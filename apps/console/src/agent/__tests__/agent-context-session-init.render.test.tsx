/**
 * 初始化会话列表与新建草稿可以并发：慢返回的列表不能覆盖用户刚创建的 draft- 会话。
 */
import { act, useEffect } from 'react';

import { describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';

const apiState = vi.hoisted(() => {
  let resolveSessions!: (sessions: any[]) => void;
  const listSessions = new Promise<any[]>((resolve) => {
    resolveSessions = resolve;
  });
  return {
    resolveSessions,
    agentApi: {
      listSessions: vi.fn(() => listSessions),
      listConfigs: vi.fn(async () => []),
      listFolders: vi.fn(async () => []),
      getMessages: vi.fn(async () => []),
      getSessionRuns: vi.fn(async () => []),
      getTurnUsage: vi.fn(async () => []),
      getArtifacts: vi.fn(async () => []),
      getSessionDocument: vi.fn(async () => null),
      getDebugData: vi.fn(async () => ''),
    },
  };
});

vi.mock('../api', () => ({ agentApi: apiState.agentApi }));
vi.mock('../sse-client', () => ({ subscribeSessionEvents: vi.fn(async () => {}) }));

const { MemoryRouter, useLocation } = await import('react-router-dom');
const { AgentProvider, useAgent } = await import('../AgentContext');

function DraftCreator({
  onReady,
  navigateToDraft = false,
}: {
  onReady: (create: () => Promise<string>) => void;
  navigateToDraft?: boolean;
}) {
  const { createSession, currentSessionKey } = useAgent();
  useEffect(
    () => onReady(() => createSession(undefined, { navigateToDraft })),
    [createSession, navigateToDraft, onReady]
  );
  return <output data-testid="current-session">{currentSessionKey}</output>;
}

function LocationProbe() {
  const location = useLocation();
  return <output data-testid="location">{JSON.stringify(location)}</output>;
}

describe('AgentProvider 会话初始化', () => {
  it('列表请求慢返回时保留已创建的草稿会话', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root: Root = createRoot(container);
    let createDraft: (() => Promise<string>) | undefined;

    await act(async () => {
      root.render(
        <MemoryRouter initialEntries={['/chat/session-existing']}>
          <AgentProvider>
            <DraftCreator onReady={(create) => (createDraft = create)} />
          </AgentProvider>
        </MemoryRouter>
      );
    });

    expect(createDraft).toBeDefined();
    await act(async () => {
      await createDraft?.();
    });
    expect(container.querySelector('[data-testid="current-session"]')?.textContent).toMatch(
      /^draft-/
    );

    await act(async () => {
      apiState.resolveSessions([{ sessionKey: 'session-existing', title: '已有任务' }]);
      await Promise.resolve();
    });

    expect(container.querySelector('[data-testid="current-session"]')?.textContent).toMatch(
      /^draft-/
    );

    act(() => root.unmount());
    container.remove();
  });

  it('新任务由 Provider 先导航到带标记的草稿地址', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root: Root = createRoot(container);
    let createDraft: (() => Promise<string>) | undefined;

    await act(async () => {
      root.render(
        <MemoryRouter initialEntries={['/chat/session-existing']}>
          <AgentProvider>
            <DraftCreator navigateToDraft onReady={(create) => (createDraft = create)} />
            <LocationProbe />
          </AgentProvider>
        </MemoryRouter>
      );
    });

    await act(async () => {
      await createDraft?.();
    });
    expect(
      JSON.parse(container.querySelector('[data-testid="location"]')?.textContent || '{}')
    ).toMatchObject({
      pathname: expect.stringMatching(/^\/chat\/draft-/),
      state: { newTaskDraft: true },
    });

    act(() => root.unmount());
    container.remove();
  });
});
