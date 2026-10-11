package cn.boommanpro.gaia.workflow.app.controller.system;

import cn.boommanpro.gaia.workflow.infra.manage.entity.AgentKnowledgeChunk;
import cn.boommanpro.gaia.workflow.infra.manage.service.AgentKnowledgeChunkService;
import cn.hutool.json.JSONObject;
import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Agent RAG 知识库管理（检索为关键词匹配，与 AgentKnowledgeService 的打分模型同源）
 */
@org.springframework.web.bind.annotation.RestController
@org.springframework.web.bind.annotation.RequestMapping("/api/agent/knowledge")
public class AgentKnowledgeController {

    private final AgentKnowledgeChunkService chunkService;

    public AgentKnowledgeController(AgentKnowledgeChunkService chunkService) {
        this.chunkService = chunkService;
    }

    /**
     * 列出全部分块，可按关键字过滤（title 或 content LIKE）
     */
    @GetMapping("/list")
    public List<AgentKnowledgeChunk> list(@RequestParam(required = false) String keyword) {
        QueryWrapper<AgentKnowledgeChunk> wrapper = new QueryWrapper<>();
        if (keyword != null && !keyword.isEmpty()) {
            String kw = keyword;
            wrapper.and(w -> w.like("title", kw).or().like("content", kw));
        }
        wrapper.orderByDesc("id");
        return chunkService.list(wrapper);
    }

    /**
     * 根据 id 获取分块
     */
    @GetMapping("/{id}")
    public ResponseEntity<AgentKnowledgeChunk> getById(@PathVariable Long id) {
        AgentKnowledgeChunk chunk = chunkService.getById(id);
        if (chunk == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(chunk);
    }

    /**
     * 新增或更新分块
     */
    @PostMapping("/save")
    public AgentKnowledgeChunk save(@RequestBody AgentKnowledgeChunk chunk) {
        if (chunk.getId() != null) {
            AgentKnowledgeChunk existing = chunkService.getById(chunk.getId());
            if (existing != null) {
                chunk.setCreatedAt(existing.getCreatedAt());
            }
            chunk.setUpdatedAt(LocalDateTime.now().toString());
            chunkService.updateById(chunk);
        } else {
            chunk.setCreatedAt(LocalDateTime.now().toString());
            chunk.setUpdatedAt(LocalDateTime.now().toString());
            chunkService.save(chunk);
        }
        return chunk;
    }

    /**
     * 软删除分块
     */
    @DeleteMapping("/{id}")
    public boolean delete(@PathVariable Long id) {
        return chunkService.removeById(id);
    }

    /**
     * 知识检索（管理端检索预览）：按关键字匹配 title/content
     */
    @PostMapping("/search")
    public List<AgentKnowledgeChunk> search(@RequestBody JSONObject body) {
        String query = body.getStr("query");
        int topK = body.getInt("topK", 5);
        String lang = body.getStr("lang");
        if (query == null || query.trim().isEmpty()) {
            return java.util.Collections.emptyList();
        }
        QueryWrapper<AgentKnowledgeChunk> wrapper = new QueryWrapper<>();
        if (lang != null && !lang.isEmpty()) {
            wrapper.eq("language", lang);
        }
        wrapper.and(w -> w.like("title", query).or().like("content", query))
            .last("LIMIT " + Math.max(1, topK));
        return chunkService.list(wrapper);
    }
}
