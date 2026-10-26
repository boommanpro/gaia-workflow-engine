package cn.boommanpro.gaia.workflow.base.node;

import cn.boommanpro.gaia.workflow.base.GaiaWorkflow;
import cn.boommanpro.gaia.workflow.base.model.EdgeCondition;
import cn.boommanpro.gaia.workflow.base.model.Chain;
import cn.boommanpro.gaia.workflow.base.model.ChainEdge;
import cn.boommanpro.gaia.workflow.base.model.ChainNode;
import cn.boommanpro.gaia.workflow.base.tools.SpringExpressionParser;
import cn.boommanpro.gaia.workflow.base.type.NodeTypeEnum;
import cn.hutool.core.util.StrUtil;
import cn.hutool.json.JSONArray;
import cn.hutool.json.JSONObject;

import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

public class ChainParser {
    private static Map<String, cn.boommanpro.gaia.workflow.base.node.NodeParser> nodeParserMap = new HashMap<>();


    public Map<String, cn.boommanpro.gaia.workflow.base.node.NodeParser> getNodeParserMap() {
        return nodeParserMap;
    }

    public Chain parse(JSONArray nodes, JSONArray edges, GaiaWorkflow workflow) {
        Chain chain = new Chain();
        for (int i = 0; i < nodes.size(); i++) {
            JSONObject nodeJSONObject = nodes.getJSONObject(i);
            String type = nodeJSONObject.getStr("type");
            if (NodeTypeEnum.notParse(type)) {
                continue;
            }
            NodeParser parser = nodeParserMap.get(type);
            if (parser == null) {
                throw new IllegalArgumentException(String.format(
                        "不支持的节点类型: %s（节点 %s）——引擎没有该类型的解析器，请删除或替换该节点",
                        type, nodeJSONObject.getStr("id")));
            }
            ChainNode node = parser.parse(nodeJSONObject, workflow);
            chain.addNode(node);
        }
        for (int i = 0; i < edges.size(); i++) {
            JSONObject edgeJSONObject = edges.getJSONObject(i);
            ChainEdge edge = parseEdge(edgeJSONObject);
            chain.addEdge(edge);
        }
        validateChain(chain);
        return chain;
    }

    private void validateChain(Chain chain) {
        List<ChainNode> nodes = chain.getNodes();
        Map<String, ChainNode> nodeMap = nodes.stream().collect(Collectors.toMap(ChainNode::getId, Function.identity()));

        // 存储节点的上游节点集合
        Map<String, Set<String>> nodeUpstreams = new HashMap<>();
        // 存储节点的下游节点集合
        Map<String, Set<String>> nodeDownstreams = new HashMap<>();

        // 构建节点依赖关系
        List<ChainEdge> edges = chain.getEdges();
        // 带端口条件的出边（condition / branches 的互斥路由）：源节点集合
        Set<String> exclusiveRouters = new HashSet<>();
        if (edges != null) {
            for (ChainEdge edge : edges) {
                String sourceId = edge.getSource();
                String targetId = edge.getTarget();

                // 记录下游节点
                nodeDownstreams.computeIfAbsent(sourceId, k -> new HashSet<>()).add(targetId);
                // 记录上游节点
                nodeUpstreams.computeIfAbsent(targetId, k -> new HashSet<>()).add(sourceId);
                if (StrUtil.isNotBlank(edge.getSourcePortID())) {
                    exclusiveRouters.add(sourceId);
                }
            }
        }

        // 查找开始节点
        ChainNode startNode = findStartNode(chain, nodeUpstreams);
        if (startNode == null) {
            throw new IllegalStateException("No start node found in the chain");
        }

        // 并发分支的出线不允许进入另一个并发分支。
        // 只针对「无条件多出边」（真正的并发扇出）；condition / branches 的多出边是互斥路由，
        // 运行期只走一条、汇合点按 ChainDepStatus（任一入边为真即 READY）正常执行——
        // 2026-10-24 实证：「低风险并入自动分支」这类两个条件节点汇到同一下游的合法拓扑
        // 被误判为并发交叉，模型反复重连 40 余次无解。按节点声明顺序遍历，裁决不再依赖 HashMap 顺序。
        for (ChainNode source : nodes) {
            Set<String> downstreams = nodeDownstreams.get(source.getId());
            if (downstreams == null || downstreams.size() <= 1 || exclusiveRouters.contains(source.getId())) {
                continue;
            }
            for (String downstreamId : downstreams) {
                ChainNode downstreamNode = nodeMap.get(downstreamId);
                if (source.isParallel() && downstreamNode.isParallel()) {
                    throw new RuntimeException("并发分支的出线不允许进入另一个并发分支（"
                        + source.getId() + " → " + downstreamId + "）：并行扇出的各分支之间不能交叉连线，"
                        + "需要汇合时让各分支都连到同一个汇合节点，由它再往下接");
                }
                downstreamNode.setParallel(true);
            }
        }
    }

    public static ChainEdge parseEdge(JSONObject edgeObject) {
        if (edgeObject == null) return null;
        ChainEdge edge = new ChainEdge();
        edge.setId(String.format("%s_%s_%s", edgeObject.getStr("sourceNodeID"), edgeObject.getStr("targetNodeID"), edgeObject.getStr("sourcePortID")));
        edge.setSource(edgeObject.getStr("sourceNodeID"));
        edge.setTarget(edgeObject.getStr("targetNodeID"));
        edge.setSourcePortID(edgeObject.getStr("sourcePortID"));


        String conditionString = edge.getSourcePortID();
        if (StrUtil.isNotBlank(conditionString)) {
//            edge.setCondition(new JavascriptStringCondition(conditionString.trim()));
            edge.setCondition(new EdgeCondition() {
                @Override
                public boolean check(Chain chain, ChainEdge edge) {
                    String key = String.format("%s.%s", edgeObject.getStr("sourceNodeID"), edgeObject.getStr("sourcePortID"));
                    Object o = SpringExpressionParser.getInstance().getValue(key, chain.getMemory());
                    return Optional.ofNullable(o).map(new Function<Object, Boolean>() {
                        @Override
                        public Boolean apply(Object o) {
                            return Boolean.parseBoolean(o.toString());
                        }
                    }).orElse(false);
                }
            });
        }
        return edge;
    }


    private ChainNode findStartNode(Chain chain, Map<String, Set<String>> nodeUpstreams) {
        for (ChainNode node : chain.getNodes()) {
            // 开始节点没有上游节点
            if (node.getInwardEdges().isEmpty()) {
                return node;
            }
        }
        return null;
    }

    public static void registerNodeParser(String type, NodeParser nodeParser) {
        nodeParserMap.put(type, nodeParser);
    }
}
