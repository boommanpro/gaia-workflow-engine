/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

export interface HistoryRecord {
  /**
   * 自增id
   */
  id?: number;
  /**
   * 唯一标识
   */
  uuid: string;
  /**
   * 类型 如 push undo redo
   */
  type: string;
  /**
   * 时间戳
   */
  timestamp: number;
  /**
   * 资源uri
   */
  resourceURI: string;
  /**
   * 资源json
   */
  resourceJSON: unknown;
}

export interface HistoryOperationRecord {
  /**
   * 自增id
   */
  id?: number;
  /**
   * 唯一标识
   */
  uuid: string;
  /**
   * 历史记录唯一标志，记录的uuid
   */
  historyId: string;
  /**
   * 类型，如 addFromNode deleteFromNode
   */
  type: string;
  /**
   * 操作值，不同类型不同，json字符串
   */
  value: string;
  /**
   * uri操作对象uri，如某个node的uri
   */
  uri: string;
  /**
   * 操作资源uri，如某个流程的uri
   */
  resourceURI: string;
  /**
   * 操作显示标题
   */
  label: string;
  /**
   * 操作显示描述
   */
  description: string;
  /**
   * 时间戳
   */
  timestamp: number;
}

/**
 * 插件配置
 */
export interface HistoryStoragePluginOptions {
  /**
   * 数据库名称
   */
  databaseName?: string;
  /**
   * 每个资源最大历史记录数量
   */
  resourceStorageLimit?: number;
}
