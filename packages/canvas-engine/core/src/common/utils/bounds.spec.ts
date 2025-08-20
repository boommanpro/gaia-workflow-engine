/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

// nolint: cyclo_complexity,method_line
import { expect, describe, beforeEach, it } from 'vitest';
import { Container } from 'inversify';
import { Matrix, Rectangle } from '@flowgram.ai/utils';

import { Entity, EntityManager, PlaygroundContext, TransformData } from '..';
import { Bounds } from './bounds';

function createContainer(): Container {
  const child = new Container({ defaultScope: 'Singleton' });
  // child.bind(AbleManager).toSelf();
  child.bind(PlaygroundContext).toConstantValue({});
  child.bind(EntityManager).toSelf();
  return child;
}

const container = createContainer();

function createEntity(): Entity {
  return container.get<EntityManager>(EntityManager).createEntity<Entity>(Entity);
}

function expectRectangle(target: Rectangle, arr: number[]): void {
  expect(target.x).toBeCloseTo(arr[0]);
  expect(target.y).toBeCloseTo(arr[1]);
  expect(target.width).toBeCloseTo(arr[2]);
  expect(target.height).toBeCloseTo(arr[3]);
}

describe('bounds', () => {
  let target: TransformData;
  beforeEach(() => {
    target = new TransformData(createEntity());
    target.size.width = 100;
    target.size.height = 100;
  });

  it('get points and bounds', () => {
    target.origin.x = 0;
    target.origin.y = 0;
    expect(Bounds.getCenter(target, target.worldTransform)).toEqual({
      x: 50,
      y: 50,
    });
    expect(Bounds.getTopLeft(target, target.worldTransform)).toEqual({
      x: 0,
      y: 0,
    });
    expect(Bounds.getTopCenter(target, target.worldTransform)).toEqual({
      x: 50,
      y: 0,
    });
    expect(Bounds.getTopRight(target, target.worldTransform)).toEqual({
      x: 100,
      y: 0,
    });
    expect(Bounds.getLeftCenter(target, target.worldTransform)).toEqual({
      x: 0,
      y: 50,
    });
    expect(Bounds.getRightCenter(target, target.worldTransform)).toEqual({
      x: 100,
      y: 50,
    });
    expect(Bounds.getBottomLeft(target, target.worldTransform)).toEqual({
      x: 0,
      y: 100,
    });
    expect(Bounds.getBottomCenter(target, target.worldTransform)).toEqual({
      x: 50,
      y: 100,
    });
    expect(Bounds.getBottomRight(target, target.worldTransform)).toEqual({
      x: 100,
      y: 100,
    });
    expect(Bounds.getBounds(target, target.worldTransform)).toEqual(new Rectangle(0, 0, 100, 100));

    target.origin.x = 0.5;
    target.origin.y = 0.5;
    expect(Bounds.getCenter(target, target.worldTransform)).toEqual({
      x: 0,
      y: 0,
    });
    expect(Bounds.getTopLeft(target, target.worldTransform)).toEqual({
      x: -50,
      y: -50,
    });
    expect(Bounds.getTopCenter(target, target.worldTransform)).toEqual({
      x: 0,
      y: -50,
    });
    expect(Bounds.getTopRight(target, target.worldTransform)).toEqual({
      x: 50,
      y: -50,
    });
    expect(Bounds.getLeftCenter(target, target.worldTransform)).toEqual({
      x: -50,
      y: 0,
    });
    expect(Bounds.getRightCenter(target, target.worldTransform)).toEqual({
      x: 50,
      y: 0,
    });
    expect(Bounds.getBottomLeft(target, target.worldTransform)).toEqual({
      x: -50,
      y: 50,
    });
    expect(Bounds.getBottomCenter(target, target.worldTransform)).toEqual({
      x: 0,
      y: 50,
    });
    expect(Bounds.getBottomRight(target, target.worldTransform)).toEqual({
      x: 50,
      y: 50,
    });
    expect(Bounds.getBounds(target, target.worldTransform)).toEqual(
      new Rectangle(-50, -50, 100, 100),
    );
  });

  it('transform position', () => {
    target.position.x = 10;
    target.position.y = 10;
    expect(Bounds.getTopLeft(target)).toEqual({ x: -50, y: -50 });
    expect(Bounds.getTopLeft(target, target.localTransform)).toEqual({
      x: -40,
      y: -40,
    });
    expect(Bounds.getTopLeft(target, target.worldTransform)).toEqual({
      x: -40,
      y: -40,
    });
  });

  it('transform position with parent', () => {
    const parent = new TransformData(createEntity());
    parent.position.x = 10;
    parent.position.y = 10;
    target.setParent(parent);
    expect(Bounds.getTopLeft(target)).toEqual({
      x: -50,
      y: -50,
    });
    expect(Bounds.getTopLeft(target, target.localTransform)).toEqual({
      x: -50,
      y: -50,
    });
    expect(Bounds.getTopLeft(target, target.worldTransform)).toEqual({
      x: -40,
      y: -40,
    });
    expect(Bounds.getLeftPointFromBounds(target, target.worldTransform)).toEqual({
      x: -40,
      y: -40,
    });
    expect(Bounds.getTopPointFromBounds(target, target.worldTransform)).toEqual({
      x: -40,
      y: -40,
    });
    expect(Bounds.getLeftPointFromBounds(parent, parent.worldTransform)).toEqual({
      x: 10,
      y: 10,
    });
    expect(Bounds.getTopPointFromBounds(parent, parent.worldTransform)).toEqual({
      x: 10,
      y: 10,
    });

    target.position.x = 10;
    target.position.y = 10;
    expect(Bounds.getTopLeft(target)).toEqual({
      x: -50,
      y: -50,
    });
    expect(Bounds.getTopLeft(target, target.localTransform)).toEqual({
      x: -40,
      y: -40,
    });
    expect(Bounds.getTopLeft(target, target.worldTransform)).toEqual({
      x: -30,
      y: -30,
    });
  });

  it('transform rotation', () => {
    // 中心点旋转 45 度
    target.rotation = Math.PI / 4;
    expectRectangle(
      Bounds.getBounds(target, target.worldTransform),
      [-70.71, -70.71, 141.42, 141.42],
    );
  });

  it('trasnform scale', () => {
    target.scale.x = 2;
    const bounds = Bounds.getBounds(target, target.worldTransform);
    expect(bounds.width).toEqual(200);
    expect(bounds.height).toEqual(100);
  });

  it('applyMatrix - without rotation', () => {
    target.position.x = 50;
    target.position.y = 50;
    expect(target.worldTransform).toEqual(new Matrix(1, 0, 0, 1, 50, 50));
    expectRectangle(Bounds.getBounds(target, target.worldTransform), [0, 0, 100, 100]);
    expectRectangle(
      Bounds.applyMatrix(new Rectangle(-50, -50, 100, 100), target.worldTransform),
      [0, 0, 100, 100],
    );
  });

  it('applyMatrix - with rotation', () => {
    target.position.x = 50;
    target.position.y = 50;
    target.scale.x = 4;
    expect(target.worldTransform).toEqual(new Matrix(4, 0, 0, 1, 50, 50));
    expectRectangle(Bounds.getBounds(target, target.worldTransform), [-150, 0, 400, 100]);
    expectRectangle(
      Bounds.applyMatrix(new Rectangle(-50, -50, 100, 100), target.worldTransform),
      [-150, 0, 400, 100],
    );
  });
});
