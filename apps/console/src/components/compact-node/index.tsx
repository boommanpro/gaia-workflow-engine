/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { useLayoutEffect, useMemo } from 'react';

import styled from 'styled-components';
import { WorkflowStatus } from '@flowgram.ai/runtime-interface';
import { IconClear, IconTick } from '@douyinfe/semi-icons';

import { useNodeReport } from '../testrun/node-status-bar';
import { getNodeVisual, categoryColorVar } from '../../nodes/node-visuals';
import { deriveBranchesOutputs, deriveConditionOutputs } from '../../nodes/derived-outputs';
import { useNodeRenderContext } from '../../hooks';

/**
 * 紧凑方卡（n8n 风格，docs/node-compact-per-node-2026-11-07.md，2026-11-07 用户确认）。
 *
 * 替代 2026-11-06 的 260px 胶囊方案，交互从全局偏好改为节点级（node-compact-store）：
 * - 卡 = 92×92 方卡（白底圆角 12，图标为实底分类色块 + 白图形），标签外置卡片下方居中；
 * - 状态走「边框光环（NodeWrapper .st-*）+ 右下角徽标」双通道，不占卡内空间；
 * - 静态端口节点：端口由引擎按左/右边缘中心兜底定位，无需处理；
 * - 动态端口节点（useDynamicPort，如 condition）：按与 condition-inputs 相同的契约渲染
 *   [data-port-id] 锚点，updateDynamicPorts 扫描 DOM 后自动建口挂线；
 * - 表单不渲染，但 FormModel 是节点实体数据（FlowNodeFormData），变量引擎同步与校验不依赖 form.render()。
 */

/** 方卡高度：≤2 输出口 92；>2 按 16px/口 扩展（命中区相切不重叠），封顶 140 */
const compactHeight = (portCount: number): number => {
  if (portCount <= 2) return 92;
  return Math.min(140, 92 + (portCount - 2) * 16);
};

const CompactCard = styled.div<{ $height: number }>`
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: ${(p) => p.$height}px;
`;

/** 图标 tile：实底分类色圆角块 + 白图形（2026-11-07 用户确认，与卡片头/变量 chip 同风格） */
const CompactIconTile = styled.span<{ $bg: string }>`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border-radius: 11px;
  background: ${(p) => p.$bg};
  color: #fff;
  line-height: 0;
`;

/** 标签区：卡片外下方居中，不占卡内空间、不影响端口定位 */
const CompactCaption = styled.div`
  position: absolute;
  left: 50%;
  top: calc(100% + 5px);
  transform: translateX(-50%);
  width: 124px;
  text-align: center;
  pointer-events: none;
  display: flex;
  flex-direction: column;
  gap: 1px;
`;

const CompactTitle = styled.span`
  font-size: 12px;
  font-weight: 500;
  line-height: 1.35;
  color: var(--ge-text, #22242e);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

/** 状态徽标：右下角 18px；运行中 conic 旋转环，成功/失败为图标徽章 */
const CompactBadge = styled.span`
  position: absolute;
  right: -8px;
  bottom: -8px;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border-radius: 999px;
  background: var(--ge-surface, #fff);
  box-shadow: 0 0 0 1px var(--ge-border, rgba(6, 7, 9, 0.1)),
    var(--ge-shadow-sm, 0 2px 6px 0 rgba(0, 0, 0, 0.04));

  &.running {
    width: 14px;
    height: 14px;
    border: 2px solid var(--g-nodecat-flow, #2f7df6);
    border-top-color: transparent;
    border-radius: 999px;
    animation: gaia-compact-spin 0.8s linear infinite;
  }

  &.succeeded {
    color: var(--g-nodecat-data, #0e9384);
  }

  &.failed {
    color: #e5404e;
  }

  @keyframes gaia-compact-spin {
    to {
      transform: rotate(360deg);
    }
  }
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

  // 经 form.values 读取以订阅变更（NodeRender 的 formValueDepend 机制），侧栏改名/改条件后方卡标签同步
  const values = form?.values;
  const title: string = values?.title || node.flowNodeType;
  // 2026-11-07 副标题不再展示（「输入 input · score」类参数摘要）；悬停 tooltip 仍可看摘要

  // 动态输出口键：与 form-meta effect 同源（derived-outputs 单源），规则只此一份
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

  const { Icon, category } = getNodeVisual(node.flowNodeType);

  return (
    <CompactCard
      data-testid="gaia.compact-node"
      data-node-title={title}
      $height={compactHeight(Math.max(dynamicKeys.length, 1))}
    >
      <CompactIconTile $bg={categoryColorVar(category)} aria-hidden>
        <Icon size={22} />
      </CompactIconTile>
      <CompactCaption>
        <CompactTitle title={title}>{title}</CompactTitle>
      </CompactCaption>
      {report?.status === WorkflowStatus.Processing && <CompactBadge className="running" />}
      {report?.status === WorkflowStatus.Succeeded && (
        <CompactBadge className="succeeded">
          <IconTick size="small" />
        </CompactBadge>
      )}
      {report?.status === WorkflowStatus.Failed && (
        <CompactBadge className="failed">
          <IconClear size="small" />
        </CompactBadge>
      )}
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
