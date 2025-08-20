/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { Container } from 'inversify';

import {
  Entity,
  EntityManager,
  PlaygroundContext,
  OpacityData,
  OpacitySchemaDecoration,
  OriginData,
  OriginSchemaDecoration,
  PositionData,
  PositionSchemaDecoration,
  RotationSchemaDecoration,
  RotationData,
  ScaleData,
  ScaleSchemaDecoration,
  SizeData,
  SizeSchema,
  SizeSchemaDecoration,
  SkewData,
  SkewSchemaDecoration,
} from '../src';

function createContainer(): Container {
  const container = new Container({ defaultScope: 'Singleton' });
  container.bind(PlaygroundContext).toConstantValue({});
  container.bind(EntityManager).toSelf();
  return container;
}

describe('core/common/schema', () => {
  let container: Container;

  beforeEach(() => {
    container = createContainer();
  });

  function createEntity() {
    return container.get<EntityManager>(EntityManager).createEntity<Entity>(Entity);
  }

  test('OpacityData', async () => {
    expect(new OpacityData(createEntity()).getDefaultData()).toEqual(1);
    expect(OpacitySchemaDecoration).not.toBeUndefined();
  });

  test('OriginData', async () => {
    const data = new OriginData(createEntity());
    expect(data.getDefaultData()).toEqual({ x: 0.5, y: 0.5 });

    data.x = 1;
    data.y = 1;
    expect(data.x).toBeCloseTo(1);
    expect(data.y).toBeCloseTo(1);

    expect(OriginSchemaDecoration).not.toBeUndefined();
  });

  test('PositionData', async () => {
    const data = new PositionData(createEntity());
    expect(data.getDefaultData()).toEqual({ x: 0, y: 0 });

    data.x = 1;
    data.y = 1;
    expect(data.x).toBeCloseTo(1);
    expect(data.y).toBeCloseTo(1);

    expect(PositionSchemaDecoration).not.toBeUndefined();
  });

  test('RotationData', async () => {
    const data = new RotationData(createEntity());
    expect(data.getDefaultData()).toEqual(0);
    expect(RotationSchemaDecoration).not.toBeUndefined();
  });

  test('ScaleData', async () => {
    const data = new ScaleData(createEntity());
    expect(data.getDefaultData()).toEqual({ x: 1, y: 1 });

    data.x = 2;
    data.y = 2;
    expect(data.x).toBeCloseTo(2);
    expect(data.y).toBeCloseTo(2);

    expect(ScaleSchemaDecoration).not.toBeUndefined();
  });

  test('SizeData ', async () => {
    const data = new SizeData(createEntity());
    expect(data.getDefaultData()).toEqual({ width: 0, height: 0, locked: false });

    data.width = 1;
    data.height = 1;
    data.locked = true;
    expect(data.width).toBeCloseTo(1);
    expect(data.height).toBeCloseTo(1);
    expect(data.locked).toBeTruthy();

    expect(SizeSchema).not.toBeUndefined();
    expect(SizeSchemaDecoration).not.toBeUndefined();
  });

  test('SkewData', async () => {
    const data = new SkewData(createEntity());
    expect(data.getDefaultData()).toEqual({ x: 0, y: 0 });

    data.x = 1;
    data.y = 1;
    expect(data.x).toBeCloseTo(1);
    expect(data.y).toBeCloseTo(1);

    expect(SkewSchemaDecoration).not.toBeUndefined();
  });
});
