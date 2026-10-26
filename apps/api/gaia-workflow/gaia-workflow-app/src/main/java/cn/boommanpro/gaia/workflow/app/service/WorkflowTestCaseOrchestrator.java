package cn.boommanpro.gaia.workflow.app.service;

import cn.boommanpro.gaia.workflow.app.domain.testrun.input.SingleNodeRunInput;
import cn.boommanpro.gaia.workflow.app.domain.testrun.output.SingleNodeRunOutput;
import cn.boommanpro.gaia.workflow.app.executor.SingleNodeRunSupport;
import cn.boommanpro.gaia.workflow.infra.manage.entity.GaiaWorkflow;
import cn.boommanpro.gaia.workflow.infra.manage.entity.GaiaWorkflowVersion;
import cn.boommanpro.gaia.workflow.infra.manage.entity.WorkflowTestCase;
import cn.boommanpro.gaia.workflow.infra.manage.entity.WorkflowTestRun;
import cn.boommanpro.gaia.workflow.infra.manage.service.GaiaWorkflowService;
import cn.boommanpro.gaia.workflow.infra.manage.service.GaiaWorkflowVersionService;
import cn.boommanpro.gaia.workflow.infra.manage.service.WorkflowTestCaseService;
import cn.boommanpro.gaia.workflow.infra.manage.service.WorkflowTestRunService;
import cn.hutool.json.JSONArray;
import cn.hutool.json.JSONObject;
import cn.hutool.json.JSONUtil;
import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 测试用例执行编排（2026-10-17 期3）。
 *
 * <p>节点级用例走 SingleNodeRunSupport（与前端单节点测试同通道）；
 * 工作流级用例走 DraftRunService（与 run(target=workflow) 同通道：预检 + 凭证兜底 + 60s 超时）。schema 来源优先级：
 * 显式传入（agent 跑草稿 / 前端跑当前画布）优先于工作流当前生效版本。</p>
 */
@Slf4j
@Service
public class WorkflowTestCaseOrchestrator {

    private final WorkflowTestCaseService caseService;
    private final WorkflowTestRunService runService;
    private final GaiaWorkflowService workflowService;
    private final GaiaWorkflowVersionService versionService;
    private final SingleNodeRunSupport singleNodeRunSupport;
    private final DraftRunService draftRunService;
    private final TestAssertEvaluator assertEvaluator;

    public WorkflowTestCaseOrchestrator(WorkflowTestCaseService caseService,
                                        WorkflowTestRunService runService,
                                        GaiaWorkflowService workflowService,
                                        GaiaWorkflowVersionService versionService,
                                        SingleNodeRunSupport singleNodeRunSupport,
                                        DraftRunService draftRunService,
                                        TestAssertEvaluator assertEvaluator) {
        this.caseService = caseService;
        this.runService = runService;
        this.workflowService = workflowService;
        this.versionService = versionService;
        this.singleNodeRunSupport = singleNodeRunSupport;
        this.draftRunService = draftRunService;
        this.assertEvaluator = assertEvaluator;
    }

    /** 执行单个用例；schemaOverride 非空时优先（草稿/画布现场），否则用生效版本 */
    public WorkflowTestRun runCase(WorkflowTestCase testCase, String schemaOverride, String source) {
        WorkflowTestRun run = new WorkflowTestRun();
        run.setCaseId(testCase.getId());
        run.setSource(source != null ? source : "manual");
        run.setExecutedAt(LocalDateTime.now().toString());

        String schema = schemaOverride;
        if (schema == null || schema.isEmpty()) {
            schema = currentVersionSchema(testCase.getWorkflowCode());
        }
        if (schema == null || schema.isEmpty()) {
            run.setStatus("stale");
            run.setError("工作流 " + testCase.getWorkflowCode() + " 没有可运行的 schema（无生效版本且未提供草稿）");
            runService.save(run);
            return run;
        }

        long start = System.currentTimeMillis();
        Map<String, Object> actual = null;
        String error = null;
        try {
            if (testCase.getNodeId() != null && !testCase.getNodeId().isEmpty()) {
                JSONObject node = findNode(schema, testCase.getNodeId());
                if (node == null) {
                    run.setStatus("stale");
                    run.setError("用例引用的节点 " + testCase.getNodeId() + " 不在当前 schema 中（画布已变更）");
                    runService.save(run);
                    return run;
                }
                JSONObject mockInputs = parseObject(testCase.getInputsJson());
                SingleNodeRunInput input = new SingleNodeRunInput();
                input.setNode(node.toString());
                input.setInputs(mockInputs != null ? new HashMap<>(mockInputs) : new HashMap<>());
                SingleNodeRunOutput output = singleNodeRunSupport.execute(input);
                actual = output.getOutputs();
                if (!output.isSuccess()) {
                    error = output.getError();
                }
            } else {
                JSONObject inputs = parseObject(testCase.getInputsJson());
                DraftRunService.RunReport report = draftRunService.run(JSONUtil.parseObj(schema), inputs);
                actual = report.outputs;
                if (!report.success) {
                    error = describeRunFailure(report);
                }
            }
        } catch (Exception e) {
            log.warn("[test-case] run case {} failed: {}", testCase.getId(), e.getMessage());
            error = e.getMessage();
        }
        run.setDurationMs(System.currentTimeMillis() - start);
        run.setActualJson(actual != null ? JSONUtil.toJsonStr(actual) : null);
        run.setError(error);

        if (error != null && actual == null) {
            run.setStatus("error");
            run.setAssertResultsJson("[]");
        } else {
            JSONArray expected = parseArray(testCase.getExpectedJson());
            List<TestAssertEvaluator.AssertResult> results = assertEvaluator.evaluate(expected, actual);
            boolean allPass = !results.isEmpty() && results.stream().allMatch(r -> r.pass);
            JSONArray resultsJson = new JSONArray();
            for (TestAssertEvaluator.AssertResult r : results) {
                JSONObject one = new JSONObject()
                    .set("field", r.field)
                    .set("op", r.op)
                    .set("expected", r.expected)
                    .set("actual", r.actual)
                    .set("pass", r.pass);
                // 断言的字段根本不是输出字段（模型常把运行报告字段 failedNodes/success 当输出断言）：
                // 点名可用输出字段，否则模型只看到 actual=null 不知道该改字段名还是改工作流
                if (!r.pass && actual != null && !hasTopLevelField(actual, r.field)) {
                    one.set("hint", "字段 " + r.field + " 不是工作流输出字段（本次输出字段："
                        + String.join(", ", actual.keySet())
                        + "）。断言只能针对 end 节点的输出字段；运行报告字段（failedNodes/success 等）不能作为断言字段");
                }
                resultsJson.add(one);
            }
            run.setStatus(allPass ? "passed" : "failed");
            run.setAssertResultsJson(resultsJson.toString());
        }
        runService.save(run);
        return run;
    }

    /**
     * 整流失败的可行动描述：点名失败节点与真实异常，而不是 Chain 外层的「Chain execute error」。
     * 2026-10-24 实证：只给外层文案时模型定位不到节点，反复重建同名用例空转直至超时。
     */
    static String describeRunFailure(DraftRunService.RunReport report) {
        StringBuilder sb = new StringBuilder();
        if (report.timedOut) {
            sb.append("整流试跑超时");
        }
        if (report.failedNodes != null && !report.failedNodes.isEmpty()) {
            for (int i = 0; i < report.failedNodes.size(); i++) {
                JSONObject failed = report.failedNodes.getJSONObject(i);
                if (sb.length() > 0) {
                    sb.append("；");
                }
                String detail = failed.getStr("error");
                if (detail != null && detail.length() > 400) {
                    detail = detail.substring(0, 400) + "…";
                }
                sb.append("节点 ").append(failed.getStr("id")).append(" 运行失败：").append(detail);
            }
        }
        if (sb.length() == 0) {
            sb.append(report.error != null ? report.error : "Chain execute error");
        }
        if (report.notExecuted != null && !report.notExecuted.isEmpty()) {
            sb.append("；因此未执行到 ").append(report.notExecuted.size()).append(" 个下游节点");
        }
        return sb.toString();
    }

    /** 断言字段的顶层键（a.b 取 a）是否存在于输出 */
    private static boolean hasTopLevelField(Map<String, Object> actual, String field) {
        if (field == null) {
            return false;
        }
        int dot = field.indexOf('.');
        return actual.containsKey(dot > 0 ? field.substring(0, dot) : field);
    }

    public List<WorkflowTestCase> listCases(String workflowCode, String nodeId) {
        QueryWrapper<WorkflowTestCase> wrapper = new QueryWrapper<WorkflowTestCase>()
            .eq("is_deleted", 0)
            .orderByDesc("updated_at");
        if (workflowCode != null && !workflowCode.isEmpty()) {
            wrapper.eq("workflow_code", workflowCode);
        }
        if (nodeId != null && !nodeId.isEmpty()) {
            wrapper.eq("node_id", nodeId);
        }
        return caseService.list(wrapper);
    }

    public WorkflowTestCase createCase(String workflowCode, String nodeId, String name, String description,
                                       JSONObject inputs, JSONArray expected, String createdBy) {
        WorkflowTestCase testCase = new WorkflowTestCase();
        testCase.setWorkflowCode(workflowCode);
        testCase.setNodeId(nodeId);
        testCase.setName(name);
        testCase.setDescription(description);
        testCase.setInputsJson(inputs != null ? inputs.toString() : "{}");
        testCase.setExpectedJson(expected != null ? expected.toString() : "[]");
        testCase.setCreatedBy(createdBy != null ? createdBy : "user");
        testCase.setEnabled(1);
        testCase.setCreatedAt(LocalDateTime.now().toString());
        testCase.setUpdatedAt(LocalDateTime.now().toString());
        caseService.save(testCase);
        return testCase;
    }

    /** upsert 结果：用例 + 是否为覆盖更新 */
    public static final class UpsertResult {
        public final WorkflowTestCase testCase;
        public final boolean updated;

        UpsertResult(WorkflowTestCase testCase, boolean updated) {
            this.testCase = testCase;
            this.updated = updated;
        }
    }

    /**
     * 同名用例 upsert：同 workflow + 同层级（nodeId）+ 同 name 已存在则覆盖更新
     * inputs/expected/description，并把更早的同名重复项逻辑删除（一名一例）；否则新建。
     * 2026-10-24 实证：模型把「重新沉淀用例」当成修复手段，一轮里堆出 8 个重复用例，
     * run(tests) 的失败数随之翻倍，进一步误导模型。
     */
    public UpsertResult upsertCase(String workflowCode, String nodeId, String name, String description,
                                   JSONObject inputs, JSONArray expected, String createdBy) {
        QueryWrapper<WorkflowTestCase> wrapper = new QueryWrapper<WorkflowTestCase>()
            .eq("is_deleted", 0)
            .eq("workflow_code", workflowCode)
            .eq("name", name)
            .orderByDesc("id");
        if (nodeId != null && !nodeId.isEmpty()) {
            wrapper.eq("node_id", nodeId);
        } else {
            wrapper.and(w -> w.isNull("node_id").or().eq("node_id", ""));
        }
        List<WorkflowTestCase> sameName = caseService.list(wrapper);
        if (sameName.isEmpty()) {
            return new UpsertResult(createCase(workflowCode, nodeId, name, description, inputs, expected, createdBy), false);
        }
        WorkflowTestCase keep = sameName.get(0);
        keep.setDescription(description);
        keep.setInputsJson(inputs != null ? inputs.toString() : "{}");
        keep.setExpectedJson(expected != null ? expected.toString() : "[]");
        keep.setEnabled(1);
        keep.setUpdatedAt(LocalDateTime.now().toString());
        caseService.updateById(keep);
        for (int i = 1; i < sameName.size(); i++) {
            caseService.removeById(sameName.get(i).getId());
        }
        return new UpsertResult(keep, true);
    }

    private String currentVersionSchema(String workflowCode) {
        GaiaWorkflow workflow = workflowService.getOne(
            new QueryWrapper<GaiaWorkflow>().eq("workflow_code", workflowCode).last("LIMIT 1"));
        if (workflow == null || workflow.getCurrentVersionId() == null) {
            return null;
        }
        GaiaWorkflowVersion version = versionService.getById(workflow.getCurrentVersionId());
        return version != null ? version.getWorkflowData() : null;
    }

    private JSONObject findNode(String schema, String nodeId) {
        try {
            JSONArray nodes = JSONUtil.parseObj(schema).getJSONArray("nodes");
            if (nodes == null) {
                return null;
            }
            for (int i = 0; i < nodes.size(); i++) {
                JSONObject node = nodes.getJSONObject(i);
                if (nodeId.equals(node.getStr("id"))) {
                    return node;
                }
            }
        } catch (Exception ignored) {
        }
        return null;
    }

    private JSONObject parseObject(String json) {
        try {
            return json != null && !json.isEmpty() ? JSONUtil.parseObj(json) : null;
        } catch (Exception e) {
            return null;
        }
    }

    private JSONArray parseArray(String json) {
        try {
            return json != null && !json.isEmpty() ? JSONUtil.parseArray(json) : new JSONArray();
        } catch (Exception e) {
            return new JSONArray();
        }
    }
}
