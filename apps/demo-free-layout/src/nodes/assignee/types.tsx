/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

export interface AssigneeData {
  title?: string;
  assignees?: Assignee[];
}

export interface Assignee {
  id: string;
  name: string;
  avatar: string;
}

// 模拟的负责人数据
export const mockAssignees: Assignee[] = [
  {
    id: '1',
    name: 'zhangsan',
    avatar: 'https://avatars.githubusercontent.com/u/1?v=4',
  },
  {
    id: '2',
    name: 'lisi',
    avatar: 'https://avatars.githubusercontent.com/u/2?v=4',
  },
  {
    id: '3',
    name: 'wangwu',
    avatar: 'https://avatars.githubusercontent.com/u/3?v=4',
  },
];

// 搜索负责人的函数
export const searchAssignees = async (query: string): Promise<Assignee[]> => {
  // 模拟网络延迟
  await new Promise(resolve => setTimeout(resolve, 300));

  if (!query.trim()) {
    return mockAssignees;
  }

  return mockAssignees.filter(assignee =>
    assignee.name.toLowerCase().includes(query.toLowerCase())
  );
};

