package cn.boommanpro.gaia.workflow.infra.extend.node.code;

import java.util.Map;

public interface CodeExecute {
    Map<String, Object> execute(Map<String, Object> inputs);
}
