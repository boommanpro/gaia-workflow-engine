/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { ASTKind, ObjectJSON, VariableDeclarationListJSON } from '../src';

export const simpleVariableList = {
  kind: ASTKind.VariableDeclarationList,
  declarations: [
    {
      type: ASTKind.String,
      key: 'string',
    },
    {
      type: ASTKind.Boolean,
      key: 'boolean',
    },
    {
      // VariableDeclarationList 的 declarations 中可以不用声明 Kind
      // kind: ASTKind.VariableDeclaration,
      type: ASTKind.Number,
      key: 'number',
    },
    {
      kind: ASTKind.VariableDeclaration,
      type: ASTKind.Integer,
      key: 'integer',
    },
    {
      kind: ASTKind.VariableDeclaration,
      type: {
        kind: ASTKind.Object,
        properties: [
          {
            key: 'key1',
            type: ASTKind.String,
            // Object 的 properties 中可以不用声明 Kind
            kind: ASTKind.Property,
          },
          {
            key: 'key2',
            type: {
              kind: ASTKind.Object,
              properties: [
                {
                  key: 'key1',
                  type: ASTKind.Number,
                },
              ],
            } as ObjectJSON,
          },
          {
            key: 'key3',
            type: {
              kind: ASTKind.Array,
              itemType: ASTKind.String,
            },
          },
          {
            key: 'key4',
            type: {
              kind: ASTKind.Array,
              items: {
                kind: ASTKind.Object,
                properties: [
                  {
                    key: 'key1',
                    type: ASTKind.Boolean,
                  },
                ],
              } as ObjectJSON,
            },
          },
        ],
      } as ObjectJSON,
      key: 'object',
    },
    {
      kind: ASTKind.VariableDeclaration,
      type: { kind: ASTKind.Map, valueType: ASTKind.Number },
      key: 'map',
    },
  ],
} as VariableDeclarationListJSON;
