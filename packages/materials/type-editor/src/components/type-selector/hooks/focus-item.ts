/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { useCallback, useImperativeHandle, useMemo, useState } from 'react';

import { noop } from 'lodash-es';

import { TypeSelectorRef, type CascaderOption, type SearchResultItem } from '../type';

interface Pos {
  x: number;
  y: number;
}

const validatePos = (pos: Pos): boolean => pos.x >= 0 && pos.y >= 0;

export const useFocusItemCascader = ({
  rootTypes,
  renderData,
  cascaderTypes,
  ref,
  onCollapse,
  onChange,
}: {
  rootTypes: CascaderOption[];
  cascaderTypes: string[];
  onChange: (newVal: string) => void;
  renderData: { item: string; options: CascaderOption[] }[];
  ref: React.ForwardedRef<TypeSelectorRef>;
  onCollapse: (type: string, level: number) => void;
}) => {
  const [focusPos, setFocusPos] = useState<Pos>({ x: -1, y: -1 });

  const allOptions = useMemo(
    () => [rootTypes, ...renderData.map((item) => item.options)],
    [rootTypes, renderData]
  );

  const initPos = useCallback(() => {
    setFocusPos({
      x: 0,
      y: 0,
    });
  }, []);

  const focusItem = useMemo(() => allOptions[focusPos.x]?.[focusPos.y], [focusPos, allOptions]);

  const focusValue = useMemo(
    () => allOptions[focusPos.x]?.[focusPos.y]?.value,
    [focusPos, allOptions]
  );

  useImperativeHandle(
    ref,
    (): TypeSelectorRef => ({
      initFocusItem() {
        initPos();
      },
      clearFocusItem() {
        setFocusPos({
          x: -1,
          y: -1,
        });
      },
      moveFocusItemUp() {
        if (!validatePos(focusPos)) {
          initPos();
          return;
        }
        const { x, y } = focusPos;

        if (!allOptions[x]?.[y]) {
          return;
        }

        // 向上查找，直到找到一个 disabled not 的 item
        let newY = (y - 1 + allOptions[x].length) % allOptions[x].length;
        let item = allOptions[x]?.[newY];

        while (item?.disabled && newY !== y) {
          newY = (newY - 1 + allOptions[x].length) % allOptions[x].length;
          item = allOptions[x]?.[newY];
        }

        if (newY !== y) {
          setFocusPos({
            x,
            y: newY,
          });
        }
      },
      moveFocusItemDown() {
        if (!validatePos(focusPos)) {
          initPos();
          return;
        }

        const { x, y } = focusPos;

        if (!allOptions[x]?.[y]) {
          return;
        }

        // 向上查找，直到找到一个 disabled not 的 item
        let newY = (y + 1) % allOptions[x].length;
        let item = allOptions[x]?.[newY];

        while (item?.disabled && newY !== y) {
          newY = (newY + 1) % allOptions[x].length;
          item = allOptions[x]?.[newY];
        }

        if (newY !== y) {
          setFocusPos({
            x,
            y: newY,
          });
        }
      },
      moveFocusItemLeft() {
        if (!validatePos(focusPos)) {
          initPos();
          return;
        }

        const childrenPanelLen = cascaderTypes.length;

        if (childrenPanelLen > 0) {
          const lastParentType = cascaderTypes[childrenPanelLen - 1];

          const newY = allOptions[childrenPanelLen - 1]?.findIndex(
            (v) => v.type === lastParentType
          );

          onCollapse(lastParentType, childrenPanelLen - 1);

          setFocusPos({
            x: focusPos.x - 1,
            y: newY || 0,
          });
        }
      },
      moveFocusItemRight() {
        if (!validatePos(focusPos)) {
          initPos();
          return;
        }

        if (focusItem && !focusItem.isLeaf && cascaderTypes[focusPos.x] !== focusItem.type) {
          onCollapse(focusItem.type, focusPos.x);
          setFocusPos({
            x: focusPos.x + 1,
            y: 0,
          });
        }
      },

      selectFocusItem() {
        if (!validatePos(focusPos)) {
          return;
        }
        if (focusItem?.isLeaf) {
          onChange(focusValue);
        }
      },
    })
  );

  return {
    focusValue,
  };
};
export const useFocusItemSearch = ({
  ref,
  onChange,
  viewValue,
}: {
  viewValue: SearchResultItem[];
  onChange: (newVal: string) => void;

  ref: React.ForwardedRef<TypeSelectorRef>;
}) => {
  const [focusPos, setFocusPos] = useState(-1);

  const focusValue = useMemo(() => viewValue[focusPos]?.value, [viewValue, focusPos]);

  const focusItem = useMemo(() => viewValue[focusPos], [viewValue, focusPos]);

  useImperativeHandle(ref, () => ({
    selectFocusItem() {
      if (!focusItem.disabled) {
        onChange(focusValue);
      }
    },
    moveFocusItemDown() {
      if (focusPos < 0) {
        setFocusPos(0);
        return;
      }

      let newPos = (focusPos + 1) % viewValue.length;

      while (viewValue[newPos]?.disabled && newPos !== focusPos) {
        newPos = (newPos + 1) % viewValue.length;
      }

      setFocusPos(newPos);
    },
    moveFocusItemLeft: noop,
    moveFocusItemRight: noop,
    moveFocusItemUp() {
      if (focusPos < 0) {
        setFocusPos(0);
        return;
      }

      let newPos = (focusPos - 1 + viewValue.length) % viewValue.length;

      while (viewValue[newPos]?.disabled && newPos !== focusPos) {
        newPos = (newPos - 1 + viewValue.length) % viewValue.length;
      }

      setFocusPos(newPos);
    },
    initFocusItem() {
      setFocusPos(0);
    },
    clearFocusItem() {
      setFocusPos(-1);
    },
  }));

  return {
    focusValue,
  };
};
