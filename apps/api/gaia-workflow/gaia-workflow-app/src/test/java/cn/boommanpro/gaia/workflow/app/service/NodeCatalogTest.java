package cn.boommanpro.gaia.workflow.app.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.junit.jupiter.api.Test;

import java.io.ByteArrayInputStream;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;

class NodeCatalogTest {
    private final ClassLoader loader = getClass().getClassLoader();

    @Test
    void catalogCoversSchemasAndSafeDefaults() throws Exception {
        Set<String> creatable = NodeSchemaRegistry.aiCreatableTypes();
        assertEquals(16, NodeSchemaRegistry.schemaTypes().size());
        ObjectMapper mapper = new ObjectMapper();
        for (String type : NodeSchemaRegistry.schemaTypes()) {
            JsonNode contract = NodeSchemaRegistry.contract(type);
            assertEquals(1, contract.path("version").asInt());
            assertEquals(creatable.contains(type), contract.path("capabilities").path("aiCreatable").asBoolean());
            assertEquals(creatable.contains(type), contract.has("defaults"));
            if (contract.has("defaults")) {
                assertEquals(java.util.List.of(), NodeSchemaRegistry.validateParams(type, contract.get("defaults").toString()), type);
            }
            try (InputStream in = loader.getResourceAsStream("node-schemas/" + type + ".schema.json")) {
                assertEquals(mapper.readTree(in), contract.get("paramSchema"));
            }
        }
        JsonNode llm = NodeSchemaRegistry.defaultData("llm").path("inputsValues");
        assertFalse(llm.has("apiKey"));
        assertFalse(llm.has("apiHost"));
        assertFalse(llm.has("modelName"));
        assertEquals("", NodeSchemaRegistry.defaultData("http").path("api").path("url").asText());
        assertFalse(NodeSchemaRegistry.contract("comment").path("capabilities").path("executable").asBoolean());
    }

    @Test
    void creatableTypesFollowCapabilitiesAndPreserveCatalogOrder() throws Exception {
        ObjectMapper mapper = new ObjectMapper();
        JsonNode index;
        JsonNode defaults;
        try (InputStream in = loader.getResourceAsStream("node-catalog/index.json")) {
            index = mapper.readTree(in);
        }
        try (InputStream in = loader.getResourceAsStream("node-catalog/defaults.json")) {
            defaults = mapper.readTree(in);
        }
        for (JsonNode entry : index.path("nodes")) {
            if (entry.path("type").asText().equals("http")) {
                ((ObjectNode) entry.path("capabilities")).put("aiCreatable", false);
                ((ObjectNode) entry).remove("defaults");
            }
            if (entry.path("type").asText().equals("break")) {
                ((ObjectNode) entry.path("capabilities")).put("aiCreatable", true);
                ((ObjectNode) entry).put("defaults", "break");
            }
        }
        ((ObjectNode) defaults).remove("http");
        ((ObjectNode) defaults).set("break", mapper.createObjectNode());
        ClassLoader changed = new ClassLoader(loader) {
            @Override
            public InputStream getResourceAsStream(String name) {
                if (name.equals("node-catalog/index.json") || name.equals("node-catalog/defaults.json")) {
                    JsonNode resource = name.endsWith("index.json") ? index : defaults;
                    return new ByteArrayInputStream(resource.toString().getBytes(StandardCharsets.UTF_8));
                }
                return super.getResourceAsStream(name);
            }
        };
        NodeCatalog catalog = new NodeCatalog(changed);
        java.util.List<String> expected = new java.util.ArrayList<>();
        for (JsonNode entry : index.path("nodes")) {
            if (entry.path("capabilities").path("aiCreatable").asBoolean()) {
                expected.add(entry.path("type").asText());
            }
        }
        assertEquals(expected, new java.util.ArrayList<>(catalog.aiCreatableTypes()));
        assertFalse(catalog.aiCreatableTypes().contains("http"));
        assertTrue(catalog.aiCreatableTypes().contains("break"));
        assertTrue(catalog.aiCreatableTypes().contains("comment"));
        assertThrows(UnsupportedOperationException.class, () -> catalog.aiCreatableTypes().add("unknown"));
    }

    @Test
    void returnedDataCannotMutateCatalog() {
        ((ObjectNode) NodeSchemaRegistry.defaultData("start")).put("title", "changed");
        ((ObjectNode) NodeSchemaRegistry.contract("start").get("paramSchema")).put("type", "string");
        assertEquals("Start", NodeSchemaRegistry.defaultData("start").path("title").asText());
        assertEquals("object", NodeSchemaRegistry.contract("start").path("paramSchema").path("type").asText());
    }

    @Test
    void missingResourcesFailClosed() {
        for (String path : Set.of("node-catalog/index.json", "node-catalog/defaults.json",
            "node-schemas/http.schema.json", "node-schemas/comment.schema.json")) {
            assertThrows(IllegalStateException.class, () -> new NodeCatalog(replace(path, null)));
        }
    }

    @Test
    void corruptResourcesFailClosed() {
        for (String path : Set.of("node-catalog/index.json", "node-catalog/defaults.json", "node-schemas/start.schema.json")) {
            assertThrows(IllegalStateException.class, () -> new NodeCatalog(replace(path, "{")));
        }
        assertThrows(IllegalStateException.class, () -> new NodeCatalog(replace("node-catalog/defaults.json", "{}")));
        assertThrows(IllegalStateException.class, () -> new NodeCatalog(replace("node-schemas/start.schema.json", "{}")));
    }

    private ClassLoader replace(String path, String text) {
        return new ClassLoader(loader) {
            @Override
            public InputStream getResourceAsStream(String name) {
                if (path.equals(name)) {
                    return text == null ? null : new ByteArrayInputStream(text.getBytes(StandardCharsets.UTF_8));
                }
                return super.getResourceAsStream(name);
            }
        };
    }
}
