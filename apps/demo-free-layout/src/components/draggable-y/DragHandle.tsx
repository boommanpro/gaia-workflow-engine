import {STYLES} from "./styles.tsx";

interface DragHandleProps {
  onMouseDown: (e: React.MouseEvent) => void;
}

export const DragHandle: React.FC<DragHandleProps> = ({ onMouseDown }) => (
  <div style={STYLES.dragHandle} onMouseDown={onMouseDown}>
    <div style={STYLES.dragBar} />
  </div>
);
