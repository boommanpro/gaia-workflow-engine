/**
 * 新建任务路由契约：不能先导航到裸/chat。
 * 处于已有会话时，AiWorkspace会将裸/chat归一回当前会话；必须直接带上草稿key。
 */
import { act } from 'react';

import { describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';

const agentState = vi.hoisted(() => ({
  currentSessionKey: 'session-current' as string | null,
  sessions: [{ sessionKey: 'session-current', folderId: null, title: '当前任务' }],
  createSession: vi.fn(() => 'draft-new-task'),
}));

vi.mock('../../../agent/AgentContext', () => ({
  useAgent: () => agentState,
}));

vi.mock('../../../i18n', () => ({
  useLanguage: () => {},
  t: (key: string) => key,
}));

vi.mock('../../../ai-workspace/session-scope', () => ({
  getWorkflowOfSession: () => null,
}));

vi.mock('../ProjectRail', () => ({
  ProjectRail: () => null,
}));

const { MemoryRouter } = await import('react-router-dom');
const { AppRail } = await import('../AppRail');

describe('AppRail 新建任务', () => {
  it('在已有会话页点击时要求 Provider 导航到新草稿', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root: Root = createRoot(container);

    act(() => {
      root.render(
        <MemoryRouter initialEntries={['/chat/session-current']}>
          <AppRail />
        </MemoryRouter>
      );
    });

    const newTaskButton = Array.from(container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('shell.newTask')
    );
    expect(newTaskButton).toBeDefined();

    act(() => {
      newTaskButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(agentState.createSession).toHaveBeenCalledWith(undefined, {
      scope: 'chat',
      folderId: null,
      inheritWorkflowCode: null,
      navigateToDraft: true,
    });

    act(() => root.unmount());
    container.remove();
  });
});
