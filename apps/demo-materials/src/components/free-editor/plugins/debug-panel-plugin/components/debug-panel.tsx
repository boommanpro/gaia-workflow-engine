/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { useState } from 'react';

import styled from 'styled-components';
import { Button, Collapsible, Tabs, Tooltip } from '@douyinfe/semi-ui';
import { IconMinus, IconTerminal } from '@douyinfe/semi-icons';

import { WorkflowJsonEditor } from './workflow-json-editor';
import { FullVariableList } from './full-variable-list';

const PanelWrapper = styled.div`
  position: relative;
  box-shadow: 4px 4px 4px rgba(0, 0, 0, 0.1);
`;

const DebugPanelButton = styled(Button)<{ $isOpen: boolean }>`
  position: absolute;
  top: 0;
  right: 0;
  border-radius: 20px;
  width: ${(props) => (props.$isOpen ? '40px' : '90px')};
  height: ${(props) => (props.$isOpen ? '40px' : '40px')};
  z-index: 999;
  top: ${(props) => (props.$isOpen ? '10px' : '0')};
  right: ${(props) => (props.$isOpen ? '10px' : '0')};
`;

const PanelContainer = styled.div`
  width: 1000px;
  border-radius: 5px;
  background-color: #fff;
  overflow: hidden;
  box-shadow: 4px 4px 4px rgba(0, 0, 0, 0.1);
  z-index: 30;

  .semi-tabs-bar {
    padding-left: 20px;
  }

  .semi-tabs-content {
    padding: 20px;
    height: 80vh;
    overflow: auto;
  }
`;

export function DebugPanel() {
  const [isOpen, setOpen] = useState<boolean>(false);

  return (
    <PanelWrapper>
      <Tooltip content="Toggle Debug Panel">
        <DebugPanelButton
          $isOpen={isOpen}
          theme={isOpen ? 'borderless' : 'light'}
          onClick={() => setOpen((_open) => !_open)}
        >
          {isOpen ? (
            <IconMinus />
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <IconTerminal />
              Debug
            </div>
          )}
        </DebugPanelButton>
      </Tooltip>
      <Collapsible isOpen={isOpen}>
        <PanelContainer>
          <Tabs>
            <Tabs.TabPane itemKey="workflow_json" tab="Workflow JSON">
              <WorkflowJsonEditor />
            </Tabs.TabPane>
            <Tabs.TabPane itemKey="variables" tab="Variable List">
              <FullVariableList />
            </Tabs.TabPane>
          </Tabs>
        </PanelContainer>
      </Collapsible>
    </PanelWrapper>
  );
}
