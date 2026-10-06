package cn.boommanpro.gaia.workflow.app.agent.ark;

import cn.boommanpro.gaia.workflow.app.service.AgentProviderConfigService;
import cn.hutool.json.JSONArray;
import cn.hutool.json.JSONObject;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.MethodOrderer.OrderAnnotation;
import org.junit.jupiter.api.Order;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestMethodOrder;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;

import java.util.concurrent.TimeUnit;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * 方舟 Managed Agents 真实 API 冒烟测试 —— 仅验证资源创建链路（Agent / Skill 挂载 / Session），
 * <b>绝不发送 user.message、不触发模型调用与 token 消耗</b>。
 *
 * <p>双保险开关，普通构建与 CI 不会触发：</p>
 * <ul>
 *   <li>{@code ARK_LIVE_TEST=true}</li>
 *   <li>{@code ARK_API_KEY=<方舟 Key>}（以及可选 ARK_MODEL_ID / ARK_ENVIRONMENT_ID / ARK_SKILL_ID）</li>
 * </ul>
 *
 * <p>费用说明：Agent/Skill/Environment 均为免费配置资源；创建 Session 会初始化沙箱实例，
 * 测试在查询状态后立即 DELETE 释放，把可能的沙箱时长计费压到秒级。</p>
 */
@EnabledIfEnvironmentVariable(named = "ARK_LIVE_TEST", matches = "true")
@EnabledIfEnvironmentVariable(named = "ARK_API_KEY", matches = ".+")
@TestMethodOrder(OrderAnnotation.class)
@DisplayName("方舟真实 API 冒烟（无对话、无 token 消耗）")
class ArkManagedClientLiveTest {

    private static final AgentProviderConfigService.ArkConfig CFG = buildConfig();

    private static AgentProviderConfigService.ArkConfig buildConfig() {
        AgentProviderConfigService.ArkConfig cfg = new AgentProviderConfigService.ArkConfig();
        cfg.setBaseUrl(System.getenv().getOrDefault("ARK_BASE_URL", "https://ark.cn-beijing.volces.com/api/v3"));
        cfg.setApiKey(System.getenv("ARK_API_KEY"));
        cfg.setEnvironmentId(System.getenv("ARK_ENVIRONMENT_ID"));
        cfg.setConnectTimeoutMs(15000);
        cfg.setReadTimeoutMs(60000);
        return cfg;
    }

    private final ArkManagedClient client = new ArkManagedClient();

    private static volatile String createdAgentId;
    private static volatile int createdVersion;

    @Test
    @Order(1)
    @DisplayName("鉴权与读路径：列出 Agent / Environment")
    void listResources() {
        JSONObject agents = client.listAgents(CFG, 20);
        System.out.println("[live] agents count=" + agents.getJSONArray("data").size());
        assertNotNull(agents.getJSONArray("data"));

        if (CFG.getEnvironmentId() != null && !CFG.getEnvironmentId().isEmpty()) {
            JSONObject envs = client.listEnvironments(CFG);
            boolean found = envs.getJSONArray("data").stream()
                .anyMatch(e -> CFG.getEnvironmentId().equals(((JSONObject) e).getStr("id")));
            assertTrue(found, "配置的 Environment 不存在: " + CFG.getEnvironmentId());
            System.out.println("[live] environment ok: " + CFG.getEnvironmentId());
        }
    }

    @Test
    @Order(2)
    @DisplayName("创建 Agent：模型 + 自定义工具声明")
    void createAgent() {
        String modelId = System.getenv().getOrDefault("ARK_MODEL_ID", "doubao-seed-2-1-pro-260628");
        JSONArray required = new JSONArray();
        required.add("order_id");
        JSONArray tools = new JSONArray();
        tools.add(new JSONObject()
            .set("type", "custom")
            .set("name", "query_order")
            .set("description", "根据订单 ID 查询订单状态（冒烟测试声明）")
            .set("input_schema", new JSONObject()
                .set("type", "object")
                .set("properties", new JSONObject().set("order_id", new JSONObject()
                    .set("type", "string").set("description", "订单 ID")))
                .set("required", required)
                .set("additionalProperties", false)));
        JSONObject body = new JSONObject()
            .set("name", "gaia-ark-smoke-test")
            .set("description", "Gaia 接入冒烟测试 Agent（可删除）")
            .set("model", new JSONObject().set("id", modelId))
            .set("system", "你是 Gaia 工作流平台的冒烟测试助手。只做简单应答，不要调用任何工具。")
            .set("tools", tools);

        JSONObject created = client.createAgent(CFG, body.toString());
        createdAgentId = created.getStr("id");
        createdVersion = created.getInt("version", 1);
        System.out.println("[live] agent created: " + createdAgentId + " v" + createdVersion);
        assertNotNull(createdAgentId);
        assertTrue(createdAgentId.startsWith("agent-"));
    }

    @Test
    @Order(3)
    @DisplayName("更新 Agent：版本乐观锁 + 挂载 Skill")
    void updateAgentWithSkill() {
        assertNotNull(createdAgentId, "依赖 createAgent 先执行");

        JSONObject body = new JSONObject()
            .set("version", createdVersion)
            .set("system", "你是 Gaia 工作流平台的冒烟测试助手（v2）。只做简单应答，不要调用任何工具。");
        String skillId = System.getenv("ARK_SKILL_ID");
        if (skillId != null && !skillId.isEmpty()) {
            JSONArray skills = new JSONArray();
            skills.add(new JSONObject()
                .set("type", "custom").set("skill_id", skillId).set("version", "1"));
            body.set("skills", skills);
        }

        JSONObject updated = client.updateAgent(CFG, createdAgentId, body.toString());
        int newVersion = updated.getInt("version");
        System.out.println("[live] agent updated: " + createdAgentId + " v" + createdVersion + " → v" + newVersion
            + (skillId != null ? " (挂载 skill " + skillId + ")" : " (无 skill)"));
        assertTrue(newVersion > createdVersion, "更新后版本号应递增");
        createdVersion = newVersion;
    }

    @Test
    @Order(4)
    @DisplayName("列表校验：新建 Agent 可查且版本一致")
    void verifyViaList() {
        assertNotNull(createdAgentId, "依赖 createAgent 先执行");
        JSONObject page = client.listAgents(CFG, 50);
        JSONObject found = null;
        for (Object item : page.getJSONArray("data")) {
            JSONObject agent = (JSONObject) item;
            if (createdAgentId.equals(agent.getStr("id"))) {
                found = agent;
                break;
            }
        }
        assertNotNull(found, "列表中未找到刚创建的 Agent");
        assertEquals(createdVersion, found.getInt("version").intValue());
        System.out.println("[live] agent verified via list: " + createdAgentId + " v" + found.getInt("version"));
    }

    @Test
    @Order(5)
    @DisplayName("创建 Session → 查状态 → 立即删除释放沙箱（无对话）")
    void sessionLifecycle() throws Exception {
        assertNotNull(createdAgentId, "依赖 createAgent 先执行");

        JSONObject created = client.createSession(CFG, createdAgentId, null, "gaia-smoke-lifecycle");
        String sessionId = created.getStr("id");
        System.out.println("[live] session created: " + sessionId + " status=" + created.getStr("status"));
        assertNotNull(sessionId);
        assertTrue(sessionId.startsWith("sesn-"));

        // 轮询 1-2 次看状态机推进（initializing → idle），总时长控制在 ~40s 内
        String status = created.getStr("status", "");
        for (int i = 0; i < 4 && !"idle".equals(status) && !"terminated".equals(status); i++) {
            TimeUnit.SECONDS.sleep(10);
            JSONObject current = client.getSession(CFG, sessionId);
            status = current.getStr("status", "");
            System.out.println("[live] session status poll #" + (i + 1) + ": " + status);
        }

        client.deleteSession(CFG, sessionId);
        System.out.println("[live] session deleted（沙箱已释放）: " + sessionId);
    }
}
