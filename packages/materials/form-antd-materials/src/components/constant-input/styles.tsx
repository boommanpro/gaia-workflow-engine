import styled from 'styled-components';
import type { SelectProps } from 'antd/es/select';
import type { InputNumberProps } from 'antd/es/input-number';
import { Input, InputNumber, Select } from 'antd';

const commonStyle = `
  width: 100%;
  height: 22px;
  border-radius: 6px;
  padding: 4px 11px;
  display: flex;
  justify-content: center;
  align-items: center;
`;

export const UIInput = styled(Input)`
  ${commonStyle}
`;
export const UIInputNumber: React.ComponentType<InputNumberProps> = styled(InputNumber)`
  ${commonStyle}
  padding: 4px 4px;
`;
export const UISelect: React.ComponentType<SelectProps> = styled(Select)`
  ${commonStyle}
`;
