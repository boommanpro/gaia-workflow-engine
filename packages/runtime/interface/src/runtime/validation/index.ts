import { WorkflowSchema } from '@schema/index';

export interface ValidationResult {
  valid: boolean;
  errors?: string[];
}

export interface IValidation {
  validate(schema: WorkflowSchema): ValidationResult;
}

export const IValidation = Symbol.for('Validation');
