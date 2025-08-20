/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

// nolint: cyclo_complexity,method_line
import { describe, test, expect } from 'vitest';

import { Vector2 } from '../Vector2';
import { Point } from '../Point';
import { type IPoint } from '../IPoint';
import { PI } from '../const';
import { OBBRect, Rectangle as R, RectangleAlignType } from './Rectangle';

describe('Rectangle', () => {
  describe('Rectangle Class', () => {
    test('Rectangle', async () => {
      expect(R).not.toBeUndefined();

      expect(new R()).toEqual({ x: 0, y: 0, width: 0, height: 0, type: 1 });
      expect(new R(1)).toEqual({ x: 1, y: 0, width: 0, height: 0, type: 1 });
      expect(new R(1, 2)).toEqual({ x: 1, y: 2, width: 0, height: 0, type: 1 });
      expect(new R(1, 2, 3)).toEqual({
        x: 1,
        y: 2,
        width: 3,
        height: 0,
        type: 1,
      });
      expect(new R(1, 2, 3, 4)).toEqual({
        x: 1,
        y: 2,
        width: 3,
        height: 4,
        type: 1,
      });
    });

    test('EMPTY', async () => {
      expect(R.EMPTY).toEqual({ x: 0, y: 0, width: 0, height: 0, type: 1 });
    });

    test('left/right/top/bottom', async () => {
      const r = new R(1, 2, 3, 4);
      expect(r.left).toEqual(1);
      expect(r.right).toEqual(4);
      expect(r.top).toEqual(2);
      expect(r.bottom).toEqual(6);
    });

    test('clone', async () => {
      const r = new R(1, 2, 3, 4);
      const r1 = r.clone();
      r.y = 5;
      expect(r).toEqual({ x: 1, y: 5, width: 3, height: 4, type: 1 });
      expect(r1).toEqual({ x: 1, y: 2, width: 3, height: 4, type: 1 });
    });

    test('copyFrom', async () => {
      const r = new R(1, 2, 3, 4);
      const r1 = new R().copyFrom(r);
      r.y = 5;
      expect(r).toEqual({ x: 1, y: 5, width: 3, height: 4, type: 1 });
      expect(r1).toEqual({ x: 1, y: 2, width: 3, height: 4, type: 1 });
    });

    test('copyTo', async () => {
      const r = new R(1, 2, 3, 4);
      const r1 = r.copyTo(new R());
      r.y = 5;
      expect(r).toEqual({ x: 1, y: 5, width: 3, height: 4, type: 1 });
      expect(r1).toEqual({ x: 1, y: 2, width: 3, height: 4, type: 1 });
    });

    test('contains', async () => {
      const r = new R(0, 0, 1, 1);
      expect(r.contains(0, 0)).toEqual(true);
      expect(r.contains(0.5, 0.5)).toEqual(true);
      expect(r.contains(0, 1)).toEqual(true);
      expect(r.contains(1, 0)).toEqual(true);
      expect(r.contains(1, 1)).toEqual(true);
      expect(r.contains(2, 2)).toEqual(false);

      expect(R.EMPTY.contains(0, 0)).toEqual(false);
    });

    test('isEqual', async () => {
      expect(R.EMPTY.isEqual(R.EMPTY)).toEqual(true);
      expect(new R(1, 2, 3, 4).isEqual(new R(1, 2, 3, 4))).toEqual(true);
      expect(new R(1, 2, 3, 4).isEqual(new R(1, 2))).toEqual(false);
    });

    test('containsRectangle', async () => {
      expect(R.EMPTY.containsRectangle(R.EMPTY)).toEqual(true);
      expect(new R(1, 2, 3, 4).containsRectangle(new R(1, 2, 3, 4))).toEqual(true);
      expect(new R(0, 0, 2, 2).containsRectangle(new R(1, 1, 1, 1))).toEqual(true);
      expect(new R(0, 0, 2, 2).containsRectangle(new R(1, 1, 2, 2))).toEqual(false);
    });

    test('pad', async () => {
      expect(new R().pad()).toEqual(new R());
      expect(new R().pad(1)).toEqual(new R(-1, -1, 2, 2));
      expect(new R().pad(1, 2)).toEqual(new R(-1, -2, 2, 4));
    });

    test('fit', async () => {
      expect(new R(0, 0, 2, 2).fit(new R(0, 0, 1, 1))).toEqual(new R(0, 0, 1, 1));
      expect(new R(0, 0, 2, 2).fit(new R(1, 1, 2, 2))).toEqual(new R(1, 1, 1, 1));
      expect(new R(0, 0, 2, 2).fit(new R(3, 3, 1, 1))).toEqual(new R(3, 3, 0, 0));
    });

    test('ceil', async () => {
      expect(new R(0.1, 0.2, 2, 2).ceil()).toEqual(new R(0, 0, 3, 3));
      expect(new R(0.5, 0.6, 2, 2).ceil()).toEqual(new R(0, 0, 3, 3));
    });

    test('enlarge', async () => {
      expect(new R().enlarge(R.EMPTY)).toEqual(R.EMPTY);
      expect(new R().enlarge(new R(0, 0, 1, 1))).toEqual(new R(0, 0, 1, 1));
      expect(new R(0, 0, 1, 1).enlarge(new R(1, 1, 1, 1))).toEqual(new R(0, 0, 2, 2));
      expect(new R(0, 0, 2, 2).enlarge(new R(1, 1, 2, 2))).toEqual(new R(0, 0, 3, 3));
    });

    test('center...crossDistance', async () => {
      const r = new R(1, 1, 4, 4);
      expect(r.center).toEqual({ x: 3, y: 3 });
      expect(r.rightBottom).toEqual({ x: 5, y: 5 });
      expect(r.leftBottom).toEqual({ x: 1, y: 5 });
      expect(r.rightTop).toEqual({ x: 5, y: 1 });
      expect(r.leftTop).toEqual({ x: 1, y: 1 });
      expect(r.bottomCenter).toEqual({ x: 3, y: 5 });
      expect(r.topCenter).toEqual({ x: 3, y: 1 });
      expect(r.rightCenter).toEqual({ x: 5, y: 3 });
      expect(r.leftCenter).toEqual({ x: 1, y: 3 });
      expect(r.crossDistance).toEqual(Math.sqrt(32));
    });

    test('update', async () => {
      expect(
        new R(1, 1, 4, 4).update((r) => {
          r.x = 0;
          r.y = 0;
          return r;
        })
      ).toEqual(new R(0, 0, 4, 4));
    });

    test('toStyleStr', async () => {
      expect(new R(1, 1, 4, 4).toStyleStr()).toEqual(
        'left: 1px; top: 1px; width: 4px; height: 4px;'
      );
    });

    test('withPadding', async () => {
      expect(new R(1, 1, 4, 4).withPadding({ left: 1, right: 1, top: 1, bottom: 1 })).toEqual(
        new R(0, 0, 6, 6)
      );
    });

    test('withoutPadding', async () => {
      expect(
        new R(1, 1, 4, 4).withoutPadding({
          left: 1,
          right: 1,
          top: 1,
          bottom: 1,
        })
      ).toEqual(new R(2, 2, 2, 2));
    });

    test('withHeight', async () => {
      expect(new R(1, 1, 4, 4).withHeight(5)).toEqual(new R(1, 1, 4, 5));
    });

    test('clearSpace', async () => {
      expect(new R(1, 1, 4, 4).clearSpace()).toEqual(new R(1, 1, 0, 0));
    });
  });

  // test('Rectangle namespace', async () => {
  //   expect(R._test).toEqual({})
  //   R._test.a = 1
  //   expect(R._test).toEqual({ a: 1 })
  // })

  test('align', async () => {
    const r1 = new R(0, 0, 1, 1);
    const r2 = new R(1, 1, 2, 2);
    expect(R.align([r1.clone(), r2.clone()], RectangleAlignType.ALIGN_BOTTOM)).toEqual([
      new R(0, 2, 1, 1),
      new R(1, 1, 2, 2),
    ]);
    expect(R.align([r1.clone(), r2.clone()], RectangleAlignType.ALIGN_CENTER)).toEqual([
      new R(1, 0, 1, 1),
      new R(0.5, 1, 2, 2),
    ]);
    expect(R.align([r1.clone(), r2.clone()], RectangleAlignType.ALIGN_LEFT)).toEqual([
      new R(0, 0, 1, 1),
      new R(0, 1, 2, 2),
    ]);
    expect(R.align([r1.clone(), r2.clone()], RectangleAlignType.ALIGN_MIDDLE)).toEqual([
      new R(0, 1, 1, 1),
      new R(1, 0.5, 2, 2),
    ]);
    expect(R.align([r1.clone(), r2.clone()], RectangleAlignType.ALIGN_RIGHT)).toEqual([
      new R(2, 0, 1, 1),
      new R(1, 1, 2, 2),
    ]);
    expect(R.align([r1.clone(), r2.clone()], RectangleAlignType.ALIGN_TOP)).toEqual([
      new R(0, 0, 1, 1),
      new R(1, 0, 2, 2),
    ]);

    expect(
      R.align(
        [new R(0, 0, 1, 1), new R(2, 0, 1, 1), new R(6, 0, 1, 1)],
        RectangleAlignType.DISTRIBUTE_HORIZONTAL
      )
    ).toEqual([new R(0, 0, 1, 1), new R(3, 0, 1, 1), new R(6, 0, 1, 1)]);
    expect(
      R.align(
        [new R(0, 0, 1, 1), new R(0.5, 0, 1, 1), new R(0.5, 0, 1, 1)],
        RectangleAlignType.DISTRIBUTE_HORIZONTAL
      )
    ).toEqual([new R(0, 0, 1, 1), new R(0.25, 0, 1, 1), new R(0.5, 0, 1, 1)]);
    expect(R.align([r1.clone(), r2.clone()], RectangleAlignType.DISTRIBUTE_HORIZONTAL)).toEqual([
      r1,
      r2,
    ]);

    expect(
      R.align(
        [new R(0, 0, 1, 1), new R(0, 2, 1, 1), new R(0, 6, 1, 1)],
        RectangleAlignType.DISTRIBUTE_VERTICAL
      )
    ).toEqual([new R(0, 0, 1, 1), new R(0, 3, 1, 1), new R(0, 6, 1, 1)]);
    expect(R.align([r1.clone(), r2.clone()], RectangleAlignType.DISTRIBUTE_VERTICAL)).toEqual([
      r1,
      r2,
    ]);

    expect(R.align([r1.clone()], RectangleAlignType.DISTRIBUTE_VERTICAL)).toEqual([r1]);
    expect(R.align([r1.clone(), r2.clone()], '' as any)).toEqual([r1, r2]); // override default
  });

  test('enlarge', async () => {
    expect(R.enlarge([new R(0, 0, 1, 1), new R(1, 1, 1, 1)])).toEqual(new R(0, 0, 2, 2));
    expect(R.enlarge([new R(0, 0, 1, 1)])).toEqual(new R(0, 0, 1, 1));
    expect(R.enlarge([])).toEqual(new R());
  });

  test('intersects', async () => {
    expect(R.intersects(new R(0, 0, 2, 2), new R(1, 1, 2, 2))).toEqual(true);
    expect(R.intersects(new R(0, 0, 2, 2), new R(1, 1, 2, 2), 'horizontal')).toEqual(true);
    expect(R.intersects(new R(0, 0, 2, 2), new R(1, 1, 2, 2), 'vertical')).toEqual(true);

    expect(R.intersects(new R(0, 0, 2, 2), new R(3, 3, 2, 2))).toEqual(false);
    expect(R.intersects(new R(0, 0, 2, 2), new R(3, 3, 2, 2), 'horizontal')).toEqual(false);
    expect(R.intersects(new R(0, 0, 2, 2), new R(3, 3, 2, 2), 'vertical')).toEqual(false);
  });

  test('OBBRect', async () => {
    expect(
      new OBBRect(new Point(0, 0), 1, 1, 0).getProjectionRadius(new Vector2(0, 1))
    ).toBeCloseTo(0.5);
    expect(
      new OBBRect(new Point(0, 0), 1, 1, 0).getProjectionRadius(new Vector2(1, 0))
    ).toBeCloseTo(0.5);
    expect(new OBBRect(new Point(0, 0), 1, 1, 0).getProjectionRadius(new Vector2(1, 1))).toEqual(1);
    expect(
      new OBBRect(new Point(0, 0), 1, 1, PI / 4).getProjectionRadius(new Vector2(1, 1))
    ).toBeCloseTo(Math.sqrt(2) / 2);
    expect(
      new OBBRect(new Point(0, 0), 1, 1, PI / 2).getProjectionRadius(new Vector2(1, 1))
    ).toEqual(1);
  });

  test('intersectsWithRotation', async () => {
    expect(R.intersects(new R(0, 0, 10, 10), new R(8, 8, 4, 4))).toEqual(true);
    expect(new R(0, 0, 10, 10).fit(new R(8, 8, 4, 4))).toEqual(new R(8, 8, 2, 2));
    expect(R.intersectsWithRotation(new R(0, 0, 10, 10), 0, new R(8, 8, 4, 4), 0)).toEqual(true);
    expect(
      R.intersectsWithRotation(new R(0, 0, 10, 10), PI / 4, new R(8, 8, 4, 4), PI / 4)
    ).toEqual(false);
    expect(
      R.intersectsWithRotation(new R(0, 0, 10, 10), PI / 2, new R(8, 8, 4, 4), PI / 2)
    ).toEqual(true);
    expect(R.intersectsWithRotation(new R(0, 0, 10, 10), PI, new R(8, 8, 4, 4), PI)).toEqual(true);
    // expect(R.intersectsWithRotation(new R(0, 0, 10, 10), PI / 4, new R(8, -12, 4, 4), PI / 4)).toEqual(false)
    // expect(R.intersectsWithRotation(new R(0, 0, 10, 10), PI / 4, new R(-12, 8, 4, 4), PI / 4)).toEqual(false)
  });

  test('isViewportVisible', async () => {
    expect(R.isViewportVisible(new R(0, 0, 1, 1), new R(0.5, 0.5, 1, 1))).toEqual(true);
    expect(R.isViewportVisible(new R(0, 0, 1, 1), new R(0.5, 0.5, 1, 1), 0, true)).toEqual(false);
    expect(R.isViewportVisible(new R(0, 0, 1, 1), new R(0.5, 0.5, 1, 1), PI / 4)).toEqual(true);
  });

  test('createRectangleWithTwoPoints', async () => {
    expect(R.createRectangleWithTwoPoints({ x: 0, y: 0 }, { x: 1, y: 1 })).toEqual(
      new R(0, 0, 1, 1)
    );
    expect(R.createRectangleWithTwoPoints({ x: 1, y: 1 }, { x: 0, y: 0 })).toEqual(
      new R(0, 0, 1, 1)
    );
  });

  test('OBBRect', async () => {
    expect(
      new OBBRect(new Point(0, 0), 1, 1, 0).getProjectionRadius(new Vector2(0, 1))
    ).toBeCloseTo(0.5);
    expect(
      new OBBRect(new Point(0, 0), 1, 1, 0).getProjectionRadius(new Vector2(1, 0))
    ).toBeCloseTo(0.5);
    expect(new OBBRect(new Point(0, 0), 1, 1, 0).getProjectionRadius(new Vector2(1, 1))).toEqual(1);
    expect(
      new OBBRect(new Point(0, 0), 1, 1, PI / 4).getProjectionRadius(new Vector2(1, 1))
    ).toBeCloseTo(Math.sqrt(2) / 2);
    expect(
      new OBBRect(new Point(0, 0), 1, 1, PI / 2).getProjectionRadius(new Vector2(1, 1))
    ).toEqual(1);
  });
  test('setViewportVisible', () => {
    const viewport = new R(0, 0, 100, 100);
    function check(
      rect: { x: number; y: number; width: number; height: number },
      pos: IPoint,
      padding = 0
    ) {
      const bounds = new R(rect.x, rect.y, rect.width, rect.height);
      R.setViewportVisible(bounds, viewport, padding);
      expect({ x: bounds.x, y: bounds.y }).toEqual(pos);
    }
    // no change
    check({ x: 0, y: 0, width: 10, height: 10 }, { x: 0, y: 0 });
    // left
    check({ x: -10, y: 0, width: 10, height: 10 }, { x: 0, y: 0 });
    // top
    check({ x: 0, y: -10, width: 10, height: 10 }, { x: 0, y: 0 });
    // right
    check({ x: 110, y: 0, width: 10, height: 10 }, { x: 90, y: 0 });
    // bottom
    check({ x: 0, y: 110, width: 10, height: 10 }, { x: 0, y: 90 });
    // 贴到边界，如果有 padding 也往下移动
    check({ x: 0, y: 0, width: 10, height: 10 }, { x: 10, y: 10 }, 10);
    // left with padding
    check({ x: -10, y: 0, width: 10, height: 10 }, { x: 10, y: 10 }, 10);
    // top with padding
    check({ x: 0, y: -10, width: 10, height: 10 }, { x: 10, y: 10 }, 10);
    // right with padding
    check({ x: 110, y: 0, width: 10, height: 10 }, { x: 80, y: 10 }, 10);
    // bottom with padding
    check({ x: 0, y: 110, width: 10, height: 10 }, { x: 10, y: 80 }, 10);
  });
});
