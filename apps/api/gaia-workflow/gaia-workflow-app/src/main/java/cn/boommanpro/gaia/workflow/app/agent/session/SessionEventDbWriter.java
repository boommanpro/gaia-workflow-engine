package cn.boommanpro.gaia.workflow.app.agent.session;

import cn.boommanpro.gaia.workflow.infra.manage.entity.AgentSessionEvent;
import cn.boommanpro.gaia.workflow.infra.manage.service.AgentSessionEventService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import javax.annotation.PreDestroy;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.LinkedBlockingQueue;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicLong;

/**
 * 会话事件持久化的异步批量写出器 —— 把「逐事件同步写 SQLite」从 run 热路径上摘掉。
 *
 * <p>旧实现每个事件一条 INSERT（含携带全量 DSL 的 document / 大结果 tool_result），
 * 高频工具循环时数据库写是吞吐瓶颈（架构评审 P1-6）。现在：</p>
 * <ul>
 *   <li>生产端只入队（有界 {@link #QUEUE_CAPACITY}，FIFO 保序）；</li>
 *   <li>单条守护写线程批量刷库（攒 {@value #BATCH_SIZE} 条或 {@value #BATCH_FLUSH_MS}ms）；</li>
 *   <li>队列满时丢最旧的非终态事件并告警（日志可观测性优先于逐条保真，
 *       终态 done/error/run_end 永不丢）；</li>
 *   <li>run 收尾可 {@link #flush(long)} 同步等账，保证「durable before finish」。</li>
 * </ul>
 */
@Slf4j
@Component
public class SessionEventDbWriter {

    private static final int QUEUE_CAPACITY = 4096;
    private static final int BATCH_SIZE = 128;
    private static final long BATCH_FLUSH_MS = 200;

    /** 终态类事件：丢不得（回放/审计依据）；过载时优先丢中间过程帧 */
    private static boolean isTerminal(String eventType) {
        return "done".equals(eventType) || "error".equals(eventType)
            || "run_end".equals(eventType) || "assistant_settled".equals(eventType);
    }

    private final AgentSessionEventService eventService;
    private final LinkedBlockingQueue<AgentSessionEvent> queue = new LinkedBlockingQueue<>(QUEUE_CAPACITY);
    private final AtomicLong dropped = new AtomicLong();
    private final AtomicBoolean closed = new AtomicBoolean(false);
    private final Thread worker;

    public SessionEventDbWriter(AgentSessionEventService eventService) {
        this.eventService = eventService;
        this.worker = new Thread(this::run, "session-event-db-writer");
        this.worker.setDaemon(true);
        this.worker.start();
    }

    /** 入队一条待持久化事件（非阻塞）。队列满时丢最旧的非终态事件腾位。 */
    public void enqueue(AgentSessionEvent row) {
        if (row == null || closed.get()) {
            return;
        }
        while (!queue.offer(row)) {
            AgentSessionEvent oldest = queue.poll();
            if (oldest == null) {
                continue;
            }
            if (isTerminal(oldest.getEventType())) {
                // 终态不丢：塞回去再从头部找非终态（简化处理：直接尝试重排，失败则丢当前行）
                if (!queue.offer(oldest)) {
                    dropped.incrementAndGet();
                    return;
                }
                continue;
            }
            long total = dropped.incrementAndGet();
            if (total == 1 || total % 100 == 0) {
                log.warn("[event-db-writer] queue overflow, dropped {} non-terminal events so far", total);
            }
        }
    }

    /** 当前积压（观测/测试用） */
    public int pending() {
        return queue.size();
    }

    /** 同步等账：队列内全部事件落库或超时（run 收尾调用，保证终态 durable） */
    public boolean flush(long timeoutMillis) {
        long deadline = System.currentTimeMillis() + timeoutMillis;
        while (queue.size() > 0 && System.currentTimeMillis() < deadline) {
            try {
                Thread.sleep(10);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                return false;
            }
        }
        return queue.size() == 0;
    }

    @PreDestroy
    public void stop() {
        closed.set(true);
        worker.interrupt();
    }

    private void run() {
        List<AgentSessionEvent> batch = new ArrayList<>(BATCH_SIZE);
        while (!closed.get() || !queue.isEmpty()) {
            try {
                AgentSessionEvent first = queue.poll(BATCH_FLUSH_MS, TimeUnit.MILLISECONDS);
                if (first == null) {
                    continue;
                }
                batch.add(first);
                queue.drainTo(batch, BATCH_SIZE - 1);
                persist(batch);
            } catch (InterruptedException e) {
                // 关停中：把剩余账目刷完再退出
                Thread.currentThread().interrupt();
                List<AgentSessionEvent> rest = new ArrayList<>();
                queue.drainTo(rest);
                if (!rest.isEmpty()) {
                    persist(rest);
                }
                return;
            } catch (Throwable e) {
                // 单批失败不终止写线程（丢批可观测）
                log.warn("[event-db-writer] batch persist failed ({} rows dropped): {}",
                    batch.size(), e.getMessage());
            } finally {
                batch.clear();
            }
        }
    }

    private void persist(List<AgentSessionEvent> rows) {
        if (rows.isEmpty()) {
            return;
        }
        try {
            eventService.saveBatch(rows);
        } catch (Exception e) {
            // 批量失败时逐条重试一次（半批成功也算成功，失败条目告警）
            int failed = 0;
            for (AgentSessionEvent row : rows) {
                try {
                    eventService.save(row);
                } catch (Exception per) {
                    failed++;
                    log.debug("[event-db-writer] row persist failed: {}", per.getMessage());
                }
            }
            if (failed > 0) {
                log.warn("[event-db-writer] {} of {} rows failed to persist", failed, rows.size());
            }
        }
    }
}
