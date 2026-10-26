/**
 * 试运行校验错误结构化模型的单元测试。
 *
 * 对应修复：三道校验关卡（表单 / task.validate / task.run 预检）此前把失败
 * 压成纯字符串，用户无法定位出错节点；这些纯函数负责把各关卡的原始反馈
 * 统一成带 nodeId 的条目，供面板渲染定位按钮、画布自动聚焦。
 */
import { describe, expect, it } from 'vitest';

import {
  backendIssuesToItems,
  formFeedbackToItem,
  itemText,
  messageToItem,
} from '../validation-errors';

describe('formFeedbackToItem', () => {
  it('保留 error 级反馈并映射节点/字段信息', () => {
    expect(
      formFeedbackToItem('llm_1', '总结', {
        path: 'inputsValues.prompt',
        feedbackStatus: 'error',
        feedbackText: 'Field is required',
      })
    ).toEqual({
      nodeId: 'llm_1',
      nodeTitle: '总结',
      fieldPath: 'inputsValues.prompt',
      message: 'Field is required',
    });
  });

  it('过滤 warning/pending 级反馈（不拦试运行）', () => {
    expect(
      formFeedbackToItem('n', undefined, { feedbackStatus: 'warning', feedbackText: 'x' })
    ).toBeNull();
    expect(
      formFeedbackToItem('n', undefined, { feedbackStatus: 'pending', feedbackText: 'x' })
    ).toBeNull();
  });

  it('过滤空文案反馈', () => {
    expect(
      formFeedbackToItem('n', undefined, { feedbackStatus: 'error', feedbackText: '  ' })
    ).toBeNull();
    expect(formFeedbackToItem('n', undefined, { feedbackStatus: 'error' })).toBeNull();
  });
});

describe('backendIssuesToItems', () => {
  const titleOf = (id: string) => (id === 'http_1' ? '抓取网页' : undefined);

  it('按 level 分组并补节点标题', () => {
    const { errors, warnings } = backendIssuesToItems(
      [
        { level: 'error', code: 'INVALID_PARAM', nodeId: 'http_1', message: '参数结构不合法' },
        {
          level: 'warning',
          code: 'UNREACHABLE_NODE',
          nodeId: 'code_9',
          message: '从 start 不可达',
        },
      ],
      titleOf
    );
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatchObject({
      nodeId: 'http_1',
      nodeTitle: '抓取网页',
      message: '参数结构不合法',
      text: '参数结构不合法',
    });
    expect(warnings).toHaveLength(1);
    expect(warnings[0].nodeId).toBe('code_9');
    expect(warnings[0].nodeTitle).toBeUndefined();
  });

  it('level 缺失按 error 处理（后端只有 error/warning 两级）', () => {
    const { errors, warnings } = backendIssuesToItems(
      [{ nodeId: null, message: '缺少 start 节点：工作流没有入口' }],
      titleOf
    );
    expect(errors).toHaveLength(1);
    expect(errors[0].nodeId).toBeUndefined();
    expect(warnings).toHaveLength(0);
  });

  it('空 message 条目跳过', () => {
    const { errors } = backendIssuesToItems(
      [
        { level: 'error', message: '  ' },
        { level: 'error', nodeId: 'x', message: 'ok' },
      ],
      titleOf
    );
    expect(errors).toHaveLength(1);
    expect(errors[0].nodeId).toBe('x');
  });
});

describe('itemText', () => {
  it('有预渲染文本（后端 issues）时直接使用，不重复拼节点前缀', () => {
    expect(itemText({ message: 'x', text: '节点 http_1（http）参数结构不合法：…' })).toBe(
      '节点 http_1（http）参数结构不合法：…'
    );
  });

  it('表单反馈按「节点「标题」 字段: 消息」拼装', () => {
    expect(
      itemText({
        nodeId: 'llm_1',
        nodeTitle: '总结',
        fieldPath: 'inputsValues.prompt',
        message: 'Field is required',
      })
    ).toBe('节点「总结」 inputsValues.prompt: Field is required');
  });

  it('标题缺失时回落节点 id；都没有时只剩消息', () => {
    expect(itemText({ nodeId: 'llm_1', message: 'boom' })).toBe('节点「llm_1」 boom');
    expect(itemText(messageToItem('Internal Server Error'))).toBe('Internal Server Error');
  });
});
