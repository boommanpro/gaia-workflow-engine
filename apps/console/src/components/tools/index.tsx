/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 *
 * 画布工具栏（2026-11-05 单胶囊分组改版，对标 Coze/Dify 底部居中胶囊）：
 *   历史（撤销/重做）· 视图（缩放三件套/适应）· 布局（自动布局）·
 *   变量 Dock · 运行（测试用例/运行历史/保存/试运行）。
 *   2026-11-07 用户决策：去掉小地图开关（小地图常显）与「添加节点」按钮（添加走左侧面板/右键/拖线）。
 *   2026-11-06 用户决策：「⋯ 更多」溢出菜单删除（只有交互模式两项，没有使用价值）——
 *   交互偏好（鼠标/触控板）迁入齿轮设置弹层「工作区」分组，存储键不变。
 * 文档级动作（发布/版本历史）不在画布工具栏——归顶部栏。
 * 位置由 gaia.editor.prefs.toolbarPosition 控制，默认下部居中。
 */
import { useState } from 'react';

import { useClientContext } from '@flowgram.ai/free-layout-editor';
import { Divider } from '@douyinfe/semi-ui';

import { VariableDockButton } from '../variable-dock';
import { TestRunButton } from '../testrun/testrun-button';
import { TestCaseSheetButton } from '../test-case-panel';
import { useLanguage } from '../../i18n';
import { useEditorPrefs } from '../../editor-prefs';
import { ZoomControls } from './zoom-controls';
import { useBottomPanelAvoidance } from './use-bottom-panel-avoidance';
import { UndoRedo } from './undo-redo';
import { ToolContainer, ToolSection } from './styles';
import { Save } from './save';
import { MinimapSwitch } from './minimap-switch';
import { Minimap } from './minimap';
import { FitView } from './fit-view';
import { AutoLayout } from './auto-layout';
import { RunHistoryButton } from '../run-history';

const GroupDivider = () => (
  <Divider layout="vertical" style={{ height: '16px', margin: '0 2px' }} />
);

export const DemoTools = ({
  hideSaveAndTestRun = false,
  hideSave = false,
  hideRunHistory = false,
  testWorkflowCode,
}: {
  hideSaveAndTestRun?: boolean;
  hideSave?: boolean;
  hideRunHistory?: boolean;
  /** 测试用例入口归属的工作流编码（2026-11-04 用户决策：测试用例收进工具栏运行组） */
  testWorkflowCode?: string;
} = {}) => {
  const { playground, document } = useClientContext();
  useLanguage();
  const prefs = useEditorPrefs();
  const [minimapVisible, setMinimapVisible] = useState(true);
  // bottom 区面板（变量 Dock / 运行历史）展开时，底部居中工具栏上移避让
  // （其他工具栏位置不与 bottom 面板冲突）
  const bottomPanelHeight = useBottomPanelAvoidance();

  return (
    <>
      {minimapVisible && <Minimap visible />}
      <ToolContainer
        className="demo-free-layout-tools"
        data-position={prefs.toolbarPosition}
        style={
          prefs.toolbarPosition === 'center' && bottomPanelHeight > 0
            ? { bottom: bottomPanelHeight + 12 }
            : undefined
        }
      >
        <ToolSection>
          {/* 历史 */}
          <UndoRedo />
          <GroupDivider />
          {/* 视图 */}
          <ZoomControls />
          <FitView />
          <GroupDivider />
          {/* 布局 + 小地图（2026-11-07 用户决策：小地图开关放自动布局左侧） */}
          <MinimapSwitch minimapVisible={minimapVisible} setMinimapVisible={setMinimapVisible} />
          <AutoLayout />
          {/* 变量 + 运行同一分组（2026-11-07 用户决策） */}
          <GroupDivider />
          <VariableDockButton />
          {/* 运行（2026-11-06 用户决策：测试用例移到运行历史前） */}
          {(!hideRunHistory || !hideSaveAndTestRun) && (
            <>
              {testWorkflowCode && (
                <TestCaseSheetButton
                  variant="toolbar"
                  workflowCode={testWorkflowCode}
                  getCanvasJson={() => {
                    try {
                      return document?.toJSON() ?? null;
                    } catch {
                      return null;
                    }
                  }}
                  getNodes={() =>
                    (document?.getAllNodes() ?? []).map((n) => ({
                      id: n.id,
                      type: String(n.flowNodeType),
                      title: (n.toJSON().data as { title?: string } | undefined)?.title,
                    }))
                  }
                />
              )}
              {!hideRunHistory && <RunHistoryButton />}
              {!hideSaveAndTestRun && !hideSave && <Save disabled={playground.config.readonly} />}
              {!hideSaveAndTestRun && <TestRunButton disabled={playground.config.readonly} />}
            </>
          )}
        </ToolSection>
      </ToolContainer>
    </>
  );
};
