/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import React, { useMemo } from 'react';

import { usePlayground } from '@flowgram.ai/core';

import {
  PlaygroundContentLayer,
  PlaygroundReactContentProps,
} from '../layers/playground-content-layer';

export { PlaygroundReactContentProps };

export const PlaygroundReactContent: React.FC<PlaygroundReactContentProps> = props => {
  const playground = usePlayground();
  useMemo(() => {
    const layer = playground.getLayer(PlaygroundContentLayer)!;
    layer.updateOptions(props);
  }, [props]);
  return <></>;
};
