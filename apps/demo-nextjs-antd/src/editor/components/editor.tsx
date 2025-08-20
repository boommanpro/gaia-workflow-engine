'use client';

import { EditorRenderer, FreeLayoutEditorProvider } from '@flowgram.ai/free-layout-editor';

import { SidebarProvider, SidebarRenderer } from '@editor/components/sidebar';
import '@flowgram.ai/free-layout-editor/index.css';
import { useEditorProps } from '../hooks/use-editor-props';
import { nodeRegistries } from '../data/node-registries';
import { initialData } from '../data/initial-data';
import { Tools } from './tools';

export const Editor = () => {
  const editorProps = useEditorProps(initialData, nodeRegistries);
  return (
    <FreeLayoutEditorProvider {...editorProps}>
      <SidebarProvider>
        <Tools />
        <EditorRenderer className="mastra-workflow-editor" />
        <SidebarRenderer />
      </SidebarProvider>
    </FreeLayoutEditorProvider>
  );
};
