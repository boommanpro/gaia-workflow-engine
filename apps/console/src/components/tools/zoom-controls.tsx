/**
 * 缩放控件（2026-11-05 工具栏改版）：− / 百分比（下拉直达 50–200%）/ ＋ 三件套，
 * 替代旧 ZoomSelect 单一下拉。同一 usePlaygroundTools 数据源。
 */
import { useState } from 'react';

import { usePlayground, usePlaygroundTools } from '@flowgram.ai/free-layout-editor';
import { Dropdown, IconButton } from '@douyinfe/semi-ui';
import { IconPlus, IconMinus } from '@douyinfe/semi-icons';

import { useLanguage, t } from '../../i18n';

export const ZoomControls = () => {
  const tools = usePlaygroundTools({ maxZoom: 2, minZoom: 0.25 });
  const playground = usePlayground();
  useLanguage();
  const [dropDownVisible, openDropDown] = useState(false);

  return (
    <>
      <IconButton
        icon={<IconMinus />}
        type="tertiary"
        theme="borderless"
        onClick={() => tools.zoomout()}
        aria-label={t('tool.zoomOut')}
      />
      <Dropdown
        position="top"
        trigger="custom"
        visible={dropDownVisible}
        onClickOutSide={() => openDropDown(false)}
        render={
          <Dropdown.Menu>
            <Dropdown.Item onClick={() => playground.config.updateZoom(0.5)}>
              {t('tool.zoomTo', { percent: 50 })}
            </Dropdown.Item>
            <Dropdown.Item onClick={() => playground.config.updateZoom(1)}>
              {t('tool.zoomTo', { percent: 100 })}
            </Dropdown.Item>
            <Dropdown.Item onClick={() => playground.config.updateZoom(1.5)}>
              {t('tool.zoomTo', { percent: 150 })}
            </Dropdown.Item>
            <Dropdown.Item onClick={() => playground.config.updateZoom(2.0)}>
              {t('tool.zoomTo', { percent: 200 })}
            </Dropdown.Item>
          </Dropdown.Menu>
        }
      >
        <button
          className="gaia-zoom-pct"
          onClick={() => openDropDown(true)}
          aria-label={t('tool.zoomTo', { percent: Math.floor(tools.zoom * 100) })}
        >
          {Math.floor(tools.zoom * 100)}%
        </button>
      </Dropdown>
      <IconButton
        icon={<IconPlus />}
        type="tertiary"
        theme="borderless"
        onClick={() => tools.zoomin()}
        aria-label={t('tool.zoomIn')}
      />
    </>
  );
};
