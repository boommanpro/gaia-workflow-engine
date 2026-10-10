package cn.boommanpro.gaia.workflow.app.service;

import cn.boommanpro.gaia.workflow.infra.manage.entity.AgentConfig;
import cn.boommanpro.gaia.workflow.infra.manage.entity.AgentKnowledgeChunk;
import cn.boommanpro.gaia.workflow.infra.manage.service.AgentConfigService;
import cn.boommanpro.gaia.workflow.infra.manage.service.AgentKnowledgeChunkService;
import cn.hutool.json.JSONArray;
import cn.hutool.json.JSONObject;
import cn.hutool.json.JSONUtil;
import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;

/**
 * 统一知识检索 —— 把「节点文档 / RAG 分块」收进一个带来源归因的检索入口。
 *
 * <p>v2 知识策略从「全量注入提示词」改为「按需拉取」（对齐 dsh 的 pull 模式）：
 * 模型在需要时调 search_knowledge / get_node_schema，检索结果带 sourceType + sourceId，
 * 每次检索都产生 knowledge_retrieved 事件（归因闭环：知道了什么知识被用掉）。</p>
 *
 * <p>评分用轻量关键词模型（中英混合分词 + bigram 命中计分），
 * 不依赖 embedding 服务可用性；embedding 命中时作为加分项排序。</p>
 */
@Slf4j
@Service
public class AgentKnowledgeService {

    private final AgentConfigService configService;
    private final AgentKnowledgeChunkService chunkService;
    private final EmbeddingService embeddingService;

    public AgentKnowledgeService(AgentConfigService configService,
                                 AgentKnowledgeChunkService chunkService,
                                 EmbeddingService embeddingService) {
        this.configService = configService;
        this.chunkService = chunkService;
        this.embeddingService = embeddingService;
    }

    /** 一条知识命中 */
    public static class Hit {
        public String sourceType;   // node_doc / rag_chunk
        public String sourceId;     // nodeType 或 chunk id
        public String title;
        public String snippet;      // 截断正文
        public double score;
    }

    /** 节点文档条目（agent_config node_knowledge 行的解析形态） */
    public static class NodeDoc {
        public String nodeType;
        public String title;
        public String content;
    }

    /**
     * 检索知识：节点文档 + RAG 分块，按得分取 topK。
     */
    public List<Hit> search(String query, Integer topK) {
        int k = topK != null && topK > 0 ? Math.min(topK, 8) : 5;
        List<Hit> hits = new ArrayList<>();
        hits.addAll(searchNodeDocs(query));
        hits.addAll(searchRagChunks(query));
        hits.sort((a, b) -> Double.compare(b.score, a.score));
        return hits.size() > k ? hits.subList(0, k) : hits;
    }

    /** 按类型精确取节点文档（get_node_schema 用） */
    public NodeDoc getNodeDoc(String nodeType) {
        for (NodeDoc doc : listNodeDocs()) {
            if (doc.nodeType.equalsIgnoreCase(nodeType)) {
                return doc;
            }
        }
        return null;
    }

    /** 全部节点文档（提示词目录生成 / 校验指引用） */
    public List<NodeDoc> listNodeDocs() {
        List<NodeDoc> docs = new ArrayList<>();
        try {
            List<AgentConfig> configs = configService.list(
                new QueryWrapper<AgentConfig>().eq("config_type", "node_knowledge"));
            if (configs == null) {
                return docs;
            }
            for (AgentConfig config : configs) {
                String key = config.getConfigKey();
                String content = config.getContent();
                if (key == null || content == null || content.trim().isEmpty()) {
                    continue;
                }
                // key 形如 node_start / node_llm / node_start.en；跳过英文变体
                if (key.endsWith(".en")) {
                    continue;
                }
                String nodeType = key.startsWith("node_") ? key.substring("node_".length()) : key;
                NodeDoc doc = new NodeDoc();
                doc.nodeType = nodeType;
                doc.title = config.getTitle() != null ? config.getTitle() : nodeType;
                doc.content = content.trim();
                docs.add(doc);
            }
        } catch (Exception e) {
            log.warn("[knowledge] list node docs failed: {}", e.getMessage());
        }
        return docs;
    }

    /** 节点类型目录（提示词瘦身注入用：type + 标题一句话） */
    public String nodeTypeCatalog() {
        List<NodeDoc> docs = listNodeDocs();
        if (docs.isEmpty()) {
            return null;
        }
        StringBuilder sb = new StringBuilder();
        for (NodeDoc doc : docs) {
            sb.append("- `").append(doc.nodeType).append("`：")
                .append(oneLine(doc.title)).append('\n');
        }
        return sb.toString();
    }

    // ---------------- 内部：检索实现 ----------------

    private List<Hit> searchNodeDocs(String query) {
        List<Hit> hits = new ArrayList<>();
        Set<String> terms = tokenize(query);
        if (terms.isEmpty()) {
            return hits;
        }
        for (NodeDoc doc : listNodeDocs()) {
            double score = score(terms, doc.nodeType + " " + doc.title + " " + doc.content);
            if (score <= 0) {
                continue;
            }
            // 节点文档是结构化知识，命中即给高权重
            Hit hit = new Hit();
            hit.sourceType = "node_doc";
            hit.sourceId = doc.nodeType;
            hit.title = doc.title;
            hit.snippet = snippet(doc.content);
            hit.score = score * 2;
            hits.add(hit);
        }
        return hits;
    }

    private List<Hit> searchRagChunks(String query) {
        List<Hit> hits = new ArrayList<>();
        Set<String> terms = tokenize(query);
        if (terms.isEmpty()) {
            return hits;
        }
        try {
            List<AgentKnowledgeChunk> chunks = chunkService.list(
                new QueryWrapper<AgentKnowledgeChunk>().eq("is_deleted", 0));
            for (AgentKnowledgeChunk chunk : chunks) {
                double score = score(terms, chunk.getTitle() + " " + chunk.getContent());
                if (score <= 0) {
                    continue;
                }
                // 向量相似度加分（embedding 可用且分块已有向量时）
                if (embeddingService.isAvailable() && chunk.getEmbedding() != null) {
                    try {
                        double[] queryVec = embeddingService.embed(query);
                        double[] chunkVec = embeddingService.jsonToEmbedding(chunk.getEmbedding());
                        if (queryVec != null && chunkVec != null) {
                            score += cosine(queryVec, chunkVec) * 2;
                        }
                    } catch (Exception ignore) {
                        // 向量加分失败不影响关键词得分
                    }
                }
                Hit hit = new Hit();
                hit.sourceType = "rag_chunk";
                hit.sourceId = String.valueOf(chunk.getId());
                hit.title = chunk.getTitle();
                hit.snippet = snippet(chunk.getContent());
                hit.score = score;
                hits.add(hit);
            }
        } catch (Exception e) {
            log.warn("[knowledge] rag search failed: {}", e.getMessage());
        }
        return hits;
    }

    // ---------------- 内部：打分 / 分词 ----------------

    /** 关键词命中率得分：命中词数 / 查询词数 为主，重复出现轻微加权 */
    private static double score(Set<String> terms, String text) {
        if (text == null || text.isEmpty() || terms.isEmpty()) {
            return 0;
        }
        String lower = text.toLowerCase(Locale.ROOT);
        int matched = 0;
        double weight = 0;
        for (String term : terms) {
            int idx = lower.indexOf(term);
            if (idx >= 0) {
                matched++;
                int count = 1;
                int from = idx + term.length();
                while (count < 5) {
                    int next = lower.indexOf(term, from);
                    if (next < 0) {
                        break;
                    }
                    count++;
                    from = next + term.length();
                }
                weight += 1 + (count - 1) * 0.1;
            }
        }
        if (matched == 0) {
            return 0;
        }
        return weight * (matched / (double) terms.size());
    }

    /** 混合分词：英文按词、中文按 2-gram，去停用词 */
    static Set<String> tokenize(String text) {
        Set<String> tokens = new LinkedHashSet<>();
        if (text == null || text.trim().isEmpty()) {
            return tokens;
        }
        String lower = text.toLowerCase(Locale.ROOT).replaceAll("[\\p{Punct}]+", " ");
        for (String word : lower.split("\\s+")) {
            if (word.length() >= 2 && word.matches("[a-z0-9]+") && !STOP_WORDS.contains(word)) {
                tokens.add(word);
            }
        }
        // 中文 2-gram
        StringBuilder cjk = new StringBuilder();
        for (char c : lower.toCharArray()) {
            if (c >= 0x4e00 && c <= 0x9fff) {
                cjk.append(c);
            } else {
                appendBigrams(tokens, cjk.toString());
                cjk.setLength(0);
            }
        }
        appendBigrams(tokens, cjk.toString());
        return tokens;
    }

    private static void appendBigrams(Set<String> tokens, String cjk) {
        if (cjk.length() < 2) {
            return;
        }
        for (int i = 0; i < cjk.length() - 1; i++) {
            tokens.add(cjk.substring(i, i + 2));
        }
    }

    private static final Set<String> STOP_WORDS = new LinkedHashSet<>(java.util.Arrays.asList(
        "the", "a", "an", "of", "to", "and", "or", "is", "are", "how", "what",
        "的", "了", "在", "是", "我", "有", "和", "就", "不", "人", "都", "一"));

    private static double cosine(double[] a, double[] b) {
        int n = Math.min(a.length, b.length);
        double dot = 0;
        double na = 0;
        double nb = 0;
        for (int i = 0; i < n; i++) {
            dot += a[i] * b[i];
            na += a[i] * a[i];
            nb += b[i] * b[i];
        }
        if (na == 0 || nb == 0) {
            return 0;
        }
        return dot / (Math.sqrt(na) * Math.sqrt(nb));
    }

    private static String snippet(String content) {
        if (content == null) {
            return "";
        }
        String compact = content.trim();
        return compact.length() > 600 ? compact.substring(0, 600) + "…（完整内容用 get_node_schema 查看）" : compact;
    }

    private static String oneLine(String title) {
        if (title == null) {
            return "";
        }
        // "Start 节点（开始节点）" → "Start 节点（开始节点）"，只去换行保一行
        return title.replaceAll("[\\r\\n]+", " ").trim();
    }

    /** Hit 列表转 JSON（工具 payload 用） */
    public static JSONArray hitsToJson(List<Hit> hits) {
        JSONArray array = new JSONArray();
        for (Hit hit : hits) {
            JSONObject item = new JSONObject()
                .set("sourceType", hit.sourceType)
                .set("sourceId", hit.sourceId)
                .set("title", hit.title)
                .set("snippet", hit.snippet)
                .set("score", Math.round(hit.score * 100) / 100.0);
            array.add(item);
        }
        return array;
    }

    /** 便捷：hits 是否包含某 nodeType 的节点文档 */
    public static boolean containsNodeDoc(List<Hit> hits, String nodeType) {
        for (Hit hit : hits) {
            if ("node_doc".equals(hit.sourceType) && hit.sourceId.equals(nodeType)) {
                return true;
            }
        }
        return false;
    }

    /** 解析用（避免未使用告警的占位） */
    static JSONObject noop() {
        return JSONUtil.parseObj("{}");
    }
}
