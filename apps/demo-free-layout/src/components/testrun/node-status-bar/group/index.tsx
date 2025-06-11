import { FC, useState } from 'react';

import { IconSmallTriangleDown } from '@douyinfe/semi-icons';

import { DataStructureViewer } from '../viewer';

import './index.css';
import { Tag } from '@douyinfe/semi-ui';

interface NodeStatusGroupProps {
  title: string;
  data: unknown;
  optional?: boolean;
  disableCollapse?: boolean;
}

const isObjectHasContent = (obj: any = {}): boolean => Object.keys(obj).length > 0;

export const NodeStatusGroup: FC<NodeStatusGroupProps> = ({
  title,
  data,
  optional = false,
  disableCollapse = false,
}) => {
  const hasContent = isObjectHasContent(data);
  const [isExpanded, setIsExpanded] = useState(true);

  if (optional && !hasContent) {
    return null;
  }

  return (
    <>
      <div className="node-status-group" onClick={() => hasContent && setIsExpanded(!isExpanded)}>
        {!disableCollapse && (
          <IconSmallTriangleDown
            style={{
              transform: isExpanded ? 'rotate(0deg)' : 'rotate(-90deg)',
              transition: 'transform 0.2s',
              cursor: 'pointer',
              marginRight: '4px',
              opacity: hasContent ? 1 : 0,
            }}
          />
        )}
        <span>{title}:</span>
        {!hasContent && (
          <Tag
            size="small"
            style={{
              marginLeft: 4,
            }}
          >
            null
          </Tag>
        )}
      </div>
      {hasContent && isExpanded ? <DataStructureViewer data={data} /> : null}
    </>
  );
};
