import { ValidationDefine } from './validation';
import { FlowGramAPIDefines } from './type';
import { TaskRunDefine } from './task-run';
import { TaskResultDefine } from './task-result';
import { TaskReportDefine } from './task-report';
import { TaskCancelDefine } from './task-cancel';
import { ServerInfoDefine } from './server-info';
import { FlowGramAPIName } from './constant';

export const FlowGramAPIs: FlowGramAPIDefines = {
  [FlowGramAPIName.ServerInfo]: ServerInfoDefine,
  [FlowGramAPIName.TaskRun]: TaskRunDefine,
  [FlowGramAPIName.TaskReport]: TaskReportDefine,
  [FlowGramAPIName.TaskResult]: TaskResultDefine,
  [FlowGramAPIName.TaskCancel]: TaskCancelDefine,
  [FlowGramAPIName.Validation]: ValidationDefine,
};

export const FlowGramAPINames = Object.keys(FlowGramAPIs) as FlowGramAPIName[];
