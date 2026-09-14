/**
 * 工作区版工具执行器挂载。
 *
 * 原先 setToolExecutor 由 AgentDockPanel 调用，而 AI 工作区不再渲染 Dock，
 * 若不在此挂载，navigate / query / canvas 等工具会全部不可用。
 */
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import { useAgent } from '../agent/AgentContext';
import { createToolExecutor } from '../agent/tools';

export const WorkspaceToolExecutor: React.FC = () => {
  const navigate = useNavigate();
  const { setToolExecutor } = useAgent();

  useEffect(() => {
    setToolExecutor(createToolExecutor(navigate));
  }, [navigate, setToolExecutor]);

  return null;
};

export default WorkspaceToolExecutor;
