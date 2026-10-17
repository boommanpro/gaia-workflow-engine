package cn.boommanpro.gaia.workflow.app.service;

import cn.boommanpro.gaia.workflow.infra.manage.entity.GaiaWorkflow;
import cn.boommanpro.gaia.workflow.infra.manage.entity.GaiaWorkflowVersion;
import cn.boommanpro.gaia.workflow.infra.extend.node.workflow.WorkflowNode;
import cn.boommanpro.gaia.workflow.infra.manage.service.GaiaWorkflowService;
import cn.boommanpro.gaia.workflow.infra.manage.service.GaiaWorkflowVersionService;
import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import javax.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

/**
 * 把 {@link WorkflowNode.WorkflowSchemaResolver} 钩子接到 DB 服务上。
 *
 * <p>节点实现在 infra（无 Spring/无 DB），通过静态钩子 inverted dependency；
 * 本桥在启动时注册，resolve 语义：优先按 workflowCode 查当前生效版本，
 * 其次按数值 id 查版本行。解析失败返回 null，由节点侧给出明确报错。</p>
 */
@Slf4j
@Component
public class WorkflowSchemaResolverBridge {

    private final GaiaWorkflowService workflowService;
    private final GaiaWorkflowVersionService versionService;

    public WorkflowSchemaResolverBridge(GaiaWorkflowService workflowService,
                                        GaiaWorkflowVersionService versionService) {
        this.workflowService = workflowService;
        this.versionService = versionService;
    }

    @PostConstruct
    public void register() {
        WorkflowNode.setSchemaResolver(this::resolve);
        log.info("[workflow-node] 已注册目标工作流 schema 解析器");
    }

    /** 按 workflowCode 或版本 id 解析目标工作流 schema（找不到返回 null） */
    public String resolve(String workflowId) {
        if (workflowId == null || workflowId.isBlank()) {
            return null;
        }
        // 1) 按 workflowCode 查当前生效版本
        GaiaWorkflow workflow = workflowService.getOne(
            new QueryWrapper<GaiaWorkflow>().eq("workflow_code", workflowId).last("LIMIT 1"));
        if (workflow != null && workflow.getCurrentVersionId() != null) {
            GaiaWorkflowVersion version = versionService.getById(workflow.getCurrentVersionId());
            if (version != null && version.getWorkflowData() != null) {
                return version.getWorkflowData();
            }
        }
        // 2) 数值 id：按版本行查
        if (workflowId.chars().allMatch(Character::isDigit)) {
            try {
                GaiaWorkflowVersion version = versionService.getById(Long.parseLong(workflowId));
                if (version != null && version.getWorkflowData() != null) {
                    return version.getWorkflowData();
                }
            } catch (NumberFormatException ignored) {
                // 超长数字串等异常情况按不存在处理
            }
        }
        return null;
    }
}
