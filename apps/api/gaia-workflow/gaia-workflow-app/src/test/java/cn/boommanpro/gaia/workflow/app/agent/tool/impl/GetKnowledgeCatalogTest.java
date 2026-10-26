package cn.boommanpro.gaia.workflow.app.agent.tool.impl;

import cn.boommanpro.gaia.workflow.app.service.AgentSkillCatalog;
import cn.boommanpro.gaia.workflow.app.service.NodeSchemaRegistry;
import cn.hutool.json.JSONObject;
import cn.hutool.json.JSONUtil;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class GetKnowledgeCatalogTest {
    @Test
    void contractsAreAvailableWithoutKnowledgeDocumentsOrSession() {
        AgentSkillCatalog skills = mock(AgentSkillCatalog.class);
        GetToolExecutor executor = new GetToolExecutor(null, skills, null, null, null);
        for (String type : NodeSchemaRegistry.schemaTypes()) {
            var result = executor.execute(new JSONObject().set("target", "knowledge").set("nodeType", type), null);
            assertTrue(result.isSuccess(), type);
            JSONObject payload = JSONUtil.parseObj(result.getPayload());
            assertEquals(type, payload.getStr("nodeType"));
            assertEquals(1, payload.getInt("version"));
            assertNotNull(payload.getJSONObject("paramSchema"));
            assertNotNull(payload.getJSONObject("capabilities"));
            assertFalse(payload.containsKey("doc"));
        }
    }

    @Test
    void unknownAndInvalidTypesDoNotReturnContracts() {
        AgentSkillCatalog skills = mock(AgentSkillCatalog.class);
        GetToolExecutor executor = new GetToolExecutor(null, skills, null, null, null);
        assertFalse(executor.execute(new JSONObject().set("target", "knowledge"), null).isSuccess());
        assertFalse(executor.execute(new JSONObject().set("target", "knowledge").set("nodeType", "../secret"), null).isSuccess());
        verifyNoInteractions(skills);
        assertFalse(executor.execute(new JSONObject().set("target", "knowledge").set("nodeType", "unknown"), null).isSuccess());
    }
}
