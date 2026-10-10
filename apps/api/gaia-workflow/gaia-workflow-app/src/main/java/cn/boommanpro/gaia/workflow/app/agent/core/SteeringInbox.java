package cn.boommanpro.gaia.workflow.app.agent.core;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.ConcurrentLinkedQueue;

/**
 * 运行中 steering 收件箱（对齐 dsh 双通道 inbox 的 next-turn 语义）。
 *
 * <p>run 进行中用户发来的新消息不再被拒之门外（旧的 conflict 语义），
 * 而是进入本收件箱；运行循环在每个 turn 边界排空它，把消息作为
 * user 消息注入当前对话 —— 模型能在本 run 内看到并调整方向。</p>
 *
 * <p>由 {@code AgentSessionRunService} 持有（会话级），经
 * {@code AgentRequest.variables["steeringInbox"]} 传入运行时；
 * 消息的持久化由 run 侧完成，这里只做投递。</p>
 */
public class SteeringInbox {

    /** 一条待注入的 steering 消息 */
    public static class Message {
        public final String content;
        public final List<String> images;
        /** 发送时的页面上下文（链接式 run 复用） */
        public final String pageContext;
        public final String locale;
        public final String agentId;

        public Message(String content, List<String> images) {
            this(content, images, null, null, null);
        }

        public Message(String content, List<String> images, String pageContext, String locale, String agentId) {
            this.content = content;
            this.images = images;
            this.pageContext = pageContext;
            this.locale = locale;
            this.agentId = agentId;
        }
    }

    private final ConcurrentLinkedQueue<Message> queue = new ConcurrentLinkedQueue<>();

    public void offer(String content, List<String> images) {
        offer(new Message(content, images, null, null, null));
    }

    public void offer(Message message) {
        if (message != null && message.content != null && !message.content.trim().isEmpty()) {
            queue.offer(message);
        }
    }

    /** 非阻塞排空：取走当前积压的全部消息（并发安全，取走即消失） */
    public List<Message> drain() {
        List<Message> drained = new ArrayList<>();
        Message m;
        while ((m = queue.poll()) != null) {
            drained.add(m);
        }
        return drained;
    }

    public boolean isEmpty() {
        return queue.isEmpty();
    }
}
