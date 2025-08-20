/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { inject, injectable, optional } from 'inversify';
import { FlowDocument, FlowNodeTransformData } from '@flowgram.ai/document';
import {
  Layer,
  observeEntity,
  PlaygroundConfigEntity,
  PlaygroundDrag,
} from '@flowgram.ai/core';
import { domUtils, Rectangle } from '@flowgram.ai/utils';
// import {
//   FlowDocument,
//   FlowDocumentTransformerEntity,
//   FlowNodeTransformData,
// } from '@flowgram.ai/document'

import { ScrollBarEvents } from '../utils/scroll-bar-events';
import { getScrollViewport } from '../utils';

// 中间区域边框宽度
const BORDER_WIDTH = 2;

// 右下角预留的 offset
const BLOCK_OFFSET = 11;

// 滚动条样式宽
const SCROLL_BAR_WIDTH = '7px';

// 滚动条显示状态
enum ScrollBarVisibility {
  Show = 'show',
  Hidden = 'hidden',
}

export interface ScrollBarOptions {
  /**
   * 显示滚动条的时机，可选常驻或滚动时显示
   */
  showScrollBars: 'whenScrolling' | 'always';
  getBounds(): Rectangle;
}

/**
 * 渲染滚动条 layer
 */
@injectable()
export class FlowScrollBarLayer extends Layer<ScrollBarOptions> {
  @optional()
  @inject(ScrollBarEvents)
  readonly events?: ScrollBarEvents;

  @inject(FlowDocument) @optional() flowDocument?: FlowDocument;

  @observeEntity(PlaygroundConfigEntity)
  protected playgroundConfigEntity: PlaygroundConfigEntity;

  // @observeEntity(FlowDocumentTransformerEntity) readonly documentTransformer: FlowDocumentTransformerEntity

  // 右滚动区域
  readonly rightScrollBar = domUtils.createDivWithClass('gedit-playground-scroll-right');

  // 右滚动条
  readonly rightScrollBarBlock = domUtils.createDivWithClass('gedit-playground-scroll-right-block');

  // 底滚动区域
  readonly bottomScrollBar = domUtils.createDivWithClass('gedit-playground-scroll-bottom');

  // 底滚动条
  readonly bottomScrollBarBlock = domUtils.createDivWithClass(
    'gedit-playground-scroll-bottom-block',
  );

  // 最左边的位置
  private mostLeft: number;

  // 最右边的位置
  private mostRight: number;

  // 最上面的位置
  private mostTop: number;

  // 最下面的位置
  private mostBottom: number;

  // 视区宽度
  private viewportWidth: number;

  // 视区高度
  private viewportHeight: number;

  // 元素宽高
  private width: number;

  private height: number;

  // 底部滚动条宽度
  private scrollBottomWidth: number;

  // 右侧滚动条高度
  private scrollRightHeight: number;

  // 缩放比
  private scale: number;

  // 总滚动距离
  private sum = 0;

  // 初始 x 轴滚动距离
  private initialScrollX = 0;

  // 初始 y 轴滚动距离
  private initialScrollY = 0;

  // 隐藏滚动条的时延
  private hideTimeout: number | undefined;

  // 浏览器视图宽度
  get clientViewportWidth(): number {
    return this.viewportWidth * this.scale - BLOCK_OFFSET;
  }

  // 浏览器视图高度
  get clientViewportHeight(): number {
    return this.viewportHeight * this.scale - BLOCK_OFFSET;
  }

  // 视图的完整宽度
  get viewportFullWidth(): number {
    return this.mostLeft - this.mostRight;
  }

  // 视图的完整高度
  get viewportFullHeight(): number {
    return this.mostTop - this.mostBottom;
  }

  // 视图的可移动宽度
  get viewportMoveWidth(): number {
    return this.mostLeft - this.mostRight + this.width;
  }

  // 视图的可移动高度
  get viewportMoveHeight(): number {
    return this.mostTop - this.mostBottom + this.height;
  }

  getToLeft(scrollX: number): number {
    return ((scrollX - this.mostRight) / this.viewportMoveWidth) * this.clientViewportWidth;
  }

  getToTop(scrollY: number): number {
    return ((scrollY - this.mostBottom) / this.viewportMoveHeight) * this.clientViewportHeight;
  }

  clickRightScrollBar(e: MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const ratio = 1 - (e?.y || 0) / this.clientViewportHeight;
    const scrollY = (this.mostTop - this.viewportFullHeight * ratio) * this.scale;

    // 滚动到指定位置
    this.playgroundConfigEntity.scroll(
      {
        scrollY,
      },
      false,
    );
  }

  clickBottomScrollBar(e: MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const ratio = 1 - (e?.x || 0) / this.clientViewportWidth;
    const scrollX = (this.mostLeft - this.viewportFullWidth * ratio) * this.scale;

    // 滚动到指定位置
    this.playgroundConfigEntity.scroll(
      {
        scrollX,
      },
      false,
    );
  }

  onBoardingToast() {
    // onBoarding 逻辑，滚动条指示优化，弹出 toast
    this.events?.dragStart();
  }

  protected bottomGrabDragger = new PlaygroundDrag({
    onDragStart: e => {
      this.config.updateCursor('grabbing');
      this.sum = 0;
      this.initialScrollX = this.config.getViewport().x;
      this.onBoardingToast();
    },
    onDrag: e => {
      this.sum += e.movingDelta.x;
      this.playgroundConfigEntity.scroll(
        {
          scrollX:
            (this.initialScrollX +
              (this.sum * this.viewportFullWidth) /
                (this.clientViewportWidth - this.scrollBottomWidth)) *
            this.scale,
        },
        false,
      );
    },
    onDragEnd: e => {
      this.config.updateCursor('default');
    },
  });

  protected rightGrabDragger = new PlaygroundDrag({
    onDragStart: e => {
      this.config.updateCursor('grabbing');
      this.sum = 0;
      this.initialScrollY = this.config.getViewport().y;
      this.onBoardingToast();
    },
    onDrag: e => {
      this.sum += e.movingDelta.y;
      this.playgroundConfigEntity.scroll(
        {
          scrollY:
            (this.initialScrollY +
              (this.sum * this.viewportFullHeight) /
                (this.clientViewportHeight - this.scrollRightHeight)) *
            this.scale,
        },
        false,
      );
    },
    onDragEnd: e => {
      this.config.updateCursor('default');
    },
  });

  protected changeScrollBarVisibility(scrollBar: HTMLDivElement, status: ScrollBarVisibility) {
    const addClassName =
      status === ScrollBarVisibility.Show
        ? 'gedit-playground-scroll-show'
        : 'gedit-playground-scroll-hidden';
    const delClassName =
      status === ScrollBarVisibility.Show
        ? 'gedit-playground-scroll-hidden'
        : 'gedit-playground-scroll-show';
    domUtils.addClass(scrollBar, addClassName);
    domUtils.delClass(scrollBar, delClassName);
  }

  onReady() {
    if (!this.options.getBounds) {
      this.options = {
        getBounds: () => {
          const document = this.flowDocument;
          if (!document) return Rectangle.EMPTY;
          document.transformer.refresh();
          return document.root.getData(FlowNodeTransformData)!.bounds;
        },
        showScrollBars: 'whenScrolling',
      };
    }
    this.pipelineNode.parentNode!.appendChild(this.rightScrollBar);
    this.pipelineNode.parentNode!.appendChild(this.rightScrollBarBlock);
    this.pipelineNode.parentNode!.appendChild(this.bottomScrollBar);
    this.pipelineNode.parentNode!.appendChild(this.bottomScrollBarBlock);
    // 模拟滚动条点击时的滚动
    this.rightScrollBar.onclick = this.clickRightScrollBar.bind(this);
    this.bottomScrollBar.onclick = this.clickBottomScrollBar.bind(this);

    // 滚动时才显示滚动条 则要监听鼠标事件 hover 的时候也要显示
    if (this.options.showScrollBars === 'whenScrolling') {
      this.rightScrollBar.addEventListener('mouseenter', (e: MouseEvent) => {
        this.changeScrollBarVisibility(this.rightScrollBarBlock, ScrollBarVisibility.Show);
      });
      this.rightScrollBar.addEventListener('mouseleave', (e: MouseEvent) => {
        this.changeScrollBarVisibility(this.rightScrollBarBlock, ScrollBarVisibility.Hidden);
      });
      this.bottomScrollBar.addEventListener('mouseenter', (e: MouseEvent) => {
        this.changeScrollBarVisibility(this.bottomScrollBarBlock, ScrollBarVisibility.Show);
      });
      this.bottomScrollBar.addEventListener('mouseleave', (e: MouseEvent) => {
        this.changeScrollBarVisibility(this.bottomScrollBarBlock, ScrollBarVisibility.Hidden);
      });
    }

    // 监听拖拽滚动
    this.bottomScrollBarBlock.addEventListener('mousedown', (e: MouseEvent) => {
      this.bottomGrabDragger.start(e.clientX, e.clientY);
      e.stopPropagation();
    });
    this.rightScrollBarBlock.addEventListener('mousedown', (e: MouseEvent) => {
      this.rightGrabDragger.start(e.clientX, e.clientY);
      e.stopPropagation();
    });
  }

  autorun() {
    // if (this.documentTransformer.loading) return null
    // this.documentTransformer.refresh()
    if (this.hideTimeout) {
      clearTimeout(this.hideTimeout);
    }

    // 中间活动区域宽高
    const viewportBounds = getScrollViewport(
      {
        scrollX: this.config.config.scrollX,
        scrollY: this.config.config.scrollY,
      },
      this.config,
    );

    // 画布视区宽高
    const viewport = this.config.getViewport();
    // 计算视区的时候预留 11px，防止右下角滚动条重叠
    this.viewportWidth = viewport.width;
    this.viewportHeight = viewport.height;
    // 中间部分元素的宽高
    const rootBounds = this.options.getBounds(); // this.document.root.getData(FlowNodeTransformData)!.bounds
    this.width = rootBounds?.width || 0;
    this.height = rootBounds?.height || 0;
    // 中间部分元素的左右间距
    const paddingLeftRight = (this.viewportWidth - viewportBounds.width) / 2 - BORDER_WIDTH;
    // 中间部分元素的上下间距
    const paddingTopBottom = (this.viewportHeight - viewportBounds.height) / 2 - BORDER_WIDTH;

    // 画布可滚动总长度
    const canvasTotalWidth = this.width + viewportBounds.width;
    const canvasTotalHeight = this.height + viewportBounds.height;
    // 根据当前滚动距离计算 滚动条距离边界间距
    // 中间元素初始的偏移位置：
    const initialOffsetX = rootBounds.x;
    const initialOffsetY = rootBounds.y;
    // 最左边的位置
    this.mostLeft = this.width + initialOffsetX - paddingLeftRight;
    // 最右边的位置
    this.mostRight = this.mostLeft - canvasTotalWidth;
    // 最上面的位置
    this.mostTop = this.height + initialOffsetY - paddingTopBottom;
    // 最下面的位置
    this.mostBottom = this.mostTop - canvasTotalHeight;

    this.scale = this.config.finalScale;

    const calcViewportWidth = this.clientViewportWidth;
    const calcViewportHeight = this.clientViewportHeight;
    // 计算公式：
    // 可视区域 - 滚动条的长度 / 可视区域 = 可视区域 / 画布可滚动距离
    // 底部滚动条宽度
    this.scrollBottomWidth =
      calcViewportWidth -
      (calcViewportWidth * (this.mostLeft - this.mostRight)) / this.viewportMoveWidth;
    // 右侧滚动条高度
    this.scrollRightHeight =
      calcViewportHeight -
      (calcViewportHeight * (this.mostTop - this.mostBottom)) / this.viewportMoveHeight;

    // 计算滚动条滚动位移的距离
    // 可滚动区域：canvasTotalWidth - scrollBottomWidth
    const bottomBarToLeft = this.getToLeft(viewport.x);
    const rightBarToTop = this.getToTop(viewport.y);

    // 设置右侧的滚动条内的 block 样式
    domUtils.setStyle(this.rightScrollBarBlock, {
      right: 2,
      top: rightBarToTop,
      background: '#1F2329',
      zIndex: 10,
      height: this.scrollRightHeight,
      width: SCROLL_BAR_WIDTH,
    });
    // 设置底部的滚动条内的 block 样式
    domUtils.setStyle(this.bottomScrollBarBlock, {
      left: bottomBarToLeft,
      bottom: 2,
      background: '#1F2329',
      zIndex: 10,
      height: SCROLL_BAR_WIDTH,
      width: this.scrollBottomWidth,
    });
    this.changeScrollBarVisibility(this.rightScrollBarBlock, ScrollBarVisibility.Show);
    this.changeScrollBarVisibility(this.bottomScrollBarBlock, ScrollBarVisibility.Show);

    // 滚动时才显示滚动条
    // 定时器在 1s 后隐藏滚动条
    if (this.options.showScrollBars === 'whenScrolling') {
      this.hideTimeout = window.setTimeout(() => {
        this.changeScrollBarVisibility(this.rightScrollBarBlock, ScrollBarVisibility.Hidden);
        this.changeScrollBarVisibility(this.bottomScrollBarBlock, ScrollBarVisibility.Hidden);
        this.hideTimeout = undefined;
      }, 1000);
    }
  }
}
