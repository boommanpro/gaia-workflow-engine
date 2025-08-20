import React, { useMemo } from 'react';

import { theme } from 'antd';
import { DownOutlined } from '@ant-design/icons';

import { IRule, Op } from '../types';
import { opConfigs } from '../constants';
import { OpSelect } from './styles';

const { useToken } = theme;

interface HookParams {
  rule?: IRule;
  op?: Op;
  onChange: (op: Op) => void;
}

export function useOp({ rule, op, onChange }: HookParams) {
  const options = useMemo(
    () =>
      Object.keys(rule || {}).map((_op) => ({
        ...(opConfigs[_op as Op] || {}),
        value: _op,
      })),
    [rule]
  );

  const opConfig = useMemo(() => opConfigs[op as Op], [op]);

  const renderOpSelect = () => {
    const { token } = useToken();
    return (
      <OpSelect
        style={{ color: token.colorPrimary }}
        styles={{
          popup: { root: { maxHeight: 400, minWidth: 230, overflow: 'auto' } },
        }}
        className="op-select"
        size="small"
        value={op}
        options={options}
        onChange={(v) => {
          onChange(v as Op);
        }}
        labelRender={({ value }) => <span>{opConfig?.abbreviation || <DownOutlined />}</span>}
        suffixIcon={op ? null : undefined}
      />
    );
  };

  return { renderOpSelect, opConfig };
}
