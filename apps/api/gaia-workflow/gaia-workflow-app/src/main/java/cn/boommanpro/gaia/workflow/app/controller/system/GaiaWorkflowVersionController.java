package cn.boommanpro.gaia.workflow.app.controller.system;

import cn.boommanpro.gaia.workflow.infra.manage.entity.GaiaWorkflow;
import cn.boommanpro.gaia.workflow.infra.manage.entity.GaiaWorkflowVersion;
import cn.boommanpro.gaia.workflow.infra.manage.service.GaiaWorkflowService;
import cn.boommanpro.gaia.workflow.infra.manage.service.GaiaWorkflowVersionService;
import cn.boommanpro.gaia.workflow.app.service.WorkflowDslApplyService;
import cn.boommanpro.gaia.workflow.app.service.WorkflowDslValidator;
import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.UpdateWrapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
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
    private final cn.boommanpro.gaia.workflow.app.service.WorkflowDiffService diffService;
    @Autowired
    private GaiaWorkflowService gaiaWorkflowService;

    public GaiaWorkflowVersionController(GaiaWorkflowVersionService workflowVersionService,
                                          WorkflowDslApplyService dslApplyService,
                                          cn.boommanpro.gaia.workflow.app.service.WorkflowDiffService diffService) {
        this.workflowVersionService = workflowVersionService;
        this.dslApplyService = dslApplyService;
        this.diffService = diffService;
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
     * 版本差异（v2）：落版时已计算存 diff_json；为空（旧版本）时现场计算。
     *
     * <p>响应附带 nodeTitles（前后两版合并的 nodeId→标题映射）：diff 数组只存 id 列表，
     * 前端渲染明细需要标题（removed 节点的标题只存在于旧版数据里）。</p>
     */
    @GetMapping("/diff/{id}")
    public Map<String, Object> versionDiff(@PathVariable Long id) {
        GaiaWorkflowVersion version = workflowVersionService.getById(id);
        Map<String, Object> result = new HashMap<>();
        if (version == null) {
            result.put("error", "version not found");
            return result;
        }
        result.put("workflowCode", version.getWorkflowCode());
        result.put("versionNumber", version.getVersionNumber());

        // 找上一版数据：优先给 diff 明细提供 removed 节点的标题来源
        List<GaiaWorkflowVersion> versions = workflowVersionService.list(
            new QueryWrapper<GaiaWorkflowVersion>()
                .eq("workflow_code", version.getWorkflowCode())
                .orderByDesc("created_at"));
        String previous = null;
        String previousVersionNumber = null;
        boolean seenSelf = false;
        for (GaiaWorkflowVersion v : versions) {
            if (seenSelf) {
                previous = v.getWorkflowData();
                previousVersionNumber = v.getVersionNumber();
                break;
            }
            if (v.getId().equals(version.getId())) {
                seenSelf = true;
            }
        }
        result.put("previousVersionNumber", previousVersionNumber);

        if (version.getDiffJson() != null && !version.getDiffJson().isEmpty()) {
            result.put("diff", cn.hutool.json.JSONUtil.parseObj(version.getDiffJson()));
        } else {
            // 旧版本无存档 diff：现场与上一版本对比
            result.put("diff", diffService.diff(previous, version.getWorkflowData()));
        }

        Map<String, String> titles = new HashMap<>();
        collectNodeTitles(previous, titles);
        collectNodeTitles(version.getWorkflowData(), titles);
        result.put("nodeTitles", titles);
        return result;
    }

    /** 从 DSL 提取 nodeId→标题（data.title 缺省回退 id），收集进 titles */
    private void collectNodeTitles(String dsl, Map<String, String> titles) {
        if (dsl == null || dsl.trim().isEmpty()) {
            return;
        }
        try {
            cn.hutool.json.JSONArray nodes = cn.hutool.json.JSONUtil.parseObj(dsl).getJSONArray("nodes");
            if (nodes == null) {
                return;
            }
            for (int i = 0; i < nodes.size(); i++) {
                cn.hutool.json.JSONObject node = nodes.getJSONObject(i);
                if (node == null || node.getStr("id") == null) {
                    continue;
                }
                String id = node.getStr("id");
                String title = id;
                cn.hutool.json.JSONObject data = node.getJSONObject("data");
                if (data != null && data.getStr("title") != null && !data.getStr("title").trim().isEmpty()) {
                    title = data.getStr("title");
                }
                titles.putIfAbsent(id, title);
            }
        } catch (Exception ignore) {
            // 不可解析按无标题处理，明细渲染回退 id
        }
    }

    /**
     * 创建新版本（编辑器手动保存通道）。
     *
     * <p>2026-10-16 起：这是最后一条免校验写入通道——保存前过 {@link WorkflowDslValidator}，
     * error 级问题（未知类型/环/悬空边/引用悬空/语义缺失）返回 422 并带结构化 issues，
     * 不再让脏 schema 落库后到执行期才炸。</p>
     */
    @PostMapping("/create")
    public ResponseEntity<?> createVersion(@RequestBody GaiaWorkflowVersion version) {
        List<WorkflowDslValidator.Issue> issues =
            WorkflowDslValidator.validate(version.getWorkflowData());
        if (WorkflowDslValidator.hasErrors(issues)) {
            return reject(issues);
        }
        version.setCreatedAt(LocalDateTime.now());
        version.setIsCurrent(0);
        return ResponseEntity.ok(workflowVersionService.save(version));
    }

    /**
     * 更新版本：workflowData 有变更时同样过校验（防 PUT 直改绕过门禁）。
     */
    @PutMapping("/update")
    public ResponseEntity<?> updateVersion(@RequestBody GaiaWorkflowVersion version) {
        if (version.getWorkflowData() != null) {
            List<WorkflowDslValidator.Issue> issues =
                WorkflowDslValidator.validate(version.getWorkflowData());
            if (WorkflowDslValidator.hasErrors(issues)) {
                return reject(issues);
            }
        }
        return ResponseEntity.ok(workflowVersionService.updateById(version));
    }

    /**
     * 删除版本
     */
    @DeleteMapping("/delete/{id}")
    public boolean deleteVersion(@PathVariable Long id) {
        return workflowVersionService.removeById(id);
    }

    /**
     * 设置为当前版本。切换生效版本 = 生效内容变更，目标版本必须先过校验——
     * 任意手工 POST 的坏 JSON 版本不能再被设为生效版本后到执行期才失败。
     */
    @PutMapping("/set-current/{id}")
    public ResponseEntity<?> setCurrentVersion(@PathVariable Long id) {
        // 先将该工作流下的所有版本设为非当前版本
        GaiaWorkflowVersion version = workflowVersionService.getById(id);
        if (version == null) {
            return ResponseEntity.ok(false);
        }
        List<WorkflowDslValidator.Issue> issues =
            WorkflowDslValidator.validate(version.getWorkflowData());
        if (WorkflowDslValidator.hasErrors(issues)) {
            return reject(issues);
        }
        // 切换生效版本 = 生效内容变更：revision 必须同步递增，
        // 否则切换前读取的 CAS 基准（revision 未变）仍会被认作新鲜，并发覆盖生效版本
        gaiaWorkflowService.update(new UpdateWrapper<GaiaWorkflow>()
            .eq("workflow_code", version.getWorkflowCode())
            .set("current_version_id", id)
            .setSql("revision = revision + 1")
            .set("updated_at", java.time.LocalDateTime.now()));
        workflowVersionService.update(
            new com.baomidou.mybatisplus.core.conditions.update.UpdateWrapper<GaiaWorkflowVersion>()
                .eq("workflow_code", version.getWorkflowCode())
                .set("is_current", 0)
        );

        // 再将指定版本设为当前版本
        return ResponseEntity.ok(workflowVersionService.update(
            new com.baomidou.mybatisplus.core.conditions.update.UpdateWrapper<GaiaWorkflowVersion>()
                .eq("id", id)
                .set("is_current", 1)
        ));
    }

    /** 校验失败：422 + 结构化 issues（前端 extractError 会读 error 字段直接展示） */
    private static ResponseEntity<Map<String, Object>> reject(List<WorkflowDslValidator.Issue> issues) {
        Map<String, Object> body = new HashMap<>();
        body.put("success", false);
        body.put("error", "工作流校验未通过，未保存：" + WorkflowDslValidator.errorSummary(issues));
        body.put("issues", issues);
        return ResponseEntity.unprocessableEntity().body(body);
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
