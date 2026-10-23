package cn.boommanpro.gaia.workflow.app.service;

import cn.boommanpro.gaia.workflow.app.domain.testrun.input.TaskRunInput;
import cn.boommanpro.gaia.workflow.app.domain.testrun.model.NodeReport;
import cn.boommanpro.gaia.workflow.app.domain.testrun.model.Snapshot;
import cn.boommanpro.gaia.workflow.app.domain.testrun.model.TaskInfo;
import cn.boommanpro.gaia.workflow.infra.manage.entity.WorkflowNodeRun;
import cn.boommanpro.gaia.workflow.infra.manage.entity.WorkflowRun;
import cn.boommanpro.gaia.workflow.infra.manage.service.WorkflowNodeRunService;
import cn.boommanpro.gaia.workflow.infra.manage.service.WorkflowRunService;
import cn.hutool.json.JSONArray;
import cn.hutool.json.JSONObject;
import cn.hutool.json.JSONUtil;
import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 运行历史持久化（第一档 B）：编辑器试运行结束把 run 实例 + 节点级明细落库，
 * 替换此前"反射调用不存在的 testCallLogRecorderImpl"的死代码路径——
 * 报告只存在内存仓库里，重启即丢、无处回查。
 *
 * <p>查询口径：按 workflowCode 过滤 + 分页；taskId 取详情（含节点明细）。
 * 写入失败只 warn，绝不影响运行结果本身。</p>
 */
@Slf4j
@Service
public class WorkflowRunHistoryService {

    private final WorkflowRunService runService;
    private final WorkflowNodeRunService nodeRunService;

    public WorkflowRunHistoryService(WorkflowRunService runService, WorkflowNodeRunService nodeRunService) {
        this.runService = runService;
        this.nodeRunService = nodeRunService;
    }

    /** 试运行结束：一次写入 run 行 + N 行节点明细（durationMs = 运行耗时） */
    public void recordEditorRun(String taskId, String workflowCode, TaskInfo taskInfo,
                                TaskRunInput input, long durationMs) {
        try {
            LocalDateTime now = LocalDateTime.now();

            WorkflowRun run = new WorkflowRun();
            run.setTaskId(taskId);
            run.setWorkflowCode(resolveCode(workflowCode, taskInfo));
            run.setStatus(normalizeStatus(taskInfo.getWorkflowStatus().getStatus()));
            run.setErrorMessage(firstError(taskInfo));
            run.setInputsJson(safeJson(input != null ? input.getInputs() : null));
            run.setOutputsJson(safeJson(taskInfo.getOutputs()));
            run.setDurationMs(durationMs);
            run.setTriggerChannel("editor");
            run.setStartedAt(now.minusNanos(durationMs * 1_000_000));
            run.setFinishedAt(now);
            run.setCreatedAt(now);

            Map<String, JSONObject> nodeMeta = nodeMetaFromSchema(taskInfo.getSchema());
            List<NodeReport> reports = taskInfo.getNodeReports() != null
                ? new ArrayList<>(taskInfo.getNodeReports().values()) : new ArrayList<>();
            run.setNodeCount(reports.size());

            runService.save(run);
            saveNodeRuns(taskId, reports, nodeMeta, now);
        } catch (Exception e) {
            log.warn("[run-history] 试运行历史落库失败 taskId={}: {}", taskId, e.getMessage());
        }
    }

    /** 运行列表（按工作流过滤 + 分页，倒序） */
    public Page<WorkflowRun> listRuns(String workflowCode, int page, int size) {
        QueryWrapper<WorkflowRun> wrapper = new QueryWrapper<WorkflowRun>()
            .orderByDesc("id");
        if (workflowCode != null && !workflowCode.isBlank()) {
            wrapper.eq("workflow_code", workflowCode);
        }
        return runService.page(new Page<>(Math.max(1, page), Math.min(100, Math.max(1, size))), wrapper);
    }

    /** 单次运行详情（含节点明细） */
    public Map<String, Object> getRunDetail(String taskId) {
        Map<String, Object> result = new HashMap<>();
        WorkflowRun run = runService.getOne(
            new QueryWrapper<WorkflowRun>().eq("task_id", taskId).last("LIMIT 1"));
        if (run == null) {
            return null;
        }
        result.put("run", run);
        List<WorkflowNodeRun> nodes = nodeRunService.list(
            new QueryWrapper<WorkflowNodeRun>().eq("run_task_id", taskId).orderByAsc("id"));
        result.put("nodes", nodes);
        return result;
    }

    // ==================== 内部 ====================

    private void saveNodeRuns(String taskId, List<NodeReport> reports,
                              Map<String, JSONObject> nodeMeta, LocalDateTime now) {
        if (reports.isEmpty()) {
            return;
        }
        List<WorkflowNodeRun> rows = new ArrayList<>(reports.size());
        for (NodeReport report : reports) {
            WorkflowNodeRun row = new WorkflowNodeRun();
            row.setRunTaskId(taskId);
            row.setNodeId(report.getId());
            JSONObject meta = nodeMeta.get(report.getId());
            if (meta != null) {
                row.setNodeType(meta.getStr("type"));
                JSONObject data = meta.getJSONObject("data");
                if (data != null && data.getStr("title") != null) {
                    row.setTitle(data.getStr("title"));
                }
            }
            row.setStatus(report.getStatus());
            row.setTimeCostMs(report.getTimeCost());
            // 快照取最后一份（多份=循环迭代，末次最具代表性）
            List<Snapshot> snapshots = report.getSnapshots();
            if (snapshots != null && !snapshots.isEmpty()) {
                Snapshot last = snapshots.get(snapshots.size() - 1);
                row.setInputsJson(safeJson(last.getInputs()));
                row.setOutputJson(safeJson(last.getOutputs()));
                if (last.getError() != null) {
                    row.setErrorMessage(String.valueOf(last.getError()));
                }
            }
            row.setCreatedAt(now);
            rows.add(row);
        }
        nodeRunService.saveBatch(rows);
    }

    /** schema 里 nodeId → {type, data.title}，节点明细的可读元信息 */
    private Map<String, JSONObject> nodeMetaFromSchema(String schema) {
        Map<String, JSONObject> meta = new HashMap<>();
        if (schema == null || schema.isBlank()) {
            return meta;
        }
        try {
            JSONArray nodes = JSONUtil.parseObj(schema).getJSONArray("nodes");
            if (nodes == null) {
                return meta;
            }
            for (int i = 0; i < nodes.size(); i++) {
                JSONObject node = nodes.getJSONObject(i);
                if (node != null && node.getStr("id") != null) {
                    meta.put(node.getStr("id"), node);
                }
            }
        } catch (Exception ignore) {
            // schema 不可解析时按无元信息处理
        }
        return meta;
    }

    private String resolveCode(String workflowCode, TaskInfo taskInfo) {
        if (workflowCode != null && !workflowCode.isBlank()) {
            return workflowCode;
        }
        return parseWorkflowCodeFromSchema(taskInfo.getSchema());
    }

    /** 旧实现同款兜底：从 schema 根节点找 workflowCode 字段 */
    private String parseWorkflowCodeFromSchema(String schema) {
        if (schema == null || schema.isBlank()) {
            return null;
        }
        try {
            String code = JSONUtil.parseObj(schema).getStr("workflowCode");
            return code != null && !code.isBlank() ? code : null;
        } catch (Exception e) {
            return null;
        }
    }

    private String normalizeStatus(String status) {
        if (status == null) {
            return "failed";
        }
        switch (status) {
            case "success":
            case "succeeded":
                return "success";
            case "fail":
            case "failed":
                return "failed";
            case "canceled":
                return "canceled";
            default:
                return status;
        }
    }

    private String firstError(TaskInfo taskInfo) {
        try {
            if (taskInfo.getMessages() != null
                && taskInfo.getMessages().getError() != null
                && !taskInfo.getMessages().getError().isEmpty()) {
                return taskInfo.getMessages().getError().get(0).getMessage();
            }
        } catch (Exception ignore) {
            // 无错误信息
        }
        return null;
    }

    private String safeJson(Object value) {
        if (value == null) {
            return null;
        }
        try {
            String json = JSONUtil.toJsonStr(value);
            // SQLite 单列存储上限保护：截断超大明细
            return json.length() > 60_000 ? json.substring(0, 60_000) + "…(truncated)" : json;
        } catch (Exception e) {
            return null;
        }
    }
}
