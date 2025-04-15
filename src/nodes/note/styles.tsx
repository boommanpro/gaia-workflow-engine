import styled from 'styled-components';

export const NoteWrapper = styled.div`
  box-sizing: border-box;
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 6px;
  background-color: rgba(0, 0, 0, 0.02);
  padding: 1px 1px 1px 1px;

  .semi-input-textarea-wrapper-focus {
    border-color: transparent; // 或者你想要的颜色
    box-shadow: none; // 去除聚焦时的阴影
  }
`;
