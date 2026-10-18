package cn.boommanpro.gaia.workflow.app.agent.session;

/**
 * ask_user 答案的「新一轮对话」编排 —— 把一次作答变成一轮真正的对话。
 *
 * <p>用户点选/输入（或超时自动代答）后：</p>
 * <ol>
 *   <li>唤醒挂起中的提问工具（旧 run 的调用留档返回）</li>
 *   <li>停止当前 run（协作式中断，主循环在下一检查点退出，答案不回灌旧 run）</li>
 *   <li>答案以用户消息落库并启动新 run —— 模型在新的对话轮里继续</li>
 * </ol>
 *
 * <p>独立成接口是为了打破依赖环（run 服务 → 引擎 → 工具注册表 → ask_user 执行器 → 本编排
 * → run 服务），实现侧用 {@code @Lazy} 注入 run 服务。</p>
 */
public interface AskUserRoundOrchestrator {

    /**
     * 把答案编排成新一轮对话。
     *
     * @param sessionKey   会话 key
     * @param askId        提问 id
     * @param answer       答案文本（用户作答或超时自动选择的选项）
     * @param auto         是否超时自动代答（随 ask_resolved 事件外发，前端据此标注）
     * @param awaitRunExit 是否等旧 run 完全退出后再落库答案：用户作答路径传 true
     *                     （保证「提问 run 的收尾行 → 答案用户行」的叙事顺序，
     *                     否则答案气泡会插在提问卡前面）；执行器超时路径自身就在
     *                     run 线程里，等待会自锁，必须传 false
     * @return 提问不存在/已失效返回 false（404 语义）
     */
    boolean startRound(String sessionKey, String askId, String answer, boolean auto, boolean awaitRunExit);
}
