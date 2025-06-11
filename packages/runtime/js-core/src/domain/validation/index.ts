import { WorkflowSchema, IValidation, ValidationResult } from '@flowgram.ai/runtime-interface';

export class WorkflowRuntimeValidation implements IValidation {
  validate(schema: WorkflowSchema): ValidationResult {
    // TODO
    // 检查成环
    // 检查边的节点是否存在
    // 检查跨层级连线
    // 检查是否只有一个开始节点和一个结束节点
    // 检查开始节点是否在根节点
    // 检查结束节点是否在根节点

    // 注册节点检查器
    return {
      valid: true,
    };
  }
}
