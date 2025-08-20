/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import React, { useEffect, useRef, useState } from 'react';

import { IJsonSchema } from '@flowgram.ai/json-schema';

import { TypeEditorProp } from '../type';
import { columnConfigs } from '../columns';
import { TypeEditorColumnConfig } from '../../../types';
import { TypeEditorService } from '../../../services';
import { useService } from '../../../contexts';
import { useTypeEditorHotKey } from './hot-key';

export const TypeEditorListener = <TypeSchema extends Partial<IJsonSchema>>({
  configs = [],
  children,
}: React.PropsWithChildren & {
  configs: TypeEditorProp<'type-definition', TypeSchema>['viewConfigs'];
}) => {
  const dom = useRef();

  const lastWidth = useRef(0);

  const typeEditorService = useService<TypeEditorService<TypeSchema>>(TypeEditorService);

  const [init, setInit] = useState(false);

  useEffect(() => {
    if (dom.current) {
      const el = dom.current;

      const resize = new ResizeObserver((entries) => {
        if (lastWidth.current === 0) {
          lastWidth.current = entries[0].contentRect.width;
        }
        if (entries[0].contentRect.width !== lastWidth.current) {
          typeEditorService.clearActivePos();
        }
      });

      resize.observe(el);
      return () => {
        resize.unobserve(el);
      };
    }
  }, [dom.current, typeEditorService]);

  useEffect(() => {
    typeEditorService.registerConfigs(
      columnConfigs as unknown as TypeEditorColumnConfig<TypeSchema>[]
    );

    configs.forEach(
      (config) => config.config && typeEditorService.addConfigProps(config.type, config.config)
    );

    setInit(true);
  }, [typeEditorService, configs]);

  const composition = useRef(false);

  const hotkeys = useTypeEditorHotKey();

  return (
    <div
      style={{ width: '100%' }}
      onCompositionStart={() => (composition.current = true)}
      onCompositionEnd={() => (composition.current = false)}
      onKeyDown={(e) => {
        if (composition.current) return;
        const hotKey = hotkeys.find((item) => item.matcher(e));
        hotKey?.callback();
        if (hotKey?.preventDefault) {
          e.preventDefault();
          e.stopPropagation();
        }
      }}
      ref={dom as unknown as React.LegacyRef<HTMLDivElement>}
    >
      {init && children}
    </div>
  );
};
