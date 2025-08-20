import React from 'react';

export function SvgIcon(props: {
  size?: 'inherit' | 'extra-small' | 'small' | 'default' | 'large' | 'extra-large';
  svg: React.ReactNode;
}) {
  return <span className="anticon">{props.svg}</span>;
}
