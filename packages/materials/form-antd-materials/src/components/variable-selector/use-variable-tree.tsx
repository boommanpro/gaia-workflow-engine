import React, { useCallback } from 'react';

import { ASTMatch, BaseVariableField, useScopeAvailable } from '@flowgram.ai/editor';

import { ArrayIcons, VariableTypeIcons } from '../type-selector/constants';
import { JsonSchemaUtils } from '../../utils/json-schema';
import { SvgIcon } from '../../utils';
import { IJsonSchema } from '../../typings/json-schema';
import { TreeNodeData } from './types';
import { ImgIconWrapper } from './styles';

type VariableField = BaseVariableField<{
  icon?: string;
  title?: string;
}>;

export function useVariableTree(params: {
  includeSchema?: IJsonSchema | IJsonSchema[];
  excludeSchema?: IJsonSchema | IJsonSchema[];
}): TreeNodeData[] {
  const { includeSchema, excludeSchema } = params;

  const available = useScopeAvailable();

  const getVariableTypeIcon = useCallback((variable: VariableField) => {
    if (variable.meta?.icon) {
      return (
        <ImgIconWrapper>
          <img style={{ marginRight: 8 }} width={12} height={12} src={variable.meta.icon} />
        </ImgIconWrapper>
      );
    }

    const _type = variable.type;

    if (ASTMatch.isArray(_type)) {
      return (
        <SvgIcon svg={ArrayIcons[_type.items?.kind.toLowerCase()] || VariableTypeIcons.array} />
      );
    }

    if (ASTMatch.isCustomType(_type)) {
      return <SvgIcon svg={VariableTypeIcons[_type.typeName.toLowerCase()]} />;
    }

    return <SvgIcon svg={VariableTypeIcons[variable.type?.kind.toLowerCase()]} />;
  }, []);

  const renderVariable = (
    variable: VariableField,
    parentFields: VariableField[] = []
  ): TreeNodeData | null => {
    let type = variable?.type;

    if (!type) {
      return null;
    }

    let children: TreeNodeData[] | undefined;

    if (ASTMatch.isObject(type)) {
      children = (type.properties || [])
        .map((_property) => renderVariable(_property as VariableField, [...parentFields, variable]))
        .filter(Boolean) as TreeNodeData[];

      if (!children?.length) {
        return null;
      }
    }

    const keyPath = [...parentFields.map((_field) => _field.key), variable.key];
    const key = keyPath.join('.');

    const isSchemaInclude = includeSchema
      ? JsonSchemaUtils.isASTMatchSchema(type, includeSchema)
      : true;
    const isSchemaExclude = excludeSchema
      ? JsonSchemaUtils.isASTMatchSchema(type, excludeSchema)
      : false;
    const isSchemaMatch = isSchemaInclude && !isSchemaExclude;

    // If not match, and no children, return null
    if (!isSchemaMatch && !children?.length) {
      return null;
    }

    return {
      key: key,
      title: variable.meta?.title || variable.key,
      value: key,
      keyPath,
      icon: getVariableTypeIcon(variable), // TODO
      children,
      disabled: !isSchemaMatch,
      rootMeta: parentFields[0]?.meta,
    };
  };

  return [...available.variables.slice(0).reverse()]
    .map((_variable) => renderVariable(_variable as VariableField))
    .filter(Boolean) as TreeNodeData[];
}
