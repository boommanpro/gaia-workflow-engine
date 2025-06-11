import React, { useState } from 'react';

import './index.css';
import { Toast } from '@douyinfe/semi-ui';

interface DataStructureViewerProps {
  data: any;
  level?: number;
}

interface TreeNodeProps {
  label: string;
  value: any;
  level: number;
  isLast?: boolean;
}

const TreeNode: React.FC<TreeNodeProps> = ({ label, value, level, isLast = false }) => {
  const [isExpanded, setIsExpanded] = useState(true);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    Toast.success('Copied');
  };

  const isExpandable = (val: any) =>
    val !== null &&
    typeof val === 'object' &&
    ((Array.isArray(val) && val.length > 0) ||
      (!Array.isArray(val) && Object.keys(val).length > 0));

  const renderPrimitiveValue = (val: any) => {
    if (val === null) return <span className="primitive-value null">null</span>;
    if (val === undefined) return <span className="primitive-value undefined">undefined</span>;

    switch (typeof val) {
      case 'string':
        return (
          <span className="string">
            <span className="primitive-value-quote">{'"'}</span>
            <span className="primitive-value" onDoubleClick={() => handleCopy(val)}>
              {val}
            </span>
            <span className="primitive-value-quote">{'"'}</span>
          </span>
        );
      case 'number':
        return (
          <span className="primitive-value number" onDoubleClick={() => handleCopy(String(val))}>
            {val}
          </span>
        );
      case 'boolean':
        return (
          <span
            className="primitive-value boolean"
            onDoubleClick={() => handleCopy(val.toString())}
          >
            {val.toString()}
          </span>
        );
      default:
        return (
          <span className="primitive-value" onDoubleClick={() => handleCopy(String(val))}>
            {String(val)}
          </span>
        );
    }
  };

  const renderChildren = () => {
    if (Array.isArray(value)) {
      return value.map((item, index) => (
        <TreeNode
          key={index}
          label={`${index + 1}.`}
          value={item}
          level={level + 1}
          isLast={index === value.length - 1}
        />
      ));
    } else {
      const entries = Object.entries(value);
      return entries.map(([key, val], index) => (
        <TreeNode
          key={key}
          label={`${key}:`}
          value={val}
          level={level + 1}
          isLast={index === entries.length - 1}
        />
      ));
    }
  };

  return (
    <div className="tree-node">
      <div className="tree-node-header">
        {isExpandable(value) ? (
          <button
            className={`expand-button ${isExpanded ? 'expanded' : 'collapsed'}`}
            onClick={() => setIsExpanded(!isExpanded)}
          >
            ▶
          </button>
        ) : (
          <span className="expand-placeholder"></span>
        )}
        <span
          className="node-label"
          onClick={() =>
            handleCopy(
              JSON.stringify({
                [label]: value,
              })
            )
          }
        >
          {label}
        </span>
        {!isExpandable(value) && <span className="node-value">{renderPrimitiveValue(value)}</span>}
      </div>
      {isExpandable(value) && isExpanded && (
        <div className="tree-node-children">{renderChildren()}</div>
      )}
    </div>
  );
};

export const DataStructureViewer: React.FC<DataStructureViewerProps> = ({ data, level = 0 }) => {
  if (data === null || data === undefined || typeof data !== 'object') {
    return (
      <div className="node-status-data-structure-viewer">
        <TreeNode label="value" value={data} level={0} />
      </div>
    );
  }

  const entries = Object.entries(data);

  return (
    <div className="node-status-data-structure-viewer">
      {entries.map(([key, value], index) => (
        <TreeNode
          key={key}
          label={key}
          value={value}
          level={0}
          isLast={index === entries.length - 1}
        />
      ))}
    </div>
  );
};
