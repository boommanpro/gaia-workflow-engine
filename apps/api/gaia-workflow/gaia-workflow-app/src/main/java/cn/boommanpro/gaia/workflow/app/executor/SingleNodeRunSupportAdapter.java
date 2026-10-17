package cn.boommanpro.gaia.workflow.app.executor;

import cn.boommanpro.gaia.workflow.app.domain.testrun.input.SingleNodeRunInput;
import cn.boommanpro.gaia.workflow.app.domain.testrun.output.SingleNodeRunOutput;
import org.springframework.stereotype.Component;

/**
 * {@link SingleNodeRunSupport} 的默认适配：委托 {@link SingleNodeExecutor}。
 */
@Component
public class SingleNodeRunSupportAdapter implements SingleNodeRunSupport {

    private final SingleNodeExecutor singleNodeExecutor;

    public SingleNodeRunSupportAdapter(SingleNodeExecutor singleNodeExecutor) {
        this.singleNodeExecutor = singleNodeExecutor;
    }

    @Override
    public SingleNodeRunOutput execute(SingleNodeRunInput input) {
        return singleNodeExecutor.execute(input);
    }
}
