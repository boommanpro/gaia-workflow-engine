/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { useEffect, useState } from 'react';

import { type MonitorData } from './monitor-data';

export const useMonitorData = <Type>(
  monitorData: MonitorData<Type> | undefined
): { data: Type | undefined } => {
  const [data, setData] = useState(monitorData?.data);

  useEffect(() => {
    const dispose = monitorData?.onDataChange(({ prev, next }) => {
      setData(next);
    });
    return () => {
      dispose?.dispose();
    };
  }, [monitorData]);

  return {
    data,
  };
};
