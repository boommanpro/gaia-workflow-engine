package cn.boommanpro.gaia.workflow.infra.manage.service;

import cn.boommanpro.gaia.workflow.infra.manage.entity.GaiaWorkflowApi;
import com.baomidou.mybatisplus.extension.service.IService;

import java.util.List;
import java.util.Map;

public interface GaiaWorkflowApiService extends IService<GaiaWorkflowApi> {

    /** 发布：把某工作流当前生效版本发布为一个可调用的 API，返回含明文 Key 的记录 */
    GaiaWorkflowApi publish(String workflowCode, String apiName, String apiDesc);

    /** 下架：status -> 0 */
    void unpublish(String workflowCode);

    /** 重新生成 API Key，返回含明文 Key 的记录 */
    GaiaWorkflowApi regenerateKey(String workflowCode);

    /** 取对外元信息（Key 脱敏），未发布返回 null */
    GaiaWorkflowApi getMeta(String workflowCode);

    /** 取原始记录（含明文 Key），供鉴权拦截器校验 */
    GaiaWorkflowApi getByCodeAndKey(String workflowCode, String apiKey);

    /** 列出所有已发布 API（Key 脱敏） */
    List<GaiaWorkflowApi> listPublished();

    /**
     * 调用数据看板：workflowCode 为 null 时统计全部已发布 API。
     * days 为统计窗口（近 N 天），用于看板的时间范围过滤。
     */
    Map<String, Object> buildStats(String workflowCode, int days);

    /**
     * 看板「最近调用明细」：按时间倒序返回调用记录，支持按 API / 时间窗口 / 状态过滤。
     * status 为 null 时不过滤状态。
     */
    List<Map<String, Object>> recentCalls(String workflowCode, int days, String status, int limit);
}
