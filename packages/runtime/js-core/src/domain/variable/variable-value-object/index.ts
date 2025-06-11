import { IVariable, VOData } from '@flowgram.ai/runtime-interface';

import { uuid } from '@infra/utils';

export namespace WorkflowRuntimeVariable {
  export const create = (params: VOData<IVariable>): IVariable => ({
    id: uuid(),
    ...params,
  });
}
