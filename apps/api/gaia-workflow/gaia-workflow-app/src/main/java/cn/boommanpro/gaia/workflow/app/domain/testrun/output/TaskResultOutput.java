package cn.boommanpro.gaia.workflow.app.domain.testrun.output;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.util.Map;

@Data
@AllArgsConstructor
public class TaskResultOutput {
    private Map<String, Object> outputs;
}

