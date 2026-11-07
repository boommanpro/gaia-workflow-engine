package cn.boommanpro.gaia.workflow.app.service;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * 2026-11-05 节点描述字段契约：全部 node-schemas 根级补声明可选 string description
 * （前端画布/侧栏可双击编辑、可清空）。背景：编辑器一直写 data.description，而 schema
 * 根级 additionalProperties:false —— 用户改过描述的草稿在发布/试跑 S3 校验会被
 * INVALID_PARAM 打回。守卫三点：可选字段放行、类型错误拒绝、未知字段仍拒绝（不降校验强度）。
 */
class NodeSchemaDescriptionOptionalTest {

    @Test
    @DisplayName("description 可选放行 / 类型错误拒绝 / 未知字段仍拒绝")
    void descriptionOptionalButStrict() {
        // ① 带 description 的合法 data 通过（发布链路不再被 INVALID_PARAM 拦截）
        List<String> ok = NodeSchemaRegistry.validateParams(
            "code",
            "{\"title\":\"格式化\",\"description\":\"画布展示用说明\",\"script\":{\"language\":\"javascript\",\"content\":\"return 1\"}}");
        assertThat(ok).isEmpty();

        // ② 类型错误仍拒绝
        assertThat(NodeSchemaRegistry.validateParams("code", "{\"description\":1}")).isNotEmpty();
        assertThat(NodeSchemaRegistry.validateParams("llm", "{\"description\":[]}")).isNotEmpty();

        // ③ 未知字段仍拒绝——补声明 description 不降低契约严格性（拼错字段名照样拦截）
        assertThat(NodeSchemaRegistry.validateParams("code", "{\"unknownField\":1}")).isNotEmpty();
        assertThat(NodeSchemaRegistry.validateParams("http", "{\"descrption\":\"拼错字段\"}"))
            .isNotEmpty();
    }
}
