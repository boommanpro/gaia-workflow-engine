/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { util } from './util';
import { Graph } from '@dagrejs/graphlib';

export { debugOrdering };

/* istanbul ignore next */
function debugOrdering(g) {
  let layerMatrix = util.buildLayerMatrix(g);

  let h = new Graph({ compound: true, multigraph: true }).setGraph({});

  g.nodes().forEach((v) => {
    h.setNode(v, { label: v });
    h.setParent(v, 'layer' + g.node(v).rank);
  });

  g.edges().forEach((e) => h.setEdge(e.v, e.w, {}, e.name));

  layerMatrix.forEach((layer, i) => {
    let layerV = 'layer' + i;
    h.setNode(layerV, { rank: 'same' });
    layer.reduce((u, v) => {
      h.setEdge(u, v, { style: 'invis' });
      return v;
    });
  });

  return h;
}
