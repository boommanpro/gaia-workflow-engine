package cn.boommanpro.gaia.workflow.infra.extend.node.loop;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.util.Map;

/**
 * 块执行结果
 * 用于替代SubChainExecutor.SubChainExecutionResult
 *
 * @author <a href="mailto:boommanpro@gmail.com">boommanpro</a>
 * @date 2025/08/22
 */
@Data
@AllArgsConstructor
public class BlockExecutionResult {
    private final boolean isBreak;
    private final boolean isContinue;
    private final Map<String, Object> memory;
}

