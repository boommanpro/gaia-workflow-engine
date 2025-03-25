import styled from 'styled-components';

export const FormOutputsContainer = styled.div`
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  border-top: 1px solid var(--semi-color-border);
  width: 100%;
  padding: 10px 10px 10px;
  background: linear-gradient(#f5f5fc 0%, rgba(0, 0, 0, 0.02) 100%);
  :global(.semi-tag .semi-tag-content) {
    font-size: 10px;
  }
`;
