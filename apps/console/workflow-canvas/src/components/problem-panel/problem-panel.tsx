/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { PanelFactory, usePanelManager } from '@flowgram.ai/panel-manager-plugin';
import { IconButton } from '@douyinfe/semi-ui';
import { IconUploadError, IconClose } from '@douyinfe/semi-icons';
export const PROBLEM_PANEL = 'problem-panel';

export const ProblemPanel = () => {
  const panelManager = usePanelManager();

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        borderRadius: '8px',
        background: 'rgb(251, 251, 251)',
        border: '1px solid rgba(82,100,154, 0.13)',
      }}
    >
      <div style={{ display: 'flex', height: '50px', alignItems: 'center', justifyContent: 'end' }}>
        <IconButton
          type="tertiary"
          theme="borderless"
          icon={<IconClose />}
          onClick={() => panelManager.close(PROBLEM_PANEL)}
        />
      </div>
      <div>problem panel</div>
    </div>
  );
};

export const problemPanelFactory: PanelFactory<void> = {
  key: PROBLEM_PANEL,
  defaultSize: 200,
  render: () => <ProblemPanel />,
};

export const ProblemButton = () => {
  const panelManager = usePanelManager();

  return (
    <IconButton
      type="tertiary"
      theme="borderless"
      icon={<IconUploadError />}
      onClick={() => panelManager.open(PROBLEM_PANEL, 'bottom')}
    />
  );
};
