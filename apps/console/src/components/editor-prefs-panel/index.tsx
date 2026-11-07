/**
 * 编辑器偏好设置弹层（齿轮入口）——约定优于配置（2026-11-05 收敛，2026-11-07 改版）：
 *   · 面板只保留「左侧节点面板（拖拽放入）」一个开关 + 交互偏好 + 「更多」工具行；
 *   · 主题/背景/工具栏位置/强调色等一律走默认（主题跟随应用、工具栏下部居中）；
 *   · 2026-11-07 改版（用户反馈）：风格对齐 Semi——「更多」分区由「行标签 + 小『打开』按钮」
 *     改为整行可点条目（图标 + 标题 + 箭头/开关，命中区整行），只读锁定改为 Switch 行；
 *     标题区用 Semi Tag/Title，间距与字号走统一 CSS（styles/index.css .gaia-prefs-*）。
 */
import { useState } from 'react';

import { usePlaygroundTools } from '@flowgram.ai/free-layout-editor';
import type { InteractiveType as IdeInteractiveType } from '@flowgram.ai/free-layout-editor';
import { Popover, Button, Switch, Tag, Typography, Radio, RadioGroup } from '@douyinfe/semi-ui';
import { IconChevronRight, IconHelpCircle, IconSetting } from '@douyinfe/semi-icons';

import { SchemaEditor } from '../tools/schema-editor';
import { ReportEditor } from '../tools/report-editor';
import { Readonly } from '../tools/readonly';
import {
  InteractiveType,
  getPreferInteractiveType,
  setPreferInteractiveType,
} from '../tools/interactive';
import { ShortcutsHelpModal } from '../shortcuts-help-modal';
import { useLanguage, t } from '../../i18n';
import { EditorPrefs, setEditorPrefs, useEditorPrefs } from '../../editor-prefs';

const { Title: SemiTitle } = Typography;

const Section = ({ label }: { label: string }) => <div className="gaia-prefs-sec">{label}</div>;

export const EditorPrefsPanel = () => {
  useLanguage();
  const prefs = useEditorPrefs();
  const [helpOpen, setHelpOpen] = useState(false);
  // 交互偏好（鼠标/触控板）：2026-11-06 从工具栏「⋯」溢出菜单迁入，存储键不变
  const tools = usePlaygroundTools();
  const [interactiveType, setInteractiveType] = useState<InteractiveType>(
    () => getPreferInteractiveType() as InteractiveType
  );
  const applyInteractive = (type: InteractiveType) => {
    setInteractiveType(type);
    setPreferInteractiveType(type);
    tools.setInteractiveType(type as unknown as IdeInteractiveType);
  };

  const patch = (p: Partial<EditorPrefs>) => setEditorPrefs(p);

  const content = (
    <div className="gaia-prefs-pop" role="group" aria-label={t('prefs.title')}>
      <div className="gaia-prefs-head">
        <SemiTitle heading={6} style={{ margin: 0 }}>
          {t('prefs.title')}
        </SemiTitle>
        {/* 形态标识从顶部栏移入（2026-11-05）：这里是「专家模式」 */}
        <Tag size="small" color="purple">
          {t('workspace.modeExpert')}
        </Tag>
      </div>

      <Section label={t('prefs.secAddNode')} />
      <div className="gaia-prefs-checks">
        <label className="gaia-prefs-check">
          <Switch
            size="small"
            checked={prefs.addPalette}
            onChange={(v) => patch({ addPalette: v })}
          />
          <span>{t('prefs.addPalette')}</span>
        </label>
      </div>

      <Section label={t('prefs.interaction')} />
      <div className="gaia-prefs-row">
        <RadioGroup
          type="button"
          buttonSize="small"
          value={interactiveType}
          onChange={(e) => applyInteractive(e.target.value as InteractiveType)}
        >
          <Radio value={InteractiveType.Mouse}>{t('tool.mouseFriendly')}</Radio>
          <Radio value={InteractiveType.Pad}>{t('tool.touchpadFriendly')}</Radio>
        </RadioGroup>
      </div>

      <Section label={t('prefs.secMore')} />
      <div className="gaia-prefs-actions">
        <Readonly />
        <ReportEditor />
        <SchemaEditor />
        <button type="button" className="gaia-prefs-action" onClick={() => setHelpOpen(true)}>
          <IconHelpCircle size="small" className="gaia-prefs-action-icon" />
          <span className="gaia-prefs-action-label">{t('prefs.help.title')}</span>
          <IconChevronRight size="small" className="gaia-prefs-action-arrow" />
        </button>
      </div>

      <div className="gaia-prefs-note">{t('prefs.note')}</div>
    </div>
  );

  return (
    <>
      <Popover
        content={content}
        trigger="click"
        position="bottomRight"
        showArrow
        className="gaia-prefs-popover"
      >
        <Button
          theme="borderless"
          icon={<IconSetting />}
          aria-label={t('prefs.title')}
          style={{ height: '32px' }}
        />
      </Popover>
      <ShortcutsHelpModal visible={helpOpen} onClose={() => setHelpOpen(false)} />
    </>
  );
};
