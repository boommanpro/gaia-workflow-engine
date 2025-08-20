/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { MaybePromise } from './';

type FuncMaybePromise<D> = (d: D, ...others: any[]) => MaybePromise<D>;
type FuncPromise<D> = (d: D, ...others: any[]) => Promise<D>;
type Func<D> = (d: D, ...others: any[]) => D;

export function composeAsync<D>(...fns: FuncMaybePromise<D>[]): FuncPromise<D> {
  return async (data: D, ...others: any[]) => {
    let index = 0;
    while (fns[index]) {
      data = await fns[index](data, ...others);
      index += 1;
    }
    return data;
  };
}

export function compose<D>(...fns: Func<D>[]): Func<D> {
  return (data: D, ...others: any[]) => {
    let index = 0;
    while (fns[index]) {
      data = fns[index](data, ...others);
      index += 1;
    }
    return data;
  };
}
