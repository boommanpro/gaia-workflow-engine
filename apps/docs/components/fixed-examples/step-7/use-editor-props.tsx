import '@flowgram.ai/fixed-layout-editor/index.css';

import { useMemo } from 'react';

import { createMinimapPlugin } from '@flowgram.ai/minimap-plugin';
import { defaultFixedSemiMaterials } from '@flowgram.ai/fixed-semi-materials';
import { FlowRendererKey, FixedLayoutProps, Field } from '@flowgram.ai/fixed-layout-editor';

import { NodeRender } from './node-render';
import { nodeRegistries } from './node-registries';
import { initialData } from './initial-data';
import { Adder } from './adder';

export function useEditorProps(): FixedLayoutProps {
  return useMemo<FixedLayoutProps>(
    () => ({
      plugins: () => [
        createMinimapPlugin({
          disableLayer: true,
          enableDisplayAllNodes: true,
          canvasStyle: {
            canvasWidth: 100,
            canvasHeight: 50,
            canvasPadding: 50,
          },
        }),
      ],
      nodeRegistries,
      initialData,
      materials: {
        renderDefaultNode: NodeRender,
        components: {
          ...defaultFixedSemiMaterials,
          [FlowRendererKey.ADDER]: Adder,
        },
      },
      onAllLayersRendered: (ctx) => {
        setTimeout(() => {
          ctx.playground.config.fitView(ctx.document.root.bounds.pad(30));
        }, 10);
      },
      /**
       * Get the default node registry, which will be merged with the 'nodeRegistries'
       * 提供默认的节点注册，这个会和 nodeRegistries 做合并
       */
      getNodeDefaultRegistry(type) {
        return {
          type,
          meta: {
            defaultExpanded: true,
          },
          formMeta: {
            /**
             * Render form
             */
            render: () => (
              <>
                <Field<string> name="title">{({ field }) => <div>{field.value}</div>}</Field>
                <Field<string> name="content">
                  <input />
                </Field>
              </>
            ),
          },
        };
      },
      /**
       * Redo/Undo enable
       */
      history: {
        enable: true,
        enableChangeNode: true, // Listen Node engine data change
        onApply: (ctx) => {
          if (ctx.document.disposed) return;
          // Listen change to trigger auto save
          console.log('auto save: ', ctx.document.toJSON());
        },
      },
      /**
       * Node engine enable, you can configure formMeta in the FlowNodeRegistry
       */ nodeEngine: {
        enable: true,
      },
    }),
    []
  );
}
