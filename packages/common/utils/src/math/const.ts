/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

export const { PI } = Math;

/** Two Pi. */
export const PI_2 = PI * 2;

/** Conversion factor for converting radians to degrees. */
export const RAD_TO_DEG = 180 / PI;

/** Conversion factor for converting degrees to radians. */
export const DEG_TO_RAD = PI / 180;

/** Constants that identify shapes. */
export enum SHAPES {
  /** Polygon */
  POLY = 0,
  /** Rectangle */
  RECT = 1,
  /** Circle */
  CIRC = 2,
  /** Ellipse */
  ELIP = 3,
  /** Rounded Rectangle */
  RREC = 4,
}
