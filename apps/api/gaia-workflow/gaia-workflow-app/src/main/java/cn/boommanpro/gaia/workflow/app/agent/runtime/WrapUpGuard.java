package cn.boommanpro.gaia.workflow.app.agent.runtime;

/**
 * 失控防护计数器（自然停止的安全网，语义对齐旧自研引擎的 wrap-up 轮）。
 *
 * <p>弱模型实测会以略微不同的参数绕过复读护栏无限循环（2026-10-10 实测 105 轮）。
 * 触发条件后不砍 run，而是收走工具（后续工具调用直接拒绝并附收尾指令），
 * 让模型用正文总结：已完成的内容、当前状态、还需要用户提供什么。</p>
 *
 * <p>两个触发条件（任一满足即触发，只触发一次）：</p>
 * <ul>
 *   <li>{@code runawayTurnCeiling}：模型轮次触顶（正常长任务的富余量）；</li>
 *   <li>{@code noProgressTurnLimit}：连续 N 轮「有工具调用但全部失败/被拒」，
 *       任一工具成功即归零。</li>
 * </ul>
 */
public class WrapUpGuard {

    private final int turnCeiling;
    private final int noProgressLimit;

    private int turns;
    private int noProgressStreak;
    private boolean turnHadAnyToolCall;
    private boolean turnHadProgress;
    private boolean wrappedUp;

    public WrapUpGuard(int turnCeiling, int noProgressLimit) {
        this.turnCeiling = Math.max(1, turnCeiling);
        this.noProgressLimit = Math.max(1, noProgressLimit);
    }

    /** 一个模型轮开始（对应一次 LLM 调用结束后的下一轮边界） */
    public void onModelTurn() {
        if (turns > 0 && turnHadAnyToolCall && !turnHadProgress) {
            noProgressStreak++;
        } else if (turnHadProgress) {
            noProgressStreak = 0;
        }
        turnHadAnyToolCall = false;
        turnHadProgress = false;
        turns++;
        if (!wrappedUp && (turns >= turnCeiling || noProgressStreak >= noProgressLimit)) {
            wrappedUp = true;
        }
    }

    /** 工具调用到达（无论成败都说明模型仍在尝试） */
    public void onToolCall() {
        turnHadAnyToolCall = true;
    }

    /** 工具结果落地：成功即本轮有进展 */
    public void onToolResult(boolean success) {
        turnHadAnyToolCall = true;
        if (success) {
            turnHadProgress = true;
        }
    }

    public boolean isWrappedUp() {
        return wrappedUp;
    }

    /** 收尾指令：作为工具拒绝结果与 wrap_up 事件附带，指令模型用正文总结 */
    public String advisory() {
        return "系统护栏：本次运行已进行 " + turns
            + " 轮（连续无进展 " + noProgressStreak + " 轮），"
            + "请停止调用工具，直接用正文向用户总结：已完成的内容、当前状态、还需要用户提供什么。";
    }

    public int getTurns() {
        return turns;
    }

    public int getNoProgressStreak() {
        return noProgressStreak;
    }
}
