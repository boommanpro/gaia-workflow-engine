package cn.boommanpro.gaia.workflow.infra.extend.node;

import cn.boommanpro.gaia.workflow.base.model.ChainNode;
import cn.boommanpro.gaia.workflow.base.model.Parameter;
import lombok.Data;

import java.util.ArrayList;
import java.util.List;

/**
 * 代码功能
 *
 * @author <a href="mailto:boommanpro@gmail.com">boommanpro</a>
 * @date 2025/05/17 15:01
 */
@Data
public abstract class BaseNode extends ChainNode {
    protected List<Parameter> parameters;
    protected List<Parameter> outputParameters;

    @Override
    public List<Parameter> getParameters() {
        return parameters != null ? parameters : new ArrayList<>();
    }

    @Override
    public List<Parameter> getOutputParameters() {
        return outputParameters != null ? outputParameters : new ArrayList<>();
    }

    public List<Parameter> addParameter() {
        return parameters;
    }

    public List<Parameter> addOutDefs() {
        return outputParameters;
    }
}
