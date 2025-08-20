/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

export { barycenter };
export default barycenter;

function barycenter(g, movable = []) {
  return movable.map((v) => {
    let inV = g.inEdges(v);
    if (!inV.length) {
      return { v: v };
    } else {
      let result = inV.reduce(
        (acc, e) => {
          let edge = g.edge(e),
            nodeU = g.node(e.v);
          return {
            sum: acc.sum + edge.weight * nodeU.order,
            weight: acc.weight + edge.weight,
          };
        },
        { sum: 0, weight: 0 }
      );

      return {
        v: v,
        barycenter: result.sum / result.weight,
        weight: result.weight,
      };
    }
  });
}
