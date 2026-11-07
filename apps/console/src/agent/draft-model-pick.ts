/**
 * 草稿会话（draft-）的模型选择暂存 —— 审计 A14。
 *
 * 欢迎页/新任务阶段 currentSessionKey 是本地 draft- 伪键，服务端会话尚不存在，
 * setSessionModel 必 404。这里先把选择存进模块级 Map，等 sendMessage 物化出
 * 真实会话后由 AgentContext 取出并真正生效。
 */
const picks = new Map<string, number | null>();

export const draftModelPick = {
  set(draftKey: string, modelId: number | null): void {
    picks.set(draftKey, modelId);
  },
  /** 取走（读后即清），物化时消费一次 */
  take(draftKey: string): number | null | undefined {
    const v = picks.get(draftKey);
    picks.delete(draftKey);
    return v;
  },
  get(draftKey: string): number | null | undefined {
    return picks.get(draftKey);
  },
};
