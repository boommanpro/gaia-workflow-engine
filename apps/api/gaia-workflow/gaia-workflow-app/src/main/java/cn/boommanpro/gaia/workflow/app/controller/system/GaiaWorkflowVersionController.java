package cn.boommanpro.gaia.workflow.app.controller.system;

import cn.boommanpro.gaia.workflow.infra.manage.entity.GaiaWorkflow;
import cn.boommanpro.gaia.workflow.infra.manage.entity.GaiaWorkflowVersion;
import cn.boommanpro.gaia.workflow.infra.manage.service.GaiaWorkflowService;
import cn.boommanpro.gaia.workflow.infra.manage.service.GaiaWorkflowVersionService;
import cn.boommanpro.gaia.workflow.app.service.WorkflowDslApplyService;
import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.UpdateWrapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/workflow-version")
public class GaiaWorkflowVersionController {

    private final GaiaWorkflowVersionService workflowVersionService;
    private final WorkflowDslApplyService dslApplyService;
    @Autowired
    private GaiaWorkflowService gaiaWorkflowService;

    public GaiaWorkflowVersionController(GaiaWorkflowVersionService workflowVersionService,
                                          WorkflowDslApplyService dslApplyService) {
        this.workflowVersionService = workflowVersionService;
        this.dslApplyService = dslApplyService;
        }

    /**
     * 获取指定工作流的所有版本列表
     */
    @GetMapping("/list/{workflowCode}")
    public List<GaiaWorkflowVersion> listVersionsByWorkflowCode(@PathVariable String workflowCode) {
        return workflowVersionService.list(
            new com.baomidou.mybatisplus.core.conditions.query.QueryWrapper<GaiaWorkflowVersion>()
                .eq("workflow_code", workflowCode)
                    .orderByDesc("created_at")
        );
    }

    /**
     * 根据ID获取版本详情
     */
    @GetMapping("/{id}")
    public GaiaWorkflowVersion getVersionById(@PathVariable Long id) {
        return workflowVersionService.getById(id);
    }

    /**
     * 创建新版本
     */
    @PostMapping("/create")
    public boolean createVersion(@RequestBody GaiaWorkflowVersion version) {
        version.setCreatedAt(LocalDateTime.now());
        version.setIsCurrent(0);
        return workflowVersionService.save(version);
    }

    /**
     * 更新版本
     */
    @PutMapping("/update")
    public boolean updateVersion(@RequestBody GaiaWorkflowVersion version) {
        return workflowVersionService.updateById(version);
    }

    /**
     * 删除版本
     */
    @DeleteMapping("/delete/{id}")
    public boolean deleteVersion(@PathVariable Long id) {
        return workflowVersionService.removeById(id);
    }

    /**
     * 设置为当前版本
     */
    @PutMapping("/set-current/{id}")
    public boolean setCurrentVersion(@PathVariable Long id) {
        // 先将该工作流下的所有版本设为非当前版本
        GaiaWorkflowVersion version = workflowVersionService.getById(id);
        gaiaWorkflowService.update(new UpdateWrapper<GaiaWorkflow>().eq("workflow_code", version.getWorkflowCode()).set("current_version_id", id));
        if (version != null) {
            workflowVersionService.update(
                new com.baomidou.mybatisplus.core.conditions.update.UpdateWrapper<GaiaWorkflowVersion>()
                    .eq("workflow_code", version.getWorkflowCode())
                    .set("is_current", 0)
            );

            // 再将指定版本设为当前版本
            return workflowVersionService.update(
                new com.baomidou.mybatisplus.core.conditions.update.UpdateWrapper<GaiaWorkflowVersion>()
                    .eq("id", id)
                    .set("is_current", 1)
            );
        }
        return false;
    }

    // ==================================================================
    // AI 一次成型：整份 DSL 直接落版
    // 实际逻辑已收敛到 WorkflowDslApplyService，Controller 与 Agent 工具共用同一份实现。
    // ==================================================================

    /**
     * 把一份完整的工作流 DSL 直接写成一个新版本并设为生效版本。
     *
     * <p>这是「以 AI 为核心主视角、工作流为最终产物」的关键落版通道：
     * AI 一次性产出完整 {nodes, edges} 后，不需要再拆成 N 次
     * addNode / connect 往返，一次调用即可成型 + 落版。</p>
     *
     * <p>请求体：
     * <pre>
     * {
     *   "dsl": { "nodes": [...], "edges": [...] },   // 或 "workflowData": "JSON 字符串"
     *   "workflowName": "可选，工作流不存在时用它命名",
     *   "versionDesc": "可选，版本描述",
     *   "createIfMissing": true                       // 可选，默认 true
     * }
     * </pre>
     */
    @PostMapping("/apply/{workflowCode}")
    public Map<String, Object> applyDsl(@PathVariable String workflowCode,
                                        @RequestBody Map<String, Object> body) {
        if (body == null) {
            Map<String, Object> empty = new HashMap<>();
            empty.put("success", false);
            empty.put("error", "request body is required");
            return empty;
        }

        Object dsl = body.get("dsl");
        if (dsl == null) {
            dsl = body.get("workflowData");
        }
        if (dsl == null) {
            Map<String, Object> empty = new HashMap<>();
            empty.put("success", false);
            empty.put("error", "either 'dsl' or 'workflowData' is required");
            return empty;
        }

        WorkflowDslApplyService.ApplyOptions options = new WorkflowDslApplyService.ApplyOptions();
        if (body.get("workflowName") != null) {
            options.setWorkflowName(String.valueOf(body.get("workflowName")));
        }
        if (body.get("workflowDesc") != null) {
            options.setWorkflowDesc(String.valueOf(body.get("workflowDesc")));
        }
        if (body.get("versionDesc") != null) {
            options.setVersionDesc(String.valueOf(body.get("versionDesc")));
        }
        if (body.get("createIfMissing") != null) {
            options.setCreateIfMissing(Boolean.parseBoolean(String.valueOf(body.get("createIfMissing"))));
        }

        return WorkflowDslApplyService.toMap(dslApplyService.apply(workflowCode, dsl, options));
    }
}
