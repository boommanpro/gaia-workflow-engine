/**
 * 参数 Schema 树视图（2026-11-05）：从后端 node-schemas 资源派生渲染节点类型契约
 * （字段 / 类型 / 必填 / 枚举），供侧栏「参数 Schema」页签与卡片 ⤢ 全屏对照视图共用。
 * 只读展示，不在前端复制字段规则（P-01 / NC-04）。
 */
import React from 'react';

import { Tooltip } from '@douyinfe/semi-ui';

import { t, useLanguage } from '../../i18n';
import { nodeSchemaOf } from '../../agent/node-templates/schemas';

const defName = (ref: string): string => ref.split('/').pop() || ref;

/** definitions 名称 → 值包装语义（constantValue → constant 包装等） */
const REF_SHORT: Record<string, string> = {
  constantValue: 'constant',
  refValue: 'ref',
  templateValue: 'template',
  expressionValue: 'expression',
};

function typeLabel(decl: any): string {
  if (typeof decl?.type === 'string') return decl.type;
  if (Array.isArray(decl?.enum)) return 'enum';
  if (Array.isArray(decl?.anyOf)) {
    return decl.anyOf
      .map((v: any) =>
        typeof v?.$ref === 'string'
          ? REF_SHORT[defName(v.$ref)] ?? defName(v.$ref)
          : typeof v?.type === 'string'
          ? v.type
          : 'any'
      )
      .join(' | ');
  }
  if (typeof decl?.$ref === 'string') return REF_SHORT[defName(decl.$ref)] ?? defName(decl.$ref);
  return 'any';
}

/** 数组 items 里的对象字段也展开一层（branches: array of {id,logic,conditions…}） */
function childrenOf(decl: any): Array<[string, any]> | null {
  const props = decl?.properties ?? decl?.items?.properties;
  if (!props || typeof props !== 'object') return null;
  return Object.entries(props);
}

const SchemaRow: React.FC<{
  name: string;
  decl: Record<string, any>;
  required: boolean;
  arrayItem?: boolean;
  depth: number;
}> = ({ name, decl, required, arrayItem, depth }) => {
  const label = typeLabel(decl);
  const children = childrenOf(decl);
  const enumValues = Array.isArray(decl?.enum) ? decl.enum.map(String) : null;
  const rowTitle = typeof decl?.description === 'string' ? decl.description : undefined;
  return (
    <>
      <Tooltip content={rowTitle} position="right" showArrow>
        <div className="gaia-schema-row" data-depth={depth}>
          <span className="gaia-schema-field">
            {depth > 0 ? <span className="gaia-schema-indent">{'└ '}</span> : null}
            {arrayItem ? `${name}[]` : name}
          </span>
          <span className="gaia-schema-type" data-many={label.includes('|') ? '1' : undefined}>
            {label}
          </span>
          <span className="gaia-schema-req" data-req={required ? '1' : undefined}>
            {required ? t('nodeSchema.required') : t('nodeSchema.optional')}
          </span>
        </div>
      </Tooltip>
      {enumValues && (
        <div className="gaia-schema-enum" data-depth={depth}>
          {enumValues.join(' · ')}
        </div>
      )}
      {children &&
        children.map(([childName, childDecl]) => (
          <SchemaRow
            key={childName}
            name={childName}
            decl={childDecl}
            depth={depth + 1}
            arrayItem={!!decl?.items && !decl?.properties}
            required={
              Array.isArray(decl?.items?.required)
                ? decl.items.required.includes(childName)
                : Array.isArray(decl?.required)
                ? decl.required.includes(childName)
                : false
            }
          />
        ))}
    </>
  );
};

export const SchemaTreeView: React.FC<{ type: string }> = ({ type }) => {
  useLanguage();
  const schema = nodeSchemaOf(type);
  if (!schema) {
    return <div className="gaia-schema-empty">{t('nodeSchema.empty')}</div>;
  }
  const required: string[] = Array.isArray(schema.required) ? schema.required : [];
  const entries = Object.entries(schema.properties ?? {});
  return (
    <div className="gaia-schema-tree">
      <div className="gaia-schema-hint">{t('nodeSchema.sourceHint')}</div>
      {entries.map(([name, decl]) => (
        <SchemaRow
          key={name}
          name={name}
          decl={decl as Record<string, any>}
          required={required.includes(name)}
          depth={0}
        />
      ))}
    </div>
  );
};
