package cn.boommanpro.gaia.workflow.app.domain.testrun.input;

import lombok.Data;

import java.util.Map;

/**
 * 代码功能
 *
 * @author <a href="mailto:boommanpro@gmail.com">boommanpro</a>
 * @date 2025/08/22 13:35
 */
@Data
public class TaskRunInput {
    private String schema;
    private Map<String, Object> inputs;
}
