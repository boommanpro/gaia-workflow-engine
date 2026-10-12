package cn.boommanpro.gaia.workflow.app.controller.api;

import cn.boommanpro.gaia.workflow.app.agent.memory.AgentMemoryManager;
import cn.boommanpro.gaia.workflow.infra.manage.entity.AgentMemory;
import cn.boommanpro.gaia.workflow.infra.manage.service.AgentMemoryService;
import cn.hutool.json.JSONObject;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * 记忆管理 API（双层记忆的界面入口，2026-10-11）：
 * GET  /api/agent/memory            两层全量（手写区 + 条目区）
 * PUT  /api/agent/memory/manual     保存手写区
 * DELETE /api/agent/memory/{id}     删除单条条目
 */
@RestController
@RequestMapping("/api/agent/memory")
public class MemoryController {

    private final AgentMemoryManager memoryManager;
    private final AgentMemoryService memoryService;

    public MemoryController(AgentMemoryManager memoryManager, AgentMemoryService memoryService) {
        this.memoryManager = memoryManager;
        this.memoryService = memoryService;
    }

    @GetMapping
    public Map<String, Object> get() {
        List<Map<String, Object>> items = new ArrayList<>();
        for (AgentMemory m : memoryManager.entries()) {
            items.add(new JSONObject()
                .set("id", m.getId())
                .set("content", m.getContent())
                .set("source", m.getSource())
                .set("updatedAt", m.getUpdatedAt()));
        }
        return new JSONObject()
            .set("manual", memoryManager.manualSection() == null ? "" : memoryManager.manualSection())
            .set("items", items);
    }

    @PutMapping("/manual")
    public Map<String, Object> saveManual(@RequestBody Map<String, Object> body) {
        memoryManager.saveManual(body.get("content") != null ? String.valueOf(body.get("content")) : "");
        return new JSONObject().set("success", true);
    }

    @DeleteMapping("/{id}")
    public Map<String, Object> delete(@PathVariable Long id) {
        memoryService.removeById(id);
        return new JSONObject().set("success", true);
    }
}
