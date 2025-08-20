import { IJsonSchema } from '../../typings';

export interface PropertyValueType extends IJsonSchema {
  name?: string;
  key?: number;
  isPropertyRequired?: boolean;
}

export type PropertiesValueType = Pick<PropertyValueType, 'properties' | 'required'>;

export type JsonSchemaProperties = IJsonSchema['properties'];

export interface ConfigType {
  placeholder?: string;
  descTitle?: string;
  descPlaceholder?: string;
  defaultValueTitle?: string;
  defaultValuePlaceholder?: string;
  addButtonText?: string;
  jsonFormatText?: string;
}
