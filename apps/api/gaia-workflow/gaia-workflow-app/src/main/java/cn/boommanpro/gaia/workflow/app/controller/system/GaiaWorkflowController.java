package cn.boommanpro.gaia.workflow.app.controller.system;

import cn.boommanpro.gaia.workflow.app.agent.session.SessionWorkflowStore;
import cn.boommanpro.gaia.workflow.infra.manage.entity.GaiaWorkflow;
import cn.boommanpro.gaia.workflow.infra.manage.entity.GaiaWorkflowTemplate;
import cn.boommanpro.gaia.workflow.infra.manage.entity.GaiaWorkflowVersion;
import cn.boommanpro.gaia.workflow.infra.manage.service.GaiaWorkflowService;
import cn.boommanpro.gaia.workflow.infra.manage.service.GaiaWorkflowTemplateService;
import cn.boommanpro.gaia.workflow.infra.manage.service.GaiaWorkflowVersionService;
import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/workflow")
public class GaiaWorkflowController {

    private final GaiaWorkflowService workflowService;

    private final GaiaWorkflowTemplateService templateService;

    private final GaiaWorkflowVersionService versionService;

    public GaiaWorkflowController(GaiaWorkflowService workflowService,
                                  @Qualifier("gaiaWorkflowTemplateAppService") GaiaWorkflowTemplateService templateService,
                                  GaiaWorkflowVersionService versionService) {
        this.workflowService = workflowService;
        this.templateService = templateService;
        this.versionService = versionService;
    }

    /**
     * 获取所有工作流列表（会话草稿工作流 source=session 不展示）
     */
    @GetMapping("/list")
    public List<GaiaWorkflow> listWorkflows() {
        return workflowService.list(new QueryWrapper<GaiaWorkflow>()
            .and(w -> w.ne("source", SessionWorkflowStore.SOURCE_SESSION).or().isNull("source")));
    }

    /**
     * 根据ID获取工作流详情
     */
    @GetMapping("/{id}")
    public GaiaWorkflow getWorkflowById(@PathVariable Long id) {
        return workflowService.getById(id);
    }

    /**
     * 根据工作流编码获取工作流详情
     */
    @GetMapping("/code/{workflowCode}")
    public GaiaWorkflow getWorkflowByCode(@PathVariable String workflowCode) {
        return workflowService.getOne(
            new com.baomidou.mybatisplus.core.conditions.query.QueryWrapper<GaiaWorkflow>()
                .eq("workflow_code", workflowCode)
                .eq("is_deleted", 0)
        );
    }

    /**
     * 子流程（workflow 节点）可选工作流清单。
     *
     * <p>返回每个正式工作流的 code/name/description + 从当前生效版本提取的入出参 schema：
     * 入参 = start 节点 data.outputs（工作流的输入参数定义），
     * 出参 = end 节点 data.inputs（工作流的输出参数声明）。
     * 前端子流程节点选择器此前打的是不存在的 GET /workflows（永远 404 空列表），
     * 本端点是它的正式替代。</p>
     */
    @GetMapping("/subflow-options")
    public List<Map<String, Object>> subflowOptions() {
        List<Map<String, Object>> options = new java.util.ArrayList<>();
        for (GaiaWorkflow workflow : listWorkflows()) {
            Map<String, Object> option = new java.util.LinkedHashMap<>();
            option.put("code", workflow.getWorkflowCode());
            option.put("name", workflow.getWorkflowName());
            option.put("description", workflow.getWorkflowDesc());
            option.put("currentVersionId", workflow.getCurrentVersionId());
            option.put("inputs", extractNodeSchema(workflow, "start", "outputs"));
            option.put("outputs", extractNodeSchema(workflow, "end", "inputs"));
            options.add(option);
        }
        return options;
    }

    /**
     * 从工作流当前生效版本数据里提取指定类型节点的 schema 字段。
     * 找不到节点或字段时返回空 object schema（选择器侧统一按无参数处理）。
     */
    private Object extractNodeSchema(GaiaWorkflow workflow, String nodeType, String schemaField) {
        try {
            if (workflow.getCurrentVersionId() == null) {
                return EMPTY_OBJECT_SCHEMA;
            }
            GaiaWorkflowVersion version = versionService.getById(workflow.getCurrentVersionId());
            if (version == null || version.getWorkflowData() == null) {
                return EMPTY_OBJECT_SCHEMA;
            }
            cn.hutool.json.JSONArray nodes = cn.hutool.json.JSONUtil.parseObj(version.getWorkflowData())
                .getJSONArray("nodes");
            if (nodes == null) {
                return EMPTY_OBJECT_SCHEMA;
            }
            for (int i = 0; i < nodes.size(); i++) {
                cn.hutool.json.JSONObject node = nodes.getJSONObject(i);
                if (node != null && nodeType.equals(node.getStr("type"))) {
                    cn.hutool.json.JSONObject data = node.getJSONObject("data");
                    if (data != null && data.get(schemaField) != null) {
                        return data.get(schemaField);
                    }
                }
            }
        } catch (Exception e) {
            // 单个工作流解析失败不拖垮整份清单，按无参数处理
        }
        return EMPTY_OBJECT_SCHEMA;
    }

    private static final Map<String, Object> EMPTY_OBJECT_SCHEMA =
        Map.of("type", "object", "properties", Map.of());


    /**
     * 创建新工作流
     * 始终创建初始版本：有模板则用模板数据，无模板则用最小默认数据
     */
    @PostMapping("/create")
    public ResponseEntity<?> createWorkflow(@RequestBody GaiaWorkflow workflow) {
        // 编码必填
        if (workflow.getWorkflowCode() == null || workflow.getWorkflowCode().trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "工作流编码不能为空"));
        }
        workflow.setWorkflowCode(workflow.getWorkflowCode().trim());

        // 编码唯一校验：workflow_code 在库中全局唯一，先查再写，避免落库时唯一索引冲突抛 500
        GaiaWorkflow existed = workflowService.getOne(
            new QueryWrapper<GaiaWorkflow>()
                .eq("workflow_code", workflow.getWorkflowCode())
                .last("LIMIT 1")
        );
        if (existed != null) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(Map.of("message", "工作流编码已存在: " + workflow.getWorkflowCode()));
        }

        // 保存工作流
        workflow.setCreatedAt(LocalDateTime.now());
        workflow.setUpdatedAt(LocalDateTime.now());
        boolean workflowSaved = workflowService.save(workflow);

        if (!workflowSaved) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("message", "创建工作流失败"));
        }

        // 确定初始版本数据来源
        String versionDesc;
        String workflowData;

        if (workflow.getTemplateCode() != null) {
            // 根据模板编码查找模板
            GaiaWorkflowTemplate template = templateService.getOne(
                new com.baomidou.mybatisplus.core.conditions.query.QueryWrapper<GaiaWorkflowTemplate>()
                    .eq("template_code", workflow.getTemplateCode())
                    .eq("is_deleted", 0)
            );

            if (template != null) {
                versionDesc = "基于模板 [" + template.getTemplateName() + "] 创建的初始版本";
                workflowData = template.getTemplateData();
            } else {
                versionDesc = "初始版本";
                workflowData = DEFAULT_WORKFLOW_DATA;
            }
        } else {
            versionDesc = "初始版本";
            workflowData = DEFAULT_WORKFLOW_DATA;
        }

        // 创建初始版本
        GaiaWorkflowVersion version = new GaiaWorkflowVersion();
        version.setWorkflowCode(workflow.getWorkflowCode());
        version.setVersionNumber("v1.0");
        version.setVersionDesc(versionDesc);
        version.setWorkflowData(workflowData);
        version.setCreatedBy("system");
        version.setIsCurrent(1);
        version.setCreatedAt(LocalDateTime.now());

        boolean versionSaved = versionService.save(version);

        if (versionSaved) {
            // 更新工作流的当前版本ID
            workflow.setCurrentVersionId(version.getId());
            workflowService.updateById(workflow);
        }

        return ResponseEntity.ok(true);
    }

    /**
     * 新工作流的默认最小数据：包含 Start 与 End 节点
     * Start 节点定义 query 入参（string），End 节点直接引用并返回 start_0.query
     */
    private static final String DEFAULT_WORKFLOW_DATA =
        "{\"nodes\":[" +
        "{\"id\":\"start_0\",\"type\":\"start\",\"meta\":{\"position\":{\"x\":180,\"y\":200}}," +
        "\"data\":{\"title\":\"Start\",\"description\":\"start node\"," +
        "\"outputs\":{\"type\":\"object\",\"properties\":{\"query\":{\"type\":\"string\",\"default\":\"Hello Flow.\"}}}}}," +
        "{\"id\":\"end_0\",\"type\":\"end\",\"meta\":{\"position\":{\"x\":180,\"y\":420}}," +
        "\"data\":{\"title\":\"End\",\"description\":\"end node\"," +
        "\"inputsValues\":{\"query\":{\"type\":\"ref\",\"content\":[\"start_0\",\"query\"]}}," +
        "\"inputs\":{\"properties\":{\"query\":{\"type\":\"string\"}}}}}" +
        "],\"edges\":[{\"sourceNodeID\":\"start_0\",\"targetNodeID\":\"end_0\"}]}";

    /**
     * 更新工作流元数据（名称/描述）。
     * 2026-10-16 起收紧：工作流必须存在；currentVersionId/revision 是并发控制字段，
     * 不允许经本接口绕过 CAS 任意改写（要切换生效版本走 set-current，它有过校验门禁）。
     */
    @PutMapping("/update")
    public org.springframework.http.ResponseEntity<java.util.Map<String, Object>> updateWorkflow(
        @RequestBody GaiaWorkflow workflow) {
        java.util.Map<String, Object> result = new java.util.HashMap<>();
        if (workflow == null || workflow.getId() == null
            || workflowService.getById(workflow.getId()) == null) {
            result.put("success", false);
            result.put("error", "工作流不存在或缺少 id");
            return org.springframework.http.ResponseEntity.unprocessableEntity().body(result);
        }
        workflow.setCurrentVersionId(null);
        workflow.setRevision(null);
        workflow.setUpdatedAt(LocalDateTime.now());
        boolean updated = workflowService.updateById(workflow);
        if (updated) {
            // folder_id 允许置空（移出项目）：MyBatis-Plus 默认跳过 null 字段，需显式 set。
            // 本接口的唯一调用方（工作流管理编辑弹窗）始终携带 folderId 提交。
            workflowService.update(new com.baomidou.mybatisplus.core.conditions.update.UpdateWrapper<GaiaWorkflow>()
                .eq("id", workflow.getId())
                .set("folder_id", workflow.getFolderId()));
        }
        result.put("success", updated);
        return org.springframework.http.ResponseEntity.ok(result);
    }

    /**
     * 删除工作流
     */
    @DeleteMapping("/delete/{id}")
    public boolean deleteWorkflow(@PathVariable Long id) {
        return workflowService.removeById(id);
    }
}
