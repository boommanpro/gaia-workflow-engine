/**
 * Return the corresponding string description according to the type of the input value.根据输入值的类型返回对应的字符串描述。
 * @param value - 需要判断类型的值。The value whose type needs to be judged.
 * @returns 返回值的类型字符串 The type string of the return value（'string', 'integer', 'number', 'boolean', 'object', 'array', 'other'）。
 */
export function getValueType(value: any): string {
  const type = typeof value;

  if (type === 'string') {
    return 'string';
  } else if (type === 'number') {
    return Number.isInteger(value) ? 'integer' : 'number';
  } else if (type === 'boolean') {
    return 'boolean';
  } else if (type === 'object') {
    if (value === null) {
      return 'other';
    }
    return Array.isArray(value) ? 'array' : 'object';
  } else {
    // undefined, function, symbol, bigint etc.
    return 'other';
  }
}
