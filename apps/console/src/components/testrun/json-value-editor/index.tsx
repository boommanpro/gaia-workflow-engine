/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { useEffect, useMemo, useRef, useState } from 'react';

import { JsonCodeEditor } from '@flowgram.ai/form-materials';

export function JsonValueEditor({
  value,
  onChange,
}: {
  value: Record<string, unknown>;
  onChange: (value: Record<string, unknown>) => void;
}) {
  const defaultJsonText = useMemo(() => JSON.stringify(value, null, 2), [value]);

  const [jsonText, setJsonText] = useState(defaultJsonText);
  // 解析失败就地提示（阶段 1.4）：旧的 // ignore 会让非法 JSON 静默沿用旧值，
  // 用户以为改成功了，实际运行用的还是上一次的合法输入
  const [parseError, setParseError] = useState<string | null>(null);

  const effectVersion = useRef(0);
  const changeVersion = useRef(0);

  const handleJsonTextChange = (text: string) => {
    setJsonText(text);
    try {
      const jsonValue = JSON.parse(text);
      setParseError(null);
      onChange(jsonValue);
      changeVersion.current++;
    } catch (e) {
      setParseError((e as Error).message);
    }
  };

  useEffect(() => {
    // more effect compared with change
    effectVersion.current = effectVersion.current + 1;
    if (effectVersion.current === changeVersion.current) {
      return;
    }
    effectVersion.current = changeVersion.current;

    setJsonText(JSON.stringify(value, null, 2));
  }, [value]);

  return (
    <div>
      <JsonCodeEditor value={jsonText} onChange={handleJsonTextChange} />
      {parseError && (
        <div
          style={{
            marginTop: 4,
            fontSize: 11,
            lineHeight: 1.4,
            color: '#e5484d',
            wordBreak: 'break-all',
          }}
        >
          JSON 解析失败，当前仍沿用上一次的合法值：{parseError}
        </div>
      )}
    </div>
  );
}
