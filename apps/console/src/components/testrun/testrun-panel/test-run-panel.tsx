/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { FC, useState, useEffect } from 'react';

import classnames from 'classnames';
import { WorkflowInputs, WorkflowOutputs } from '@flowgram.ai/runtime-interface';
import { type PanelFactory, usePanelManager } from '@flowgram.ai/panel-manager-plugin';
import { useService } from '@flowgram.ai/free-layout-editor';
import { Button, Switch } from '@douyinfe/semi-ui';
import { IconClose, IconPlay, IconSpin } from '@douyinfe/semi-icons';

import { TestRunJsonInput } from '../testrun-json-input';
import { TestRunForm } from '../testrun-form';
import { NodeStatusGroup } from '../node-status-bar/group';
import { itemText, type TestRunErrorItem } from '../../../plugins/runtime-plugin/validation-errors';
import { WorkflowRuntimeService } from '../../../plugins/runtime-plugin/runtime-service';
import { useLanguage, t } from '../../../i18n';
import { IconCancel } from '../../../assets/icon-cancel';

import styles from './index.module.less';

interface TestRunSidePanelProps {}

export const TestRunSidePanel: FC<TestRunSidePanelProps> = () => {
  const runtimeService = useService(WorkflowRuntimeService);

  const panelManager = usePanelManager();
  useLanguage();
  const [isRunning, setRunning] = useState(false);
  /** 审计 A17：启动往返期间按钮进入 loading，杜绝连点双任务 */
  const [starting, setStarting] = useState(false);
  const [hasStoredResult, setHasStoredResult] = useState(false);
  /** 审计 A7：最近一次运行为用户取消（区别于成功/失败） */
  const [canceled, setCanceled] = useState(false);
  const [values, setValues] = useState<Record<string, unknown>>({});
  const [errors, setErrors] = useState<string[]>();
  const [errorItems, setErrorItems] = useState<TestRunErrorItem[]>();
  const [warnings, setWarnings] = useState<string[]>();
  const [result, setResult] = useState<
    | {
        inputs: WorkflowInputs;
        outputs: WorkflowOutputs;
      }
    | undefined
  >();

  // en - Use localStorage to persist the JSON mode state
  const [inputJSONMode, _setInputJSONMode] = useState(() => {
    const savedMode = localStorage.getItem('testrun-input-json-mode');
    return savedMode ? JSON.parse(savedMode) : false;
  });

  const setInputJSONMode = (checked: boolean) => {
    _setInputJSONMode(checked);
    localStorage.setItem('testrun-input-json-mode', JSON.stringify(checked));
  };

  const onTestRun = async () => {
    if (starting) return; // 审计 A17：启动往返期间忽略重复点击
    if (isRunning) {
      await runtimeService.taskCancel();
      setRunning(false);
      return;
    }

    if (hasStoredResult && !runtimeService.isTaskRunning()) {
      setHasStoredResult(false);
      setResult(undefined);
      setErrors(undefined);
      setErrorItems(undefined);
      setWarnings(undefined);
    }

    if (runtimeService.isTaskRunning()) {
      setRunning(true);
      return;
    }

    setResult(undefined);
    setErrors(undefined);
    setErrorItems(undefined);
    setWarnings(undefined);
    setCanceled(false);
    setHasStoredResult(false);

    setStarting(true);
    try {
      const taskID = await runtimeService.taskRun(values, true);
      if (taskID) {
        setRunning(true);
      }
    } finally {
      setStarting(false);
    }
  };

  const onClose = async () => {
    // 审计 A18：关闭面板不再清空输入值（keepDOM 下面板只是隐藏），
    // 显式「重新运行」时上方已有 hasStoredResult 分支负责清场
    setRunning(false);
    panelManager.close(testRunPanelFactory.key);
  };

  const renderRunning = (
    <div className={styles['testrun-panel-running']}>
      <IconSpin spin size="large" />
      <div className={styles.text}>{t('testRun.running')}</div>
    </div>
  );

  const renderForm = (
    <div className={styles['testrun-panel-form']}>
      <div className={styles['testrun-panel-input']}>
        <div className={styles.title}>{t('testRun.inputForm')}</div>
        <div>{t('testRun.jsonMode')}</div>
        <Switch
          checked={inputJSONMode}
          onChange={(checked: boolean) => setInputJSONMode(checked)}
          size="small"
        />
      </div>
      {inputJSONMode ? (
        <TestRunJsonInput values={values} setValues={setValues} />
      ) : (
        <TestRunForm values={values} setValues={setValues} />
      )}
      {errorItems?.length || errors?.length ? (
        <div className={styles['error-list']}>
          {(errorItems?.length
            ? errorItems
            : (errors ?? []).map((message) => ({ message } as TestRunErrorItem))
          ).map((item, index) => (
            <div className={styles['error-item']} key={`${item.nodeId ?? 'global'}-${index}`}>
              <div className={styles['error-item-text']}>{itemText(item)}</div>
              {item.nodeId && (
                <Button
                  size="small"
                  theme="borderless"
                  className={styles['error-item-locate']}
                  onClick={() => runtimeService.focusNode(item.nodeId!)}
                >
                  {t('testRun.locate')}
                </Button>
              )}
            </div>
          ))}
        </div>
      ) : null}
      {warnings?.length ? (
        <div className={styles['warning-list']}>
          <div className={styles['warning-item']}>{t('testRun.warnings')}</div>
          {warnings.map((warning, index) => (
            <div className={styles['warning-item']} key={index}>
              {warning}
            </div>
          ))}
        </div>
      ) : null}
      <NodeStatusGroup
        title={t('testRun.inputsResult')}
        data={result?.inputs}
        optional
        disableCollapse
      />
      <NodeStatusGroup
        title={t('testRun.outputsResult')}
        data={result?.outputs}
        optional
        disableCollapse
      />
    </div>
  );

  const renderButton = (
    <Button
      onClick={onTestRun}
      disabled={starting}
      loading={starting}
      icon={isRunning ? <IconCancel /> : <IconPlay size="small" />}
      className={classnames(styles.button, {
        [styles.running]: isRunning,
        [styles.default]: !isRunning,
      })}
    >
      {isRunning
        ? t('testRun.cancel')
        : starting
        ? t('Submitting')
        : hasStoredResult || canceled
        ? t('testRun.rerun')
        : t('tool.testRun')}
    </Button>
  );

  useEffect(() => {
    const lastResult = runtimeService.getLastResult();
    if (lastResult) {
      setResult(lastResult);
      setHasStoredResult(true);
    }
    if (runtimeService.isTaskRunning()) {
      setRunning(true);
    }
  }, [runtimeService]);

  useEffect(() => {
    const disposer = runtimeService.onResultChanged(
      ({ result, errors, errorItems, warnings, canceled: runCanceled }) => {
        setRunning(false);
        setCanceled(!!runCanceled);
        setResult(result);
        setHasStoredResult(!!result && !runCanceled);
        if (errors || errorItems?.length || warnings?.length) {
          setErrors(errors);
          setErrorItems(errorItems?.length ? errorItems : undefined);
          setWarnings(warnings?.length ? warnings : undefined);
        } else {
          setErrors(undefined);
          setErrorItems(undefined);
          setWarnings(undefined);
        }
      }
    );
    return () => disposer.dispose();
  }, [runtimeService]);

  return (
    <div className={styles['testrun-panel-container']}>
      <div className={styles['testrun-panel-header']}>
        <div className={styles['testrun-panel-title']}>{t('testRun.title')}</div>
        <Button
          className={styles['testrun-panel-title']}
          type="tertiary"
          icon={<IconClose />}
          size="small"
          theme="borderless"
          onClick={onClose}
        />
      </div>
      <div className={styles['testrun-panel-content']}>
        {isRunning ? renderRunning : renderForm}
        {!isRunning && canceled ? (
          // 审计 A7：取消的运行如实显示「已取消」，不再出现成功/伪错
          <div className={styles['warning-list']}>
            <div className={styles['warning-item']}>{t('testRun.canceledNote')}</div>
          </div>
        ) : null}
      </div>
      <div className={styles['testrun-panel-footer']}>{renderButton}</div>
    </div>
  );
};

export const testRunPanelFactory: PanelFactory<TestRunSidePanelProps> = {
  key: 'test-run-panel',
  defaultSize: 400,
  // 审计 A18：keepDOM 让面板隐藏而非卸载——点选节点打开表单面板不会杀掉运行中的
  // 试运行面板，重开时输入值/结果都在（同运行历史/变量 Dock 的口径）
  keepDOM: true,
  render: () => <TestRunSidePanel />,
};
