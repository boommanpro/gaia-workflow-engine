package cn.boommanpro.gaia.workflow.app.controller.api;

import cn.boommanpro.gaia.workflow.app.service.TestCaseAiService;
import cn.boommanpro.gaia.workflow.app.service.WorkflowTestCaseOrchestrator;
import cn.boommanpro.gaia.workflow.infra.manage.entity.WorkflowTestCase;
import cn.boommanpro.gaia.workflow.infra.manage.entity.WorkflowTestRun;
import cn.boommanpro.gaia.workflow.infra.manage.service.WorkflowTestCaseService;
import cn.boommanpro.gaia.workflow.infra.manage.service.WorkflowTestRunService;
import cn.hutool.json.JSONArray;
import cn.hutool.json.JSONObject;
import cn.hutool.json.JSONUtil;
import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 工作流测试用例 REST 接口（前端测试面板用，2026-10-17 期3）。
 * agent 侧走 test_case / run(target=tests) 工具，同一套服务层。
 */
@RestController
@RequestMapping("api/test-case")
public class WorkflowTestCaseController {

    @Autowired
    private WorkflowTestCaseOrchestrator orchestrator;

    @Autowired
    private WorkflowTestCaseService caseService;

    @Autowired
    private WorkflowTestRunService runService;

    /** 用例列表：?workflowCode= 必填，?nodeId= 可选（不传含工作流级） */
    @GetMapping("list")
    public List<WorkflowTestCase> list(@RequestParam String workflowCode,
                                       @RequestParam(required = false) String nodeId) {
        return orchestrator.listCases(workflowCode, nodeId);
    }

    /** 新建用例 */
    @PostMapping("create")
    public WorkflowTestCase create(@RequestBody Map<String, Object> body) {
        String workflowCode = str(body.get("workflowCode"));
        String nodeId = str(body.get("nodeId"));
        String name = str(body.get("name"));
        if (workflowCode == null || name == null) {
            throw new IllegalArgumentException("workflowCode 与 name 必填");
        }
        return orchestrator.createCase(workflowCode, nodeId, name,
            str(body.get("description")),
            toObject(body.get("inputs")),
            toArray(body.get("expected")),
            "user");
    }

    /** 修改用例（name/description/inputs/expected/enabled） */
    @PostMapping("update")
    public boolean update(@RequestBody Map<String, Object> body) {
        Object idObj = body.get("id");
        if (idObj == null) {
            throw new IllegalArgumentException("id 必填");
        }
        WorkflowTestCase testCase = caseService.getById(Long.parseLong(String.valueOf(idObj)));
        if (testCase == null) {
            return false;
        }
        if (body.containsKey("name")) {
            testCase.setName(str(body.get("name")));
        }
        if (body.containsKey("description")) {
            testCase.setDescription(str(body.get("description")));
        }
        if (body.containsKey("inputs")) {
            testCase.setInputsJson(toObject(body.get("inputs")) != null
                ? toObject(body.get("inputs")).toString() : "{}");
        }
        if (body.containsKey("expected")) {
            testCase.setExpectedJson(toArray(body.get("expected")) != null
                ? toArray(body.get("expected")).toString() : "[]");
        }
        if (body.containsKey("enabled")) {
            testCase.setEnabled(Boolean.parseBoolean(String.valueOf(body.get("enabled"))) ? 1 : 0);
        }
        testCase.setUpdatedAt(java.time.LocalDateTime.now().toString());
        return caseService.updateById(testCase);
    }

    /** 删除用例 */
    @DeleteMapping("delete/{id}")
    public boolean delete(@PathVariable Long id) {
        return caseService.removeById(id);
    }

    /** 运行：{caseId} 或 {workflowCode, nodeId?, schema?}（schema=当前画布现场，优先于生效版本） */
    @PostMapping("run")
    public Map<String, Object> run(@RequestBody Map<String, Object> body) {
        Map<String, Object> result = new HashMap<>();
        String schema = str(body.get("schema"));
        if (body.get("caseId") != null) {
            WorkflowTestCase testCase = caseService.getById(Long.parseLong(String.valueOf(body.get("caseId"))));
            if (testCase == null) {
                result.put("error", "用例不存在");
                return result;
            }
            WorkflowTestRun run = orchestrator.runCase(testCase, schema, "manual");
            result.put("run", run);
            return result;
        }
        String workflowCode = str(body.get("workflowCode"));
        if (workflowCode == null) {
            result.put("error", "需要 caseId 或 workflowCode");
            return result;
        }
        List<WorkflowTestCase> cases = orchestrator.listCases(workflowCode, str(body.get("nodeId")));
        // 2026-11-07 修复「全部运行」500：旧代码把 Lombok 实体 toString()（"WorkflowTestRun(id=...)"）
        // 当 JSON 解析，首次有用例时即抛 "A JSONObject text must begin with '{'"。
        // 与上面单用例分支同口径：实体直接交给 Jackson 序列化。
        List<WorkflowTestRun> runs = new ArrayList<>();
        for (WorkflowTestCase testCase : cases) {
            if (testCase.getEnabled() == null || testCase.getEnabled() == 1) {
                runs.add(orchestrator.runCase(testCase, schema, "manual"));
            }
        }
        result.put("runs", runs);
        result.put("total", runs.size());
        return result;
    }

    /** 用例的运行历史 */
    @GetMapping("history/{caseId}")
    public List<WorkflowTestRun> history(@PathVariable Long caseId) {
        return runService.list(new QueryWrapper<WorkflowTestRun>()
            .eq("case_id", caseId)
            .orderByDesc("executed_at")
            .last("LIMIT 20"));
    }

    /* ---------- AI 辅助（2026-11-06，TestCaseAiService；AI 只起草、用户确认后才入库） ---------- */

    @Autowired
    private TestCaseAiService aiService;

    /**
     * AI 起草用例草稿（不入库）。body: {workflowCode, prompt?, schema?}——
     * prompt 为用户想覆盖的场景（2026-11-06 用户要求支持文本输入定向生成），空则模型自行分析画布。
     */
    @PostMapping("ai-generate")
    public Map<String, Object> aiGenerate(@RequestBody Map<String, Object> body) {
        Map<String, Object> result = new HashMap<>();
        try {
            result.put("cases", aiService.generate(str(body.get("workflowCode")), str(body.get("prompt")), str(body.get("schema"))));
        } catch (Exception e) {
            logAiFailure("ai-generate", e);
            result.put("error", e.getMessage() != null ? e.getMessage() : "AI 生成失败");
        }
        return result;
    }

    /** AI 补断言建议。body: {caseId, schema?}——依据最近一次实际输出；未运行过则依据 end 输出声明 */
    @PostMapping("ai-assertions")
    public Map<String, Object> aiAssertions(@RequestBody Map<String, Object> body) {
        Map<String, Object> result = new HashMap<>();
        try {
            Long caseId = body.get("caseId") == null ? null : Long.parseLong(String.valueOf(body.get("caseId")));
            result.putAll(aiService.suggestAssertions(caseId, str(body.get("schema"))));
        } catch (NumberFormatException e) {
            result.put("error", "caseId 必须是数字");
        } catch (Exception e) {
            logAiFailure("ai-assertions", e);
            result.put("error", e.getMessage() != null ? e.getMessage() : "AI 补断言失败");
        }
        return result;
    }

    /** AI 诊断失败断言。body: {caseId} → {diagnosis, fix?}——fix 为可采纳的期望值修复 */
    @PostMapping("ai-diagnose")
    public Map<String, Object> aiDiagnose(@RequestBody Map<String, Object> body) {
        Map<String, Object> result = new HashMap<>();
        try {
            Long caseId = body.get("caseId") == null ? null : Long.parseLong(String.valueOf(body.get("caseId")));
            result.putAll(aiService.diagnose(caseId));
        } catch (NumberFormatException e) {
            result.put("error", "caseId 必须是数字");
        } catch (Exception e) {
            logAiFailure("ai-diagnose", e);
            result.put("error", e.getMessage() != null ? e.getMessage() : "AI 诊断失败");
        }
        return result;
    }

    private void logAiFailure(String action, Exception e) {
        // AI 是锦上添花：失败对前端只是 error 字段 + Toast，不刷异常栈打扰日志排查
        org.slf4j.LoggerFactory.getLogger(WorkflowTestCaseController.class)
            .warn("[test-case] {} failed: {}", action, e.getMessage());
    }

    private static String str(Object value) {
        return value == null ? null : String.valueOf(value);
    }

    private static JSONObject toObject(Object value) {
        if (value == null) {
            return null;
        }
        try {
            return JSONUtil.parseObj(JSONUtil.toJsonStr(value));
        } catch (Exception e) {
            return null;
        }
    }

    private static JSONArray toArray(Object value) {
        if (value == null) {
            return null;
        }
        try {
            return JSONUtil.parseArray(JSONUtil.toJsonStr(value));
        } catch (Exception e) {
            return null;
        }
    }
}
