package cn.boommanpro.gaia.workflow.app.agent.session;

import cn.hutool.json.JSONObject;

/**
 * 会话事件录制器 —— SessionEventBus.publish 的旁路观察者。
 *
 * <p>用途：把会话事件流（token/thinking/tool_call/…）落成 ndjson，
 * 作为前端回放 fixture 的录制源与「会话审查」的原始证据。
 * 录制失败绝不影响主链路（bus 侧 catch-all）。</p>
 */
public interface SessionEventRecorder {

    void record(String sessionKey, String type, JSONObject data);
}
