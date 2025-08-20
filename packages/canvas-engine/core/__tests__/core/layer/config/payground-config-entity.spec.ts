/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { PlaygroundConfigEntity } from '../../../../src/core/layer/config/playground-config-entity';

it('should disable grab', () => {
  const playgroundConfig = new PlaygroundConfigEntity({
    entityManager: {
      getDataRegistryByType: vi.fn(),
      registerEntityData: vi.fn(),
      getDataInjector() {
        return () => {};
      },
    } as any,
  });
  let changeTimes = 0;
  playgroundConfig.onGrabDisableChange(() => changeTimes++);
  playgroundConfig.grabDisable = false;
  expect(changeTimes).toBe(0)
  playgroundConfig.grabDisable = true;
  expect(changeTimes).toBe(1)
  playgroundConfig.grabDisable = true;
  expect(changeTimes).toBe(1)
  playgroundConfig.grabDisable = false;
  expect(changeTimes).toBe(2)
});


