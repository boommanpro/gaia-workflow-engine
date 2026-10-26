package cn.boommanpro.gaia.workflow.app.config;

import cn.boommanpro.gaia.workflow.app.service.NodeSchemaRegistry;
import org.springframework.stereotype.Component;

@Component
public class NodeCatalogInitializer {
    public NodeCatalogInitializer() {
        NodeSchemaRegistry.schemaTypes();
    }
}
