package cn.boommanpro.gaia.workflow.app.service;

import cn.boommanpro.gaia.workflow.infra.manage.entity.GaiaWorkflow;
import cn.boommanpro.gaia.workflow.infra.manage.entity.GaiaWorkflowVersion;
import cn.boommanpro.gaia.workflow.infra.manage.service.GaiaWorkflowService;
import cn.boommanpro.gaia.workflow.infra.manage.service.GaiaWorkflowVersionService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.io.Serializable;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * CAS 原子化落版的单测：乐观并发、竞争失败回滚、revision 递增。
 */
class WorkflowDslApplyCasTest {

    private GaiaWorkflowVersionService versionService;
    private GaiaWorkflowService workflowService;
    private WorkflowDslApplyService service;

    /** 模拟条件 UPDATE 的结果：true=revision 匹配成功 */
    private boolean conditionalUpdateSucceeds;

    @BeforeEach
    void setUp() {
        versionService = mock(GaiaWorkflowVersionService.class);
        workflowService = mock(GaiaWorkflowService.class);
        AgentModelConfigService modelConfig = mock(AgentModelConfigService.class);
        when(modelConfig.getLlmConfig()).thenReturn(null);
        WorkflowDiffService diff = mock(WorkflowDiffService.class);
        when(diff.diff(any(), any())).thenReturn(new cn.hutool.json.JSONObject());
        when(diff.isEmpty(any())).thenReturn(true);
        // save 桩回填 id（removeById 断言需要非 null id）
        when(versionService.save(any(GaiaWorkflowVersion.class))).thenAnswer(inv -> {
            ((GaiaWorkflowVersion) inv.getArgument(0)).setId(99L);
            return true;
        });
        service = new WorkflowDslApplyService(versionService, workflowService, modelConfig, diff);

        conditionalUpdateSucceeds = true;
        // update 桩：条件 CAS 的结果由 conditionalUpdateSucceeds 控制
        when(workflowService.update(any(com.baomidou.mybatisplus.core.conditions.update.UpdateWrapper.class)))
            .thenAnswer(inv -> conditionalUpdateSucceeds);
        // getOne 顺序桩：第 1 次（提交前读取）= existing(revision 5)，
        // 第 2 次（提交成功后回读 / 竞争失败重读）= committed(revision 6)
        GaiaWorkflow existing = new GaiaWorkflow();
        existing.setWorkflowCode("wf_a");
        existing.setRevision(5L);
        existing.setCurrentVersionId(11L);
        GaiaWorkflow committed = new GaiaWorkflow();
        committed.setWorkflowCode("wf_a");
        committed.setRevision(6L);
        committed.setCurrentVersionId(12L);
        when(workflowService.getOne(any(com.baomidou.mybatisplus.core.conditions.query.QueryWrapper.class)))
            .thenReturn(existing, committed);
    }

    private static final String DSL = "{\"nodes\":[{\"id\":\"start_0\",\"data\":{\"type\":\"start\"}},"
        + "{\"id\":\"llm_0\",\"data\":{\"type\":\"llm\",\"prompt\":\"总结：{{ start_0.text }}\",\"modelName\":\"m\"}},"
        + "{\"id\":\"end_0\",\"data\":{\"type\":\"end\"}}],"
        + "\"edges\":[{\"sourceNodeID\":\"start_0\",\"targetNodeID\":\"llm_0\"},"
        + "{\"sourceNodeID\":\"llm_0\",\"targetNodeID\":\"end_0\"}]}";

    @Test
    void stalePrecheckRejectsBeforeInsert() {
        WorkflowDslApplyService.ApplyOptions opts = new WorkflowDslApplyService.ApplyOptions();
        opts.setExpectedRevision(4L); // 落后于当前 5

        WorkflowDslApplyService.ApplyResult result = service.apply("wf_a", DSL, opts);

        assertThat(result.isSuccess()).isFalse();
        assertThat(result.isStaleRevision()).isTrue();
        assertThat(result.getActualRevision()).isEqualTo(5L);
        // 快速失败路径：不插入版本行
        verify(versionService, never()).save(any(GaiaWorkflowVersion.class));
    }

    @Test
    void conditionalUpdateRaceLosesRemovesInsertedVersion() {
        conditionalUpdateSucceeds = false; // 模拟并发：CAS UPDATE 影响 0 行
        WorkflowDslApplyService.ApplyOptions opts = new WorkflowDslApplyService.ApplyOptions();
        opts.setExpectedRevision(5L);

        WorkflowDslApplyService.ApplyResult result = service.apply("wf_a", DSL, opts);

        assertThat(result.isSuccess()).isFalse();
        assertThat(result.isStaleRevision()).isTrue();
        // 竞争失败必须回滚刚插入的版本行（不留悬空 is_current 状态）
        verify(versionService, times(1)).removeById(any(Serializable.class));
    }

    @Test
    void happyPathBumpsRevisionAtomically() {
        WorkflowDslApplyService.ApplyOptions opts = new WorkflowDslApplyService.ApplyOptions();
        opts.setExpectedRevision(5L);

        WorkflowDslApplyService.ApplyResult result = service.apply("wf_a", DSL, opts);

        assertThat(result.isSuccess()).isTrue();
        // 提交后 revision 以回读为准（=6）
        assertThat(result.getRevision()).isEqualTo(6L);
        verify(versionService, times(1)).save(any(GaiaWorkflowVersion.class));
        verify(versionService, never()).removeById(any(Serializable.class));
        // 版本落行时先非 current，切换由 CAS 后的 update 完成
        ArgumentCaptor<GaiaWorkflowVersion> captor = ArgumentCaptor.forClass(GaiaWorkflowVersion.class);
        verify(versionService).save(captor.capture());
        assertThat(captor.getValue().getIsCurrent()).isEqualTo(0);
    }
}
