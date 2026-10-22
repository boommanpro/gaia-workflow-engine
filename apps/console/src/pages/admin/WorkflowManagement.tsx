/**
 * WorkflowManagement — 工作流管理页面（应用态一级页面）
 *
 * 表格展示工作流列表（含所属项目列）；行操作收进「更多」菜单：
 * 打开编辑器 / 编辑信息 / API 文档 / 删除。
 * 「发起会话」已移除——携带工作流开新会话统一走对话页的「新建任务 → 继承已有工作流」。
 */
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { Modal, Toast, Dropdown } from '@douyinfe/semi-ui';
import { IconMore } from '@douyinfe/semi-icons';
import { workflowApi, type GaiaWorkflow, type GaiaWorkflowTemplate } from '../../services/workflow-api';
import { useAgent } from '../../agent/AgentContext';
import { useLanguage, t } from '../../i18n';
import { ApiDocModal } from '../../components/ApiDocModal';
import type { AdminOutletContext } from './AdminLayout';

const ACCENT = 'var(--g-accent)';

interface WorkflowForm {
  workflowName: string;
  workflowCode: string;
  workflowDesc: string;
  templateCode: string;
  folderId: number | null;
}

const EMPTY_FORM: WorkflowForm = {
  workflowName: '',
  workflowCode: '',
  workflowDesc: '',
  templateCode: '',
  folderId: null,
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

export const WorkflowManagement = () => {
  const navigate = useNavigate();
  useLanguage();
  const { folders } = useAgent();
  const [workflows, setWorkflows] = useState<GaiaWorkflow[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingWorkflow, setEditingWorkflow] = useState<GaiaWorkflow | null>(null);
  const [workflowForm, setWorkflowForm] = useState<WorkflowForm>(EMPTY_FORM);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [templates, setTemplates] = useState<GaiaWorkflowTemplate[]>([]);
  // 「API 文档」行内弹窗：选中的工作流；null 表示关闭
  const [apiDocsWorkflow, setApiDocsWorkflow] = useState<GaiaWorkflow | null>(null);

  const folderName = (folderId?: number | null): string =>
    folderId == null ? t('admin.workflow.unfiled') : folders.find((f) => f.id === folderId)?.name || t('admin.workflow.unfiled');

  const loadData = async () => {
    setLoading(true);
    try {
      const wfList = await workflowApi.listWorkflows();
      setWorkflows(wfList || []);
    } catch (err) {
      console.error('Failed to load data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openCreateModal = async () => {
    setEditingWorkflow(null);
    setWorkflowForm(EMPTY_FORM);
    setShowCreateModal(true);
    // 加载模板列表供下拉选择
    if (templates.length === 0) {
      try {
        const list = await workflowApi.listTemplates();
        setTemplates(list || []);
      } catch (err) {
        console.error('Failed to load templates:', err);
      }
    }
  };

  const openEditModal = (wf: GaiaWorkflow) => {
    setEditingWorkflow(wf);
    setWorkflowForm({
      workflowName: wf.workflowName || '',
      workflowCode: wf.workflowCode || '',
      workflowDesc: wf.workflowDesc || '',
      templateCode: '',
      folderId: wf.folderId ?? null,
    });
    setShowCreateModal(true);
  };

  const closeModal = () => {
    setShowCreateModal(false);
    setEditingWorkflow(null);
    setWorkflowForm(EMPTY_FORM);
  };

  const handleSubmit = async () => {
    if (!workflowForm.workflowName.trim() || !workflowForm.workflowCode.trim()) {
      alert(t('admin.validate.nameAndCode'));
      return;
    }
    setSubmitting(true);
    try {
      if (editingWorkflow) {
        await workflowApi.updateWorkflow({
          id: editingWorkflow.id,
          workflowCode: editingWorkflow.workflowCode,
          workflowName: workflowForm.workflowName.trim(),
          workflowDesc: workflowForm.workflowDesc.trim(),
          // 编辑弹窗始终携带 folderId（含 null=移出项目）：后端据此显式 set folder_id
          folderId: workflowForm.folderId,
        });
      } else {
        await workflowApi.createWorkflow({
          workflowName: workflowForm.workflowName.trim(),
          workflowCode: workflowForm.workflowCode.trim(),
          workflowDesc: workflowForm.workflowDesc.trim(),
          templateCode: workflowForm.templateCode || undefined,
          folderId: workflowForm.folderId,
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

  const handleDelete = (wf: GaiaWorkflow) => {
    if (wf.id == null) return;
    Modal.confirm({
      title: t('admin.deleteWorkflow.title'),
      content: t('admin.deleteWorkflow.confirm', { name: wf.workflowName }),
      okType: 'danger',
      onOk: async () => {
        try {
          if (wf.id != null) await workflowApi.deleteWorkflow(wf.id);
          await loadData();
          Toast.success(t('admin.deleteSuccess'));
        } catch (err) {
          console.error('Delete failed:', err);
          Toast.error(t('admin.deleteFailed') + (err as Error).message);
        }
      },
    });
  };

  const handleOpenEditor = (wf: GaiaWorkflow) => {
    // 带上来源，编辑器「返回」才知道回到哪里
    navigate(`/editor/${wf.workflowCode}`, { state: { from: '/workflows' } });
  };

  const handleOpenApiDocs = (wf: GaiaWorkflow) => {
    // 原位打开 API 文档弹窗，不再跳转到独立 /docs 页面
    setApiDocsWorkflow(wf);
  };

  // 将「新建」按钮注册到顶栏标题右侧
  const { setHeaderAction } = useOutletContext<AdminOutletContext>();
  const createHandlerRef = useRef(openCreateModal);
  createHandlerRef.current = openCreateModal;
  const createLabel = t('admin.createWorkflow');
  useEffect(() => {
    setHeaderAction({ label: createLabel, onClick: () => createHandlerRef.current() });
    return () => setHeaderAction(null);
  }, [setHeaderAction, createLabel]);

  /** 行「更多」菜单：低频操作收在这里；「打开编辑器」是高频动作，直接露在行内 */
  const rowMenu = (wf: GaiaWorkflow) => (
    <Dropdown.Menu>
      <Dropdown.Item onClick={() => openEditModal(wf)}>
        {t('admin.editMeta')}
      </Dropdown.Item>
      <Dropdown.Item onClick={() => handleOpenApiDocs(wf)}>
        {t('admin.apiDocs')}
      </Dropdown.Item>
      <Dropdown.Divider />
      <Dropdown.Item type="danger" onClick={() => handleDelete(wf)}>
        {t('Delete')}
      </Dropdown.Item>
    </Dropdown.Menu>
  );

  return (
    <div style={{ color: 'var(--g-text)' }}>
      {/* ---------- Table card ---------- */}
      <div style={tableCardStyle}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
          <thead>
            <tr>
              {[
                t('admin.workflow.name'),
                t('admin.workflow.code'),
                t('admin.workflow.project'),
                t('admin.workflow.createdAt'),
                t('admin.workflow.actions'),
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
            ) : workflows.length === 0 ? (
              <tr>
                <td colSpan={5} style={emptyTdStyle}>{t('admin.noData')}</td>
              </tr>
            ) : (
              workflows.map((wf) => (
                <tr key={wf.id ?? wf.workflowCode} style={{ borderTop: '1px solid var(--g-line-soft)' }}>
                  <td style={tdStyle}>{wf.workflowName}</td>
                  <td style={{ ...tdStyle, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: 13, color: 'var(--g-text-sub)' }}>{wf.workflowCode}</td>
                  <td style={{ ...tdStyle, color: 'var(--g-text-sub)' }}>{folderName(wf.folderId)}</td>
                  <td style={{ ...tdStyle, color: 'var(--g-text-sub)', whiteSpace: 'nowrap' }}>{formatDateTime(wf.createdAt)}</td>
                  <td style={{ ...tdStyle, whiteSpace: 'nowrap', textAlign: 'right' }}>
                    <button onClick={() => handleOpenEditor(wf)} style={actionBtnBlueStyle}>{t('admin.openEditor')}</button>
                    <Dropdown trigger="click" position="bottomRight" render={rowMenu(wf)}>
                      <button
                        type="button"
                        onClick={(e) => e.stopPropagation()}
                        aria-label={t('shell.moreActions')}
                        title={t('shell.moreActions')}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: 28,
                          height: 28,
                          border: 'none',
                          borderRadius: 7,
                          background: 'transparent',
                          color: 'var(--g-text-muted)',
                          cursor: 'pointer',
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--g-bg-sunken)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                      >
                        <IconMore />
                      </button>
                    </Dropdown>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ---------- Modal ---------- */}
      {showCreateModal && (
        <div onClick={closeModal} style={modalOverlayStyle}>
          <div onClick={(e) => e.stopPropagation()} style={modalCardStyle}>
            <h2 style={{ margin: '0 0 22px 0', fontSize: 18, fontWeight: 700, letterSpacing: '-0.01em' }}>
              {editingWorkflow ? t('admin.modal.editWorkflow') : t('admin.modal.createWorkflow')}
            </h2>

            <div style={{ marginBottom: 16 }}>
              <label style={fieldLabelStyle}>{t('admin.modal.workflowName')} <span style={{ color: 'var(--g-danger)' }}>*</span></label>
              <input
                type="text"
                value={workflowForm.workflowName}
                onChange={(e) => setWorkflowForm({ ...workflowForm, workflowName: e.target.value })}
                style={inputStyle}
                placeholder={t('admin.modal.placeholder.name')}
              />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={fieldLabelStyle}>{t('admin.modal.workflowCode')} <span style={{ color: 'var(--g-danger)' }}>*</span></label>
              <input
                type="text"
                value={workflowForm.workflowCode}
                onChange={(e) => setWorkflowForm({ ...workflowForm, workflowCode: e.target.value })}
                style={editingWorkflow ? { ...inputStyle, background: 'var(--g-bg-sunken)', color: 'var(--g-text-muted)', cursor: 'not-allowed' } : inputStyle}
                placeholder={t('admin.modal.placeholder.code')}
                disabled={!!editingWorkflow}
              />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={fieldLabelStyle}>{t('admin.workflow.project')}</label>
              <select
                value={workflowForm.folderId == null ? '' : String(workflowForm.folderId)}
                onChange={(e) => setWorkflowForm({ ...workflowForm, folderId: e.target.value === '' ? null : Number(e.target.value) })}
                style={inputStyle}
              >
                <option value="">{t('admin.workflow.unfiled')}</option>
                {folders.map((f) => (
                  <option key={f.id} value={f.id}>{f.name}</option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={fieldLabelStyle}>{t('admin.modal.workflowDesc')}</label>
              <textarea
                value={workflowForm.workflowDesc}
                onChange={(e) => setWorkflowForm({ ...workflowForm, workflowDesc: e.target.value })}
                style={{ ...inputStyle, resize: 'vertical', minHeight: 72 }}
                placeholder={t('admin.modal.placeholder.desc')}
                rows={3}
              />
            </div>

            {!editingWorkflow && (
              <div style={{ marginBottom: 16 }}>
                <label style={fieldLabelStyle}>{t('admin.modal.template')}</label>
                <select
                  value={workflowForm.templateCode}
                  onChange={(e) => setWorkflowForm({ ...workflowForm, templateCode: e.target.value })}
                  style={inputStyle}
                >
                  <option value="">{t('admin.modal.placeholder.template')}</option>
                  {templates.map((tpl) => (
                    <option key={tpl.templateCode} value={tpl.templateCode}>
                      {tpl.templateName} ({tpl.templateCode})
                    </option>
                  ))}
                </select>
              </div>
            )}

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

      {/* ---------- API 文档弹窗 ---------- */}
      <ApiDocModal
        workflowCode={apiDocsWorkflow?.workflowCode ?? null}
        workflowName={apiDocsWorkflow?.workflowName}
        onClose={() => setApiDocsWorkflow(null)}
      />
    </div>
  );
};

export default WorkflowManagement;

/* ---------------- Styles ---------------- */

const tableCardStyle: CSSProperties = {
  background: 'var(--g-bg-raised)',
  border: '1px solid var(--g-line)',
  borderRadius: 12,
  boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.04)',
  overflow: 'visible',
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

const actionBtnBlueStyle: CSSProperties = {
  background: 'transparent',
  border: 'none',
  padding: '4px 8px',
  fontSize: 13,
  fontWeight: 500,
  cursor: 'pointer',
  color: 'var(--g-link)',
  marginRight: 8,
};

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
