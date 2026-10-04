/**
 * 服务端连接状态标识（参考 tts-skill 的实现）。
 *
 * - 服务端正常时**不显示任何图标**，不占用界面；
 * - 仅在「检测中」（灰色旋转）与「未连接」（红色信号图标）时显示；
 * - 文案收敛到 title / aria-label，鼠标悬停可见；
 * - 未连接时点击弹出配置弹窗，可自定义服务端地址（localStorage 持久化）；
 * - 保存后自动刷新，让全站以新的地址重新拉取数据。
 */
import React, { useState } from 'react';
import { Modal, Input, Button } from '@douyinfe/semi-ui';
import { IconWifi, IconLoading } from '@douyinfe/semi-icons';
import { useHealthCheck } from '../hooks/useHealthCheck';
import { getApiBaseUrl, updateApiBaseUrl } from '../utils/apiConfig';
import { t } from '../i18n';

const ACCENT = '#4d53e8';
const DEFAULT_BASE_URL = 'http://127.0.0.1:48080/api';

export const ConnectionStatus: React.FC = () => {
  const { status } = useHealthCheck();
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState('');

  const openConfig = () => {
    setUrl(getApiBaseUrl());
    setOpen(true);
  };

  const handleSave = () => {
    const next = url.trim();
    if (next) {
      updateApiBaseUrl(next);
    }
    setOpen(false);
    // 全站以新地址重新拉取数据
    window.location.reload();
  };

  const handleReset = () => {
    localStorage.removeItem('apiBaseUrl');
    setUrl(DEFAULT_BASE_URL);
  };

  // 服务端正常时完全不显示，保持界面干净
  if (status === 'online') return null;

  const offline = status === 'offline';
  const iconColor = offline ? '#f53f3f' : '#999';
  const label = offline ? t('status.offline') : t('status.checking');

  return (
    <>
      <button
        type="button"
        title={label}
        aria-label={label}
        onClick={() => {
          if (offline) openConfig();
        }}
        className="flex h-8 w-8 items-center justify-center rounded-full transition-colors"
        style={{
          border: 'none',
          background: 'transparent',
          color: iconColor,
          cursor: offline ? 'pointer' : 'default',
          padding: 0,
        }}
        onMouseEnter={(e) => {
          if (offline) e.currentTarget.style.background = '#f5f5f7';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'transparent';
        }}
      >
        {offline ? (
          <IconWifi size="default" />
        ) : (
          <span className="flex animate-spin">
            <IconLoading size="default" />
          </span>
        )}
      </button>

      <Modal
        title={t('serverConfig.title')}
        visible={open}
        onCancel={() => setOpen(false)}
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button theme="borderless" onClick={handleReset}>
              {t('Reset')}
            </Button>
            <Button theme="borderless" onClick={() => setOpen(false)}>
              {t('Cancel')}
            </Button>
            <Button theme="solid" style={{ background: ACCENT }} onClick={handleSave}>
              {t('serverConfig.saveReconnect')}
            </Button>
          </div>
        }
      >
        <p style={{ margin: '0 0 12px', color: '#666', fontSize: 13, lineHeight: 1.6 }}>
          {t('serverConfig.desc')}
        </p>
        <Input
          value={url}
          onChange={setUrl}
          placeholder="http://127.0.0.1:48080/api"
          prefix={t('status.serverConfig')}
        />
      </Modal>
    </>
  );
};

export default ConnectionStatus;