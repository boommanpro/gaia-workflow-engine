import { useMemo } from 'react';

import { createMinimapPlugin } from '@flowgram.ai/minimap-plugin';
import { createFreeSnapPlugin } from '@flowgram.ai/free-snap-plugin';
import { Field, FreeLayoutProps } from '@flowgram.ai/free-layout-editor';

import { NodeRender } from './node-render';
import { nodeRegistries } from './node-registries';
import { initialData } from './initial-data';

export const useEditorProps = () =>
  useMemo<FreeLayoutProps>(
    () => ({
      plugins: () => [createMinimapPlugin({}), createFreeSnapPlugin({})],
      onAllLayersRendered: (ctx) => {
        ctx.tools.fitView(false);
      },
      materials: {
        renderDefaultNode: NodeRender,
      },
      nodeRegistries,
      canDeleteNode: () => true,
      canDeleteLine: () => true,
      initialData,
      /**
       * Node engine enable, you can configure formMeta in the FlowNodeRegistry
       */
      nodeEngine: {
        enable: true,
      },
      /**
       * Redo/Undo enable
       */
      history: {
        enable: true,
        enableChangeNode: true, // Listen Node engine data change
      },
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
              </>
            ),
          },
        };
      },
    }),
    []
  );
