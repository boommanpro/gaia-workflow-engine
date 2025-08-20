/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

export const MOCK_RESOURCE_URI1 = 'resource-uri1'
export const MOCK_RESOURCE_URI2 = 'resource-uri2'

export const MOCK_HISTORY1 = {
  resourceURI: MOCK_RESOURCE_URI1,
  uuid: 'history1',
  timestamp: 111,
  type: 'push',
  resourceJSON: 'resourceJSON',
}

export const MOCK_HISTORY2 = {
  resourceURI: MOCK_RESOURCE_URI2,
  uuid: 'history2',
  timestamp: 111,
  type: 'push',
  resourceJSON: 'resourceJSON',
}

export const MOCK_OPERATION1 = {
  historyId: 'history1',
  uri: 'test-1',
  uuid: 'operation1',
  type: 'addFromNode',
  value: 'value1',
  resourceURI: MOCK_RESOURCE_URI1,
  label: 'operation1-label',
  description: 'operation1-description',
  timestamp: 1,
}

export const MOCK_OPERATION2 = {
  historyId: 'history1',
  uri: 'test-2',
  uuid: 'operation2',
  type: 'deleteFromNode',
  value: 'value2',
  resourceURI: MOCK_RESOURCE_URI1,
  label: 'operation2-label',
  description: 'operation2-description',
  timestamp: 2,
}

export const MOCK_OPERATION3 = {
  historyId: 'history1',
  uri: 'test-3',
  uuid: 'operation3',
  type: 'addText',
  value: 'value3',
  resourceURI: MOCK_RESOURCE_URI1,
  label: 'operation3-label',
  description: 'operation3-description',
  timestamp: 3,
}