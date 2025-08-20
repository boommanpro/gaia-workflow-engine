export type JsonSchemaBasicType =
  | 'boolean'
  | 'string'
  | 'integer'
  | 'number'
  | 'object'
  | 'array'
  | 'map';

export interface IJsonSchema<T = string> {
  type?: T;
  default?: any;
  title?: string;
  description?: string;
  enum?: (string | number)[];
  properties?: Record<string, IJsonSchema<T>>;
  additionalProperties?: IJsonSchema<T>;
  items?: IJsonSchema<T>;
  required?: string[];
  $ref?: string;
  extra?: {
    index?: number;
    // Used in BaseType.isEqualWithJSONSchema, the type comparison will be weak
    weak?: boolean;
    // Set the render component
    formComponent?: string;
    [key: string]: any;
  };
}

export type IBasicJsonSchema = IJsonSchema<JsonSchemaBasicType>;
