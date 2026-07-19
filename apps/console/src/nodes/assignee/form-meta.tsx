/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { useState, useCallback } from 'react';

import {
  Field,
  FieldRenderProps,
  FormRenderProps,
  FormMeta,
  ValidateTrigger,
} from '@flowgram.ai/free-layout-editor';

import { FlowNodeJSON } from '../../typings';
import { useIsSidebar } from '../../hooks';
import { FormHeader, FormContent } from '../../form-components';
import { Assignee, searchAssignees } from './types';
import { useLanguage, t } from '../../i18n';

export const renderForm = ({ form }: FormRenderProps<FlowNodeJSON>) => {
  const isSidebar = useIsSidebar();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Assignee[]>([]);
  const [loading, setLoading] = useState(false);
  useLanguage();

  const handleSearch = useCallback(async (query: string) => {
    setSearchQuery(query);
    setLoading(true);
    try {
      const results = await searchAssignees(query);
      setSearchResults(results);
    } catch (error) {
      console.error('搜索失败:', error);
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSelectAssignee = (
    assignee: Assignee,
    currentAssignees: Assignee[],
    onChange: (value: Assignee[]) => void
  ) => {
    const exists = currentAssignees.find((a: Assignee) => a.id === assignee.id);
    if (!exists) {
      onChange([...currentAssignees, assignee]);
    }
    setSearchQuery('');
    setSearchResults([]);
  };

  const handleRemoveAssignee = (
    assigneeId: string,
    currentAssignees: Assignee[],
    onChange: (value: Assignee[]) => void
  ) => {
    onChange(currentAssignees.filter((a: Assignee) => a.id !== assigneeId));
  };

  if (isSidebar) {
    return (
      <>
        <FormHeader />
        <FormContent>
          <Field
            name="data.assignees"
            render={({ field: { value = [], onChange } }: FieldRenderProps<Assignee[]>) => (
              <div style={{ padding: '16px' }}>
                <h3 style={{ marginBottom: '16px', fontSize: '14px', fontWeight: 'bold' }}>
                  {t('assignee.listTitle')}
                </h3>

                {/* 搜索输入框 */}
                <div style={{ marginBottom: '16px' }}>
                  <input
                    type="text"
                    placeholder={t('assignee.searchPlaceholder')}
                    value={searchQuery}
                    onChange={(e) => handleSearch(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '1px solid #d9d9d9',
                      borderRadius: '6px',
                      fontSize: '14px',
                    }}
                  />

                  {/* 搜索结果 */}
                  {searchQuery && (
                    <div
                      style={{
                        marginTop: '8px',
                        border: '1px solid #d9d9d9',
                        borderRadius: '6px',
                        maxHeight: '150px',
                        overflowY: 'auto',
                        backgroundColor: '#fff',
                      }}
                    >
                      {loading ? (
                        <div style={{ padding: '8px', textAlign: 'center', color: '#666' }}>
                          {t('assignee.searching')}
                        </div>
                      ) : searchResults.length > 0 ? (
                        searchResults.map((assignee) => (
                          <div
                            key={assignee.id}
                            onClick={() => handleSelectAssignee(assignee, value, onChange)}
                            style={{
                              padding: '8px 12px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              cursor: 'pointer',
                              borderBottom: '1px solid #f0f0f0',
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = '#f5f5f5';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = 'transparent';
                            }}
                          >
                            <img
                              src={assignee.avatar}
                              alt={assignee.name}
                              style={{
                                width: '24px',
                                height: '24px',
                                borderRadius: '50%',
                              }}
                            />
                            <span>{assignee.name}</span>
                          </div>
                        ))
                      ) : (
                        <div style={{ padding: '8px', textAlign: 'center', color: '#666' }}>
                          {t('assignee.noResults')}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* 已选择的负责人 */}
                <div>
                  <h4 style={{ marginBottom: '8px', fontSize: '12px', color: '#666' }}>
                    {t('assignee.selectedTitle')}
                  </h4>
                  {value.length === 0 ? (
                    <div style={{ color: '#999', fontSize: '12px' }}>{t('assignee.empty')}</div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {value.map((assignee) => (
                        <div
                          key={assignee.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '8px 12px',
                            backgroundColor: '#f5f5f5',
                            borderRadius: '6px',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <img
                              src={assignee.avatar}
                              alt={assignee.name}
                              style={{
                                width: '24px',
                                height: '24px',
                                borderRadius: '50%',
                              }}
                            />
                            <span>{assignee.name}</span>
                          </div>
                          <button
                            onClick={() => handleRemoveAssignee(assignee.id, value, onChange)}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: '#ff4d4f',
                              cursor: 'pointer',
                              fontSize: '16px',
                              padding: '0',
                              lineHeight: '1',
                            }}
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          />
        </FormContent>
      </>
    );
  }

  return (
    <>
      <FormHeader />
      <FormContent>
        <div style={{ padding: '16px' }}>
          <h3>{t('assignee.markTitle')}</h3>
          <Field
            name="data.assignees"
            render={({ field: { value = [] } }: FieldRenderProps<Assignee[]>) => (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {value.length === 0 ? (
                  <div style={{ color: '#999', textAlign: 'center', padding: '20px' }}>
                    {t('assignee.none')}
                  </div>
                ) : (
                  value.map((assignee) => (
                    <div
                      key={assignee.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '8px',
                        backgroundColor: '#f5f5f5',
                        borderRadius: '6px',
                      }}
                    >
                      <img
                        src={assignee.avatar}
                        alt={assignee.name}
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '50%',
                        }}
                      />
                      <span>{assignee.name}</span>
                    </div>
                  ))
                )}
              </div>
            )}
          />
        </div>
      </FormContent>
    </>
  );
};

export const formMeta: FormMeta<FlowNodeJSON> = {
  render: renderForm,
  validateTrigger: ValidateTrigger.onChange,
};
