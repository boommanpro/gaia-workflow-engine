/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

// export type ValidatorFormats =
//   | 'url'
//   | 'email'
//   | 'ipv6'
//   | 'ipv4'
//   | 'number'
//   | 'integer'
//   | 'idcard'
//   | 'qq'
//   | 'phone'
//   | 'money'
//   | 'zh'
//   | 'date'
//   | 'zip'
//   | (string & {});
//
// export interface IValidatorRules<Context = any> {
//   format?: ValidatorFormats;
//   validator?: ValidatorFunction<Context>;
//   required?: boolean;
//   pattern?: RegExp | string;
//   max?: number;
//   maximum?: number;
//   maxItems?: number;
//   minItems?: number;
//   maxLength?: number;
//   minLength?: number;
//   exclusiveMaximum?: number;
//   exclusiveMinimum?: number;
//   minimum?: number;
//   min?: number;
//   len?: number;
//   whitespace?: boolean;
//   enum?: any[];
//   const?: any;
//   multipleOf?: number;
//   uniqueItems?: boolean;
//   maxProperties?: number;
//   minProperties?: number;
//   message?: string;
//
//   [key: string]: any;
// }
//
// export interface IValidateResult {
//   type: 'error' | 'warning';
//   message: string;
// }
//
// export const isValidateResult = (obj: any): obj is IValidateResult =>
//   Boolean(obj.type) && Boolean(obj.message);
//
// export type ValidatorFunctionResponse =
//   | null
//   | void
//   | undefined
//   | string
//   | boolean
//   | IValidateResult;
//
// export type ValidatorFunction<Context = any> = (
//   value: any,
//   ctx: Context,
// ) => ValidatorFunctionResponse | Promise<ValidatorFunctionResponse>;
//
// export type Validator<Context = any> =
//   | ValidatorFormats
//   | ValidatorFunction<Context>
//   | IValidatorRules;
