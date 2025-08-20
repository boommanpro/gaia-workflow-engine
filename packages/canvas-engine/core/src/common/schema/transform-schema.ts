/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import {
  Angle,
  Circle,
  Disposable,
  DisposableCollection,
  Matrix,
  PI_2,
  RAD_TO_DEG,
  Rectangle,
  Schema,
  TransformSchema,
  TransformSchemaDecoration,
} from '@flowgram.ai/utils';

import { Bounds } from '../utils/bounds';
import { EntityData } from '../entity-data';
import type { Entity } from '../entity';
import { SkewData, type SkewSchema } from './skew-schema';
import { SizeData, type SizeSchema } from './size-schema';
import { ScaleData, type ScaleSchema } from './scale-schema';
import { RotationData } from './rotation-schema';
import { PositionData, type PositionSchema } from './position-schema';
import { OriginData, type OriginSchema } from './origin-schema';

export { TransformSchemaDecoration, TransformSchema };

export class TransformData extends EntityData<TransformSchema> implements TransformSchema {
  static type = 'TransformData';

  protected _worldTransform: Matrix = new Matrix();

  protected _localTransform: Matrix = new Matrix();

  protected _children: TransformData[] | undefined;

  protected mutationCache: Map<string, any> = new Map();

  public sizeToScale = false; // 标记 size 转成 scale

  get children(): TransformData[] {
    return this._children || [];
  }

  clearChildren(): void {
    if (this._children) {
      this._children.slice().forEach((child) => {
        child.setParent(undefined);
      });
    }
  }

  /**
   * 容器选择框会动态计算子节点大小
   */
  get isContainer(): boolean {
    return !!this._children && this._children.length > 0;
  }

  /**
   * The X-coordinate value of the normalized local X axis,
   * the first column of the local transformation matrix without a scale.
   */
  protected _cx = 1;

  /**
   * The Y-coordinate value of the normalized local X axis,
   * the first column of the local transformation matrix without a scale.
   */
  protected _sx = 0;

  /**
   * The X-coordinate value of the normalized local Y axis,
   * the second column of the local transformation matrix without a scale.
   */
  protected _cy = 0;

  /**
   * The Y-coordinate value of the normalized local Y axis,
   * the second column of the local transformation matrix without a scale.
   */
  protected _sy = 1;

  /**
   * The locally unique ID of the local transform.
   */
  protected _localID = 0;

  /**
   * The locally unique ID of the local transform
   * used to calculate the current local transformation matrix.
   */
  protected _currentLocalID = 0;

  /**
   * The locally unique ID of the world transform.
   */
  protected _worldID = 0;

  /**
   * The locally unique ID of the parent's world transform
   * used to calculate the current world transformation matrix.
   */
  protected _parentID = 0;

  /**
   * The parent transform
   */
  protected _parent?: TransformData;

  constructor(entity: Entity) {
    super(entity);
    // 默认添加
    this.bindChange(this.entity.addData(PositionData));
    this.bindChange(this.entity.addData(SizeData));
    this.bindChange(this.entity.addData(OriginData));
    this.bindChange(this.entity.addData(ScaleData));
    this.bindChange(this.entity.addData(SkewData), () => this.updateSkew());
    this.bindChange(this.entity.addData(RotationData), () => this.updateSkew());
  }

  fireChange(): void {
    if (this.changeLocked) return;
    this._localID++;
    this.mutationCache.clear();
    super.fireChange();
  }

  get localTransform(): Matrix {
    this.updateLocalTransformMatrix();
    return this._localTransform;
  }

  get worldTransform(): Matrix {
    this.updateTransformMatrix();
    return this._worldTransform;
  }

  getDefaultData(): TransformSchema {
    return Schema.createDefault<TransformSchema>(TransformSchemaDecoration);
  }

  update(data: Partial<TransformSchema>): void {
    if (data.position) {
      this.entity.updateData(PositionData, data.position);
    }
    if (data.size) {
      this.entity.updateData(SizeData, data.size);
    }
    if (data.origin) {
      this.entity.updateData(OriginData, data.origin);
    }
    if (data.scale) {
      this.entity.updateData(ScaleData, data.scale);
    }
    if (data.skew) {
      this.entity.updateData(SkewData, data.skew);
    }
    if (data.rotation !== undefined) {
      this.entity.updateData(RotationData, data.rotation);
    }
  }

  get position(): PositionSchema {
    return this.entity.getData<PositionData>(PositionData)!;
  }

  set position(position: PositionSchema) {
    this.entity.updateData<PositionData>(PositionData, position);
  }

  get size(): SizeSchema {
    return this.entity.getData<SizeData>(SizeData)!;
  }

  set size(size: SizeSchema) {
    this.entity.updateData<SizeData>(SizeData, size);
  }

  get origin(): OriginSchema {
    return this.entity.getData<OriginData>(OriginData)!;
  }

  set origin(origin: OriginSchema) {
    this.entity.updateData<OriginData>(OriginData, origin);
  }

  get scale(): ScaleSchema {
    return this.entity.getData<ScaleData>(ScaleData)!;
  }

  set scale(scale: ScaleSchema) {
    this.entity.updateData<ScaleData>(ScaleData, scale);
  }

  get skew(): SkewSchema {
    return this.entity.getData<SkewData>(SkewData)!;
  }

  set skew(skew: SkewSchema) {
    this.entity.updateData<SkewData>(SkewData, skew);
  }

  get rotation(): number {
    return this.entity.getData<RotationData>(RotationData)!.data;
  }

  set rotation(rotation: number) {
    this.entity.updateData<RotationData>(RotationData, rotation);
  }

  get data(): TransformSchema {
    return TransformSchema.toJSON(this);
  }

  /**
   * Called when the skew or the rotation changes.
   *
   * @protected
   */
  protected updateSkew(): void {
    const { rotation } = this;
    this._cx = Math.cos(rotation + this.skew.y);
    this._sx = Math.sin(rotation + this.skew.y);
    this._cy = -Math.sin(rotation - this.skew.x); // cos, added PI/2
    this._sy = Math.cos(rotation - this.skew.x); // sin, added PI/2

    this._localID++;
  }

  /**
   * Updates the local transformation matrix.
   */
  protected updateLocalTransformMatrix(): void {
    const lt = this._localTransform;

    if (this._localID !== this._currentLocalID) {
      // get the matrix values of the displayobject based on its transform properties..
      lt.a = this._cx * this.scale.x;
      lt.b = this._sx * this.scale.x;
      lt.c = this._cy * this.scale.y;
      lt.d = this._sy * this.scale.y;

      // TODO 删除这个 origin 偏移，不然会有一像素的偏差
      lt.tx = this.position.x; //  - (this.origin.x * lt.a + this.origin.y * lt.c)
      lt.ty = this.position.y; // - (this.origin.x * lt.b + this.origin.y * lt.d)
      this._currentLocalID = this._localID;

      // force an update..
      this._parentID = -1;
    }
  }

  get localID() {
    return this._localID;
  }

  get worldID() {
    return this._worldID;
  }

  /**
   * Updates the local and the world transformation matrices.
   *
   */
  protected updateTransformMatrix(): void {
    const lt = this._localTransform;
    this.updateLocalTransformMatrix();
    let parentTransform: Matrix = Matrix.TEMP_MATRIX;
    let worldId = 0;
    if (this.parent) {
      parentTransform = this.parent.worldTransform;
      worldId = this.parent._worldID;
    }
    if (this._parentID !== worldId) {
      // concat the parent matrix with the objects transform.
      const pt = parentTransform;
      const wt = this._worldTransform;

      wt.a = lt.a * pt.a + lt.b * pt.c;
      wt.b = lt.a * pt.b + lt.b * pt.d;
      wt.c = lt.c * pt.a + lt.d * pt.c;
      wt.d = lt.c * pt.b + lt.d * pt.d;
      wt.tx = lt.tx * pt.a + lt.ty * pt.c + pt.tx;
      wt.ty = lt.tx * pt.b + lt.ty * pt.d + pt.ty;
      this._parentID = worldId;

      // update the id of the transform..
      this._worldID++;
    }
  }

  /**
   * Decomposes a matrix and sets the transforms properties based on it.
   *
   * matrix - The matrix to decompose
   */
  setFromMatrix(matrix: Matrix): void {
    // sort out rotation / skew..
    const { a, b, c, d } = matrix;

    const skewX = -Math.atan2(-c, d);
    const skewY = Math.atan2(b, a);

    const delta = Math.abs(skewX + skewY);

    if (delta < 0.00001 || Math.abs(PI_2 - delta) < 0.00001) {
      this.rotation = skewY;
      this.skew.x = this.skew.y = 0;
    } else {
      this.rotation = 0;
      this.skew.x = skewX;
      this.skew.y = skewY;
    }

    // next set scale
    this.scale.x = Math.sqrt(a * a + b * b);
    this.scale.y = Math.sqrt(c * c + d * d);

    // next set position
    this.position.x = matrix.tx;
    this.position.y = matrix.ty;
    this.fireChange();
  }

  /**
   * 缓存计算, 缓存只能针对 local, world 加缓存会出问题
   */
  getMutationCache<T>(key: string, fn: () => T): T {
    // 缓存设计有问题，先去掉
    if (this.mutationCache.has(key)) return this.mutationCache.get(key) as T;
    const item = fn();
    this.mutationCache.set(key, item);
    return item;
  }

  get bounds(): Rectangle {
    if (this.isContainer) {
      const children = this._children!;
      return Rectangle.enlarge(children.map((c) => c.bounds));
    }
    return Bounds.getBounds(this, this.worldTransform);
  }

  /**
   * 不旋转的 bounds
   */
  get boundsWithoutRotation(): Rectangle {
    const { center } = this.bounds;
    const { worldScale } = this;
    // TODO 目前 container 计算有误差，需要解决
    const size = this.localSize;
    const width = worldScale.x * size.width;
    const height = worldScale.y * size.height;
    const leftTop = {
      x: center.x - width / 2,
      y: center.y - height / 2,
    };
    return new Rectangle(leftTop.x, leftTop.y, width, height);
  }

  /**
   * 本身的大小
   */
  get localSize(): SizeSchema {
    let { size } = this;
    if (this.isContainer) {
      const childrenBounds = Rectangle.enlarge(this.children.map((c) => c.localBounds));
      size = {
        width: childrenBounds.width,
        height: childrenBounds.height,
      };
    }
    return {
      width: size.width,
      height: size.height,
    };
  }

  get worldSize(): SizeSchema {
    const { localSize } = this;
    const { worldScale } = this;
    return {
      width: localSize.width * worldScale.x,
      height: localSize.height * worldScale.y,
    };
  }

  /**
   * 本地 bounds
   */
  get localBounds(): Rectangle {
    if (this.isContainer) {
      const children = this._children!;
      const childrenBounds = Rectangle.enlarge(children.map((c) => c.localBounds));
      // 投射 local
      return Bounds.applyMatrix(childrenBounds, this.localTransform);
    }
    return this.getMutationCache<Rectangle>('localBounds', () =>
      Bounds.getBounds(this, this.localTransform)
    );
  }

  /**
   * 判断是否包含点
   * @param x
   * @param y
   * @param asCircle - 以圆形来算，TODO 目前不支持椭圆形
   */
  contains(x: number, y: number, asCircle?: boolean): boolean {
    // Container 情况不支持 circle
    if (this.isContainer) {
      return this.bounds.contains(x, y);
    }
    const tempPoint = this.worldTransform.applyInverse({ x, y });
    const { width, height } = this.size;
    // 不包含空大小 TODO
    if (width === 0 || height === 0) return false;
    const x1 = -width * this.origin.x;
    const y1 = -height * this.origin.y;
    if (asCircle) {
      const circle = new Circle(x1 + width / 2, y1 + height / 2, Math.min(width / 2, height / 2));
      return circle.contains(tempPoint.x, tempPoint.y);
    }
    if (tempPoint.x >= x1 && tempPoint.x < x1 + width) {
      if (tempPoint.y >= y1 && tempPoint.y < y1 + height) {
        return true;
      }
    }
    return false;
  }

  get parent(): TransformData | undefined {
    return this._parent;
  }

  isParent(parent: TransformData): boolean {
    let currentParent = this.parent;
    while (currentParent) {
      if (currentParent === parent) return true;
      currentParent = currentParent.parent;
    }
    return false;
  }

  isParentTransform(parent?: TransformData): boolean {
    let currentParent = this.parent;
    while (currentParent) {
      if (currentParent === parent) return true;
      currentParent = currentParent.parent;
    }
    return false;
  }

  private _parentChangedDispose?: DisposableCollection;

  private entityDispose?: Disposable;

  setParent(parent: TransformData | undefined, listenParentData = true): void {
    if (this._parent !== parent) {
      if (this.entityDispose) {
        this.entityDispose.dispose();
        this.entityDispose = undefined;
      }
      if (this._parentChangedDispose) {
        this._parentChangedDispose.dispose();
        this._parentChangedDispose = undefined;
      }
      this._parentID = -1;
      if (parent && listenParentData) {
        if (!parent._children) parent._children = [];
        parent._children.push(this);
        this._parentChangedDispose = new DisposableCollection();
        this.toDispose.push(this._parentChangedDispose);
        this.entityDispose = this.entity.onDispose(() => {
          parent.fireChange();
        });
        this._parentChangedDispose.pushAll([
          parent.onDispose(() => {
            this.setParent(undefined);
          }),
          Disposable.create(() => {
            const index = parent._children!.indexOf(this);
            if (index !== -1) {
              parent._children!.splice(index, 1);
            }
          }),
        ]);
      }
      this._parent = parent;
      this.fireChange();
    }
  }

  /**
   * 判断矩形碰撞
   */
  intersects(rect: Rectangle): boolean {
    if (!this.isContainer && (this.size.width === 0 || this.size.height === 0)) return false;
    return Rectangle.intersectsWithRotation(
      this.boundsWithoutRotation,
      this.worldRotation,
      rect,
      0
    );
  }

  /**
   * 全局的 scale
   */
  get worldScale(): ScaleSchema {
    const { parent } = this;
    const parentScale = parent ? parent.worldScale : { x: 1, y: 1 };
    return {
      x: this.scale.x * parentScale.x,
      y: this.scale.y * parentScale.y,
    };
  }

  /**
   * 全局的 rotation
   */
  get worldRotation(): number {
    const { parent } = this;
    if (parent) {
      return Angle.wrap(this.rotation + parent.worldRotation);
    }
    return Angle.wrap(this.rotation);
  }

  /**
   * 全局的角度
   */
  get worldDegree(): number {
    return Math.round(this.worldRotation * RAD_TO_DEG);
  }

  get localOrigin(): PositionSchema {
    const matrix = this.localTransform;
    const bounds = this.localBounds;
    return matrix.apply({
      x: this.origin.x * bounds.width,
      y: this.origin.y * bounds.height,
    });
  }

  /**
   * 全局的原点位置
   */
  get worldOrigin(): PositionSchema {
    const matrix = this.worldTransform;
    const { bounds } = this;
    return matrix.apply({
      x: this.origin.x * bounds.width,
      y: this.origin.y * bounds.height,
    });
  }

  /**
   * 宽转换成 scale，用于图片等无法修改大小的场景
   * @param isWorldSize 是否为绝对大小
   */
  widthToScaleX(width: number, isWorldSize?: boolean): number {
    const parentScaleX = isWorldSize && this.parent ? this.parent.worldScale.x : 1;
    return width / parentScaleX / this.localSize.width;
  }

  /**
   * 绝对高转换成 scale，用于图片等无法修改大小的场景
   * @param isWorldSize 是否为绝对大小
   */
  heightToScaleY(height: number, isWorldSize?: boolean): number {
    const parentScaleY = isWorldSize && this.parent ? this.parent.worldScale.y : 1;
    return height / parentScaleY / this.localSize.height;
  }

  sizeToScaleValue(
    size: { width: number; height: number },
    isWorldSize?: boolean
  ): { x: number; y: number } {
    return {
      x: this.widthToScaleX(size.width, isWorldSize),
      y: this.heightToScaleY(size.height, isWorldSize),
    };
  }
}

export namespace TransformData {
  /**
   * @param dragableEntities
   * @param target
   */
  export function isParentOrChildrenTransform(dragableEntities: Entity[], target: Entity): boolean {
    const targetTransform = target.getData<TransformData>(TransformData);
    if (!targetTransform) return false;
    for (const dragger of dragableEntities.values()) {
      const draggerTransform = dragger.getData<TransformData>(TransformData);
      // eslint-disable-next-line no-continue
      if (!draggerTransform) continue;
      if (
        draggerTransform.isParent(targetTransform) ||
        targetTransform.isParent(draggerTransform)
      ) {
        return true;
      }
    }
    return false;
  }
}
