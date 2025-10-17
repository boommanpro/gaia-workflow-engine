/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import React from 'react';

import { expect } from 'vitest';
import { describe, it } from 'vitest';
import { ContainerModule, injectable, interfaces } from 'inversify';
import { renderHook } from '@testing-library/react-hooks';
import { Emitter } from '@flowgram.ai/utils';

import {
  useEntities,
  useConfigEntity,
  useEntityDataFromContext,
  useEntityFromContext,
  useListenEvents,
  usePlaygroundContext,
  useRefresh,
  useService,
} from '../src/react-hooks';
import {
  PlaygroundEntityContext,
  PlaygroundReactContainerContext,
  PlaygroundReactContext,
  PlaygroundReactProvider,
  PlaygroundReactRenderer,
} from '../src/react';
import { createPlaygroundContainer } from '../src/playground-container';
import { Playground } from '../src/playground';
import { ConfigEntity, createConfigDataRegistry } from '../src/common';
import { createPlayground } from '../__mocks__/playground-container.mock';

class MockEntity extends ConfigEntity {
  public mockType: string = 'mock-entity';

  change() {
    this.fireChange();
  }
}

@injectable()
class MockService {
  invoked = false;

  setInvoked() {
    this.invoked = true;
  }
}

const mockContainerModule = new ContainerModule((bind) => {
  bind(MockService).toSelf().inSingletonScope();
});

const modules: interfaces.ContainerModule[] = [mockContainerModule];

// 构建环境，保证 hook 内部的 usePlaygroundContainer 能获取到值
const wrapper = ({ children }: { children: any }) => (
  <PlaygroundReactProvider containerModules={modules}>
    <PlaygroundReactRenderer>
      <PlaygroundReactContext.Provider value={{ a: 1 }}>{children}</PlaygroundReactContext.Provider>
    </PlaygroundReactRenderer>
  </PlaygroundReactProvider>
);

describe('react-hooks', () => {
  it('use-entities', () => {
    const playground = createPlayground();
    playground.entityManager.registerEntity(MockEntity);
    const entity = new MockEntity({
      entityManager: playground.entityManager,
    });
    renderHook(() => useEntities(MockEntity), { wrapper });
    playground.entityManager.fireEntityChanged(entity);
  });

  it('use-entity', () => {
    const { result } = renderHook(() => useConfigEntity<MockEntity>(MockEntity), { wrapper });
    expect(result.current?.mockType).toEqual('mock-entity');
    // 调用 firechange
    const prevVersion = result.current?.version;
    result.current?.change();
    // 触发 onEntityChange，version + 1
    expect(result.current?.version).toEqual(prevVersion + 1);
  });

  it('use-entity-from-context', () => {
    const playground = createPlayground();
    playground.entityManager.registerEntity(MockEntity);
    const entity = new MockEntity({
      entityManager: playground.entityManager,
    });
    const playgroundEntityContextWrapper = ({ children }: { children: any }) => (
      <PlaygroundEntityContext.Provider value={entity}>
        {wrapper({ children })}
      </PlaygroundEntityContext.Provider>
    );
    const { result } = renderHook(() => useEntityFromContext(), {
      wrapper,
    });
    expect(() => result.current).toThrowError(
      new Error('[useEntityFromContext] Unknown entity from "PlaygroundEntityContext"')
    );
    const { result: resultWithoutError } = renderHook(() => useEntityFromContext(true), {
      wrapper: playgroundEntityContextWrapper,
    });
    const prevVersion = resultWithoutError.current.version;
    (resultWithoutError.current as MockEntity)?.change();
    expect(resultWithoutError.current.version).toEqual(prevVersion + 1);
  });

  it('use-entity-data-from-context', () => {
    const container = createPlaygroundContainer();
    const playground = container.get(Playground);
    playground.entityManager.registerEntity(MockEntity);
    const entity = new MockEntity({
      entityManager: playground.entityManager,
    });

    const containerWrapper = ({ children }: { children: any }) => (
      <PlaygroundReactContainerContext.Provider value={container}>
        <PlaygroundEntityContext.Provider value={entity}>
          {/* {wrapper({ children })} */}
          {children}
        </PlaygroundEntityContext.Provider>
      </PlaygroundReactContainerContext.Provider>
    );
    const dataRegistry = createConfigDataRegistry(entity);
    renderHook(() => useEntityDataFromContext(dataRegistry), {
      wrapper: containerWrapper,
    });
  });

  it('use-playground-context', () => {
    const { result } = renderHook(() => usePlaygroundContext(), {
      wrapper,
    });
    expect(result.current).toEqual({ a: 1 });
  });

  it('use-listen-events with use-refresh', () => {
    const eventEmitter = new Emitter<number>();
    const event = eventEmitter.event;

    renderHook(() => useListenEvents(event));
    const { result } = renderHook(() => useRefresh());
    result.current?.(1);
  });

  it('use-listen-events', async () => {
    const eventEmitter = new Emitter<any>();
    const event = eventEmitter.event;

    let count = 0;
    renderHook(() => {
      useListenEvents(event);
      count++;
    });

    expect(count).toBe(1);

    // fire with empty string
    eventEmitter.fire('');
    expect(count).toBe(2);
    eventEmitter.fire('');
    expect(count).toBe(3);
    eventEmitter.fire('');
    expect(count).toBe(4);

    // fire with 0
    eventEmitter.fire(0);
    expect(count).toBe(5);
    eventEmitter.fire(0);
    expect(count).toBe(6);
    eventEmitter.fire(0);
    expect(count).toBe(7);

    // fire with the same object
    const object = {};
    eventEmitter.fire(object);
    expect(count).toBe(8);
    eventEmitter.fire(object);
    expect(count).toBe(9);
    eventEmitter.fire(object);
    expect(count).toBe(10);

    // fire with undefined
    eventEmitter.fire(undefined);
    expect(count).toBe(11);
    eventEmitter.fire(undefined);
    expect(count).toBe(12);
    eventEmitter.fire(undefined);
    expect(count).toBe(13);
  });

  it('use-service', () => {
    const { result } = renderHook(() => useService<MockService>(MockService), { wrapper });
    // 触发一次重渲染
    result.current?.setInvoked();
    expect(result.current?.invoked).toEqual(true);
  });
});
