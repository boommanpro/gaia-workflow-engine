export const OPERATOR_OPTIONS = [
  { value: 1, label: '=' },
  { value: 2, label: '!=' },
  { value: 3, label: '>' },
  { value: 4, label: '<' },
  { value: 5, label: '>=' },
  { value: 6, label: '<=' },
  { value: 7, label: 'contains' },
  { value: 8, label: 'not contains' },
];

export const LOGIC_OPTIONS = [
  { value: 1, label: '且' },
  { value: 2, label: '或' },
];

export const DEFAULT_CONDITION = {
  operator: 1,
  left: { type: 'expression', content: '' },
  right: { type: 'expression', content: '' },
};
