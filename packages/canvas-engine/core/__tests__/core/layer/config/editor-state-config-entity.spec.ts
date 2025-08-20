/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { EditorStateConfigEntity } from '../../../../src/core/layer/config/editor-state-config-entity';

it('should expose isPressingSpaceBar', () => {
  const editorStateConfig = new EditorStateConfigEntity({
    entityManager: {
      getDataRegistryByType: vi.fn(),
      registerEntityData: vi.fn(),
      getDataInjector() {
        return () => {};
      },
    } as any,
  });

  expect(editorStateConfig.isPressingSpaceBar).toBe(false);
  editorStateConfig.isPressingSpaceBar = true;
  expect(editorStateConfig.isPressingSpaceBar).toBe(true);
});


it('should return correct state from shortcuts', () => {
  const editorStateConfig = new EditorStateConfigEntity({
    entityManager: {
      getDataRegistryByType: vi.fn(),
      registerEntityData: vi.fn(),
      getDataInjector() {
        return () => {};
      },
    } as any,
  });

  let currState = editorStateConfig.getStateFromShortcut({ key: ' '} as KeyboardEvent);
  expect(currState?.id).toBe('STATE_GRAB');

  // currState = editorStateConfig.getStateFromShortcut({ key: 'V'} as KeyboardEvent);
  // expect(currState?.id).toBe('STATE_SELECT');
});
