package cn.boommanpro.gaia.workflow.app.service;

import cn.hutool.json.JSONObject;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

import java.io.InputStream;
import java.util.Arrays;
import java.util.LinkedHashSet;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;

class AiCreatableTypesContractTest {
    @Test
    void canonicalizerAndToolDescriptionMatchCatalogCapabilities() throws Exception {
        Set<String> expected = new LinkedHashSet<>();
        try (InputStream in = getClass().getClassLoader().getResourceAsStream("node-catalog/index.json")) {
            for (JsonNode entry : new ObjectMapper().readTree(in).path("nodes")) {
                String type = entry.path("type").asText();
                boolean creatable = entry.path("capabilities").path("aiCreatable").asBoolean();
                assertEquals(creatable, WorkflowDslCanonicalizer.isSupportedType(type), type);
                if (creatable) expected.add(type);
            }
        }
        assertFalse(expected.isEmpty());
        assertEquals(expected, NodeSchemaRegistry.aiCreatableTypes());
        assertEquals(expected, WorkflowDslCanonicalizer.supportedTypes());
        assertTrue(expected.contains("comment"));
        for (String type : Arrays.asList(null, "", "unknown", "assignee", "note", "group", "block-start", "block-end", "break", "continue")) {
            assertFalse(WorkflowDslCanonicalizer.isSupportedType(type), type);
        }
        assertThrows(UnsupportedOperationException.class, () -> WorkflowDslCanonicalizer.supportedTypes().add("unknown"));

        AgentToolRegistry registry = new AgentToolRegistry(null, null, null);
        JSONObject nodeFunction = null;
        for (Object tool : registry.buildToolsSchema()) {
            JSONObject function = ((JSONObject) tool).getJSONObject("function");
            if ("node".equals(function.getStr("name"))) nodeFunction = function;
        }
        assertNotNull(nodeFunction);
        String description = nodeFunction.getStr("description");
        String marker = "可选类型: ";
        assertTrue(description.contains(marker));
        String[] advertised = description.substring(description.indexOf(marker) + marker.length()).split(",\\s*");
        assertEquals(expected, new LinkedHashSet<>(Arrays.asList(advertised)));
        assertEquals(expected.size(), advertised.length);
    }
}
