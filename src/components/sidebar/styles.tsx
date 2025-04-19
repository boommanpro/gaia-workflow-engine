import { CSSProperties } from 'react';

import styled from 'styled-components';

export const NodeContent = styled.div``;

export const RunNodeContent = styled.div`
  background: white;
`;

export const DraggableContent = styled.div``;

// styles.tsx

export const sideSheetStyle: CSSProperties = {
  position: 'relative',
  height: '100%',
};

export const nodeContentStyle: CSSProperties = {
  position: 'relative',
  height: '100%',
};

export const draggableContainerStyle: CSSProperties = {
  position: 'absolute',
  bottom: 0,
  width: '100%',
  zIndex: 2,
  height: '800px',
  background: 'white',
};

export const draggableHandleStyle: CSSProperties = {
  width: '100%',
  backgroundColor: 'white',
  cursor: 'ns-resize',
  willChange: 'transform',
  bottom: 0,
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
};

export const draggableHandleInnerStyle: CSSProperties = {
  width: '30%',
  height: '5px',
  backgroundColor: 'gray',
  borderRadius: '5px',
};
