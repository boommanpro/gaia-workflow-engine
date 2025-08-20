import type { ReactElement } from 'react';

export interface TreeNodeData<VariableMeta = any> {
  value: string | number;
  title: string;
  disabled?: boolean;
  disableCheckbox?: boolean;
  selectable?: boolean;
  checkable?: boolean;
  children?: TreeNodeData[];
  icon: ReactElement;
  key: string;
  keyPath: string[];
  rootMeta: VariableMeta;
}
