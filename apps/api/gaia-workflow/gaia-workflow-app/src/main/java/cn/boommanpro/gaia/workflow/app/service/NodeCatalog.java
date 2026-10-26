package cn.boommanpro.gaia.workflow.app.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.networknt.schema.Schema;
import com.networknt.schema.SchemaRegistry;
import com.networknt.schema.SpecificationVersion;

import java.io.InputStream;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.Map;
import java.util.Set;

public final class NodeCatalog {
    private final Map<String, JsonNode> contracts = new LinkedHashMap<>();
    private final Map<String, Schema> schemas = new LinkedHashMap<>();

    NodeCatalog(ClassLoader loader) {
        ObjectMapper mapper = new ObjectMapper();
        SchemaRegistry registry = SchemaRegistry.withDefaultDialect(SpecificationVersion.DRAFT_7);
        JsonNode index = read(loader, mapper, "node-catalog/index.json");
        JsonNode defaults = read(loader, mapper, "node-catalog/defaults.json");
        if (index.path("catalogVersion").asInt() != 1 || !index.path("nodes").isArray()
            || index.path("nodes").isEmpty() || !defaults.isObject()) {
            throw new IllegalStateException("Invalid node catalog index");
        }
        for (JsonNode entry : index.path("nodes")) {
            String type = entry.path("type").asText();
            JsonNode capabilities = entry.path("capabilities");
            if (!type.matches("[a-z][a-z-]*") || !entry.path("version").isIntegralNumber()
                || entry.path("version").asInt() < 1 || contracts.containsKey(type)
                || !capabilities.isObject()) {
                throw new IllegalStateException("Invalid node catalog entry: " + type);
            }
            for (String key : Set.of("executable", "aiCreatable", "container", "internal")) {
                if (!capabilities.path(key).isBoolean()) {
                    throw new IllegalStateException("Invalid node capability: " + type + "/" + key);
                }
            }
            String path = entry.path("schema").asText();
            if (!path.equals("node-schemas/" + type + ".schema.json")) {
                throw new IllegalStateException("Invalid node schema path: " + type);
            }
            JsonNode schema = read(loader, mapper, path);
            if (!schema.isObject() || !schema.path("type").asText().equals("object")) {
                throw new IllegalStateException("Invalid node schema: " + type);
            }
            ObjectNode contract = entry.deepCopy();
            contract.set("paramSchema", schema);
            boolean hasDefaults = entry.has("defaults");
            if (hasDefaults != capabilities.path("aiCreatable").asBoolean()
                || (hasDefaults && (!entry.path("defaults").asText().equals(type) || !defaults.path(type).isObject()))) {
                throw new IllegalStateException("Invalid node defaults: " + type);
            }
            if (hasDefaults) contract.set("defaults", defaults.get(type));
            try {
                Schema compiled = registry.getSchema(schema.toString());
                compiled.validate(mapper.createObjectNode());
                schemas.put(type, compiled);
            } catch (Exception e) {
                throw new IllegalStateException("Cannot compile node schema: " + type);
            }
            contracts.put(type, contract);
        }
        defaults.fieldNames().forEachRemaining(type -> {
            if (!contracts.containsKey(type) || !contracts.get(type).has("defaults")) {
                throw new IllegalStateException("Unindexed node defaults: " + type);
            }
        });
    }

    private static JsonNode read(ClassLoader loader, ObjectMapper mapper, String path) {
        try (InputStream in = loader.getResourceAsStream(path)) {
            if (in == null) throw new IllegalStateException();
            JsonNode result = mapper.readTree(in);
            if (result == null) throw new IllegalStateException();
            return result;
        } catch (Exception e) {
            throw new IllegalStateException("Cannot load node catalog resource: " + path);
        }
    }

    public Set<String> types() {
        return Collections.unmodifiableSet(contracts.keySet());
    }

    public Set<String> aiCreatableTypes() {
        Set<String> types = new LinkedHashSet<>();
        contracts.forEach((type, contract) -> {
            if (contract.path("capabilities").path("aiCreatable").asBoolean()) {
                types.add(type);
            }
        });
        return Collections.unmodifiableSet(types);
    }

    public JsonNode contract(String type) {
        JsonNode contract = contracts.get(type);
        return contract == null ? null : contract.deepCopy();
    }

    Schema schema(String type) {
        return schemas.get(type);
    }
}
