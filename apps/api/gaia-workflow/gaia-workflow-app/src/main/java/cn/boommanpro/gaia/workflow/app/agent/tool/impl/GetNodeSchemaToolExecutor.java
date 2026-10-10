package cn.boommanpro.gaia.workflow.app.agent.tool.impl;

import cn.boommanpro.gaia.workflow.app.agent.core.AgentRunContext;
import cn.boommanpro.gaia.workflow.app.agent.core.ExecutionSurface;
import cn.boommanpro.gaia.workflow.app.agent.tool.ToolErrorCode;
import cn.boommanpro.gaia.workflow.app.agent.tool.ToolExecutor;
import cn.boommanpro.gaia.workflow.app.agent.tool.ToolResult;
import cn.boommanpro.gaia.workflow.app.service.AgentKnowledgeService;
import cn.boommanpro.gaia.workflow.app.service.WorkflowDslCanonicalizer;
import cn.hutool.json.JSONArray;
import cn.hutool.json.JSONObject;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

/**
 * get_node_schema —— 单节点类型的完整结构文档（dsh get_goal 式精确查询）。
 *
 * <p>配置任何节点前模型应先查它：完整字段说明 + JSON 结构示例 + 注意事项。
 * 配合提示词瘦身：系统提示词只带类型目录，详情靠本工具拉取。</p>
 */
@Component
public class GetNodeSchemaToolExecutor implements ToolExecutor {

    private final AgentKnowledgeService knowledgeService;

    public GetNodeSchemaToolExecutor(AgentKnowledgeService knowledgeService) {
        this.knowledgeService = knowledgeService;
    }

    @Override
    public String name() {
        return "get_node_schema";
    }

    @Override
    public ExecutionSurface surface() {
        return ExecutionSurface.BACKEND_ONLY;
    }

    @Override
    public String description() {
        return "获取节点类型的完整字段结构与 JSON 示例";
    }

    @Override
    public ToolResult execute(JSONObject args, AgentRunContext context) {
        String nodeType = args.getStr("nodeType");
        if (nodeType != null) {
            nodeType = nodeType.trim();
        }
        if (!WorkflowDslCanonicalizer.isSupportedType(nodeType)) {
            List<String> types = new ArrayList<>(WorkflowDslCanonicalizer.supportedTypes());
            java.util.Collections.sort(types);
            JSONObject error = new JSONObject()
                .set("code", ToolErrorCode.INVALID_ARGS.name())
                .set("message", "不支持的节点类型：" + nodeType)
                .set("violations", new JSONArray()
                    .add(new JSONObject()
                        .set("path", "nodeType")
                        .set("issue", "不在受支持类型清单内")
                        .set("fix", "可选类型：" + String.join(",", types))));
            return ToolResult.fail(new JSONObject().set("error", error).toString(),
                "不支持的节点类型", ToolErrorCode.INVALID_ARGS);
        }
        AgentKnowledgeService.NodeDoc doc = knowledgeService.getNodeDoc(nodeType);
        if (doc == null) {
            return ToolResult.notFound("节点类型 " + nodeType + " 的文档（知识库未收录，可参考同类节点结构）");
        }
        context.emit("knowledge_retrieved", new JSONObject()
            .set("query", "get_node_schema:" + nodeType)
            .set("hits", new JSONArray()
                .add(new JSONObject()
                    .set("sourceType", "node_doc")
                    .set("sourceId", nodeType)
                    .set("title", doc.title))));
        JSONObject payload = new JSONObject()
            .set("nodeType", nodeType)
            .set("title", doc.title)
            .set("doc", doc.content);
        return ToolResult.ok(payload.toString(), "已返回 " + nodeType + " 的结构文档");
    }
}
