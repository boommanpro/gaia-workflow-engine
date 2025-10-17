/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { Rectangle } from '@flowgram.ai/utils';
import {
  type FlowNodeTransitionData,
  FlowTransitionLabelEnum,
  LABEL_SIDE_TYPE,
} from '@flowgram.ai/document';
import { ConfigEntity, type EntityOpts, PlaygroundConfigEntity } from '@flowgram.ai/core';

import { DEFAULT_LABEL_ACTIVATE_HEIGHT } from '../components/utils';

const BRANCH_HOVER_HEIGHT = 64;

interface FlowDragEntityConfig extends EntityOpts {}

enum ScrollDirection {
  TOP,
  BOTTOM,
  LEFT,
  RIGHT,
}

const SCROLL_DELTA = 4;

const SCROLL_INTERVAL = 20;

const SCROLL_BOUNDING = 20;

const EDITOR_LEFT_BAR_WIDTH = 60;

export interface CollisionRetType {
  hasCollision: boolean;
  labelOffsetType?: LABEL_SIDE_TYPE;
}

export class FlowDragEntity extends ConfigEntity<FlowDragEntityConfig> {
  private playgroundConfigEntity: PlaygroundConfigEntity;

  static type = 'FlowDragEntity';

  private containerX = 0;

  private containerY = 0;

  private _scrollXInterval: { interval: number; origin: number } | undefined;

  private _scrollYInterval: { interval: number; origin: number } | undefined;

  get hasScroll(): boolean {
    return Boolean(this._scrollXInterval || this._scrollYInterval);
  }

  constructor(conf: any) {
    super(conf);
    this.playgroundConfigEntity = this.entityManager.getEntity<PlaygroundConfigEntity>(
      PlaygroundConfigEntity,
      true
    )!;
  }

  isCollision(
    transition: FlowNodeTransitionData,
    rect: Rectangle,
    isBranch: boolean
  ): CollisionRetType {
    const scale = this.playgroundConfigEntity.finalScale || 0;
    if (isBranch) {
      return this.isBranchCollision(transition, rect, scale);
    }
    return this.isNodeCollision(transition, rect, scale);
  }

  // 检测节点维度碰撞方法
  isNodeCollision(
    transition: FlowNodeTransitionData,
    rect: Rectangle,
    scale: number
  ): CollisionRetType {
    const { labels } = transition;
    const { isVertical } = transition.entity;

    const hasCollision = labels.some((label) => {
      if (
        !label ||
        ![
          FlowTransitionLabelEnum.ADDER_LABEL,
          FlowTransitionLabelEnum.COLLAPSE_ADDER_LABEL,
        ].includes(label.type)
      ) {
        return false;
      }

      const hoverWidth = isVertical
        ? transition.transform.bounds.width
        : DEFAULT_LABEL_ACTIVATE_HEIGHT;
      const hoverHeight = isVertical
        ? DEFAULT_LABEL_ACTIVATE_HEIGHT
        : transition.transform.bounds.height;

      const labelRect = new Rectangle(
        (label.offset.x - hoverWidth / 2) * scale,
        (label.offset.y - hoverHeight / 2) * scale,
        hoverWidth * scale,
        hoverHeight * scale
      );
      // 检测两个正方形是否相互碰撞
      return Rectangle.intersects(labelRect, rect);
    });

    return {
      hasCollision,
      // 节点不关心 offsetType
      labelOffsetType: undefined,
    };
  }

  // 检测分支维度碰撞
  isBranchCollision(
    transition: FlowNodeTransitionData,
    rect: Rectangle,
    scale: number
  ): CollisionRetType {
    const { labels } = transition;
    const { isVertical } = transition.entity;

    let labelOffsetType: LABEL_SIDE_TYPE = LABEL_SIDE_TYPE.NORMAL_BRANCH;
    const hasCollision = labels.some((label) => {
      if (!label || label.type !== FlowTransitionLabelEnum.BRANCH_DRAGGING_LABEL) {
        return false;
      }
      const hoverHeight = isVertical ? BRANCH_HOVER_HEIGHT : label.width || 0;
      // BRANCH_DRAGGING_LABEL 类型的 label 一定存在 width 属性
      const hoverWidth = isVertical ? label.width || 0 : BRANCH_HOVER_HEIGHT;

      const labelRect = new Rectangle(
        (label.offset.x - hoverWidth / 2) * scale,
        (label.offset.y - hoverHeight / 2) * scale,
        hoverWidth * scale,
        hoverHeight * scale
      );
      // 检测两个正方形是否相互碰撞
      const collision = Rectangle.intersects(labelRect, rect);
      if (collision) {
        labelOffsetType = label.props!.side;
      }
      return collision;
    });

    return {
      hasCollision,
      labelOffsetType,
    };
  }

  private _startScrollX(origin: number, added: boolean): void {
    if (this._scrollXInterval) {
      return;
    }
    const interval = window.setInterval(() => {
      const current = this._scrollXInterval;
      if (!current) return;
      // eslint-disable-next-line no-multi-assign
      const scrollX = (current.origin = added
        ? current.origin + SCROLL_DELTA
        : current.origin - SCROLL_DELTA);
      this.playgroundConfigEntity.updateConfig({
        scrollX,
      });
      const playgroundConfig = this.playgroundConfigEntity.config;
      if (playgroundConfig?.scrollX === scrollX) {
        if (added) {
          this.containerX += SCROLL_DELTA;
        } else {
          this.containerX -= SCROLL_DELTA;
        }
      }
    }, SCROLL_INTERVAL);
    this._scrollXInterval = { interval, origin };
  }

  private _stopScrollX(): void {
    if (this._scrollXInterval) {
      clearInterval(this._scrollXInterval.interval);
      this._scrollXInterval = undefined;
    }
  }

  private _startScrollY(origin: number, added: boolean): void {
    if (this._scrollYInterval) {
      return;
    }
    const interval = window.setInterval(() => {
      const current = this._scrollYInterval;
      if (!current) return;
      // eslint-disable-next-line no-multi-assign
      const scrollY = (current.origin = added
        ? current.origin + SCROLL_DELTA
        : current.origin - SCROLL_DELTA);
      this.playgroundConfigEntity.updateConfig({
        scrollY,
      });
      const playgroundConfig = this.playgroundConfigEntity.config;
      if (playgroundConfig?.scrollY === scrollY) {
        if (added) {
          this.containerY += SCROLL_DELTA;
        } else {
          this.containerY -= SCROLL_DELTA;
        }
      }
    }, SCROLL_INTERVAL);
    this._scrollYInterval = { interval, origin };
  }

  private _stopScrollY(): void {
    if (this._scrollYInterval) {
      clearInterval(this._scrollYInterval.interval);
      this._scrollYInterval = undefined;
    }
  }

  stopAllScroll(): void {
    this._stopScrollX();
    this._stopScrollY();
  }

  scrollDirection(e: MouseEvent, x: number, y: number): ScrollDirection | undefined {
    const playgroundConfig = this.playgroundConfigEntity.config;
    const currentScrollX = playgroundConfig.scrollX;
    const currentScrollY = playgroundConfig.scrollY;
    this.containerX = x;
    this.containerY = y;
    const clientRect = this.playgroundConfigEntity.playgroundDomNode.getBoundingClientRect();

    const mouseToBottom = playgroundConfig.height + clientRect.y - e.clientY;
    if (mouseToBottom < SCROLL_BOUNDING) {
      this._startScrollY(currentScrollY, true);
      return ScrollDirection.BOTTOM;
    }
    const mouseToTop = e.clientY - clientRect.y;
    if (mouseToTop < SCROLL_BOUNDING) {
      this._startScrollY(currentScrollY, false);
      return ScrollDirection.TOP;
    }
    this._stopScrollY();
    const mouseToRight = playgroundConfig.width + clientRect.x - e.clientX;
    if (mouseToRight < SCROLL_BOUNDING) {
      this._startScrollX(currentScrollX, true);
      return ScrollDirection.RIGHT;
    }
    const mouseToLeft = e.clientX - clientRect.x;
    if (mouseToLeft < SCROLL_BOUNDING + EDITOR_LEFT_BAR_WIDTH) {
      this._startScrollX(currentScrollX, false);
      return ScrollDirection.LEFT;
    }
    this._stopScrollX();

    return undefined;
  }

  dispose(): void {
    this.toDispose.dispose();
  }
}
