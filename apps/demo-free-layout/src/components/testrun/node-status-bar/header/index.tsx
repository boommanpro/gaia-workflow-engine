import React, { useState } from 'react';

import { IconChevronDown } from '@douyinfe/semi-icons';

import { useNodeRenderContext } from '../../../../hooks';
import { NodeStatusHeaderContentStyle, NodeStatusHeaderStyle } from './style';

interface NodeStatusBarProps {
  header?: React.ReactNode;
  defaultShowDetail?: boolean;
  extraBtns?: React.ReactNode[];
}

export const NodeStatusHeader: React.FC<React.PropsWithChildren<NodeStatusBarProps>> = ({
  header,
  defaultShowDetail,
  children,
  extraBtns = [],
}) => {
  const [showDetail, setShowDetail] = useState(defaultShowDetail);
  const { selectNode } = useNodeRenderContext();

  const handleToggleShowDetail = (e: React.MouseEvent) => {
    e.stopPropagation();
    selectNode(e);
    setShowDetail(!showDetail);
  };

  return (
    <NodeStatusHeaderStyle
      // 必须要禁止 down 冒泡，防止判定圈选和 node hover（不支持多边形）
      onMouseDown={(e) => e.stopPropagation()}
    >
      <NodeStatusHeaderContentStyle
        className={showDetail ? 'status-header-opened' : ''}
        // 必须要禁止 down 冒泡，防止判定圈选和 node hover（不支持多边形）
        onMouseDown={(e) => e.stopPropagation()}
        // 其他事件统一走点击事件，且也需要阻止冒泡
        onClick={handleToggleShowDetail}
      >
        <div className="status-title">
          {header}
          {extraBtns.length > 0 ? extraBtns : null}
        </div>
        <div className="status-btns">
          <IconChevronDown className={showDetail ? 'is-show-detail' : ''} />
        </div>
      </NodeStatusHeaderContentStyle>
      {showDetail ? children : null}
    </NodeStatusHeaderStyle>
  );
};
