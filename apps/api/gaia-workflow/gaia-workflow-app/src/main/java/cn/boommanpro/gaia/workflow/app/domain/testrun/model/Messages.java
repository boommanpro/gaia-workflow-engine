package cn.boommanpro.gaia.workflow.app.domain.testrun.model;

import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

/**
 * 消息
 *
 * @author <a href="mailto:boommanpro@gmail.com">boommanpro</a>
 * @date 2025/08/22 13:41
 */
@Data
@NoArgsConstructor
public class Messages {
    private List<ErrorMessage> error = new ArrayList<>();
}

