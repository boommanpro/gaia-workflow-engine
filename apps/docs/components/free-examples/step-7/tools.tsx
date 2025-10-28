import { CSSProperties, useEffect, useState } from 'react';

import { usePlaygroundTools, useClientContext, LineType } from '@flowgram.ai/free-layout-editor';

export const Tools = () => {
  const { history } = useClientContext();
  const tools = usePlaygroundTools();
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const buttonStyle: CSSProperties = {
    border: '1px solid #e0e0e0',
    borderRadius: '4px',
    cursor: 'pointer',
    padding: '4px',
    color: '#141414',
    background: '#e1e3e4',
  };

  useEffect(() => {
    const disposable = history.undoRedoService.onChange(() => {
      setCanUndo(history.canUndo());
      setCanRedo(history.canRedo());
    });
    return () => disposable.dispose();
  }, [history]);

  return (
    <div
      style={{ position: 'absolute', zIndex: 10, bottom: 34, right: 16, display: 'flex', gap: 8 }}
    >
      <button style={buttonStyle} onClick={() => tools.zoomin()}>
        ZoomIn
      </button>
      <button style={buttonStyle} onClick={() => tools.zoomout()}>
        ZoomOut
      </button>
      <span
        style={{
          ...buttonStyle,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'default',
          width: 40,
        }}
      >
        {Math.floor(tools.zoom * 100)}%
      </span>
      <button style={buttonStyle} onClick={() => tools.fitView()}>
        FitView
      </button>
      <button style={buttonStyle} onClick={() => tools.autoLayout()}>
        AutoLayout
      </button>
      <button
        style={buttonStyle}
        onClick={() =>
          tools.switchLineType(
            tools.lineType === LineType.BEZIER ? LineType.LINE_CHART : LineType.BEZIER
          )
        }
      >
        {tools.lineType === LineType.BEZIER ? 'Bezier' : 'Fold'}
      </button>
      <button
        style={{
          ...buttonStyle,
          cursor: canUndo ? 'pointer' : 'not-allowed',
          color: canUndo ? '#141414' : '#b1b1b1',
        }}
        onClick={() => history.undo()}
        disabled={!canUndo}
      >
        Undo
      </button>
      <button
        style={{
          ...buttonStyle,
          cursor: canRedo ? 'pointer' : 'not-allowed',
          color: canRedo ? '#141414' : '#b1b1b1',
        }}
        onClick={() => history.redo()}
        disabled={!canRedo}
      >
        Redo
      </button>
    </div>
  );
};
