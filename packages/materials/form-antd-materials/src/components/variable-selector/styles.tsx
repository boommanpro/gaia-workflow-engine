import styled from 'styled-components';
import type { TreeSelectProps } from 'antd/es/tree-select';
import { Tag, TreeSelect } from 'antd';

export const UIRootTitle = styled.span`
  margin-right: 4px;
`;

export const UITag = styled(Tag)`
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: flex-start;
`;

export const UITreeSelect: React.ComponentType<TreeSelectProps<any>> = styled(TreeSelect)`
  height: 22px;
  min-height: 22px;
  line-height: 22px;

  & .ant-select-clear {
    right: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  & .ant-select-arrow {
    right: 6px;
    & > .anticon {
      pointer-events: none !important;
    }
  }
`;

export const ImgIconWrapper = styled.div`
  display: inline-flex;
  align-items: center;
  justify-content: center;
`;
