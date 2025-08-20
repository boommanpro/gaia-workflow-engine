/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { Container } from 'inversify';
import { type IPoint, PI, Rectangle, type SizeSchema } from '@flowgram.ai/utils';

import {
  // AbleManager,
  Entity,
  EntityManager,
  PlaygroundContext,
  TransformData,
  TransformSchema,
  TransformSchemaDecoration,
} from '../src';

function createContainer(): Container {
  const child = new Container({ defaultScope: 'Singleton' });
  // child.bind(AbleManager).toSelf()
  child.bind(PlaygroundContext).toConstantValue({});
  child.bind(EntityManager).toSelf();
  return child;
}

const container = createContainer();

function createEntity(): Entity {
  return container.get<EntityManager>(EntityManager).createEntity<Entity>(Entity);
}

function createTransform(entity?: Entity): TransformData {
  return new TransformData(entity ?? createEntity());
}

function getIds(transform: TransformData): { localID: number; worldID: number } {
  return {
    localID: transform.localID,
    worldID: transform.worldID,
  };
}

function expectRectangle(target: Rectangle, arr: number[]): void {
  expect(target.x).toBeCloseTo(arr[0]);
  expect(target.y).toBeCloseTo(arr[1]);
  expect(target.width).toBeCloseTo(arr[2]);
  expect(target.height).toBeCloseTo(arr[3]);
}

function expectSize(target: SizeSchema, arr: number[]): void {
  expect(target.width).toBeCloseTo(arr[0]);
  expect(target.height).toBeCloseTo(arr[1]);
}

function expectIPoint(target: IPoint, arr: number[]): void {
  expect(target.x).toBeCloseTo(arr[0]);
  expect(target.y).toBeCloseTo(arr[1]);
}

describe('Playground.schema.transform', () => {
  it('should decompose negative scale into rotation', () => {
    const eps = 1e-3;

    const transform = createTransform();
    const parent = createTransform();
    const otherTransform = createTransform();

    transform.position.x = 20;
    transform.position.y = 10;
    transform.scale.x = -2;
    transform.scale.y = -3;
    transform.rotation = Math.PI / 6;
    transform.setParent(parent);

    otherTransform.setFromMatrix(transform.worldTransform);

    const { position, scale, skew } = otherTransform;

    expect(position.x).toBeCloseTo(20, eps);
    expect(position.y).toBeCloseTo(10, eps);
    expect(scale.x).toBeCloseTo(2, eps);
    expect(scale.y).toBeCloseTo(3, eps);
    expect(skew.x).toEqual(0);
    expect(skew.y).toEqual(0);
    expect(otherTransform.rotation).toBeCloseTo((-5 * Math.PI) / 6, eps);
  });

  it('should decompose mirror into skew', () => {
    const eps = 1e-3;

    const transform = createTransform();
    const parent = createTransform();
    const otherTransform = createTransform();

    transform.position.x = 20;
    transform.position.y = 10;
    transform.scale.x = 2;
    transform.scale.y = -3;
    transform.rotation = Math.PI / 6;
    transform.setParent(parent);

    otherTransform.setFromMatrix(transform.worldTransform);

    const { position, scale, skew } = otherTransform;

    expect(position.x).toBeCloseTo(20, eps);
    expect(position.y).toBeCloseTo(10, eps);
    expect(scale.x).toBeCloseTo(2, eps);
    expect(scale.y).toBeCloseTo(3, eps);
    expect(skew.x).toBeCloseTo((5 * Math.PI) / 6, eps);
    expect(skew.y).toBeCloseTo(Math.PI / 6, eps);
    expect(otherTransform.rotation).toEqual(0);
  });

  it('should apply skew before scale, like in adobe animate and spine', () => {
    // this example looks the same in CSS and in PIXI, made with PIXI-animate by @bigtimebuddy

    const eps = 1e-3;

    const transform = createTransform();
    const parent = createTransform();
    const otherTransform = createTransform();

    transform.position.x = 387.8;
    transform.position.y = 313.95;
    transform.scale.x = 0.572;
    transform.scale.y = 4.101;
    transform.skew.x = -0.873;
    transform.skew.y = 0.175;
    transform.setParent(parent);

    const mat = transform.worldTransform;

    expect(mat.a).toBeCloseTo(0.563, eps);
    expect(mat.b).toBeCloseTo(0.1, eps);
    expect(mat.c).toBeCloseTo(-3.142, eps);
    expect(mat.d).toBeCloseTo(2.635, eps);
    expect(mat.tx).toBeCloseTo(387.8, eps);
    expect(mat.ty).toBeCloseTo(313.95, eps);

    otherTransform.setFromMatrix(transform.worldTransform);

    const { position } = otherTransform;
    const { scale } = otherTransform;
    const { skew } = otherTransform;

    expect(position.x).toBeCloseTo(387.8, eps);
    expect(position.y).toBeCloseTo(313.95, eps);
    expect(scale.x).toBeCloseTo(0.572, eps);
    expect(scale.y).toBeCloseTo(4.101, eps);
    expect(skew.x).toBeCloseTo(-0.873, eps);
    expect(skew.y).toBeCloseTo(0.175, eps);
    expect(otherTransform.rotation).toEqual(0);
  });

  test('transform basic', () => {
    const child = createTransform();
    expect(child.children).toEqual([]);
    // update
    child.update({
      size: { width: 100, height: 100 },
      position: { x: 100, y: 100 },
      origin: { x: 0, y: 0 },
      scale: { x: 2, y: 1 },
      skew: { x: 0, y: 0 },
      rotation: 0,
    });
    expect(child.bounds).toEqual(new Rectangle(100, 100, 200, 100));

    // setters
    child.size = { width: 200, height: 200 };
    child.position = { x: 100, y: 100 };
    child.origin = { x: 0.5, y: 0.5 };
    child.scale = { x: 1, y: 1 };
    child.skew = { x: 0, y: 0 };
    child.rotation = 0;
    expectRectangle(child.bounds, [0, 0, 200, 200]);
    expect(child.data).toEqual({
      origin: { x: 0.5, y: 0.5 },
      position: { x: 100, y: 100 },
      rotation: 0,
      scale: { x: 1, y: 1 },
      size: { width: 200, height: 200, locked: false },
      skew: { x: 0, y: 0 },
    });

    // rotation
    child.rotation = PI / 4;
    expectRectangle(child.bounds, [-41.42, -41.42, 282.84, 282.84]);
    expectRectangle(child.boundsWithoutRotation, [0, 0, 200, 200]);
  });

  test('transform with children & scale', () => {
    const child = createTransform();
    const parent = createTransform();

    child.update({
      size: { width: 100, height: 100 },
      position: { x: 100, y: 100 },
      origin: { x: 0, y: 0 },
    });
    parent.update({
      size: { width: 100, height: 100 },
      position: { x: 100, y: 100 },
      scale: { x: 2, y: 1 },
      origin: { x: 0, y: 0 },
    });

    // Building process
    expectRectangle(child.bounds, [100, 100, 100, 100]);
    expectRectangle(child.localBounds, [100, 100, 100, 100]);
    expect(parent.children).toEqual([]);
    child.setParent(parent);
    expect(parent.children).toEqual([child]);
    // child
    expect(child.isParent(parent)).toEqual(true);
    expect(child.isParentTransform(parent)).toEqual(true);
    expectRectangle(child.localBounds, [100, 100, 100, 100]);
    expectRectangle(child.bounds, [300, 200, 200, 100]);
    expectSize(child.localSize, [100, 100]);
    expectSize(child.worldSize, [200, 100]);
    expect(child.contains(300, 200)).toEqual(true);
    expect(child.contains(299, 199)).toEqual(false);
    expect(child.contains(200, 200, true)).toEqual(false);
    expect(child.contains(400, 250, true)).toEqual(true);
    expect(createTransform().contains(0, 0)).toEqual(false);
    expect(child.worldRotation).toEqual(0);
    expect(child.worldDegree).toEqual(0);
    expect(child.widthToScaleX(100)).toEqual(1);
    expect(child.widthToScaleX(100, true)).toEqual(0.5);
    expect(child.heightToScaleY(100)).toEqual(1);
    expect(child.heightToScaleY(100, true)).toEqual(1);
    expect(child.sizeToScaleValue({ width: 100, height: 100 }, true)).toEqual({ x: 0.5, y: 1 });
    expectIPoint(child.localOrigin, [100, 100]);
    expectIPoint(child.worldOrigin, [300, 200]);
    // parent
    expect(parent.isParent(child)).toEqual(false);
    expect(parent.isParentTransform(child)).toEqual(false);
    expectRectangle(parent.bounds, [300, 200, 200, 100]);
    expectRectangle(parent.localBounds, [300, 200, 200, 100]);
    expectSize(parent.localSize, [100, 100]);
    expectSize(parent.worldSize, [200, 100]);
    expect(parent.contains(300, 200)).toEqual(true);
    expect(parent.contains(299, 199)).toEqual(false);
  });

  test('transform with deep tree', () => {
    const child1 = createTransform();
    const child2 = createTransform();
    const child3 = createTransform();
    const child21 = createTransform();
    const parent = createTransform();

    expect(parent.children).toEqual([]);
    child1.setParent(parent);
    child2.setParent(parent);
    child3.setParent(parent);
    child21.setParent(child2);
    // FIXME: Circular JSON stringify ERROR
    // expect(parent.children).toEqual([child1, child2])
    expect(child1.children).toEqual([]);
    expect(child2.children).toEqual([child21]);
    expect(child1.isParent(parent)).toEqual(true);
    expect(child2.isParent(parent)).toEqual(true);
    expect(child21.isParent(child2)).toEqual(true);
    expect(child21.isParentTransform(child2)).toEqual(true);
    expect(child21.isParent(parent)).toEqual(true);
    expect(child21.isParentTransform(parent)).toEqual(true);

    child21.setParent(undefined);
    expect(child21.isParent(child2)).toEqual(false);

    child21.changeLocked = true;
    child21.setParent(child3);
    child21.changeLocked = false;
    expect(child21.isParent(child3)).toEqual(true);

    child3.dispose();
    expect(child21.isParent(child3)).toEqual(false);
  });

  test('transform with children', () => {
    const child1 = createTransform();
    const child2 = createTransform();
    const parent = createTransform();

    child1.update({
      size: { width: 100, height: 100 },
      position: { x: 100, y: 100 },
      origin: { x: 0, y: 0 },
    });
    child2.update({
      size: { width: 100, height: 100 },
      position: { x: 100, y: 100 },
      origin: { x: 0, y: 0 },
    });
    parent.update({
      size: { width: 100, height: 100 },
      position: { x: 100, y: 100 },
      origin: { x: 0, y: 0 },
    });

    // Building process
    expect(child1.bounds.x).toEqual(100);
    expect(child1.localBounds.x).toEqual(100);
    child1.setParent(parent);
    child2.setParent(parent);
    expectRectangle(child1.bounds, [200, 200, 100, 100]);
    expectRectangle(child1.localBounds, [100, 100, 100, 100]);
    expectRectangle(parent.bounds, [200, 200, 100, 100]);
    expectRectangle(parent.localBounds, [200, 200, 100, 100]);
    const ids = { child1: getIds(child1), child2: getIds(child2), parent: getIds(parent) };

    // Child changed
    child1.update({ position: { x: 90, y: 100 } });
    expect(child1.bounds.x).toEqual(190);
    expect(child2.bounds.x).toEqual(200);
    expect(parent.bounds.x).toEqual(190);
    expect(parent.bounds.width).toEqual(110);
    expect(child1.localBounds.x).toEqual(90);
    expect(child2.localBounds.x).toEqual(100);
    expect(parent.localBounds.x).toEqual(190);
    expect(getIds(child1).localID).toEqual(ids.child1.localID + 1);
    expect(getIds(child1).worldID).toEqual(ids.child1.worldID + 1);
    expect(getIds(child2)).toEqual(ids.child2);
    expect(getIds(parent)).toEqual(ids.parent);

    // Parent changed
    const ids2 = { child1: getIds(child1), child2: getIds(child2), parent: getIds(parent) };
    parent.update({ position: { x: 90, y: 100 } });
    expect(getIds(child1)).toEqual(ids2.child1);
    expect(getIds(child2)).toEqual(ids2.child2);
    expect(getIds(parent).localID).toEqual(ids2.parent.localID + 1);
    expect(child1.bounds.x).toEqual(180);
    expect(child2.bounds.x).toEqual(190);
    expect(parent.bounds.x).toEqual(180);
    expect(parent.bounds.width).toEqual(110);

    // 子节点 local 不变 world 变了
    expect(getIds(child1)).toEqual({
      localID: ids2.child1.localID,
      worldID: ids2.child1.worldID + 1,
    });
    expect(getIds(child2)).toEqual({
      localID: ids2.child2.localID,
      worldID: ids2.child2.worldID + 1,
    });
    expect(getIds(parent).localID).toEqual(ids2.parent.localID + 1);
  });

  test('initial values', () => {
    const target = createTransform();
    expect(target.origin.x).toEqual(0.5);
    expect(target.origin.y).toEqual(0.5);
    expect(target.position.x).toEqual(0);
    expect(target.position.y).toEqual(0);
    expect(target.size.width).toEqual(0);
    expect(target.size.height).toEqual(0);
    expect(target.scale.x).toEqual(1);
    expect(target.scale.y).toEqual(1);
    expect(target.skew.x).toEqual(0);
    expect(target.skew.y).toEqual(0);
    expect(target.rotation).toEqual(0);
  });

  test('intersects', () => {
    const child = createTransform();
    child.update({
      size: { width: 100, height: 100 },
      position: { x: 100, y: 100 },
      origin: { x: 0, y: 0 },
    });

    expect(child.intersects(new Rectangle(0, 0, 101, 101))).toEqual(true);
    expect(child.intersects(new Rectangle(100, 100, 1, 1))).toEqual(true);
    expect(child.intersects(new Rectangle(0, 0, 100, 100))).toEqual(false);

    expect(createTransform().intersects(new Rectangle(0, 0, 100, 100))).toEqual(false);
  });

  test('TransformSchema', () => {
    expect(TransformSchema).not.toBeUndefined();
    expect(TransformData).not.toBeUndefined();
    expect(TransformSchemaDecoration).not.toBeUndefined();
  });

  // TODO
  test.skip('isParentOrChildrenTransform', () => {
    const entity = createEntity();
    const transform = createTransform(entity);
    const entity1 = createEntity();
    const transform1 = createTransform(entity1);

    entity.addData(TransformData);
    entity.updateData(TransformData, transform);
    expect(entity.getData<TransformData>(TransformData)).toEqual(false);
    expect(TransformData.isParentOrChildrenTransform([entity1], entity)).toEqual(false);
    transform1.setParent(transform);
    expect(TransformData.isParentOrChildrenTransform([entity1], entity)).toEqual(true);

    expect(TransformData.isParentOrChildrenTransform([], entity)).toEqual(false);
  });
});
