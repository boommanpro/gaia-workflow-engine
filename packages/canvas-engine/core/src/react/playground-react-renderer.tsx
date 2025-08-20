/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import ReactDOM from 'react-dom';
import React, { useEffect, useRef } from 'react';

import { usePlayground } from '../react-hooks/use-playground';
import { useService } from '../react-hooks';
import { PlaygroundConfig } from '../playground-config';

export interface PlaygroundReactRendererProps {
  /**
   * 这个会放到 playground node 下边
   */
  children?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export const PlaygroundReactRenderer: React.FC<PlaygroundReactRendererProps> = (props) => {
  const playground = usePlayground();
  const playgroundConfig = useService<PlaygroundConfig>(PlaygroundConfig);
  const ref = useRef<any>();
  /**
   * 初始化画布
   */
  useEffect(() => {
    playground.setParent(ref.current);
    playground.ready();
    if (playgroundConfig.autoFocus) {
      playground.node.focus();
    }
  }, []);
  const PlaygroundComp = playground.toReactComponent();
  return (
    <>
      <div
        ref={ref}
        className={`gedit-playground-container${props.className ? ` ${props.className}` : ''}`}
        style={props.style}
      />
      <PlaygroundComp />
      {props.children ? ReactDOM.createPortal(<>{props.children}</>, playground.node) : null}
    </>
  );
};
