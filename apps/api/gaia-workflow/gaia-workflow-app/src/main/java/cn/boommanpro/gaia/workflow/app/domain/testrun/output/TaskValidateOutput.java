package cn.boommanpro.gaia.workflow.app.domain.testrun.output;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.util.List;

/**
 * 代码功能
 *
 * @author <a href="mailto:boommanpro@gmail.com">boommanpro</a>
 * @date 2025/08/22 13:37
 */
@Data
@AllArgsConstructor
public class TaskValidateOutput {
    private boolean valid;
    private List<String> errors;

    public static TaskValidateOutput success() {
        return new TaskValidateOutput(true, null);
    }

    public static TaskValidateOutput fail(List<String> errors) {
        return new TaskValidateOutput(false, errors);
    }
}
