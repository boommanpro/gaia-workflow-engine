/**
 * 编辑器偏好设置弹层（齿轮入口）——约定优于配置（2026-11-05 收敛）：
 *   面板只保留「左侧节点面板（拖拽放入）」一个开关 + 「更多」工具行；
 *   主题/背景/工具栏位置/密度/强调色等一律走默认（主题跟随应用、工具栏下部居中），
 *   其余节点添加方式全部默认开启、不再展示开关。
 */
import { useState } from 'react';

import { usePlaygroundTools } from '@flowgram.ai/free-layout-editor';
import type { InteractiveType as IdeInteractiveType } from '@flowgram.ai/free-layout-editor';
import { Popover, Button, Switch, Typography, Radio, RadioGroup } from '@douyinfe/semi-ui';
import { IconSetting } from '@douyinfe/semi-icons';

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

const Row = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="gaia-prefs-row">
    <span className="gaia-prefs-row-label">{label}</span>
    <div className="gaia-prefs-row-ctrl">{children}</div>
  </div>
);

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
      <SemiTitle heading={6} style={{ marginBottom: 4 }}>
        {t('prefs.title')}
      </SemiTitle>

      {/* 形态标识从顶部栏移入（2026-11-05 顶部栏归位）：这里是「专家模式」 */}
      <span
        style={{
          display: 'inline-block',
          fontSize: 10,
          fontWeight: 600,
          color: 'var(--g-editor-accent, #4d53e8)',
          background: 'color-mix(in srgb, var(--g-editor-accent, #4d53e8) 10%, transparent)',
          borderRadius: 4,
          padding: '2px 6px',
          marginBottom: 6,
        }}
      >
        {t('workspace.modeExpert')}
      </span>

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

      <Section label={t('prefs.secWorkspace')} />
      <div className="gaia-prefs-checks">
        <label className="gaia-prefs-check">
          <Switch size="small" checked={prefs.compact} onChange={(v) => patch({ compact: v })} />
          <span>{t('prefs.compactMode')}</span>
        </label>
      </div>
      <div className="gaia-prefs-more">
        <Row label={t('prefs.interaction')}>
          <RadioGroup
            type="button"
            buttonSize="small"
            value={interactiveType}
            onChange={(e) => applyInteractive(e.target.value as InteractiveType)}
          >
            <Radio value={InteractiveType.Mouse}>{t('tool.mouseFriendly')}</Radio>
            <Radio value={InteractiveType.Pad}>{t('tool.touchpadFriendly')}</Radio>
          </RadioGroup>
        </Row>
      </div>

      <Section label={t('prefs.secMore')} />
      <div className="gaia-prefs-more">
        <Row label={t('prefs.readonly')}>
          <Readonly />
        </Row>
        <Row label={t('prefs.report')}>
          <ReportEditor />
        </Row>
        <Row label={t('prefs.dsl')}>
          <SchemaEditor />
        </Row>
        <Row label={t('prefs.help.title')}>
          <Button
            theme="borderless"
            size="small"
            onClick={() => setHelpOpen(true)}
            aria-label={t('prefs.help.title')}
          >
            {t('prefs.moreOpen')}
          </Button>
        </Row>
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
