/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { inject, injectable } from 'inversify';
import { EntityManager } from '@flowgram.ai/core';

import { BaseConnector } from './base';

@injectable()
export class ECSConnector extends BaseConnector {
  @inject(EntityManager) protected entityManager: EntityManager;

  getName(): string {
    return '@flowgram.ai/EntityManager';
  }

  getState() {
    return this.entityManager.storeState({ configOnly: false });
  }

  onInit() {
    this.entityManager.onEntityLifeCycleChange(action => {
      this.send(`${action.type}/${action.entity.type}/${action.entity.id}`);
    });
  }
}
