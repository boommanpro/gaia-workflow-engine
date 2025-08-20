/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import ReactDOM from 'react-dom';
import React, { useLayoutEffect } from 'react';

import { isEqual, last } from 'lodash';
import {
  BaseVariableField,
  Disposable,
  DisposableCollection,
  Scope,
  useCurrentScope,
} from '@flowgram.ai/editor';
import { Popover } from '@douyinfe/semi-ui';
import { IconIssueStroked } from '@douyinfe/semi-icons';
import { useInjector } from '@coze-editor/editor/react';
import {
  Decoration,
  DecorationSet,
  EditorView,
  MatchDecorator,
  ViewPlugin,
  WidgetType,
} from '@codemirror/view';

import { UIPopoverContent, UIRootTitle, UITag, UIVarName } from '../styles';

class VariableTagWidget extends WidgetType {
  keyPath?: string[];

  toDispose = new DisposableCollection();

  scope: Scope;

  rootDOM?: HTMLSpanElement;

  constructor({ keyPath, scope }: { keyPath?: string[]; scope: Scope }) {
    super();

    this.keyPath = keyPath;
    this.scope = scope;
  }

  renderIcon = (icon: string | JSX.Element) => {
    if (typeof icon === 'string') {
      return <img style={{ marginRight: 8 }} width={12} height={12} src={icon} />;
    }

    return icon;
  };

  renderReact(jsx: React.ReactElement) {
    // NOTICE: For React 19, upgrade to 'react-dom/client'
    ReactDOM.render(jsx, this.rootDOM!);
  }

  renderVariable(v?: BaseVariableField) {
    if (!v) {
      this.renderReact(
        <UITag prefixIcon={<IconIssueStroked />} color="amber">
          Unknown
        </UITag>
      );
      return;
    }

    const rootField = last(v.parentFields) || v;
    const isRoot = v.parentFields.length === 0;

    const rootTitle = (
      <UIRootTitle>
        {rootField?.meta.title ? `${rootField.meta.title} ${isRoot ? '' : '-'} ` : ''}
      </UIRootTitle>
    );
    const rootIcon = this.renderIcon(rootField?.meta.icon);

    this.renderReact(
      <Popover
        content={
          <UIPopoverContent>
            {rootIcon}
            {rootTitle}
            <UIVarName>{v?.keyPath.slice(1).join('.')}</UIVarName>
          </UIPopoverContent>
        }
      >
        <UITag prefixIcon={rootIcon}>
          {rootTitle}
          {!isRoot && <UIVarName>{v?.key}</UIVarName>}
        </UITag>
      </Popover>
    );
  }

  toDOM(view: EditorView): HTMLElement {
    const dom = document.createElement('span');

    this.rootDOM = dom;

    this.toDispose.push(
      Disposable.create(() => {
        // NOTICE: For React 19, upgrade to 'react-dom/client'
        ReactDOM.unmountComponentAtNode(this.rootDOM!);
      })
    );

    this.toDispose.push(
      this.scope.available.trackByKeyPath(
        this.keyPath,
        (v) => {
          this.renderVariable(v);
        },
        { triggerOnInit: false }
      )
    );

    this.renderVariable(this.scope.available.getByKeyPath(this.keyPath));

    return dom;
  }

  eq(other: VariableTagWidget) {
    return isEqual(this.keyPath, other.keyPath);
  }

  ignoreEvent(): boolean {
    return false;
  }

  destroy(dom: HTMLElement): void {
    this.toDispose.dispose();
  }
}

export function VariableTagInject() {
  const injector = useInjector();

  const scope = useCurrentScope();

  // 基于 {{var}} 的正则进行匹配，匹配后进行自定义渲染
  useLayoutEffect(() => {
    const atMatcher = new MatchDecorator({
      regexp: /\{\{([^\}]+)\}\}/g,
      decoration: (match) =>
        Decoration.replace({
          widget: new VariableTagWidget({
            keyPath: match[1]?.split('.') ?? [],
            scope,
          }),
        }),
    });

    return injector.inject([
      ViewPlugin.fromClass(
        class {
          decorations: DecorationSet;

          constructor(private view: EditorView) {
            this.decorations = atMatcher.createDeco(view);
          }

          update() {
            this.decorations = atMatcher.createDeco(this.view);
          }
        },
        {
          decorations: (p) => p.decorations,
          provide(p) {
            return EditorView.atomicRanges.of(
              (view) => view.plugin(p)?.decorations ?? Decoration.none
            );
          },
        }
      ),
    ]);
  }, [injector]);

  return null;
}
