/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { useLayoutEffect, useMemo } from 'react';

import styled from 'styled-components';
import { WorkflowStatus } from '@flowgram.ai/runtime-interface';

import { useNodeReport } from '../testrun/node-status-bar';
import { deriveBranchesOutputs, deriveConditionOutputs } from '../../nodes/derived-outputs';
import { useNodeRenderContext } from '../../hooks';
import { getIcon, getSubtitle } from '../../form-components/form-header/utils';

/**
 * 紧凑密度节点卡（docs/node-compact-mode-redesign-2026-11-06.md 方案 A，2026-11-06 用户确认）。
 *
 * 独立渲染分支，不做 CSS 硬压：
 * - 胶囊 = 分类色芯片 + 标题 + 运行状态徽标；表单不渲染，但 FormModel 是节点实体数据
 *   （FlowNodeFormData），变量引擎同步与校验不依赖 form.render()；
 * - 静态端口节点：端口由引擎按左/右边缘中心兜底定位，无需处理；
 * - 动态端口节点（useDynamicPort，如 condition）：按与 condition-inputs 相同的契约渲染
 *   [data-port-id] 锚点，updateDynamicPorts 扫描 DOM 后自动建口挂线。
 */

/** 试运行状态徽标色（口径与 form-header 的 statusDotColor 一致） */
const statusDotColor = (status?: WorkflowStatus): string | null => {
  if (!status) return null;
  if (status === WorkflowStatus.Succeeded) return 'var(--g-nodecat-data, #0e9384)';
  if (status === WorkflowStatus.Failed) return '#e5404e';
  if (status === WorkflowStatus.Processing) return 'var(--g-nodecat-flow, #2f7df6)';
  if (status === WorkflowStatus.Cancelled) return 'var(--ge-text-2, #7b8090)';
  return null;
};

/** 胶囊高度：单口 36；多口按 16px/口 扩展（命中区相切不重叠），封顶 96 */
const compactHeight = (portCount: number): number => {
  if (portCount <= 1) return 36;
  return Math.min(96, portCount * 16 + 16);
};

const CompactCard = styled.div<{ $height: number }>`
  position: relative;
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  height: ${(p) => p.$height}px;
`;

const CompactTitle = styled.span`
  flex: 1;
  min-width: 0;
  font-size: 13px;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const CompactDot = styled.span`
  width: 7px;
  height: 7px;
  border-radius: 999px;
  flex: none;
`;

/** 动态输出口锚点：零尺寸标记，端口圆点由 WorkflowPortRender 传送进来（同 ConditionPort 契约） */
const RailSlot = styled.span`
  position: absolute;
  right: -12px;
  transform: translateY(-50%);
`;

export const CompactNodeCard = () => {
  const { node, form } = useNodeRenderContext();
  const report = useNodeReport();

  // 经 form.values 读取以订阅变更（NodeRender 的 formValueDepend 机制），侧栏改名/改条件后胶囊同步
  const values = form?.values;
  const title: string = values?.title || node.flowNodeType;
  const subtitle = getSubtitle(node);

  // 动态输出口键：与 form-meta effect 同源（derived-outputs 单源），rules 只此一份
  const dynamicKeys = useMemo<string[]>(() => {
    const meta = node.getNodeMeta();
    if (!meta.useDynamicPort) return [];
    if (node.flowNodeType === 'condition') {
      return Object.keys(deriveConditionOutputs(values?.conditions).properties);
    }
    if (node.flowNodeType === 'branches') {
      return Object.keys(deriveBranchesOutputs(values?.branches).properties);
    }
    return [];
  }, [node, values?.conditions, values?.branches]);

  // 与 condition-inputs 相同的兜底：挂载/键变化后重扫锚点（SizeData 变化时引擎也会自行重扫）
  useLayoutEffect(() => {
    if (!node.getNodeMeta().useDynamicPort || dynamicKeys.length === 0) {
      return;
    }
    const raf = window.requestAnimationFrame(() => {
      node.ports.updateDynamicPorts();
    });
    return () => window.cancelAnimationFrame(raf);
  }, [node, dynamicKeys.join(',')]);

  const dot = statusDotColor(report?.status);

  return (
    <CompactCard
      data-testid="gaia.compact-node"
      data-node-title={title}
      $height={compactHeight(Math.max(dynamicKeys.length, 1))}
    >
      {getIcon(node)}
      <CompactTitle title={subtitle ? `${title} · ${subtitle}` : title}>{title}</CompactTitle>
      {dot && <CompactDot style={{ background: dot }} />}
      {dynamicKeys.map((key, idx) => (
        <RailSlot
          key={key}
          data-port-id={key}
          data-port-type="output"
          style={{ top: `${((idx + 0.5) / dynamicKeys.length) * 100}%` }}
        />
      ))}
    </CompactCard>
  );
};
