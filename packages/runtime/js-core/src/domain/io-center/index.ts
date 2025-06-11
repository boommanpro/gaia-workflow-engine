import { IIOCenter, IOData, WorkflowInputs, WorkflowOutputs } from '@flowgram.ai/runtime-interface';

export class WorkflowRuntimeIOCenter implements IIOCenter {
  private _inputs: WorkflowInputs;

  private _outputs: WorkflowOutputs;

  public init(inputs: WorkflowInputs): void {
    this.setInputs(inputs);
  }

  public dispose(): void {}

  public get inputs(): WorkflowInputs {
    return this._inputs ?? {};
  }

  public get outputs(): WorkflowOutputs {
    return this._outputs ?? {};
  }

  public setInputs(inputs: WorkflowInputs): void {
    this._inputs = inputs;
  }

  public setOutputs(outputs: WorkflowOutputs): void {
    this._outputs = outputs;
  }

  public export(): IOData {
    return {
      inputs: this._inputs,
      outputs: this._outputs,
    };
  }
}
