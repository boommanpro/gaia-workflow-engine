import styled from 'styled-components';
import type { SelectProps } from 'antd/es/select';
import { Select } from 'antd';

export const OpSelect: React.ComponentType<SelectProps> = styled(Select)`
  width: 100%;
  height: 22px;
  width: 24px;

  & .ant-select-selector {
    padding: 0 !important;
    text-align: center;
  }

  & .ant-select-arrow {
    right: 6px;
    & > .anticon {
      pointer-events: none !important;
    }
  }
`;
