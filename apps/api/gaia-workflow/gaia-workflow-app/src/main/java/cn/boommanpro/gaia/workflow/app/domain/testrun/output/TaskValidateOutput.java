package cn.boommanpro.gaia.workflow.app.domain.testrun.output;

import cn.boommanpro.gaia.workflow.app.service.WorkflowDslValidator;
import lombok.AllArgsConstructor;
import lombok.Data;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

/**
 * 工作流校验结果（POST /api/task/validate）。
 *
 * <p>2026-10-16 起对接 {@link WorkflowDslValidator}：errors 是 error 级问题的单行文案
 * （兼容旧字段），issues 是结构化问题（level/code/nodeId/message），warnings 放行提示。</p>
 */
@Data
@AllArgsConstructor
public class TaskValidateOutput {
    private boolean valid;
    private List<String> errors;
    /** 结构化问题清单（含 warning 级） */
    private List<WorkflowDslValidator.Issue> issues;
    /** 放行但应关注的告警 */
    private List<String> warnings;

    public static TaskValidateOutput success() {
        return new TaskValidateOutput(true, null, Collections.emptyList(), Collections.emptyList());
    }

    public static TaskValidateOutput fail(List<String> errors) {
        return new TaskValidateOutput(false, errors, Collections.emptyList(), Collections.emptyList());
    }

    public static TaskValidateOutput of(List<WorkflowDslValidator.Issue> issues) {
        List<String> errors = new ArrayList<>();
        List<String> warnings = new ArrayList<>();
        for (WorkflowDslValidator.Issue issue : issues) {
            if ("error".equals(issue.getLevel())) {
                errors.add(issue.getMessage());
            } else {
                warnings.add(issue.getMessage());
            }
        }
        return new TaskValidateOutput(errors.isEmpty(), errors.isEmpty() ? null : errors, issues, warnings);
    }
}
