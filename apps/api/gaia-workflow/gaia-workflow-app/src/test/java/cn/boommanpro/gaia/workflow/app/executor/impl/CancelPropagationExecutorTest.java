package cn.boommanpro.gaia.workflow.app.executor.impl;

import cn.boommanpro.gaia.workflow.app.domain.testrun.input.TaskRunInput;
import cn.boommanpro.gaia.workflow.app.domain.testrun.model.NodeReport;
import cn.boommanpro.gaia.workflow.app.domain.testrun.model.TaskInfo;
import cn.boommanpro.gaia.workflow.app.service.TaskRepository;
import cn.boommanpro.gaia.workflow.app.service.WorkflowRunHistoryService;
import cn.boommanpro.gaia.workflow.base.node.ChainParser;
import cn.boommanpro.gaia.workflow.base.type.ChainNodeStatus;
import org.junit.jupiter.api.Test;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.mock;

/**
 * 取消传播的 executor 层集成（第一档 G）：慢节点执行中取消、节点最终 FAILED——
 * 最终 TaskInfo 的节点报告里下游必须是 canceled（e2e 曾见 pending，定位用）。
 */
class CancelPropagationExecutorTest {

    private static final String OK = "cp-ok-" + System.nanoTime();
    private static final String SLOW_FAIL = "cp-fail-" + System.nanoTime();

    private static boolean waitFor(java.util.function.BooleanSupplier cond, long timeoutMs)
            throws InterruptedException {
        long deadline = System.currentTimeMillis() + timeoutMs;
        while (System.currentTimeMillis() < deadline) {
            if (cond.getAsBoolean()) {
                return true;
            }
            TimeUnit.MILLISECONDS.sleep(30);
        }
        return cond.getAsBoolean();
    }

    @Test
    void cancelDuringSlowFailingNodeShouldMarkDownstreamCanceledInTaskReports() throws Exception {
        ChainParser.registerNodeParser(OK, (n, w) -> stub(n.getStr("id"), 0, null));
        ChainParser.registerNodeParser(SLOW_FAIL, (n, w) -> stub(n.getStr("id"), 500, "模拟超时"));

        // 内存仓库捕获最终 TaskInfo
        Map<String, TaskInfo> store = new ConcurrentHashMap<>();
        TaskRepository repo = mock(TaskRepository.class);
        doAnswer(inv -> {
            store.put(inv.getArgument(0), inv.getArgument(1));
            return true;
        }).when(repo).updateTask(anyString(), any());

        WorkflowRunHistoryService history = mock(WorkflowRunHistoryService.class);
        doAnswer(inv -> null).when(history)
            .recordEditorRun(anyString(), anyString(), any(), any(), anyLong());

        ThreadPoolAsyncWorkflowExecutor executor = new ThreadPoolAsyncWorkflowExecutor(repo, history);
        executor.init(); // executorService 由 @PostConstruct 创建，手动 new 时需显式初始化

        String schema = "{\"nodes\":["
            + "{\"id\":\"s1\",\"type\":\"" + OK + "\"},"
            + "{\"id\":\"slow1\",\"type\":\"" + SLOW_FAIL + "\"},"
            + "{\"id\":\"s2\",\"type\":\"" + OK + "\"}"
            + "],\"edges\":["
            + "{\"sourceNodeID\":\"s1\",\"targetNodeID\":\"slow1\"},"
            + "{\"sourceNodeID\":\"slow1\",\"targetNodeID\":\"s2\"}]}";

        TaskInfo taskInfo = new TaskInfo(schema, null);
        TaskRunInput input = new TaskRunInput();
        input.setSchema(schema);

        executor.executeAsync("task_cp_" + System.nanoTime(), taskInfo, input);

        // 等 chain 构建且 slow1 进入 RUNNING，然后取消
        AtomicReference<cn.boommanpro.gaia.workflow.base.GaiaWorkflow> wfRef = new AtomicReference<>();
        assertTrue(waitFor(() -> {
            wfRef.set(taskInfo.getWorkflowRef());
            return wfRef.get() != null;
        }, 5000), "workflowRef 应被注入");
        assertTrue(waitFor(() -> {
            var info = wfRef.get().toChain().getExecuteInfoMap().get("slow1");
            return info != null && info.getStatus() == ChainNodeStatus.RUNNING;
        }, 5000), "slow1 应进入 RUNNING");
        wfRef.get().requestCancel();

        // 等终态
        assertTrue(waitFor(() -> store.values().stream()
                .anyMatch(t -> t.getWorkflowStatus().isTerminated()), 15000), "任务应到达终态");

        TaskInfo finalInfo = store.values().iterator().next();
        assertEquals("canceled", finalInfo.getWorkflowStatus().getStatus());
        NodeReport slow = finalInfo.getNodeReports().get("slow1");
        NodeReport down = finalInfo.getNodeReports().get("s2");
        assertTrue(slow != null && ("failed".equals(slow.getStatus()) || "canceled".equals(slow.getStatus())),
            "slow1 应为 failed/canceled，实际: " + (slow == null ? "无报告" : slow.getStatus()));
        assertTrue(down != null && "canceled".equals(down.getStatus()),
            "下游 s2 应为 canceled，实际: " + (down == null ? "无报告" : down.getStatus()));
    }

    private static cn.boommanpro.gaia.workflow.base.model.ChainNode stub(
            String id, long sleepMs, String failWith) {
        cn.boommanpro.gaia.workflow.base.model.ChainNode node =
            new cn.boommanpro.gaia.workflow.base.model.ChainNode() {
                @Override
                public Map<String, Object> execute(
                        cn.boommanpro.gaia.workflow.base.model.Chain chain) {
                    if (sleepMs > 0) {
                        try {
                            Thread.sleep(sleepMs);
                        } catch (InterruptedException e) {
                            Thread.currentThread().interrupt();
                        }
                    }
                    if (failWith != null) {
                        throw new RuntimeException(failWith);
                    }
                    return java.util.Collections.singletonMap(id, "ok");
                }
            };
        node.setId(id);
        return node;
    }
}
