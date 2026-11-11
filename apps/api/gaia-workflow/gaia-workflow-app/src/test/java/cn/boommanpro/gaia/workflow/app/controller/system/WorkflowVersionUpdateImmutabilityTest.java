package cn.boommanpro.gaia.workflow.app.controller.system;

import cn.boommanpro.gaia.workflow.app.service.WorkflowDiffService;
import cn.boommanpro.gaia.workflow.app.service.WorkflowDslApplyService;
import cn.boommanpro.gaia.workflow.infra.manage.entity.GaiaWorkflowVersion;
import cn.boommanpro.gaia.workflow.infra.manage.service.GaiaWorkflowVersionService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.ResponseEntity;
import org.mockito.ArgumentCaptor;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * W6 规范债收口（2026-11-08，NC-08「正式版本不可原地改正文」）：
 * PUT /api/workflow-version/update 只放行元数据更新，正文变更必须走 apply 新版本或 set-current 回拨。
 */
class WorkflowVersionUpdateImmutabilityTest {

    private static final String VERSION_DATA = "{\"nodes\":["
        + "{\"id\":\"start_1\",\"type\":\"start\",\"data\":{\"outputs\":{\"type\":\"object\",\"properties\":{\"q\":{\"type\":\"string\"}}}}},"
        + "{\"id\":\"end_1\",\"type\":\"end\",\"data\":{\"inputs\":{\"type\":\"object\",\"properties\":{\"answer\":{\"type\":\"string\"}}}}}"
        + "],\"edges\":[{\"sourceNodeID\":\"start_1\",\"targetNodeID\":\"end_1\"}]}";

    private final GaiaWorkflowVersionService versionService = mock(GaiaWorkflowVersionService.class);
    private final GaiaWorkflowVersionController controller = new GaiaWorkflowVersionController(
        versionService, mock(WorkflowDslApplyService.class), mock(WorkflowDiffService.class));

    private GaiaWorkflowVersion existing() {
        GaiaWorkflowVersion v = new GaiaWorkflowVersion();
        v.setId(7L);
        v.setWorkflowCode("wf_x");
        v.setVersionNumber("1.0");
        v.setWorkflowData(VERSION_DATA);
        return v;
    }

    @Test
    @DisplayName("改写已发布版本正文：422 拒绝且不触库")
    void contentChangeIsRejected() {
        when(versionService.getById(7L)).thenReturn(existing());
        GaiaWorkflowVersion req = existing();
        req.setWorkflowData(VERSION_DATA.replace("\"q\"", "\"q2\""));

        ResponseEntity<?> resp = controller.updateVersion(req);

        assertEquals(422, resp.getStatusCode().value());
        assertFalse((Boolean) ((Map<?, ?>) resp.getBody()).get("success"));
        verify(versionService, never()).updateById(any());
    }

    @Test
    @DisplayName("纯元数据更新（改描述）：放行，且落库实体不带正文")
    void metadataOnlyUpdateStripsWorkflowData() {
        when(versionService.getById(7L)).thenReturn(existing());
        GaiaWorkflowVersion req = new GaiaWorkflowVersion();
        req.setId(7L);
        req.setVersionDesc("新描述");

        ResponseEntity<?> resp = controller.updateVersion(req);

        assertEquals(200, resp.getStatusCode().value());
        ArgumentCaptor<GaiaWorkflowVersion> captor = ArgumentCaptor.forClass(GaiaWorkflowVersion.class);
        verify(versionService).updateById(captor.capture());
        assertNull(captor.getValue().getWorkflowData(), "元数据更新不得携带/触碰 workflowData");
        assertEquals("新描述", captor.getValue().getVersionDesc());
    }

    @Test
    @DisplayName("携带相同正文 + 改描述：视为元数据更新放行（剥离正文）")
    void identicalContentPlusMetadataIsAllowed() {
        when(versionService.getById(7L)).thenReturn(existing());
        GaiaWorkflowVersion req = existing();
        req.setVersionDesc("同内容改描述");

        ResponseEntity<?> resp = controller.updateVersion(req);

        assertEquals(200, resp.getStatusCode().value());
        ArgumentCaptor<GaiaWorkflowVersion> captor = ArgumentCaptor.forClass(GaiaWorkflowVersion.class);
        verify(versionService).updateById(captor.capture());
        assertNull(captor.getValue().getWorkflowData());
    }

    @Test
    @DisplayName("缺 id 或版本不存在：400 拒绝")
    void missingIdOrUnknownVersionIsRejected() {
        assertEquals(400, controller.updateVersion(new GaiaWorkflowVersion()).getStatusCode().value());

        GaiaWorkflowVersion unknown = new GaiaWorkflowVersion();
        unknown.setId(404L);
        when(versionService.getById(404L)).thenReturn(null);
        assertEquals(400, controller.updateVersion(unknown).getStatusCode().value());
        verify(versionService, never()).updateById(any());
    }
}
