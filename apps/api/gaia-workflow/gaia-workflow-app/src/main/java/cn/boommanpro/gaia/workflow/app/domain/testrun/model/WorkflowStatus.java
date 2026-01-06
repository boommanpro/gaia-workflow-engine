package cn.boommanpro.gaia.workflow.app.domain.testrun.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 工作流状态
 *
 * @author <a href="mailto:boommanpro@gmail.com">boommanpro</a>
 * @date 2025/08/22 13:41
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class WorkflowStatus {
    private String status;
    private boolean terminated;
}

