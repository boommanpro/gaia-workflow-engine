import React from 'react';

import { PrivateScopeProvider } from '@flowgram.ai/editor';

import { VariableSelector, VariableSelectorProps } from '../variable-selector';
import { IJsonSchema } from '../../typings';

const batchVariableSchema: IJsonSchema = {
  type: 'array',
  extra: { weak: true },
};

export function BatchVariableSelector(props: VariableSelectorProps) {
  return (
    <PrivateScopeProvider>
      <VariableSelector {...props} includeSchema={batchVariableSchema} />
    </PrivateScopeProvider>
  );
}
