/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { FloatPanel } from './float-panel';
import { panelLayer, leftArea, rightArea, mainArea, bottomArea, globalCSS } from './css';

export const PanelLayer: React.FC<React.PropsWithChildren> = ({ children }) => (
  <div style={panelLayer}>
    <style dangerouslySetInnerHTML={{ __html: globalCSS }} />
    <div className="gedit-flow-panel-left-area" style={leftArea}>
      <div className="gedit-flow-panel-main-area" style={mainArea}>
        {children}
      </div>
      <div className="gedit-flow-panel-bottom-area" style={bottomArea}>
        <FloatPanel area="bottom" />
      </div>
    </div>
    <div className="gedit-flow-panel-right-area" style={rightArea}>
      <FloatPanel area="right" />
    </div>
  </div>
);
