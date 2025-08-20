/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import ReactDOM from 'react-dom';
import React, { useEffect, useState, useCallback } from 'react';

import { NOOP } from '@flowgram.ai/utils';

import type { Layer } from '../layer';
import { type PipelineRenderer } from './pipeline-renderer';

interface LayerReactAutorun {
  autorun: () => void; // autorun function
  portal: () => JSX.Element;
}

function OriginComp({
  originRenderer,
  renderedCb,
}: {
  originRenderer: () => JSX.Element | void;
  renderedCb: () => void;
}): JSX.Element | null {
  useEffect(() => {
    renderedCb();
  }, []);
  return originRenderer() || null;
}

export function createLayerReactAutorun(
  layer: Layer,
  originRenderer: () => JSX.Element | void,
  renderedCb: (layer: Layer) => void,
  pipelineRenderer: PipelineRenderer,
): LayerReactAutorun {
  let update = NOOP;
  function PlaygroundReactLayerPortal(): JSX.Element {
    const [, refresh] = useState({});
    const handleRendered = useCallback(() => {
      renderedCb(layer);
    }, [layer]);
    useEffect(() => {
      update = () => refresh({});
      return () => {
        update = NOOP;
      };
    });

    let result: any;
    try {
      result = !pipelineRenderer.isReady ? (
        <></>
      ) : (
        <OriginComp originRenderer={originRenderer} renderedCb={handleRendered} />
      );
    } catch (e) {
      console.error(`Render Layer "${layer.constructor.name}" error `, e);
      result = <></>;
    }
    return ReactDOM.createPortal(result, layer.node!);
  }
  return {
    autorun: () => update(),
    // 这里使用了 memo 缓存隔离，这样做的前提 layer 的刷新完全交给 entity，不受外部干扰
    portal: layer.renderWithReactMemo
      ? (React.memo(PlaygroundReactLayerPortal) as any)
      : PlaygroundReactLayerPortal,
  };
}
