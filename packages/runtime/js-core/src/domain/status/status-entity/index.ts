import { IStatus, StatusData, WorkflowStatus } from '@flowgram.ai/runtime-interface';

import { uuid } from '@infra/utils';

export class WorkflowRuntimeStatus implements IStatus {
  public readonly id: string;

  private _status: WorkflowStatus;

  private _startTime: number;

  private _endTime?: number;

  constructor() {
    this.id = uuid();
    this._status = WorkflowStatus.Pending;
  }

  public get status(): WorkflowStatus {
    return this._status;
  }

  public get terminated(): boolean {
    return [WorkflowStatus.Succeeded, WorkflowStatus.Failed, WorkflowStatus.Canceled].includes(
      this.status
    );
  }

  public get startTime(): number {
    return this._startTime;
  }

  public get endTime(): number | undefined {
    return this._endTime;
  }

  public get timeCost(): number {
    if (!this.startTime) {
      return 0;
    }
    if (this.endTime) {
      return this.endTime - this.startTime;
    }
    return Date.now() - this.startTime;
  }

  public process(): void {
    this._status = WorkflowStatus.Processing;
    this._startTime = Date.now();
    this._endTime = undefined;
  }

  public success(): void {
    if (this.terminated) {
      return;
    }
    this._status = WorkflowStatus.Succeeded;
    this._endTime = Date.now();
  }

  public fail(): void {
    if (this.terminated) {
      return;
    }
    this._status = WorkflowStatus.Failed;
    this._endTime = Date.now();
  }

  public cancel(): void {
    if (this.terminated) {
      return;
    }
    this._status = WorkflowStatus.Canceled;
    this._endTime = Date.now();
  }

  public export(): StatusData {
    return {
      status: this.status,
      terminated: this.terminated,
      startTime: this.startTime,
      endTime: this.endTime,
      timeCost: this.timeCost,
    };
  }

  public static create(): WorkflowRuntimeStatus {
    const status = new WorkflowRuntimeStatus();
    return status;
  }
}
