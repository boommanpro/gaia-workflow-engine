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
                    error = report.error;
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
                resultsJson.add(new JSONObject()
                    .set("field", r.field)
                    .set("op", r.op)
                    .set("expected", r.expected)
                    .set("actual", r.actual)
                    .set("pass", r.pass));
            }
            run.setStatus(allPass ? "passed" : "failed");
            run.setAssertResultsJson(resultsJson.toString());
        }
        runService.save(run);
        return run;
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
