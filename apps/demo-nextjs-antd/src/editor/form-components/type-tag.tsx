import styled from 'styled-components';
import { Tag, Tooltip } from 'antd';
import { ArrayIcons, VariableTypeIcons } from '@flowgram.ai/form-antd-materials';

interface PropsType {
  name?: string | JSX.Element;
  type: string;
  className?: string;
  isArray?: boolean;
}

const TooltipContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  column-gap: 6px;
`;

export function TypeTag({ name, type, isArray, className }: PropsType) {
  const icon = isArray ? ArrayIcons[type] : VariableTypeIcons[type];
  return (
    <Tooltip
      title={
        <TooltipContainer>
          {icon} {type}
        </TooltipContainer>
      }
    >
      <Tag
        className={className}
        style={{
          maxWidth: 450,
          backgroundColor: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginInlineEnd: 0,
          width: name ? undefined : 18,
          height: 18,
          paddingInline: name ? undefined : 3,
        }}
      >
        {icon}
        {name && (
          <span
            style={{
              display: 'inline-block',
              marginLeft: 4,
              marginTop: -1,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {' '}
            {name}
          </span>
        )}
      </Tag>
    </Tooltip>
  );
}
