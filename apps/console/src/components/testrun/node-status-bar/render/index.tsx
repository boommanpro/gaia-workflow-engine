/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { FC, useMemo, useState } from 'react';

import classnames from 'classnames';
import { NodeReport, WorkflowStatus } from '@flowgram.ai/runtime-interface';
import { Tag, Button, Select } from '@douyinfe/semi-ui';
import { IconSpin } from '@douyinfe/semi-icons';

import { NodeStatusHeader } from '../header';
import { NodeStatusGroup } from '../group';
import { IconWarningFill } from '../../../../assets/icon-warning';
import { IconSuccessFill } from '../../../../assets/icon-success';
import { useLanguage, t } from '../../../../i18n';

import styles from './index.module.less';

interface NodeStatusRenderProps {
  report: NodeReport;
}

const msToSeconds = (ms: number): string => (ms / 1000).toFixed(2) + 's';
const displayCount = 6;

export const NodeStatusRender: FC<NodeStatusRenderProps> = ({ report }) => {
  const { status: nodeStatus } = report;
  const [currentSnapshotIndex, setCurrentSnapshotIndex] = useState(0);
  useLanguage();

  const snapshots = report.snapshots || [];
  const currentSnapshot = snapshots[currentSnapshotIndex] || snapshots[0];

  // 节点 5 个状态
  const isNodePending = nodeStatus === WorkflowStatus.Pending;
  const isNodeProcessing = nodeStatus === WorkflowStatus.Processing;
  const isNodeFailed = nodeStatus === WorkflowStatus.Failed;
  const isNodeSucceed = nodeStatus === WorkflowStatus.Succeeded;
  const isNodeCancelled = nodeStatus === WorkflowStatus.Cancelled;

  const tagColor = useMemo(() => {
    if (isNodeSucceed) {
      return styles.nodeStatusSucceed;
    }
    if (isNodeFailed) {
      return styles.nodeStatusFailed;
    }
    if (isNodeProcessing) {
      return styles.nodeStatusProcessing;
    }
  }, [isNodeSucceed, isNodeFailed, isNodeProcessing]);

  const renderIcon = () => {
    if (isNodeProcessing) {
      return <IconSpin spin className={classnames(styles.icon, styles.processing)} />;
    }
    if (isNodeSucceed) {
      return <IconSuccessFill />;
    }
    return <IconWarningFill className={classnames(tagColor, styles.round)} />;
  };
  const renderDesc = () => {
    const getDesc = () => {
      if (isNodeProcessing) {
        return t('nodeStatus.running');
      } else if (isNodePending) {
        return t('nodeStatus.runTerminated');
      } else if (isNodeSucceed) {
        return t('nodeStatus.succeed');
      } else if (isNodeFailed) {
        return t('nodeStatus.failed');
      } else if (isNodeCancelled) {
        return t('nodeStatus.cancelled');
      }
    };

    const desc = getDesc();

    return desc ? <p className={styles.desc}>{desc}</p> : null;
  };
  const renderCost = () => (
    <Tag size="small" className={tagColor}>
      {msToSeconds(report.timeCost)}
    </Tag>
  );

  const renderSnapshotNavigation = () => {
    if (snapshots.length <= 1) {
      return null;
    }

    const count = <p className={styles.count}>{t('nodeStatus.total', { count: snapshots.length })}</p>;

    if (snapshots.length <= displayCount) {
      return (
        <>
          {count}
          <div className={styles.snapshotNavigation}>
            {snapshots.map((_, index) => (
              <Button
                key={index}
                size="small"
                type={currentSnapshotIndex === index ? 'primary' : 'tertiary'}
                onClick={() => setCurrentSnapshotIndex(index)}
                className={classnames(styles.snapshotButton, {
                  [styles.active]: currentSnapshotIndex === index,
                  [styles.inactive]: currentSnapshotIndex !== index,
                })}
              >
                {index + 1}
              </Button>
            ))}
          </div>
        </>
      );
    }

    // 超过5个时，前5个显示为按钮，剩余的放在下拉选择中
    return (
      <>
        {count}
        <div className={styles.snapshotNavigation}>
          {snapshots.slice(0, displayCount).map((_, index) => (
            <Button
              key={index}
              size="small"
              type="tertiary"
              onClick={() => setCurrentSnapshotIndex(index)}
              className={classnames(styles.snapshotButton, {
                [styles.active]: currentSnapshotIndex === index,
                [styles.inactive]: currentSnapshotIndex !== index,
              })}
            >
              {index + 1}
            </Button>
          ))}
          <Select
            value={currentSnapshotIndex >= displayCount ? currentSnapshotIndex : undefined}
            onChange={(value) => setCurrentSnapshotIndex(value as number)}
            className={classnames(styles.snapshotSelect, {
              [styles.active]: currentSnapshotIndex >= displayCount,
              [styles.inactive]: currentSnapshotIndex < displayCount,
            })}
            size="small"
            placeholder={t('nodeStatus.select')}
          >
            {snapshots.slice(displayCount).map((_, index) => {
              const actualIndex = index + displayCount;
              return (
                <Select.Option key={actualIndex} value={actualIndex}>
                  {actualIndex + 1}
                </Select.Option>
              );
            })}
          </Select>
        </div>
      </>
    );
  };

  if (!report) {
    return null;
  }

  return (
    <NodeStatusHeader
      header={
        <>
          {renderIcon()}
          {renderDesc()}
          {renderCost()}
        </>
      }
    >
      <div className={styles.container}>
        {isNodeFailed && currentSnapshot?.error && (
          <div className={styles.error}>{currentSnapshot.error}</div>
        )}
        {renderSnapshotNavigation()}
        <NodeStatusGroup title={t('nodeStatus.inputs')} data={currentSnapshot?.inputs} />
        <NodeStatusGroup title={t('nodeStatus.outputs')} data={currentSnapshot?.outputs} />
        <NodeStatusGroup title={t('nodeStatus.branch')} data={currentSnapshot?.branch} optional />
        <NodeStatusGroup title={t('nodeStatus.data')} data={currentSnapshot?.data} optional />
      </div>
    </NodeStatusHeader>
  );
};
