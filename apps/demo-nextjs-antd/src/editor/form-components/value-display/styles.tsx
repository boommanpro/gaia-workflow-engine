import styled from 'styled-components';

export const ValueDisplayStyle = styled.div`
  padding-left: 12px;
  width: 100%;
  min-height: 24px;
  line-height: 24px;
  display: flex;
  align-items: center;
  &.has-error {
    outline: red solid 1px;
  }
`;
