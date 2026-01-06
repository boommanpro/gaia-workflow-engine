package cn.boommanpro.gaia.workflow.base;

import cn.boommanpro.gaia.workflow.base.listener.ChainExecutionListener;
import cn.boommanpro.gaia.workflow.base.model.ChainNodeExecuteInfo;
import cn.boommanpro.gaia.workflow.base.model.Chain;
import cn.boommanpro.gaia.workflow.base.node.ChainParser;
import cn.hutool.json.JSONArray;
import cn.hutool.json.JSONObject;
import cn.hutool.json.JSONUtil;
import lombok.AllArgsConstructor;
import lombok.Data;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;

public class GaiaWorkflow {

    private String data;

    private ChainParser chainParser = new ChainParser();

    private Chain chain;

    public GaiaWorkflow(String data) {
        this.data = data;
    }

    public Chain toChain() {
        if (chain == null) {
            JSONObject jsonObject = JSONUtil.parseObj(data);
            JSONArray nodes = jsonObject.getJSONArray("nodes");
            JSONArray edges = jsonObject.getJSONArray("edges");
            chain = chainParser.parse(nodes, edges, this);
        }
        return chain;
    }

    /**
     * 执行工作流
     *
     * @param inputs 输入参数
     * @return 执行结果
     */
    public Map<String, Object> run(Map<String, Object> inputs) {
        Chain chain = toChain();
        return chain.executeForResult(inputs);
    }

    /**
     * 执行工作流（无输入参数）
     *
     * @return 执行结果
     */
    public Map<String, Object> run() {
        return run(new HashMap<>());
    }

    /**
     * 异步执行工作流（非阻塞）
     * 支持实时状态更新和进度监听
     *
     * @param inputs 输入参数
     * @return CompletableFuture 执行结果
     */
    public CompletableFuture<Map<String, Object>> runAsync(Map<String, Object> inputs) {
        Chain chain = toChain();
        return chain.executeAsync(inputs);
    }

    /**
     * 异步执行工作流（无输入参数）
     *
     * @return CompletableFuture 执行结果
     */
    public CompletableFuture<Map<String, Object>> runAsync() {
        return runAsync(new HashMap<>());
    }

    /**
     * 添加执行监听器
     *
     * @param listener 监听器
     */
    public void addListener(ChainExecutionListener listener) {
        Chain chain = toChain();
        chain.addListener(listener);
    }

    /**
     * 移除执行监听器
     *
     * @param listener 监听器
     */
    public void removeListener(ChainExecutionListener listener) {
        Chain chain = toChain();
        chain.removeListener(listener);
    }

    /**
     * 关闭异步执行相关资源
     */
    public void shutdownAsyncExecution() {
        if (chain != null) {
            chain.shutdownAsyncExecution();
        }
    }

    /**
     * 获取节点执行报告
     *
     * @return 节点执行报告
     */
    public Map<String, NodeReport> getNodeReports() {
        // 确保工作流已经执行过，如果chain还未初始化则先执行一次
        Chain chain = toChain();
        Map<String, ChainNodeExecuteInfo> executeInfoMap = chain.getExecuteInfoMap();
        Map<String, NodeReport> nodeReports = new HashMap<>();

        executeInfoMap.forEach((nodeId, info) -> {
            String status = info.getStatus() != null ? info.getStatus().name() : "UNKNOWN";

            // 计算执行时长
            long timeCost = 0;
            Long startTime = info.getStartTime();
            Long endTime = info.getEndTime();
            if (startTime != null && endTime != null) {
                timeCost = endTime - startTime;
            }

            // 创建 snapshots 列表
            List<Object> snapshots = new ArrayList<>();

            // 创建与 controller 中格式一致的 snapshot 对象
            Map<String, Object> snapshotData = new HashMap<>();
            snapshotData.put("id", nodeId);
            snapshotData.put("nodeID", nodeId);
            snapshotData.put("inputs", parseJsonStringToMap(info.getInputsResult()));
            snapshotData.put("outputs", parseJsonStringToMap(info.getOutputResult()));
            snapshotData.put("data", parseJsonStringToObject(info.getExecuteResult()));
            snapshotData.put("branch", ""); // 暂时为空，根据需要可以填充

            // 在error字段中包含异常信息
            String error = "";
            if (status.contains("FAILED")) {
                if (info.getException() != null && !info.getException().isEmpty()) {
                    error = info.getException();
                } else {
                    error = "执行失败";
                }
            }
            snapshotData.put("error", error);

            snapshots.add(snapshotData);

            NodeReport report = new NodeReport(
                    nodeId,
                    status,
                    info.getStartTime(),
                    info.getEndTime(),
                    timeCost,
                    snapshots
            );
            nodeReports.put(nodeId, report);
        });

        return nodeReports;
    }

    /**
     * 将 JSON 字符串解析为 Map 对象
     *
     * @param jsonString JSON 字符串
     * @return Map 对象
     */
    private Map<String, Object> parseJsonStringToMap(String jsonString) {
        if (jsonString == null || jsonString.isEmpty()) {
            return new HashMap<>();
        }
        try {
            return JSONUtil.parseObj(jsonString);
        } catch (Exception e) {
            // 解析失败时返回空 Map
            return new HashMap<>();
        }
    }

    /**
     * 将 JSON 字符串解析为 Object 对象
     *
     * @param jsonString JSON 字符串
     * @return Object 对象
     */
    private Object parseJsonStringToObject(String jsonString) {
        if (jsonString == null || jsonString.isEmpty()) {
            return new HashMap<>();
        }
        try {
            return JSONUtil.parse(jsonString);
        } catch (Exception e) {
            // 解析失败时返回空对象
            return new HashMap<>();
        }
    }

    /**
     * 节点报告类
     */
    @Data
    @AllArgsConstructor
    public static class NodeReport {
        private String id;
        private String status;
        private Long startTime;
        private Long endTime;
        private Long timeCost;
        private List<Object> snapshots = new ArrayList<>();

    }
}
