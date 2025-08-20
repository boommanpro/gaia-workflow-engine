/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { useEffect, useRef, useState } from 'react';

export const useHover = () => {
  const ref = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState(false);

  const checkMouseOver = (event: MouseEvent) => {
    if (!ref.current) {
      return;
    }
    const { left, top, right, bottom } = ref.current.getBoundingClientRect();
    const isOver =
      event.clientX >= left &&
      event.clientX <= right &&
      event.clientY >= top &&
      event.clientY <= bottom;

    setHover(isOver);
  };

  useEffect(() => {
    window.addEventListener('mousemove', checkMouseOver);

    return () => {
      window.removeEventListener('mousemove', checkMouseOver);
    };
  }, []);

  return {
    hover,
    ref,
  };
};
