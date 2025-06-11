import { definePluginCreator, PluginContext } from '@flowgram.ai/free-layout-editor';

import { RuntimePluginOptions } from './type';
import { WorkflowRuntimeServerClient } from './server-client';
import { WorkflowRuntimeService } from './runtime-service';
import { WorkflowRuntimeClient } from './browser-client';

export const createRuntimePlugin = definePluginCreator<RuntimePluginOptions, PluginContext>({
  onBind({ bind, rebind }, options) {
    bind(WorkflowRuntimeClient).toSelf().inSingletonScope();
    bind(WorkflowRuntimeServerClient).toSelf().inSingletonScope();
    if (options.mode === 'server') {
      rebind(WorkflowRuntimeClient).to(WorkflowRuntimeServerClient);
    }
    bind(WorkflowRuntimeService).toSelf().inSingletonScope();
  },
  onInit(ctx, options) {
    if (options.mode === 'server') {
      const serverClient = ctx.get(WorkflowRuntimeServerClient);
      serverClient.init(options.serverConfig);
    }
  },
});
