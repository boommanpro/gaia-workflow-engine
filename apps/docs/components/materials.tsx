/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

// @ts-expect-error
import { PackageManagerTabs, SourceCode } from '@theme';

export function MaterialDisplay(props: any) {
  return (
    <div>
      <br />
      <PackageManagerTabs
        command={{
          'By Import': `import { ${props.exportName} } from '@flowgram.ai/form-materials'`,
          // components/type-selector/index.tsx -> components/type-selector
          'By CLI': `npx @flowgram.ai/form-materials@latest ${props.filePath
            .split('/')
            .slice(0, -1)
            .join('/')}`,
        }}
      />
      <br />
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <div style={{ width: '42%' }}>
          {props.imgs.map((img: string | any, index: number) => (
            <div key={index}>
              <img
                loading="lazy"
                src={typeof img === 'string' ? img : img.src}
                style={{ width: '100%' }}
              />
              {img.caption && (
                <div style={{ textAlign: 'center', fontSize: 12, color: '#666' }}>
                  {img.caption}
                </div>
              )}
            </div>
          ))}
        </div>
        <div style={{ width: '55%' }}>
          {props.children}
          <SourceCode
            href={`https://github.com/bytedance/flowgram.ai/tree/main/packages/materials/form-materials/src/${props.filePath}`}
          />
        </div>
      </div>
    </div>
  );
}
