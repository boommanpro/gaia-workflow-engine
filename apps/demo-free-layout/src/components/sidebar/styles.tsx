import { CSSProperties } from 'react';

import styled from 'styled-components';

export const NodeContent = styled.div``;

export const draggableContainerStyle: CSSProperties = {
  position: 'absolute',
  bottom: 0,
  width: '100%',
  zIndex: 2,
  background: 'white',
  // ... existing styles ...
  left: 0,
  right: 0,
  borderTop: '1px solid #e8e8e8',
  display: 'flex',
  flexDirection: 'column',
};
