import styled from 'styled-components';

export const UIContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 5px;
`;

export const UIMain = styled.div`
  flex-grow: 1;
`;

export const UITrigger = styled.div`
  outline: none;
  height: 22px;
  min-height: 22px;
  line-height: 22px;

  & .ant-select-selection-wrap {
    display: none;
  }

  & .ant-select-arrow {
    right: 6px;
    & > .anticon {
      pointer-events: none !important;
    }
  }
`;
