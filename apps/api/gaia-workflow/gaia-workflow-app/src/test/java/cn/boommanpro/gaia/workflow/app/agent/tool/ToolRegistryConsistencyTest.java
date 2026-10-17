package cn.boommanpro.gaia.workflow.app.agent.tool;

import cn.boommanpro.gaia.workflow.app.service.AgentToolRegistry;
import cn.hutool.json.JSONArray;
import cn.hutool.json.JSONObject;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.HashSet;
import java.util.List;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.Mockito.mock;

@DisplayName("工具注册表 ↔ 执行器一致性守卫（16→8 合并版）")
class ToolRegistryConsistencyTest {

    private static final Set<String> EXPECTED_TOOLS = new HashSet<>(List.of(
        "skill", "ask_user", "todo_write",
        "get", "node", "edge", "run", "test_case"));

    private static final Set<String> REMOVED_TOOLS = new HashSet<>(List.of(
        "write_workflow", "edit_workflow", "delete_workflow",
        "list_workflows", "list_templates", "list_runs",
        "search_knowledge", "get_node_schema", "read_workflow", "read_node", "memory",
        "get_canvas", "get_node", "get_node_variables", "get_node_knowledge",
        "add_node", "update_node", "remove_node",
        "connect_edge", "remove_edge",
        "run_node", "run_workflow", "run_tests", "add_test_case"));

    private AgentToolRegistry newRegistry() {
        return new AgentToolRegistry(
            mock(cn.boommanpro.gaia.workflow.infra.manage.service.AgentToolDefinitionService.class),
            mock(cn.boommanpro.gaia.workflow.app.service.AgentPromptComposer.class),
            mock(cn.boommanpro.gaia.workflow.app.service.AgentSkillCatalog.class));
    }

    @Test
    @DisplayName("registry schema = 目标 8 工具集，下线工具不复活")
    void schemaMatchesTargetToolSet() {
        JSONArray schema = newRegistry().buildToolsSchema();
        Set<String> names = new HashSet<>();
        for (Object item : schema) {
            names.add(((JSONObject) item).getJSONObject("function").getStr("name"));
        }
        assertEquals(EXPECTED_TOOLS, names);
        for (String removed : REMOVED_TOOLS) assertFalse(names.contains(removed));
    }

    @Test
    @DisplayName("每个 schema 工具都有 description 与 parameters")
    void schemaShapeComplete() {
        for (Object item : newRegistry().buildToolsSchema()) {
            JSONObject function = ((JSONObject) item).getJSONObject("function");
            assertNotNull(function.getStr("name"));
            assertNotNull(function.getStr("description"));
            assertNotNull(function.getJSONObject("parameters"));
        }
    }
}
