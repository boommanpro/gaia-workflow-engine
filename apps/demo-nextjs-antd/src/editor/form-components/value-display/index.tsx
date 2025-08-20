// import { TypeTag } from '../type-tag'
import { ValueDisplayStyle } from './styles';

export interface ValueDisplayProps {
  value: string;
  placeholder?: string;
  hasError?: boolean;
}

export const ValueDisplay: React.FC<ValueDisplayProps> = (props) => (
  <ValueDisplayStyle className={props.hasError ? 'has-error' : ''}>
    {props.value}
    {props.value === undefined || props.value === '' ? (
      <span>{props.placeholder || '--'}</span>
    ) : null}
  </ValueDisplayStyle>
);
