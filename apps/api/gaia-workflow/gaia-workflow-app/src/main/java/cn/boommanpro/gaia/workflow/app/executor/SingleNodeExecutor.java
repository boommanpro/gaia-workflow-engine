package cn.boommanpro.gaia.workflow.app.executor;

import cn.boommanpro.gaia.workflow.app.domain.testrun.input.SingleNodeRunInput;
import cn.boommanpro.gaia.workflow.app.domain.testrun.output.SingleNodeRunOutput;
import cn.boommanpro.gaia.workflow.app.service.NodeDataNormalizer;
import cn.boommanpro.gaia.workflow.base.GaiaWorkflow;
import cn.boommanpro.gaia.workflow.base.model.Chain;
import cn.boommanpro.gaia.workflow.base.model.ChainNode;
import cn.boommanpro.gaia.workflow.base.model.Parameter;
import cn.boommanpro.gaia.workflow.base.node.ChainParser;
import cn.boommanpro.gaia.workflow.base.node.NodeParser;
import cn.boommanpro.gaia.workflow.base.type.RefType;
import cn.hutool.core.exceptions.ExceptionUtil;
import cn.hutool.json.JSONArray;
import cn.hutool.json.JSONObject;
import cn.hutool.json.JSONUtil;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * 单节点执行器
 * <p>
 * 解析并独立执行工作流中的单个节点，用于编辑器中的节点级测试（前端 run-node-panel 入口）。
 * 节点 JSON 直接取画布 {@code node.toJSON()}——schema 与前端口径一致（容器节点内嵌
 * blocks/edges，与 LoopNodeParser 的读取路径相同）；执行前过 {@link NodeDataNormalizer}，
 * 与草稿/落版链路共享同一份归一化，扁平/历史形状在此收敛为规范形状。
 * 用户可提供模拟的内存上下文（inputs）以解析 ref/template 引用。
 * <p>
 * 支持测试的节点类型（2026-10-17 起全量放开）：
 * <ul>
 *   <li>普通节点：start, end, code, string-format, variable, http, llm, condition, branches</li>
 *   <li>loop：画布容器节点 toJSON 自带 blocks/edges，可独立迭代执行（需在面板给 loopFor 的
 *       上游引用填模拟值）</li>
 *   <li>workflow：嵌套工作流经 schema 解析钩子（WorkflowSchemaResolverBridge）加载执行</li>
 *   <li>block-start / block-end / continue / break：loop 内部控制节点，独立执行仅回显控制
 *       标记（loop.control）或空输出，主要用于排查节点配置</li>
 * </ul>
 * 不支持：group, note, comment（画布标注类，后端本就不执行）、
 * multi-condition（后端无解析器；画布载入时会自动迁移为 branches）。
 *
 * @author <a href="mailto:boommanpro@gmail.com">boommanpro</a>
 */
@Slf4j
@Component
public class SingleNodeExecutor {

    /**
     * 不支持单节点测试的节点类型：非执行节点（group/note/comment，引擎 parse 阶段
     * 本就跳过）与无解析器类型（multi-condition）。assignee 节点已整体删除（2026-10-28）。
     */
    private static final Set<String> UNSUPPORTED_TYPES = new HashSet<>(Arrays.asList(
            "group", "note", "comment", "multi-condition"
    ));

    /**
     * 执行单个节点
     *
     * @param input 节点 JSON 与模拟内存上下文
     * @return 执行结果
     */
    public SingleNodeRunOutput execute(SingleNodeRunInput input) {
        long startTime = System.currentTimeMillis();

        // 解析节点 JSON
        JSONObject nodeJSONObject = JSONUtil.parseObj(input.getNode());
        String nodeType = nodeJSONObject.getStr("type");

        if (nodeType == null || nodeType.isEmpty()) {
            return SingleNodeRunOutput.fail(null, "节点缺少 type 字段", 0);
        }

        if (UNSUPPORTED_TYPES.contains(nodeType)) {
            return SingleNodeRunOutput.fail(nodeType,
                    "该节点类型（" + nodeType + "）不参与执行（画布标注类节点），无法单独测试", 0);
        }

        NodeParser nodeParser = new ChainParser().getNodeParserMap().get(nodeType);
        if (nodeParser == null) {
            return SingleNodeRunOutput.fail(nodeType,
                    "未找到节点类型 " + nodeType + " 的解析器", 0);
        }

        try {
            // 与草稿/落版链路同源归一化：扁平/历史字段收敛为引擎规范形状（幂等，画布 canonical 形状不变）
            JSONObject dataObj = nodeJSONObject.getJSONObject("data");
            if (dataObj != null) {
                NodeDataNormalizer.normalize(nodeType, dataObj);
            }

            // 构造一个仅包含当前节点的工作流 schema，用于 GaiaWorkflow 实例化
            JSONArray nodesArray = new JSONArray();
            nodesArray.set(nodeJSONObject);
            JSONArray edgesArray = new JSONArray();
            String schema = JSONUtil.createObj()
                    .set("nodes", nodesArray)
                    .set("edges", edgesArray)
                    .toString();
            GaiaWorkflow workflow = new GaiaWorkflow(schema);

            // 直接调用 NodeParser 解析单个节点（绕过 ChainParser.parse 的 validateChain 校验）
            ChainNode chainNode = nodeParser.parse(nodeJSONObject, workflow);
            if (chainNode == null) {
                return SingleNodeRunOutput.fail(nodeType, "节点解析返回 null", 0);
            }

            // 构造最小 Chain 并注入内存上下文
            Chain chain = new Chain();
            if (input.getInputs() != null) {
                chain.getMemory().putAll(input.getInputs());
                bridgeFlatMockInputs(chain, chainNode, input.getInputs());
            }

            // 容器节点（loop 是 Chain 子类）需要 parent 链：迭代时复制上下文、
            // 接收子块事件都走 getParent()——完整工作流里由 ChainParser 接线，单节点路径在此补上
            if (chainNode instanceof Chain) {
                ((Chain) chainNode).setParent(chain);
            }

            // 执行节点
            Map<String, Object> executeResult = chainNode.execute(chain);

            // 解析输出
            List<Parameter> outputParameters = chainNode.getOutputParameters();
            Map<String, Object> outputs = parseOutputResult(outputParameters, executeResult);

            long timeCost = System.currentTimeMillis() - startTime;
            log.info("单节点执行成功: type={}, id={}, cost={}ms", nodeType, chainNode.getId(), timeCost);

            return SingleNodeRunOutput.success(nodeType, outputs, executeResult, timeCost);

        } catch (Throwable e) {
            long timeCost = System.currentTimeMillis() - startTime;
            log.error("单节点执行失败: type={}", nodeType, e);
            String errorMsg = e.getMessage() != null ? e.getMessage() : ExceptionUtil.stacktraceToString(e);
            return SingleNodeRunOutput.fail(nodeType, errorMsg, timeCost);
        }
    }

    /**
     * mockInputs 兼容两种形态：按上游节点 id 分组（{"http_1":{"body":…}}，引用解析的正规形态）
     * 与按本节点入参名直给（{"rates":…}，模型最自然的写法）。入参 ref 指向的上游值缺失、
     * 而 mockInputs 顶层恰有同名键时，把它搬到引用位置。
     * 2026-10-24 实证：模型按入参名给值，引用解析不到 → ReferenceError: rates is not defined → 盲猜 8 轮。
     */
    @SuppressWarnings("unchecked")
    static void bridgeFlatMockInputs(Chain chain, ChainNode node, Map<String, Object> inputs) {
        List<Parameter> parameters = node.getParameters();
        if (parameters == null || inputs == null || inputs.isEmpty()) {
            return;
        }
        Map<String, Object> memory = chain.getMemory();
        for (Parameter parameter : parameters) {
            List<String> ref = parameter.getRefValue();
            if (parameter.getRefType() != RefType.REF || ref == null || ref.size() < 2
                || !inputs.containsKey(parameter.getName())) {
                continue;
            }
            String upstream = ref.get(0);
            String field = ref.get(1);
            Object existing = memory.get(upstream);
            if (existing instanceof Map && ((Map<?, ?>) existing).containsKey(field)) {
                continue;
            }
            Map<String, Object> bucket = existing instanceof Map
                ? (Map<String, Object>) existing : new HashMap<>();
            bucket.put(field, inputs.get(parameter.getName()));
            memory.put(upstream, bucket);
        }
    }

    /**
     * 解析节点输出参数
     * <p>
     * 复制 Chain.parseOutputResult 的逻辑（该方法在 Chain 中为 private），
     * 根据 outputParameters 声明从 executeResult 中提取对应的值。
     */
    private Map<String, Object> parseOutputResult(List<Parameter> outputParameters, Map<String, Object> execute) {
        if (outputParameters == null) {
            return execute != null ? execute : new HashMap<>();
        }

        Map<String, Object> result = new HashMap<>();
        List<String> missingParams = new ArrayList<>();

        for (Parameter parameter : outputParameters) {
            Object value = null;
            if (parameter.getRefType() == RefType.REF) {
                List<String> refValue = parameter.getRefValue();
                if (refValue != null && refValue.size() >= 2) {
                    Object nodeResult = execute.get(refValue.get(0));
                    if (nodeResult instanceof Map) {
                        Map<String, Object> nodeResultMap = (Map<String, Object>) nodeResult;
                        value = nodeResultMap.get(refValue.get(1));
                    }
                } else if (refValue != null && !refValue.isEmpty()) {
                    value = execute.getOrDefault(String.join(".", refValue), parameter.getDefaultValue());
                }
            } else {
                value = parameter.getDefaultValue();
            }

            if (parameter.isRequire() && value == null) {
                missingParams.add(parameter.getName());
            }
            result.put(parameter.getName(), value);
        }

        if (!missingParams.isEmpty()) {
            throw new RuntimeException("必填输出参数缺失: " + String.join(", ", missingParams));
        }

        return result;
    }

    /**
     * 判断节点类型是否支持单节点测试
     *
     * @param nodeType 节点类型
     * @return 是否支持
     */
    public boolean isSupported(String nodeType) {
        return nodeType != null && !UNSUPPORTED_TYPES.contains(nodeType)
                && new ChainParser().getNodeParserMap().containsKey(nodeType);
    }

}
