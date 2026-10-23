package cn.boommanpro.gaia.workflow.app.controller.system;

import cn.boommanpro.gaia.workflow.infra.manage.entity.GaiaWorkflow;
import cn.boommanpro.gaia.workflow.infra.manage.entity.GaiaWorkflowVersion;
import cn.boommanpro.gaia.workflow.infra.manage.service.GaiaWorkflowService;
import cn.boommanpro.gaia.workflow.infra.manage.service.GaiaWorkflowTemplateService;
import cn.boommanpro.gaia.workflow.infra.manage.service.GaiaWorkflowVersionService;
import com.baomidou.mybatisplus.core.conditions.Wrapper;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * /api/workflow/subflow-options：子流程节点可选清单。
 * 前端子流程选择器此前打不存在的 GET /workflows（永远空列表），
 * 本端点是正式替代——必须返回 code + 从当前生效版提取的入出参 schema。
 */
class GaiaWorkflowSubflowOptionsTest {

    @SuppressWarnings("unchecked")
    private GaiaWorkflowController newController(List<GaiaWorkflow> workflows, GaiaWorkflowVersion version) {
        GaiaWorkflowService workflowService = mock(GaiaWorkflowService.class);
        GaiaWorkflowTemplateService templateService = mock(GaiaWorkflowTemplateService.class);
        GaiaWorkflowVersionService versionService = mock(GaiaWorkflowVersionService.class);
        when(workflowService.list(any(Wrapper.class))).thenReturn(workflows);
        if (version != null) {
            when(versionService.getById(any(Long.class))).thenReturn(version);
        }
        return new GaiaWorkflowController(workflowService, templateService, versionService);
    }

    private GaiaWorkflow workflow(String code, String name, Long versionId) {
        GaiaWorkflow w = new GaiaWorkflow();
        w.setWorkflowCode(code);
        w.setWorkflowName(name);
        w.setCurrentVersionId(versionId);
        return w;
    }

    private static final String VERSION_DATA = "{\"nodes\":["
            + "{\"id\":\"start_1\",\"type\":\"start\",\"data\":{\"outputs\":{\"type\":\"object\",\"properties\":{\"q\":{\"type\":\"string\"}}}}},"
            + "{\"id\":\"end_1\",\"type\":\"end\",\"data\":{\"inputs\":{\"type\":\"object\",\"properties\":{\"answer\":{\"type\":\"string\"}}}}}"
            + "],\"edges\":[{\"sourceNodeID\":\"start_1\",\"targetNodeID\":\"end_1\"}]}";

    @Test
    void shouldReturnCodeAndSchemasExtractedFromCurrentVersion() {
        GaiaWorkflowVersion version = new GaiaWorkflowVersion();
        version.setWorkflowData(VERSION_DATA);
        GaiaWorkflowController controller = newController(
            List.of(workflow("wf_child", "子流程", 11L)), version);

        List<Map<String, Object>> options = controller.subflowOptions();

        assertEquals(1, options.size());
        Map<String, Object> option = options.get(0);
        assertEquals("wf_child", option.get("code"));
        assertEquals("子流程", option.get("name"));
        Map<String, Object> inputs = (Map<String, Object>) option.get("inputs");
        assertTrue(((Map<String, Object>) inputs.get("properties")).containsKey("q"));
        Map<String, Object> outputs = (Map<String, Object>) option.get("outputs");
        assertTrue(((Map<String, Object>) outputs.get("properties")).containsKey("answer"));
    }

    @Test
    void workflowWithoutVersionShouldFallBackToEmptySchema() {
        GaiaWorkflowController controller = newController(
            List.of(workflow("wf_empty", "无版本", null)), null);

        List<Map<String, Object>> options = controller.subflowOptions();

        assertEquals(1, options.size());
        Map<String, Object> inputs = (Map<String, Object>) options.get(0).get("inputs");
        assertNotNull(inputs);
        assertEquals("object", inputs.get("type"));
    }

    @Test
    void brokenVersionDataShouldNotFailTheWholeList() {
        GaiaWorkflowVersion badVersion = new GaiaWorkflowVersion();
        badVersion.setWorkflowData("not-a-json{");
        GaiaWorkflowController controller = newController(
            List.of(workflow("wf_bad", "坏数据", 1L)), badVersion);

        List<Map<String, Object>> options = controller.subflowOptions();

        assertEquals(1, options.size());
        assertEquals("object", ((Map<String, Object>) options.get(0).get("inputs")).get("type"));
    }
}
