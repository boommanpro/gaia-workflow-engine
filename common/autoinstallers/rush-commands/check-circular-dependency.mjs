/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import RushSdk from '@rushstack/rush-sdk';

const rushConfig = RushSdk.RushConfiguration.loadFromDefaultLocation();

function getPackageDependencies(packageName, depsMap) {
  const projectInfo = rushConfig.getProjectByName(packageName);
  if (!projectInfo || depsMap[packageName]) return;

  // eslint-disable-next-line no-param-reassign
  depsMap[packageName] = [...projectInfo.dependencyProjects].map(
    p => p.packageName,
  );

  for (const dep of depsMap[packageName]) {
    getPackageDependencies(dep, depsMap);
  }
}

function main() {
  const { projects } = rushConfig;
  const depsMap = {};

  for (const project of projects) {
    getPackageDependencies(project.packageName, depsMap);
  }

  // 定义一个函数来进行深度优先搜索
  function dfs(node, visited, stack, graph, cycles) {
    visited.add(node); // 将当前节点标记为已访问
    stack.push(node); // 将当前节点添加到栈中

    // 遍历当前节点的所有邻居
    for (const neighbor of graph[node]) {
      // 如果邻居节点未被访问，则进行深度优先搜索
      if (!visited.has(neighbor)) {
        dfs(neighbor, visited, stack, graph, cycles);
      }
      // 如果邻居节点已经被访问，并且在栈中，则说明存在循环依赖
      else if (stack.includes(neighbor)) {
        cycles.push([...stack.slice(stack.indexOf(neighbor)), neighbor]); // 将循环依赖添加到数组中
      }
    }

    // 将当前节点从栈中弹出，回溯到上一个节点
    stack.pop();
  }

  // 定义一个函数来查找所有循环依赖
  function findCycles(graph) {
    const visited = new Set(); // 用于存储已经访问过的节点
    const stack = []; // 用于存储遍历过程中经过的节点
    const cycles = []; // 用于存储所有循环依赖

    // 遍历图中的所有节点
    for (const node in graph) {
      // 如果当前节点未被访问，则进行深度优先搜索
      if (!visited.has(node)) {
        dfs(node, visited, stack, graph, cycles);
      }
    }

    // 返回所有循环依赖
    return cycles;
  }

  const cycles = findCycles(depsMap);

  if (cycles.length) {
    for (const chain of cycles) {
      console.log('Circular dependency detected:');
      console.log(chain.join('\n->'));
      console.log('\n');
      if (process.env.CI === 'true') {
        console.log(
          `::add-message level=error::**检测到循环依赖:**${chain.join('->')}`,
        );
      }
    }
    process.exitCode = 1;
  }
}

main();
