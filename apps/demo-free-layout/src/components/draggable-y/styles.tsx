export const STYLES = {
  dragHandle: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    height: '8px',
    cursor: 'ns-resize',
    userSelect: 'none' as const,
    backgroundColor: 'transparent',
  },
  dragBar: {
    height: '2px',
    margin: '3px auto',
    width: '40px',
    backgroundColor: '#e8e8e8',
    borderRadius: '2px',
  },
};
