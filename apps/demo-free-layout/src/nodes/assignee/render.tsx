/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { FC } from 'react';

import { usePanelManager } from '@flowgram.ai/panel-manager-plugin';
import {
  Field,
  FieldRenderProps,
  FlowNodeFormData,
  Form,
  FormModelV2,
  useClientContext,
  useNodeRender,
  WorkflowNodeEntity,
} from '@flowgram.ai/free-layout-editor';

import { nodeFormPanelFactory } from '../../components/sidebar';
import { iconAssignee } from '../../assets/icon-assignee';

export const AssigneeRender: FC<{
  node: WorkflowNodeEntity;
}> = (props) => {
  const { node } = props;
  const { selected: focused, nodeRef, selectNode, startDrag, onFocus, onBlur } = useNodeRender();
  const panelManager = usePanelManager();
  const ctx = useClientContext();

  // 状态：控制显示模式

  // 安全地获取节点数据
  if (!node) {
    console.warn('AssigneeRender: 节点不存在');
    return null;
  }

  const nodeData = node.data || {};
  const assignees = Array.isArray(nodeData.assignees) ? nodeData.assignees : [];

  // 获取节点的尺寸信息
  const nodeMeta = node.getNodeMeta();
  const { width = 120, height = 120 } = nodeMeta.size || {};

  // 获取表单模型和控制对象
  const formModel = node.getData(FlowNodeFormData).getFormModel<FormModelV2>();
  const formControl = formModel?.formControl;

  // 点击事件处理 - 区分点击和拖拽，使用双击打开配置面板
  const handleMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    selectNode(e);
  };

  // 双击事件处理 - 打开配置面板并切换显示模式
  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();

    // 打开配置面板
    panelManager.open(nodeFormPanelFactory.key, 'right', {
      props: {
        nodeId: node.id,
      },
    });

    // 切换显示模式
  };

  return (
    <div
      ref={nodeRef}
      data-node-selected={String(focused)}
      onMouseDown={handleMouseDown}
      draggable
      onDragStart={(e) => {
        startDrag(e);
      }}
      onTouchStart={(e) => {
        startDrag(e as unknown as React.MouseEvent);
      }}
      onClick={handleDoubleClick}
      onFocus={onFocus}
      onBlur={onBlur}
      style={{
        width,
        height,
        borderRadius: '50%',
        backgroundColor: '#f0f8ff',
        border: `2px solid ${focused ? '#ff4d4f' : '#1890ff'}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        cursor: 'pointer',
        position: 'relative',
        padding: '8px',
        boxSizing: 'border-box',
        transition: 'all 0.2s ease',
      }}
    >
      <Form control={formControl}>
        <Field name="data.assignees">
          {({ field: { value = [] } }: FieldRenderProps<any[]>) => {
            const currentAssignees = Array.isArray(value) ? value : [];

            return currentAssignees.length === 0 ? (
              // 默认显示图标模式
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '60px',
                  height: '60px',
                }}
              >
                <div style={{ transform: 'scale(1.8)' }}>{iconAssignee}</div>
              </div>
            ) : (
              // 显示负责人详情模式
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px',
                  padding: '4px',
                  width: '100%',
                  height: '100%',
                }}
              >
                {/* 头像展示区域 */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative',
                    flex: 1,
                    width: '100%',
                  }}
                >
                  {currentAssignees.length === 1 && (
                    // 1个人：最大化占满
                    <img
                      key={currentAssignees[0].id}
                      src={currentAssignees[0].avatar}
                      alt={currentAssignees[0].name}
                      style={{
                        width: '80px',
                        height: '80px',
                        borderRadius: '50%',
                        border: '3px solid #fff',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                      }}
                    />
                  )}

                  {currentAssignees.length === 2 && (
                    // 2个人：平均分配，左右排列
                    <>
                      {currentAssignees.map((assignee, index) => (
                        <img
                          key={assignee.id}
                          src={assignee.avatar}
                          alt={assignee.name}
                          style={{
                            width: '50px',
                            height: '50px',
                            borderRadius: '50%',
                            border: '2px solid #fff',
                            boxShadow: '0 1px 4px rgba(0,0,0,0.12)',
                            position: 'absolute',
                            left: index === 0 ? '20%' : '80%',
                            transform: 'translateX(-50%)',
                          }}
                        />
                      ))}
                    </>
                  )}

                  {currentAssignees.length === 3 && (
                    // 3个人：三角形排列
                    <>
                      {currentAssignees.map((assignee, index) => {
                        let top, left;
                        if (index === 0) {
                          // 顶部
                          top = '20%';
                          left = '50%';
                        } else if (index === 1) {
                          // 左下
                          top = '65%';
                          left = '25%';
                        } else {
                          // 右下
                          top = '65%';
                          left = '75%';
                        }

                        return (
                          <img
                            key={assignee.id}
                            src={assignee.avatar}
                            alt={assignee.name}
                            style={{
                              width: '48px',
                              height: '48px',
                              borderRadius: '50%',
                              border: '2px solid #fff',
                              boxShadow: '0 1px 4px rgba(0,0,0,0.12)',
                              position: 'absolute',
                              top,
                              left,
                              transform: 'translate(-50%, -50%)',
                            }}
                          />
                        );
                      })}
                    </>
                  )}

                  {currentAssignees.length >= 4 && (
                    // 4个及以上：只显示前2个
                    <>
                      {currentAssignees.slice(0, 2).map((assignee, index) => (
                        <img
                          key={assignee.id}
                          src={assignee.avatar}
                          alt={assignee.name}
                          style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '50%',
                            border: '2px solid #fff',
                            boxShadow: '0 1px 4px rgba(0,0,0,0.12)',
                            position: 'absolute',
                            left: index === 0 ? '35%' : '65%',
                            transform: 'translateX(-50%)',
                          }}
                        />
                      ))}
                    </>
                  )}
                </div>

                {/* 文字说明区域 */}
                {currentAssignees.length > 1 && (
                  <div
                    style={{
                      fontSize: '9px',
                      color: '#1890ff',
                      fontWeight: 'bold',
                      textAlign: 'center',
                      lineHeight: '1',
                      marginTop: '2px',
                    }}
                  >
                    {currentAssignees.length}人
                  </div>
                )}
              </div>
            );
          }}
        </Field>
      </Form>
    </div>
  );
};
