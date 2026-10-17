package cn.boommanpro.gaia.workflow.app.executor;

import cn.boommanpro.gaia.workflow.app.domain.testrun.input.SingleNodeRunInput;
import cn.boommanpro.gaia.workflow.app.domain.testrun.output.SingleNodeRunOutput;

/**
 * 单节点执行的可注入入口：让测试用例执行器不必依赖具体实现类（与前端共用 SingleNodeExecutor）。
 */
public interface SingleNodeRunSupport {

    SingleNodeRunOutput execute(SingleNodeRunInput input);
}
