package cn.boommanpro.gaia.workflow.app.agent.tool.impl;

import cn.boommanpro.gaia.workflow.app.agent.core.AgentRunContext;
import cn.boommanpro.gaia.workflow.app.agent.core.ExecutionSurface;
import cn.boommanpro.gaia.workflow.app.agent.tool.ToolExecutor;
import cn.boommanpro.gaia.workflow.app.agent.tool.ToolResult;
import cn.boommanpro.gaia.workflow.app.service.AgentKnowledgeService;
import cn.hutool.json.JSONArray;
import cn.hutool.json.JSONObject;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * search_knowledge —— 统一知识检索（dsh web_search / session_search 的对应物）。
 *
 * <p>知识从「全量注入提示词」改为按需拉取；每次检索发 knowledge_retrieved 事件，
 * 归因「模型实际用到哪些知识」。</p>
 */
@Component
public class SearchKnowledgeToolExecutor implements ToolExecutor {

    private final AgentKnowledgeService knowledgeService;

    public SearchKnowledgeToolExecutor(AgentKnowledgeService knowledgeService) {
        this.knowledgeService = knowledgeService;
    }

    @Override
    public String name() {
        return "search_knowledge";
    }

    @Override
    public ExecutionSurface surface() {
        return ExecutionSurface.BACKEND_ONLY;
    }

    @Override
    public String description() {
        return "检索节点文档与知识库（用法/示例/最佳实践）";
    }

    @Override
    public boolean concurrencySafe() {
        // 纯读工具：可与其他读并发执行（dsh isConcurrencySafe 语义）
        return true;
    }

    @Override
    public ToolResult execute(JSONObject args, AgentRunContext context) {
        String query = args.getStr("query");
        Integer topK = args.getInt("topK");
        List<AgentKnowledgeService.Hit> hits = knowledgeService.search(query, topK);
        JSONArray results = AgentKnowledgeService.hitsToJson(hits);

        // 归因事件：知道了什么知识被检索（事件日志持久化，供知识使用率分析）
        context.emit("knowledge_retrieved", new JSONObject()
            .set("query", query)
            .set("hits", results));

        if (hits.isEmpty()) {
            return ToolResult.ok(new JSONObject()
                .set("results", results)
                .set("hint", "没有命中知识。节点配置字段可用 get_node_schema(nodeType) 精确查询").toString(),
                "未命中知识");
        }
        JSONObject payload = new JSONObject()
            .set("results", results)
            .set("hint", "sourceType=node_doc 的是节点结构文档（含 JSON 示例），需要全文用 get_node_schema");
        return ToolResult.ok(payload.toString(), "命中 " + hits.size() + " 条知识");
    }
}
