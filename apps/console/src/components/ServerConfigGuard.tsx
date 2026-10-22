/**
 * ServerConfigGuard —— 后端连接守卫。
 *
 * 挂载时探活 /workflow/health：未连接则弹窗让用户配置服务端地址，
 * 已连接则直接渲染子内容。从 AdminLayout 抽出：设置区与工作流管理页共用。
 */
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Modal, Input, Button as SemiButton } from '@douyinfe/semi-ui';

import { workflowApi } from '../services/workflow-api';
import { getApiBaseUrl, updateApiBaseUrl } from '../utils/apiConfig';
import { useLanguage, t } from '../i18n';
import { CHAT } from '../chat/theme';

export const ServerConfigGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const navigate = useNavigate();
  useLanguage();
  const [showServerConfig, setShowServerConfig] = useState(false);
  const [serverUrl, setServerUrl] = useState('');
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    workflowApi.health().then(() => setChecking(false)).catch(() => {
      // 后端未连接，自动弹窗让用户配置服务端地址
      setChecking(false);
      setServerUrl(getApiBaseUrl());
      setShowServerConfig(true);
    });
  }, []);

  if (checking) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: CHAT.textMuted, fontSize: 15 }}>
        {t('admin.connecting')}
      </div>
    );
  }

  return (
    <>
      {children}

      {/* 后端未连接时弹窗配置服务端地址 */}
      <Modal
        title={t('serverConfig.title')}
        visible={showServerConfig}
        closable={false}
        maskClosable={false}
        footer={null}
        width={480}
      >
        <div style={{ padding: '8px 0' }}>
          <p style={{ fontSize: 14, color: CHAT.textSub, marginBottom: 16, lineHeight: 1.6 }}>
            {t('serverConfig.desc')}
          </p>
          <Input
            value={serverUrl}
            onChange={(v) => setServerUrl(v)}
            placeholder="http://127.0.0.1:48080/api"
            style={{ width: '100%', marginBottom: 16 }}
          />
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <SemiButton
              onClick={() => {
                setShowServerConfig(false);
                navigate('/chat');
              }}
              style={{ borderRadius: 6 }}
            >
              {t('serverConfig.returnHome')}
            </SemiButton>
            <SemiButton
              theme="solid"
              style={{ background: CHAT.accent, color: CHAT.accentFg, borderRadius: 6 }}
              onClick={() => {
                if (serverUrl.trim()) {
                  updateApiBaseUrl(serverUrl.trim());
                  window.location.reload();
                }
              }}
            >
              {t('serverConfig.saveReconnect')}
            </SemiButton>
          </div>
        </div>
      </Modal>
    </>
  );
};

export default ServerConfigGuard;
