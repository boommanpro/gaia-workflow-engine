package cn.boommanpro.gaia.workflow.app.controller.system;

import cn.boommanpro.gaia.workflow.app.service.AgentToolRegistry;
import cn.boommanpro.gaia.workflow.infra.manage.entity.AgentToolDefinition;
import cn.boommanpro.gaia.workflow.infra.manage.service.AgentToolDefinitionService;
import cn.hutool.json.JSONArray;
import cn.hutool.json.JSONObject;
import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Agent 工具定义管理：在线管理工具 schema / 默认策略 / 页面上下文
 */
@Slf4j
@RestController
@RequestMapping("/api/agent/tool-definition")
public class AgentToolDefinitionController {

    private final AgentToolDefinitionService toolDefinitionService;
    private final AgentToolRegistry toolRegistry;

    public AgentToolDefinitionController(AgentToolDefinitionService toolDefinitionService,
                                         AgentToolRegistry toolRegistry) {
        this.toolDefinitionService = toolDefinitionService;
        this.toolRegistry = toolRegistry;
    }

    /**
     * 列出全部工具定义（含禁用），可按 toolGroup 过滤
     */
    @GetMapping("/list")
    public List<AgentToolDefinition> list(@RequestParam(required = false) String toolGroup) {
        QueryWrapper<AgentToolDefinition> wrapper = new QueryWrapper<>();
        if (toolGroup != null && !toolGroup.isEmpty()) {
            wrapper.eq("tool_group", toolGroup);
        }
        wrapper.orderByAsc("sort_order", "id");
        return toolDefinitionService.list(wrapper);
    }

    /**
     * 按 toolName 获取单个工具定义
     */
    @GetMapping("/{toolName}")
    public ResponseEntity<AgentToolDefinition> get(@PathVariable String toolName) {
        AgentToolDefinition def = toolDefinitionService.getOne(
            new QueryWrapper<AgentToolDefinition>().eq("tool_name", toolName));
        if (def == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(def);
    }

    /**
     * 新增或更新工具定义（按 toolName upsert），保存后热刷新注册中心
     */
    @PostMapping("/save")
    public AgentToolDefinition save(@RequestBody AgentToolDefinition def) {
        String now = LocalDateTime.now().toString();
        AgentToolDefinition existing = toolDefinitionService.getOne(
            new QueryWrapper<AgentToolDefinition>().eq("tool_name", def.getToolName()));
        if (existing != null) {
            def.setId(existing.getId());
            def.setCreatedAt(existing.getCreatedAt());
            def.setUpdatedAt(now);
            toolDefinitionService.updateById(def);
            log.info("Updated agent tool definition [{}]", def.getToolName());
        } else {
            def.setCreatedAt(now);
            def.setUpdatedAt(now);
            toolDefinitionService.save(def);
            log.info("Created agent tool definition [{}]", def.getToolName());
        }
        toolRegistry.refresh();
        return def;
    }

    /**
     * 仅切换启停（其余字段不动）：工具目录行开关与 MCP 工具管理共用。
     * 不走 /save —— 那是整实体 upsert，只传 enabled 会把 NOT NULL 的 parameters 冲掉。
     */
    @PutMapping("/{toolName}/enabled")
    public java.util.Map<String, Object> toggleEnabled(@PathVariable String toolName,
                                                       @RequestBody java.util.Map<String, Object> body) {
        boolean enabled = Boolean.TRUE.equals(body.get("enabled"));
        AgentToolDefinition existing = toolDefinitionService.getOne(
            new QueryWrapper<AgentToolDefinition>().eq("tool_name", toolName));
        if (existing == null) {
            return java.util.Map.of("ok", false, "error", "工具不存在: " + toolName);
        }
        existing.setEnabled(enabled ? 1 : 0);
        existing.setUpdatedAt(java.time.LocalDateTime.now().toString());
        toolDefinitionService.updateById(existing);
        toolRegistry.refresh();
        return java.util.Map.of("ok", true, "enabled", enabled);
    }

    /**
     * 按 toolName 软删除，删除后热刷新注册中心
     */
    @DeleteMapping("/{toolName}")
    public boolean delete(@PathVariable String toolName) {
        boolean removed = toolDefinitionService.remove(
            new QueryWrapper<AgentToolDefinition>().eq("tool_name", toolName));
        toolRegistry.refresh();
        return removed;
    }

    /**
     * 手动触发热刷新
     */
    @PostMapping("/refresh")
    public JSONObject refresh() {
        toolRegistry.refresh();
        return new JSONObject().set("success", true);
    }

    /**
     * 获取当前工具 schema，可选 pageContext 过滤
     */
    @GetMapping("/schema")
    public JSONArray schema(@RequestParam(required = false) String pageContext) {
        if (pageContext != null && !pageContext.isEmpty()) {
            return toolRegistry.getToolsSchema(pageContext);
        }
        return toolRegistry.getToolsSchema();
    }
}
