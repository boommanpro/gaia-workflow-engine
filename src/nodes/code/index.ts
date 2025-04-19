import { nanoid } from 'nanoid';

import { FlowNodeRegistry } from '../../typings';
import iconCode from '../../assets/icon-code.png';
import { formMeta } from './form-meta';

let index = 0;
export const CodeNodeRegistry: FlowNodeRegistry = {
  type: 'code',
  info: {
    icon: iconCode,
    description: 'support java/groovy... code node',
  },
  meta: {
    size: {
      width: 360,
      height: 94,
    },
  },
  formMeta,
  onAdd() {
    return {
      id: `code_${nanoid(5)}`,
      type: 'code',
      data: {
        title: `Code_${++index}`,
        description: '代码组件',
        config: {
          language: 'java',
          code: '',
        },
        inputs: [],
        outputs: [],
      },
    };
  },
};
