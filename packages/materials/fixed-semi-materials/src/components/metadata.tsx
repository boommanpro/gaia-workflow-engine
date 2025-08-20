/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import React from 'react';

import { nanoid } from 'nanoid';

import {
  BiBootstrapReboot,
  BiCloud,
  FeAlignCenter,
  IconStyleBorder,
  IconParkRightBranch,
  PhCircleBold,
} from '../assets';

const metadata = {
  nodes: [
    {
      type: 'start',
      label: 'Start',
      icon: <IconStyleBorder />,
    },
    {
      type: 'dynamicSplit',
      label: 'Split Branch',
      icon: <IconParkRightBranch />,
      blocks() {
        return [
          {
            id: nanoid(5),
          },
          {
            id: nanoid(5),
          },
        ];
      },
    },
    {
      type: 'end',
      label: 'Branch End',
      icon: <FeAlignCenter />,
      branchEnd: true,
    },
    {
      type: 'loop',
      schemaType: 'loop',
      label: 'Loop',
      icon: <BiBootstrapReboot />,
    },
    {
      type: 'tryCatch',
      schemaType: 'tryCatch',
      label: 'TryCatch',
      icon: <IconParkRightBranch />,
      blocks() {
        return [
          {
            id: `try_${nanoid(5)}`, // try branch
          },
          {
            id: `catch_${nanoid(5)}`, // catch branch 1
          },
          {
            id: `catch_${nanoid(5)}`, // catch branch 2
          },
        ];
      },
    },
    {
      type: 'noop',
      label: 'Noop Node',
      icon: <BiCloud />,
    },
    {
      type: 'end',
      label: 'End',
      icon: <PhCircleBold />,
    },
  ],
  find: function find(type: any) {
    return metadata.nodes.find((m) => m.type === type);
  },
};

export default metadata;
