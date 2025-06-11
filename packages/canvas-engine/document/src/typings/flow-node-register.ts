import { type IPoint } from '@flowgram.ai/utils';
import { PaddingSchema } from '@flowgram.ai/utils';
import { PositionSchema } from '@flowgram.ai/utils';
import { type EntityDataRegistry, type OriginSchema, type SizeSchema } from '@flowgram.ai/core';

import { FlowDocument } from '../flow-document';
import { type FlowNodeEntity } from '../entities';
import { type FlowNodeTransformData, type FlowNodeTransitionData } from '../datas';
import { type FlowTransitionLabel, type FlowTransitionLine } from './flow-transition';
import { FlowLayout, FlowLayoutDefault } from './flow-layout';
import {
  FLOW_DEFAULT_HIDDEN_TYPES,
  FlowNodeBaseType,
  type FlowNodeJSON,
  FlowNodeType,
} from './flow';

/**
 * 节点渲染相关配置信息，可扩展
 */
export interface FlowNodeMeta {
  isStart?: boolean; // 是否为开始节点
  addable?: boolean; // 是否可添加节点
  expandable?: boolean; // 是否可展开
  draggable?: boolean | ((node: FlowNodeEntity) => boolean); // 是否可拖拽
  selectable?: boolean | ((node: FlowNodeEntity, mousePos?: PositionSchema) => boolean); // 是否可被框选
  deleteDisable?: boolean; // 是否禁用删除
  copyDisable?: boolean; // 禁用复制
  addDisable?: boolean; // 禁止添加
  hidden?: boolean; // 是否隐藏
  // maxSize?: SizeSchema // 默认展开后的大小
  size?: SizeSchema; // 默认大小
  /**
   * @deprecated 使用 NodeRegister.getOrigin 代替
   */
  origin?: OriginSchema; // 原点配置，默认 垂直 { x: 0.5, y: 0 } 水平 { x: 0, y: 0.5 }
  defaultExpanded?: boolean; // 默认是否展开
  defaultCollapsed?: boolean; // 复合节点默认是否收起
  expandedSize?: SizeSchema; // 默认缩小版大小
  spacing?: number | ((transform: FlowNodeTransformData) => number); // 兄弟节点间，等价于 marginBottom
  padding?: PaddingSchema | ((transform: FlowNodeTransformData) => PaddingSchema); // 节点设置了 padding，则不需要 inlineSpacingPre 和 inlineSpacingAfter
  inlineSpacingPre?: number | ((transform: FlowNodeTransformData) => number); // 父子节点间，等价于 paddingTop 或者 paddingLeft
  inlineSpacingAfter?: number | ((transform: FlowNodeTransformData) => number); // 父子节点间，等价于 paddingBottom 或者 paddingRight
  renderKey?: string; // 节点的渲染组件，可以绑定 react 组件
  isInlineBlocks?: boolean | ((node: FlowNodeEntity) => boolean); // 采用水平布局
  minInlineBlockSpacing?: number | ((node: FlowNodeTransformData) => number); // 最小的 inlineBlock 的间距
  isNodeEnd?: boolean; // 是否标识节点结束
  [key: string]: any;
}

/**
 * spacing default key 值
 */
export const DefaultSpacingKey = {
  /**
   * 普通节点间距。垂直 / 水平
   */
  NODE_SPACING: 'SPACING',
  /**
   * 圆弧线条 x radius
   */
  ROUNDED_LINE_X_RADIUS: 'ROUNDED_LINE_X_RADIUS',
  /**
   * 圆弧线条 y radius
   */
  ROUNDED_LINE_Y_RADIUS: 'ROUNDED_LINE_Y_RADIUS',
  /**
   * dynamicSplit block list 下部留白间距，因为有两个拐弯，所以翻一倍
   */
  INLINE_BLOCKS_PADDING_BOTTOM: 'INLINE_BLOCKS_PADDING_BOTTOM',
  /**
   * 复合节点距离上个节点的距离
   * 条件分支菱形下边和分支的距离
   */
  COLLAPSED_SPACING: 'COLLAPSED_SPACING',
  /**
   * width of hover area
   */
  HOVER_AREA_WIDTH: 'HOVER_AREA_WIDTH',
};

/**
 * 默认一些间隔参数
 */
export const DEFAULT_SPACING = {
  NULL: 0,
  [DefaultSpacingKey.NODE_SPACING]: 32, // 普通节点间距。垂直 / 水平
  MARGIN_RIGHT: 20, // 普通节点右边间距
  INLINE_BLOCK_PADDING_BOTTOM: 16, // block 底部留白
  INLINE_BLOCKS_PADDING_TOP: 30, // block list 上部留白间距
  [DefaultSpacingKey.INLINE_BLOCKS_PADDING_BOTTOM]: 40, // block lit 下部留白间距，因为有两个拐弯，所以翻一倍
  MIN_INLINE_BLOCK_SPACING: 200, // 分支间最小边距 (垂直布局)
  MIN_INLINE_BLOCK_SPACING_HORIZONTAL: 80, // 分支间最小边距 (水平布局)
  [DefaultSpacingKey.COLLAPSED_SPACING]: 12, // 复合节点距离上个节点的距离
  [DefaultSpacingKey.ROUNDED_LINE_X_RADIUS]: 16, // 圆弧线条 x radius
  [DefaultSpacingKey.ROUNDED_LINE_Y_RADIUS]: 20, // 圆弧线条 y radius
  [DefaultSpacingKey.HOVER_AREA_WIDTH]: 20, // width of hover area
};

/**
 * 拖拽种类枚举
 * 1. 节点拖拽
 * 2. 分支拖拽
 */
export enum DRAGGING_TYPE {
  NODE = 'node',
  BRANCH = 'branch',
}

/**
 * 拖拽分支 Adder、Line 类型
 */
export enum LABEL_SIDE_TYPE {
  // 前缀分支
  PRE_BRANCH = 'pre_branch',
  NORMAL_BRANCH = 'normal_branch',
}

/**
 * 默认节点大小
 */
export const DEFAULT_SIZE = {
  width: 280,
  height: 60,
};

/**
 * 默认 meta 配置
 */
export const DEFAULT_FLOW_NODE_META: (
  nodeType: FlowNodeType,
  document: FlowDocument
) => FlowNodeMeta = (nodeType: FlowNodeType, document: FlowDocument) => {
  const hidden = FLOW_DEFAULT_HIDDEN_TYPES.includes(nodeType);
  return {
    isStart: nodeType === 'start',
    hidden,
    defaultExpanded: document.options.allNodesDefaultExpanded,
    expandedSize: { width: 520, height: 300 }, // 展开后的大小
    size: DEFAULT_SIZE,
    origin: document.layout.getDefaultNodeOrigin(),
    isInlineBlocks: nodeType === FlowNodeBaseType.INLINE_BLOCKS,
    // miniSize: { width: 200, height: 40 },
    spacing: DEFAULT_SPACING.SPACING,
    inlineSpacingPre: 0,
    inlineSpacingAfter: 0,
    expandable: true,
    draggable: true,
    selectable: true,
    renderKey: '',
    minInlineBlockSpacing: () => {
      const isVertical = FlowLayoutDefault.isVertical(document.layout);
      return isVertical
        ? DEFAULT_SPACING.MIN_INLINE_BLOCK_SPACING
        : DEFAULT_SPACING.MIN_INLINE_BLOCK_SPACING_HORIZONTAL;
    },
  } as FlowNodeMeta;
};

/**
 * 节点注册
 */
export interface FlowNodeRegistry<M extends FlowNodeMeta = FlowNodeMeta> {
  /**
   * 从另外一个注册扩展
   */
  extend?: string;
  /**
   * 节点类型
   */
  type: FlowNodeType;
  /**
   * 节点注册的数据，可以理解为 ECS 里的 Component, 这里可以配置自定义数据
   */
  dataRegistries?: EntityDataRegistry[];
  /**
   * 节点画布相关初始化配置信息，会覆盖 DEFAULT_FLOW_NODE_META
   */
  meta?: Partial<M>;
  /**
   * 自定义创建节点，可以自定义节点的树形结构
   * 返回新加入的节点，这样才能统计缓存
   *
   * @action 使用该方法，在创建时候将会忽略 json blocks 数据，而是交给适用节点自己处理 json 逻辑
   */
  onCreate?: (node: FlowNodeEntity, json: FlowNodeJSON) => FlowNodeEntity[] | void;
  /**
   * 添加子 block，一般用于分支的动态添加
   */
  onBlockChildCreate?: (
    node: FlowNodeEntity,
    json: FlowNodeJSON,
    addedNodes?: FlowNodeEntity[] // 新创建的节点都要存在这里
  ) => FlowNodeEntity;
  /**
   * 创建线条
   */
  getLines?: (transition: FlowNodeTransitionData, layout: FlowLayout) => FlowTransitionLine[];
  /**
   * 创建 label
   */
  getLabels?: (transition: FlowNodeTransitionData, layout: FlowLayout) => FlowTransitionLabel[];

  /**
   * 调整子节点的线条，优先级高于子节点本身的 getLines
   */
  getChildLines?: (transition: FlowNodeTransitionData, layout: FlowLayout) => FlowTransitionLine[];

  /**
   * 调整子节点的 Labels，优先级高于子节点本身的 getLabels
   */
  getChildLabels?: (
    transition: FlowNodeTransitionData,
    layout: FlowLayout
  ) => FlowTransitionLabel[];

  /**
   * 自定义输入节点
   */
  getInputPoint?: (transform: FlowNodeTransformData, layout: FlowLayout) => IPoint;
  /**
   * 自定义输出节点
   */
  getOutputPoint?: (transform: FlowNodeTransformData, layoutKey: FlowLayout) => IPoint;
  /**
   *  获取当前节点 Position 偏移量，偏移量计算只能使用已经计算完的数据，如上一个节点或者子节点，不然会造成 o(n^2) 复杂度
   *
   *  1. 切记不要用当前节点的 localBounds(相对位置 bbox)，因为 delta 计算发生在 localBounds 计算之前
   *  2. 切记不要用 bounds(绝对位置 bbox, 会触发所有父节点绝对位置计算), bounds 只能在最终 render 时候使用
   *  3. 可以用 pre 节点 和 子节点的 localBounds 或者 size 数据，因为子节点是先算的
   *  4. 可以用当前节点的 size (所有子节点的最大 bbox), 这是已经确定下来的
   */
  getDelta?: (transform: FlowNodeTransformData, layout: FlowLayout) => IPoint | undefined;

  /**
   * 动态获取原点，会覆盖 meta.origin
   */
  getOrigin?(transform: FlowNodeTransformData, layout: FlowLayout): IPoint;
  /**
   * 原点 X 偏移
   * @param transform
   */
  getOriginDeltaX?: (transform: FlowNodeTransformData, layout: FlowLayout) => number;
  /**
   * 原点 Y 偏移
   * @param transform
   */
  getOriginDeltaY?: (transform: FlowNodeTransformData, layout: FlowLayout) => number;
  /**
   * 通过 parent 计算当前节点的偏移，规则同 getDelta
   */
  getChildDelta?: (childBlock: FlowNodeTransformData, layout: FlowLayout) => IPoint | undefined;
  /**
   * 在当前节点布局完成后调用，可以对布局做更精细的调整
   */
  onAfterUpdateLocalTransform?: (transform: FlowNodeTransformData, layout: FlowLayout) => void;

  /**
   * 子节点的 registry 覆盖，这里通过 originParent 来查找
   */
  extendChildRegistries?: FlowNodeRegistry[];

  /**
   * @deprecated
   * 自定义子节点添加逻辑
   * @param node 节点
   * @param json 添加的节点 JSON
   * @param options 其它配置
   * @returns
   */
  addChild?: (
    node: FlowNodeEntity,
    json: FlowNodeJSON,
    options?: {
      hidden?: boolean;
      index?: number;
    }
  ) => FlowNodeEntity;

  /**
   * 内部用于继承逻辑判断，不要使用
   */
  __extends__?: FlowNodeType[];
  /**
   * 扩展注册器
   */
  [key: string]: any;
}

export namespace FlowNodeRegistry {
  export function mergeChildRegistries(
    r1: FlowNodeRegistry[] = [],
    r2: FlowNodeRegistry[] = []
  ): FlowNodeRegistry[] {
    if (r1.length === 0 || r2.length === 0) {
      return [...r1, ...r2];
    }
    const r1Filter = r1.map((r1Current) => {
      const r2Current = r2.find((n) => n.type === r1Current.type);
      if (r2Current) {
        return merge(r1Current, r2Current, r1Current.type);
      }
      return r1Current;
    });
    const r2Filter = r2.filter((n) => !r1.some((r) => r.type === n.type));
    return [...r1Filter, ...r2Filter];
  }
  export function merge(
    registry1: FlowNodeRegistry,
    registry2: FlowNodeRegistry,
    finalType: FlowNodeType
  ): FlowNodeRegistry {
    const extendKeys = registry1.__extends__ ? registry1.__extends__.slice() : [];
    if (registry1.type !== registry2.type) {
      extendKeys.unshift(registry1.type);
    }
    return {
      ...registry1,
      ...registry2,
      extendChildRegistries: mergeChildRegistries(
        registry1.extendChildRegistries,
        registry2.extendChildRegistries
      ),
      meta: { ...registry1.meta, ...registry2.meta },
      extend: undefined,
      type: finalType,
      __extends__: extendKeys,
    };
  }

  export function extend(
    registry: FlowNodeRegistry,
    extendRegistries: FlowNodeRegistry[]
  ): FlowNodeRegistry {
    if (!extendRegistries.length) return registry;
    return extendRegistries.reduce((res, ext) => merge(res, ext, registry.type), registry);
  }
}
