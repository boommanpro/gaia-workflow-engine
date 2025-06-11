import { IReport, VOData } from '@flowgram.ai/runtime-interface';

import { uuid } from '@infra/utils';

export namespace WorkflowRuntimeReport {
  export const create = (params: VOData<IReport>): IReport => ({
    id: uuid(),
    ...params,
  });
}
