package cn.boommanpro.gaia.workflow.app.agent.llm;

/**
 * 流式输出的 token 回调。
 * SSE 场景把它桥接成 token 事件，无头场景直接丢弃即可。
 */
@FunctionalInterface
public interface TokenListener {

    void onToken(String text);
}
