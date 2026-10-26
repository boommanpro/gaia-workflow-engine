/**
 * 试运行校验错误的结构化模型。
 *
 * 此前三道校验关卡的失败都被压成纯字符串（表单校验甚至只剩一句
 * "Form validation failed"，后端 issues 里的 nodeId 被 TS 类型丢弃），
 * 用户无法定位是哪个节点、哪个字段出了问题。这里统一成带 nodeId 的条目，
 * 试运行面板据此渲染可定位的错误列表，画布据此高亮滚动到出错节点。
 */

/** 后端 WorkflowDslValidator.Issue 的线上 JSON 形状（runtime-interface 未声明，运行时存在） */
export interface BackendIssue {
  level?: string;
  code?: string;
  nodeId?: string | null;
  message?: string;
}

/** flowgram 表单校验反馈（form-core FormFeedback 的结构子集） */
export interface FormFeedbackLike {
  path?: string;
  feedbackStatus?: 'error' | 'warning' | 'pending';
  feedbackText?: string;
}

export interface TestRunErrorItem {
  /** 出错节点 id；全局性错误（如缺 start）可能没有 */
  nodeId?: string;
  /** 节点标题（data.title），展示用，避免裸 id 不可读 */
  nodeTitle?: string;
  /** 失败字段路径（表单校验才有，如 inputsValues.url） */
  fieldPath?: string;
  message: string;
  /** 预渲染文本；后端 issues 的 message 已含节点信息，直接透传避免重复拼前缀 */
  text?: string;
}

/** 表单单条反馈 → 错误项；非 error 级或空文案返回 null */
export function formFeedbackToItem(
  nodeId: string,
  nodeTitle: string | undefined,
  feedback: FormFeedbackLike
): TestRunErrorItem | null {
  if (feedback.feedbackStatus === 'warning' || feedback.feedbackStatus === 'pending') {
    return null;
  }
  const message = (feedback.feedbackText || '').trim();
  if (!message) {
    return null;
  }
  return { nodeId, nodeTitle, fieldPath: feedback.path, message };
}

/** 后端 issues → 错误/警告两组条目；message 为空的条目跳过 */
export function backendIssuesToItems(
  issues: BackendIssue[] | undefined,
  titleOf: (nodeId: string) => string | undefined
): { errors: TestRunErrorItem[]; warnings: TestRunErrorItem[] } {
  const errors: TestRunErrorItem[] = [];
  const warnings: TestRunErrorItem[] = [];
  for (const issue of issues || []) {
    const message = (issue?.message || '').trim();
    if (!message) continue;
    const nodeId = issue.nodeId || undefined;
    errorsOrWarnings(issue.level).push({
      nodeId,
      nodeTitle: nodeId ? titleOf(nodeId) : undefined,
      message,
      text: message,
    });
  }
  return { errors, warnings };

  function errorsOrWarnings(level?: string) {
    return level === 'warning' ? warnings : errors;
  }
}

/** 纯字符串错误（后端未带 issues 时的兜底）→ 条目 */
export function messageToItem(message: string): TestRunErrorItem {
  return { message };
}

/** 面板渲染文本：优先预渲染 text，否则按「节点「标题」 字段: 消息」拼装 */
export function itemText(item: TestRunErrorItem): string {
  if (item.text) {
    return item.text;
  }
  const where = item.nodeTitle || item.nodeId;
  const prefix = where ? `节点「${where}」` : '';
  const field = item.fieldPath ? ` ${item.fieldPath}:` : '';
  return `${prefix}${field} ${item.message}`.trim();
}
