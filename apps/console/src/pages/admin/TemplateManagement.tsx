/**
 * TemplateManagement — 模板管理页面
 * 表格展示模板列表，支持新建、编辑元数据、删除
 * 点击"打开编辑器"进入可视化编辑
 */
import { useEffect, useRef, useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { Modal, Toast } from '@douyinfe/semi-ui';
import { workflowApi, type GaiaWorkflowTemplate } from '../../services/workflow-api';
import { emptyWorkflowData } from '../../initial-data';
import type { CSSProperties } from 'react';
import { useLanguage, t } from '../../i18n';
import type { AdminOutletContext } from './AdminLayout';

const ACCENT = 'var(--g-accent)';

interface TemplateForm {
  templateName: string;
  templateCode: string;
  templateDesc: string;
}

const EMPTY_FORM: TemplateForm = {
  templateName: '',
  templateCode: '',
  templateDesc: '',
};

/* ---------------- Helpers ---------------- */

const formatDateTime = (iso?: string): string => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

/* ---------------- Component ---------------- */

export const TemplateManagement = () => {
  const navigate = useNavigate();
  useLanguage();
  const [templates, setTemplates] = useState<GaiaWorkflowTemplate[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<GaiaWorkflowTemplate | null>(null);
  const [templateForm, setTemplateForm] = useState<TemplateForm>(EMPTY_FORM);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const list = await workflowApi.listTemplates();
      setTemplates(list || []);
    } catch (err) {
      console.error('Failed to load templates:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openCreateModal = () => {
    setEditingTemplate(null);
    setTemplateForm(EMPTY_FORM);
    setShowCreateModal(true);
  };

  const openEditModal = (tpl: GaiaWorkflowTemplate) => {
    setEditingTemplate(tpl);
    setTemplateForm({
      templateName: tpl.templateName || '',
      templateCode: tpl.templateCode || '',
      templateDesc: tpl.templateDesc || '',
    });
    setShowCreateModal(true);
  };

  const closeModal = () => {
    setShowCreateModal(false);
    setEditingTemplate(null);
    setTemplateForm(EMPTY_FORM);
  };

  const handleSubmit = async () => {
    if (!templateForm.templateName.trim() || !templateForm.templateCode.trim()) {
      alert(t('admin.validate.nameAndCode'));
      return;
    }
    setSubmitting(true);
    try {
      if (editingTemplate) {
        await workflowApi.updateTemplate({
          id: editingTemplate.id,
          templateCode: editingTemplate.templateCode,
          templateName: templateForm.templateName.trim(),
          templateDesc: templateForm.templateDesc.trim(),
          templateData: editingTemplate.templateData,
        });
      } else {
        await workflowApi.createTemplate({
          templateName: templateForm.templateName.trim(),
          templateCode: templateForm.templateCode.trim(),
          templateDesc: templateForm.templateDesc.trim(),
          templateData: JSON.stringify(emptyWorkflowData),
        });
      }
      closeModal();
      await loadData();
    } catch (err) {
      console.error('Submit failed:', err);
      alert(t('admin.saveFailed') + (err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = (tpl: GaiaWorkflowTemplate) => {
    if (tpl.id == null) return;
    Modal.confirm({
      title: t('admin.deleteTemplate.title'),
      content: t('admin.deleteTemplate.confirm', { name: tpl.templateName }),
      okType: 'danger',
      onOk: async () => {
        try {
          await workflowApi.deleteTemplate(tpl.id);
          await loadData();
          Toast.success(t('admin.deleteSuccess'));
        } catch (err) {
          console.error('Delete failed:', err);
          Toast.error(t('admin.deleteFailed') + (err as Error).message);
        }
      },
    });
  };

  const handleOpenEditor = (tpl: GaiaWorkflowTemplate) => {
    navigate(`/template-editor/${tpl.templateCode}`);
  };

  // 将「新建」按钮注册到顶栏标题右侧
  const { setHeaderAction } = useOutletContext<AdminOutletContext>();
  const createHandlerRef = useRef(openCreateModal);
  createHandlerRef.current = openCreateModal;
  const createLabel = t('admin.createTemplate');
  useEffect(() => {
    setHeaderAction({ label: createLabel, onClick: () => createHandlerRef.current() });
    return () => setHeaderAction(null);
  }, [setHeaderAction, createLabel]);

  return (
    <div style={{ color: 'var(--g-text)' }}>
      {/* ---------- Table card ---------- */}
      <div style={tableCardStyle}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
          <thead>
            <tr>
              {[
                t('admin.template.name'),
                t('admin.template.code'),
                t('admin.template.desc'),
                t('admin.template.createdAt'),
                t('admin.template.actions'),
              ].map((h) => (
                <th key={h} style={thStyle}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} style={emptyTdStyle}>{t('Loading')}</td>
              </tr>
            ) : templates.length === 0 ? (
              <tr>
                <td colSpan={5} style={emptyTdStyle}>{t('admin.noData')}</td>
              </tr>
            ) : (
              templates.map((tpl) => (
                <tr key={tpl.id ?? tpl.templateCode} style={{ borderTop: '1px solid var(--g-line-soft)' }}>
                  <td style={tdStyle}>{tpl.templateName}</td>
                  <td style={{ ...tdStyle, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: 13, color: 'var(--g-text-sub)' }}>{tpl.templateCode}</td>
                  <td style={{ ...tdStyle, color: 'var(--g-text-sub)', maxWidth: 180 }}>{tpl.templateDesc || '—'}</td>
                  <td style={{ ...tdStyle, color: 'var(--g-text-sub)', whiteSpace: 'nowrap' }}>{formatDateTime(tpl.createdAt)}</td>
                  <td style={{ ...tdStyle, whiteSpace: 'nowrap' }}>
                    <button onClick={() => openEditModal(tpl)} style={actionBtnBlueStyle}>{t('Edit')}</button>
                    <button onClick={() => handleOpenEditor(tpl)} style={actionBtnPurpleStyle}>{t('admin.openEditor')}</button>
                    <button onClick={() => handleDelete(tpl)} style={actionBtnRedStyle}>{t('Delete')}</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ---------- Create/Edit Modal ---------- */}
      {showCreateModal && (
        <div onClick={closeModal} style={modalOverlayStyle}>
          <div onClick={(e) => e.stopPropagation()} style={modalCardStyle}>
            <h2 style={{ margin: '0 0 22px 0', fontSize: 18, fontWeight: 700, letterSpacing: '-0.01em' }}>
              {editingTemplate ? t('admin.modal.editTemplate') : t('admin.modal.createTemplate')}
            </h2>

            <div style={{ marginBottom: 16 }}>
              <label style={fieldLabelStyle}>{t('admin.modal.templateName')} <span style={{ color: 'var(--g-danger)' }}>*</span></label>
              <input
                type="text"
                value={templateForm.templateName}
                onChange={(e) => setTemplateForm({ ...templateForm, templateName: e.target.value })}
                style={inputStyle}
                placeholder={t('admin.modal.placeholder.name')}
              />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={fieldLabelStyle}>{t('admin.modal.templateCode')} <span style={{ color: 'var(--g-danger)' }}>*</span></label>
              <input
                type="text"
                value={templateForm.templateCode}
                onChange={(e) => setTemplateForm({ ...templateForm, templateCode: e.target.value })}
                style={editingTemplate ? { ...inputStyle, background: 'var(--g-bg-sunken)', color: 'var(--g-text-muted)', cursor: 'not-allowed' } : inputStyle}
                placeholder={t('admin.modal.placeholder.code')}
                disabled={!!editingTemplate}
              />
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={fieldLabelStyle}>{t('admin.modal.templateDesc')}</label>
              <textarea
                value={templateForm.templateDesc}
                onChange={(e) => setTemplateForm({ ...templateForm, templateDesc: e.target.value })}
                style={{ ...inputStyle, resize: 'vertical', minHeight: 60 }}
                placeholder={t('admin.modal.placeholder.desc')}
                rows={3}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
              <button onClick={closeModal} style={cancelBtnStyle}>{t('Cancel')}</button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                style={{ ...submitBtnStyle, opacity: submitting ? 0.6 : 1, cursor: submitting ? 'not-allowed' : 'pointer' }}
              >
                {submitting ? t('Submitting') : t('Submit')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TemplateManagement;

/* ---------------- Styles ---------------- */

const tableCardStyle: CSSProperties = {
  background: 'var(--g-bg-raised)',
  borderRadius: 12,
  boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.04)',
  overflow: 'hidden',
};

const thStyle: CSSProperties = {
  textAlign: 'left',
  padding: '12px 16px',
  fontSize: 13,
  fontWeight: 600,
  color: 'var(--g-text-sub)',
  background: 'var(--g-bg-sunken)',
  whiteSpace: 'nowrap',
};

const tdStyle: CSSProperties = {
  padding: '14px 16px',
  fontSize: 14,
  verticalAlign: 'middle',
};

const emptyTdStyle: CSSProperties = {
  padding: '48px 16px',
  textAlign: 'center',
  color: 'var(--g-text-muted)',
  fontSize: 14,
};

const actionBtnBase: CSSProperties = {
  background: 'transparent',
  border: 'none',
  padding: '4px 8px',
  fontSize: 13,
  fontWeight: 500,
  cursor: 'pointer',
  marginRight: 4,
};

const actionBtnBlueStyle: CSSProperties = { ...actionBtnBase, color: 'var(--g-link)' };
const actionBtnPurpleStyle: CSSProperties = { ...actionBtnBase, color: ACCENT };
const actionBtnRedStyle: CSSProperties = { ...actionBtnBase, color: 'var(--g-danger)', marginRight: 0 };

const modalOverlayStyle: CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: 'var(--g-overlay)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000,
  padding: 24,
};

const modalCardStyle: CSSProperties = {
  background: 'var(--g-bg-raised)',
  borderRadius: 12,
  padding: 28,
  width: 480,
  maxWidth: '100%',
  boxShadow: '0 20px 50px -15px rgba(0,0,0,0.25)',
  boxSizing: 'border-box',
};

const fieldLabelStyle: CSSProperties = {
  display: 'block',
  marginBottom: 7,
  fontSize: 13,
  fontWeight: 600,
  color: 'var(--g-text)',
};

const inputStyle: CSSProperties = {
  width: '100%',
  padding: '9px 12px',
  background: 'var(--g-bg-sunken)',
  border: '1px solid var(--g-line)',
  borderRadius: 8,
  fontSize: 14,
  color: 'var(--g-text)',
  outline: 'none',
  boxSizing: 'border-box',
  fontFamily: 'inherit',
};

const cancelBtnStyle: CSSProperties = {
  padding: '9px 20px',
  borderRadius: 8,
  border: '1px solid var(--g-line)',
  background: 'var(--g-bg-raised)',
  color: 'var(--g-text)',
  fontSize: 14,
  fontWeight: 500,
  cursor: 'pointer',
};

const submitBtnStyle: CSSProperties = {
  padding: '9px 24px',
  borderRadius: 8,
  border: 'none',
  background: ACCENT,
  color: 'var(--g-accent-fg)',
  fontSize: 14,
  fontWeight: 600,
  cursor: 'pointer',
};
