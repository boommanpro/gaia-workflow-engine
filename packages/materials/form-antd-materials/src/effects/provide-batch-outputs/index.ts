import {
  ASTFactory,
  EffectOptions,
  FlowNodeRegistry,
  createEffectFromVariableProvider,
  getNodeForm,
} from '@flowgram.ai/editor';

import { IFlowRefValue } from '../../typings';

export const provideBatchOutputsEffect: EffectOptions[] = createEffectFromVariableProvider({
  private: true,
  parse: (value: Record<string, IFlowRefValue>, ctx) => [
    ASTFactory.createVariableDeclaration({
      key: `${ctx.node.id}`,
      meta: {
        title: getNodeForm(ctx.node)?.getValueIn('title'),
        icon: ctx.node.getNodeRegistry<FlowNodeRegistry>().info?.icon,
      },
      type: ASTFactory.createObject({
        properties: Object.entries(value).map(([_key, value]) =>
          ASTFactory.createProperty({
            key: _key,
            initializer: ASTFactory.createWrapArrayExpression({
              wrapFor: ASTFactory.createKeyPathExpression({
                keyPath: value.content || [],
              }),
            }),
          })
        ),
      }),
    }),
  ],
});
