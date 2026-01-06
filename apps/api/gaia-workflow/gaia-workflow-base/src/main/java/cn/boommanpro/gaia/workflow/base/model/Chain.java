package cn.boommanpro.gaia.workflow.base.model;

import cn.boommanpro.gaia.workflow.base.event.*;
import cn.boommanpro.gaia.workflow.base.listener.*;
import cn.boommanpro.gaia.workflow.base.exception.ChainException;
import cn.boommanpro.gaia.workflow.base.type.*;
import cn.boommanpro.gaia.workflow.base.tools.NamedThreadPools;
import cn.hutool.core.exceptions.ExceptionUtil;
import cn.hutool.core.text.StrFormatter;
import cn.hutool.json.JSONUtil;
import lombok.Getter;
import lombok.extern.slf4j.Slf4j;

import java.util.*;
import java.util.concurrent.*;
import java.util.stream.Collectors;

/**
 * 链类 - 继承自ChainNode，直接集成执行逻辑
 * 参考Agents-Flex Core的简洁架构设计
 *
 * @author <a href="mailto:boommanpro@gmail.com">boommanpro</a>
 * @date 2025/08/22
 */
@Slf4j
@Getter
public class Chain extends ChainNode {

    // 链特有的属性
    private List<ChainNode> nodes;
    private List<ChainEdge> edges;
    private Chain parent;
    private List<Chain> children;

    // 执行相关属性
    private Map<String, Object> executeResult = null;
    private Map<String, Object> outputResult;
    private Map<String, Object> memory = new HashMap<>();
    private ChainStatus chainStatus = ChainStatus.READY;
    private Exception exception;
    private String message;

    // 事件监听器管理
    private Map<Class<?>, List<ChainEventListener>> eventListeners = new HashMap<>();
    private List<ChainOutputListener> outputListeners = new CopyOnWriteArrayList<>();
    private List<ChainErrorListener> chainErrorListeners = new CopyOnWriteArrayList<>();
    private List<NodeErrorListener> nodeErrorListeners = new CopyOnWriteArrayList<>();
    private List<ChainSuspendListener> suspendListeners = new CopyOnWriteArrayList<>();

    // 异步执行相关
    private ExecutorService asyncNodeExecutors = NamedThreadPools.newFixedThreadPool("chain-executor");
    private Phaser phaser = new Phaser(1);
    private Map<String, NodeContext> nodeContexts = new ConcurrentHashMap<>();
    private Map<String, ChainNode> suspendNodes = new ConcurrentHashMap<>();
    private List<Parameter> suspendForParameters;

    // 节点执行信息映射
    private final Map<String, ChainNodeExecuteInfo> executeInfoMap = new ConcurrentHashMap<>();

    // 异步执行相关字段
    private List<ChainExecutionListener> listeners = new ArrayList<>();
    private ScheduledExecutorService progressUpdateExecutor = Executors.newSingleThreadScheduledExecutor();
    private volatile boolean asyncExecutionCompleted = false;
    private CompletableFuture<Map<String, Object>> asyncExecutionFuture;

    public Chain() {
        this.id = UUID.randomUUID().toString();
        this.nodeType = NodeTypeEnum.CHAIN;
    }

    // ==================== 节点管理 ====================

    public List<ChainNode> addNode(ChainNode node) {
        if (nodes == null) {
            nodes = new ArrayList<>();
        }

        if (node instanceof ChainEventListener) {
            addEventListener((ChainEventListener) node);
        }

        if (node.getId() == null) {
            node.setId(UUID.randomUUID().toString());
        }

        if (node instanceof Chain) {
            ((Chain) node).parent = this;
            addChild((Chain) node);
        }

        nodes.add(node);
        return nodes;
    }

    private void addChild(Chain child) {
        if (this.children == null) {
            this.children = new ArrayList<>();
        }
        this.children.add(child);
    }

    public List<ChainEdge> addEdge(ChainEdge edge) {
        if (edges == null) {
            edges = new ArrayList<>();
        }
        edges.add(edge);

        boolean findSource = false, findTarget = false;

        for (ChainNode node : nodes) {
            if (node.getId().equals(edge.getSource())) {
                node.addOutwardEdge(edge);
                findSource = true;
            } else if (node.getId().equals(edge.getTarget())) {
                node.addInwardEdge(edge);
                findTarget = true;
            }
            if (findSource && findTarget) {
                break;
            }
        }
        return edges;
    }

    // ==================== 事件监听器管理 ====================

    public synchronized void addEventListener(Class<? extends ChainEvent> eventClass, ChainEventListener listener) {
        List<ChainEventListener> chainEventListeners = eventListeners.computeIfAbsent(eventClass, k -> new ArrayList<>());
        chainEventListeners.add(listener);
    }

    public synchronized void addEventListener(ChainEventListener listener) {
        List<ChainEventListener> chainEventListeners = eventListeners.computeIfAbsent(ChainEvent.class, k -> new ArrayList<>());
        chainEventListeners.add(listener);
    }

    public synchronized void removeEventListener(ChainEventListener listener) {
        for (List<ChainEventListener> list : eventListeners.values()) {
            list.removeIf(item -> item == listener);
        }
    }

    public synchronized void removeEventListener(Class<? extends ChainEvent> eventClass, ChainEventListener listener) {
        List<ChainEventListener> list = eventListeners.get(eventClass);
        if (list != null && !list.isEmpty()) {
            list.removeIf(item -> item == listener);
        }
    }

    public synchronized void addErrorListener(ChainErrorListener listener) {
        this.chainErrorListeners.add(listener);
    }

    public synchronized void removeErrorListener(ChainErrorListener listener) {
        this.chainErrorListeners.remove(listener);
    }

    public synchronized void addNodeErrorListener(NodeErrorListener listener) {
        this.nodeErrorListeners.add(listener);
    }

    public synchronized void removeNodeErrorListener(NodeErrorListener listener) {
        this.nodeErrorListeners.remove(listener);
    }

    public synchronized void addSuspendListener(ChainSuspendListener listener) {
        this.suspendListeners.add(listener);
    }

    public synchronized void removeSuspendListener(ChainSuspendListener listener) {
        this.suspendListeners.remove(listener);
    }

    public void addOutputListener(ChainOutputListener outputListener) {
        if (this.outputListeners == null) {
            this.outputListeners = new CopyOnWriteArrayList<>();
        }
        this.outputListeners.add(outputListener);
    }

    // ==================== 事件通知 ====================

    public void notifyEvent(ChainEvent event) {
        for (Map.Entry<Class<?>, List<ChainEventListener>> entry : eventListeners.entrySet()) {
            if (entry.getKey().isInstance(event)) {
                for (ChainEventListener chainEventListener : entry.getValue()) {
                    try {
                        chainEventListener.onEvent(event);
                    } catch (Exception e) {
                        log.warn("事件监听器通知异常", e);
                    }
                }
            }
        }
        if (parent != null) parent.notifyEvent(event);
    }

    private void notifyOutput(ChainNode node, Object response) {
        for (ChainOutputListener inputListener : outputListeners) {
            try {
                inputListener.onOutput(this, node, response);
            } catch (Exception e) {
                log.warn("输出监听器通知异常", e);
            }
        }
        if (parent != null) parent.notifyOutput(node, response);
    }

    private void notifySuspend() {
        for (ChainSuspendListener suspendListener : suspendListeners) {
            try {
                suspendListener.onSuspend(this);
            } catch (Exception e) {
                log.warn("暂停监听器通知异常", e);
            }
        }
        if (parent != null) parent.notifySuspend();
    }

    private void notifyError(Throwable error) {
        for (ChainErrorListener errorListener : chainErrorListeners) {
            try {
                errorListener.onError(error, this);
            } catch (Exception e) {
                log.warn("错误监听器通知异常", e);
            }
        }
        if (parent != null) parent.notifyError(error);
    }

    private void notifyNodeError(Throwable error, ChainNode node, Map<String, Object> executeResult) {
        for (NodeErrorListener errorListener : nodeErrorListeners) {
            try {
                errorListener.onError(error, node, executeResult, this);
            } catch (Exception e) {
                log.warn("节点错误监听器通知异常", e);
            }
        }
        if (parent != null) parent.notifyNodeError(error, node, executeResult);
    }

    // ==================== 执行逻辑 ====================

    @Override
    public Map<String, Object> execute(Chain parent) {
        return executeForResult(parent.getMemory());
    }

    public void execute(Map<String, Object> variables) {
        runInLifeCycle(variables,
                new ChainStartEvent(this, variables),
                this::executeInternal);
    }

    public Map<String, Object> executeForResult(Map<String, Object> variables) {
        return executeForResult(variables, false);
    }

    public Map<String, Object> executeForResult(Map<String, Object> variables, boolean ignoreError) {
        if (this.chainStatus == ChainStatus.SUSPEND) {
            this.resume(variables);
        } else {
            runInLifeCycle(variables, new ChainStartEvent(this, variables), this::executeInternal);
        }

        if (!ignoreError) {
            if (this.chainStatus == ChainStatus.FINISHED_ABNORMAL) {
                if (this.exception != null) {
                    if (this.exception instanceof RuntimeException) {
                        throw (RuntimeException) this.exception;
                    } else {
                        throw new ChainException(this.exception);
                    }
                } else {
                    if (this.message == null) this.message = "Chain execute error";
                    throw new ChainException(this.message);
                }
            }
        }

        return this.outputResult;
    }

    @Override
    public List<Parameter> getParameters() {
        List<ChainNode> startNodes = this.getStartNodes();
        if (startNodes == null || startNodes.isEmpty()) {
            return Collections.emptyList();
        }

        List<Parameter> parameters = new ArrayList<>();
        for (ChainNode node : startNodes) {
            List<Parameter> nodeParameters = node.getParameters();
            if (nodeParameters != null) parameters.addAll(nodeParameters);
        }
        return parameters;
    }

    protected void executeInternal() {
        List<ChainNode> currentNodes = getStartNodes();
        if (currentNodes == null || currentNodes.isEmpty()) {
            return;
        }

        List<ExecuteNode> executeNodes = new ArrayList<>();
        for (ChainNode currentNode : currentNodes) {
            executeNodes.add(new ExecuteNode(currentNode, null, ""));
        }

        doExecuteNodes(executeNodes);
    }

    protected void doExecuteNodes(List<ExecuteNode> executeNodes) {
        for (ExecuteNode executeNode : executeNodes) {
            ChainNode currentNode = executeNode.currentNode;
            if (currentNode.isAsync()) {
                phaser.register();
                asyncNodeExecutors.execute(() -> {
                    try {
                        doExecuteNode(executeNode);
                    } finally {
                        phaser.arriveAndDeregister();
                    }
                });
            } else {
                doExecuteNode(executeNode);
            }
        }
    }

    protected void doExecuteNode(ExecuteNode executeNode) {
        doExecuteNodeInternal(executeNode.currentNode, false);
    }

    /**
     * 统一的节点执行内部方法
     *
     * @param chainNode 节点
     * @param isAsync   是否异步执行
     */
    private void doExecuteNodeInternal(ChainNode chainNode, boolean isAsync) {
        synchronized (chainNode) {
            updateCurrentNodeStatus(chainNode);
            ChainNodeExecuteInfo chainNodeExecuteInfo = executeInfoMap.get(chainNode.getId());
            chainNode.setStatus(chainNodeExecuteInfo.getStatus());


            if (chainNode.getStatus() == ChainNodeStatus.WAIT) {
                return;
            }
            chainNodeExecuteInfo.trigger();
            // 异步模式下通知节点状态变化
            if (isAsync) {
                notifyNodeStatusChanged(chainNode.getId(), chainNodeExecuteInfo);
            }

            chainNodeExecuteInfo.setStartTime(System.currentTimeMillis());
            chainNodeExecuteInfo.setInwardEdges(chainNode.getInwardEdges().stream()
                    .filter(chainEdge -> chainEdge.getStatus() == ChainEdgeStatus.TRUE)
                    .map(ChainEdge::getId)
                    .collect(Collectors.toList()));

            if (chainNodeExecuteInfo.getStatus() == ChainNodeStatus.READY) {
                Map<String, Object> executeResult = null;
                NodeContext nodeContext = getNodeContext(chainNode);

                try {
                    // 调用节点执行前的钩子方法
                    onNodeExecuteBefore(nodeContext);

                    chainNodeExecuteInfo.setInputsResult(JSONUtil.toJsonStr(chainNode.getParametersData(this)));

                    // 通知节点开始执行事件
                    notifyEvent(new NodeStartEvent(this, chainNode));
                    if (this.getChainStatus() != ChainStatus.RUNNING) {
                        return;
                    }

                    // 设置节点状态为运行中
                    chainNode.setStatus(ChainNodeStatus.RUNNING);
                    chainNodeExecuteInfo.setStatus(ChainNodeStatus.RUNNING);

                    if (isAsync) {
                        notifyNodeStatusChanged(chainNode.getId(), chainNodeExecuteInfo);
                    }

                    // 调用节点执行开始的钩子方法
                    onNodeExecuteStart(nodeContext);

                    executeResult = chainNode.execute(this);
                    chainNodeExecuteInfo.setExecuteResult(JSONUtil.toJsonStr(executeResult));

                    List<Parameter> outputParameters = chainNode.getOutputParameters();
                    Map<String, Object> outputResult = parseOutputResult(outputParameters, executeResult);
                    chainNodeExecuteInfo.setOutputResult(JSONUtil.toJsonStr(outputResult));

                    if (!outputResult.isEmpty()) {
                        getMemory().put(chainNode.getId(), new HashMap<>(outputResult));
                    }

                    chainNode.setStatus(ChainNodeStatus.FINISHED);
                    this.executeResult = executeResult;
                    this.outputResult = outputResult;

                    // 通知输出
                    if (outputResult != null && !outputResult.isEmpty()) {
                        notifyOutput(chainNode, outputResult);
                    }

                    // 调用节点执行结束的钩子方法
                    onNodeExecuteEnd(nodeContext);

                } catch (Throwable error) {
                    chainNode.setStatus(ChainNodeStatus.FAILED);
                    log.error("exec {} node {}, error:", chainNode.getNodeType(), chainNode.getId(), error);
                    chainNodeExecuteInfo.setStatus(ChainNodeStatus.FAILED);
                    chainNodeExecuteInfo.setExecuteResult(StrFormatter.format("exec {} node {}, error:", chainNode.getNodeType(), chainNode.getId(), error.getMessage()));
                    chainNodeExecuteInfo.setException(ExceptionUtil.stacktraceToString(error));
                    this.chainStatus = ChainStatus.FINISHED_ABNORMAL;

                    // 通知节点错误
                    notifyNodeError(error, chainNode, executeResult);
                } finally {
                    // 通知节点结束执行事件
                    onNodeExecuteEnd(nodeContext);
                }
            }

            chainNodeExecuteInfo.setStatus(chainNode.getStatus());
            chainNodeExecuteInfo.setEndTime(System.currentTimeMillis());

            // 异步模式下再次通知节点状态变化
            if (isAsync) {
                notifyNodeStatusChanged(chainNode.getId(), chainNodeExecuteInfo);
            }

            // 调用节点执行后的钩子方法
            NodeContext nodeContext = getNodeContext(chainNode);
            onNodeExecuteAfter(nodeContext);

            // 处理后续节点
            processSubsequentNodes(chainNode,chainNodeExecuteInfo, isAsync);
        }
    }

    /**
     * 处理后续节点
     *
     * @param chainNode            当前节点
     * @param chainNodeExecuteInfo
     * @param isAsync              是否异步执行
     */
    private void processSubsequentNodes(ChainNode chainNode, ChainNodeExecuteInfo chainNodeExecuteInfo, boolean isAsync) {
        if (chainNode.getStatus() == ChainNodeStatus.FINISHED) {
            for (ChainEdge outwardEdge : chainNode.getOutwardEdges()) {
                EdgeCondition condition = outwardEdge.getCondition();
                if (condition == null) {
                    outwardEdge.setStatus(ChainEdgeStatus.TRUE);
                    executeNextNode(outwardEdge.getTarget(), isAsync);
                    continue;
                }
                if (condition.check(this, outwardEdge)) {
                    outwardEdge.setStatus(ChainEdgeStatus.TRUE);
                    chainNodeExecuteInfo.setBranch(outwardEdge.getSourcePortID());
                    if (isAsync) {
                        notifyNodeStatusChanged(chainNode.getId(), chainNodeExecuteInfo);
                    }
                    executeNextNode(outwardEdge.getTarget(), isAsync);
                } else {
                    outwardEdge.setStatus(ChainEdgeStatus.FALSE);
                    executeNextNode(outwardEdge.getTarget(), isAsync);
                }
            }
        } else if (chainNode.getStatus() == ChainNodeStatus.SKIPPED) {
            for (ChainEdge outwardEdge : chainNode.getOutwardEdges()) {
                outwardEdge.setStatus(ChainEdgeStatus.SKIPPED);
                executeNextNode(outwardEdge.getTarget(), isAsync);
            }
        }
    }

    /**
     * 执行下一个节点
     *
     * @param targetNodeId 目标节点ID
     * @param isAsync      是否异步执行
     */
    private void executeNextNode(String targetNodeId, boolean isAsync) {
        ChainNode targetNode = getNodeById(targetNodeId);
        doExecuteNodeInternal(targetNode, true);
    }

    /**
     * 执行后续节点（可能有多个）
     */
    private void doExecuteNextNodes(ChainNode currentNode, Map<String, Object> executeResult) {
        List<ChainEdge> outwardEdges = currentNode.getOutwardEdges();
        if (outwardEdges != null && !outwardEdges.isEmpty()) {
            List<ExecuteNode> nextExecuteNodes = new ArrayList<>(outwardEdges.size());
            for (ChainEdge chainEdge : outwardEdges) {
                ChainNode nextNode = getNodeById(chainEdge.getTarget());
                if (nextNode == null) {
                    continue;
                }
                // 这里需要实现EdgeCondition的检查逻辑
                nextExecuteNodes.add(new ExecuteNode(nextNode, currentNode, chainEdge.getId()));
            }
            doExecuteNodes(nextExecuteNodes);
        }
    }

    // ==================== 辅助方法 ====================

    private void updateCurrentNodeStatus(ChainNode chainNode) {
        ChainDepStatus chainDepStatus = ChainDepStatus.calcChainNodeDep(chainNode);
        ChainNodeExecuteInfo chainNodeExecuteInfo = executeInfoMap.computeIfAbsent(chainNode.getId(), id -> {
            ChainNodeExecuteInfo info = new ChainNodeExecuteInfo();
            info.setId(id);
            info.setType(chainNode.getNodeType());
            info.setExecuteInfoId(id + "_" + System.currentTimeMillis() + "_" + id.hashCode());
            return info;
        });
        chainNodeExecuteInfo.setStatus(ChainNodeStatus.fromChainDepStatus(chainDepStatus));
    }

    private Map<String, Object> parseOutputResult(List<Parameter> outputParameters, Map<String, Object> execute) {
        if (outputParameters == null) {
            return execute;
        }
        Map<String, Object> result = new HashMap<>();
        List<String> validParameters = new ArrayList<>();
        for (Parameter parameter : outputParameters) {
            Object value = null;
            if (parameter.getRefType() == RefType.REF) {
                List<String> refValue = parameter.getRefValue();
                if (refValue.size() >= 2) {
                    Object nodeResult = execute.get(refValue.get(0));
                    if (nodeResult instanceof Map) {
                        Map<String, Object> nodeResultMap = (Map<String, Object>) nodeResult;
                        value = nodeResultMap.get(refValue.get(1));
                    }
                } else {
                    value = execute.getOrDefault(String.join(".", parameter.getRefValue()), parameter.getDefaultValue());
                }
            } else {
                value = parameter.getDefaultValue();
            }
            if (parameter.isRequire() && value == null) {
                validParameters.add("参数 " + parameter.getName() + " 缺失");
            }
            result.put(parameter.getName(), value);
        }
        if (!validParameters.isEmpty()) {
            throw new RuntimeException("参数验证失败：" + String.join(",", validParameters));
        }

        return result;
    }

    public NodeContext getNodeContext(ChainNode chainNode) {
        return nodeContexts.computeIfAbsent(chainNode.getId(), k -> new NodeContext());
    }

    /**
     * 获取节点执行结果
     */
    public Map<String, Object> getNodeExecuteResult(String nodeId) {
        Map<String, Object> all = memory;
        Map<String, Object> result = new HashMap<>();
        all.forEach((k, v) -> {
            if (k.startsWith(nodeId + ".")) {
                String newKey = k.substring(nodeId.length() + 1);
                result.put(newKey, v);
            }
        });
        return result;
    }

    private List<ChainNode> getStartNodes() {
        if (this.nodes == null || this.nodes.isEmpty()) {
            return null;
        }

        if (!this.suspendNodes.isEmpty()) {
            return new ArrayList<>(suspendNodes.values());
        }

        List<ChainNode> nodes = new ArrayList<>();

        for (ChainNode node : this.nodes) {
            if (node.getInwardEdges() == null || node.getInwardEdges().isEmpty()) {
                nodes.add(node);
            }
        }
        return nodes;
    }

    private ChainNode getNodeById(String id) {
        if (id == null || id.trim().isEmpty()) {
            return null;
        }

        for (ChainNode node : this.nodes) {
            if (id.equals(node.getId())) {
                return node;
            }
        }

        return null;
    }

    protected void runInLifeCycle(Map<String, Object> variables, ChainEvent startEvent, Runnable runnable) {
        if (variables != null) {
            this.memory.putAll(variables);
        }
        try {
            notifyEvent(startEvent);
            try {
                setStatusAndNotifyEvent(ChainStatus.RUNNING);
                runnable.run();
            } catch (Exception e) {
                log.error("error:", e);
                this.exception = e;
                setStatusAndNotifyEvent(ChainStatus.ERROR);
                notifyError(e);
            }

            this.phaser.arriveAndAwaitAdvance();

            if (chainStatus == ChainStatus.RUNNING) {
                setStatusAndNotifyEvent(ChainStatus.FINISHED_NORMAL);
            } else if (chainStatus == ChainStatus.ERROR) {
                setStatusAndNotifyEvent(ChainStatus.FINISHED_ABNORMAL);
            }

        } finally {
            notifyEvent(new ChainEndEvent(this));
        }
    }

    public void setStatusAndNotifyEvent(ChainStatus status) {
        ChainStatus before = this.chainStatus;
        this.chainStatus = status;

        if (before != status) {
            notifyEvent(new ChainStatusChangeEvent(this, this.chainStatus, before));
        }
    }

    // ==================== 钩子方法 ====================

    protected void onNodeExecuteAfter(NodeContext nodeContext) {
    }

    protected void onNodeExecuteEnd(NodeContext nodeContext) {
    }

    protected void onNodeExecuteStart(NodeContext nodeContext) {
    }

    protected void onNodeExecuteBefore(NodeContext nodeContext) {
    }

    // ==================== 其他方法 ====================

    public void stopNormal(String message) {
        this.message = message;
        setStatusAndNotifyEvent(ChainStatus.FINISHED_NORMAL);
    }

    public void stopError(String message) {
        this.message = message;
        setStatusAndNotifyEvent(ChainStatus.FINISHED_ABNORMAL);
    }

    public void output(ChainNode node, Object response) {
        notifyOutput(node, response);
    }

    public void suspend(ChainNode node) {
        try {
            suspendNodes.putIfAbsent(node.getId(), node);
        } finally {
            setStatusAndNotifyEvent(ChainStatus.SUSPEND);
        }
    }

    public void resume(Map<String, Object> variables) {
        runInLifeCycle(variables,
                new ChainStartEvent(this, variables),
                this::executeInternal);
    }

    public void reset() {
        // node
        this.memory.clear();
        this.setStatus(ChainNodeStatus.READY);

        // chain
        this.chainStatus = ChainStatus.READY;
        this.executeResult = null;
        this.message = null;
        this.exception = null;
        this.nodeContexts.clear();

        if (this.suspendNodes != null) {
            this.suspendNodes.clear();
        }

        if (this.suspendForParameters != null) {
            this.suspendForParameters.clear();
        }

        this.phaser = new Phaser(1);
    }

    // ==================== 内部类 ====================

    public static class ExecuteNode {
        final ChainNode currentNode;
        final ChainNode prevNode;
        final String fromEdgeId;

        public ExecuteNode(ChainNode currentNode, ChainNode prevNode, String fromEdgeId) {
            this.currentNode = currentNode;
            this.prevNode = prevNode;
            this.fromEdgeId = fromEdgeId;
        }
    }

    // ==================== Getter/Setter ====================

    public void setNodes(List<ChainNode> nodes) {
        this.nodes = nodes;
    }

    public void setEdges(List<ChainEdge> edges) {
        this.edges = edges;
    }

    public void setParent(Chain parent) {
        this.parent = parent;
    }

    public void setChildren(List<Chain> children) {
        this.children = children;
    }

    public void setExecuteResult(Map<String, Object> executeResult) {
        this.executeResult = executeResult;
    }

    public void setMemory(Map<String, Object> memory) {
        this.memory = memory;
    }

    public void setStatus(ChainStatus status) {
        this.chainStatus = status;
    }

    public ChainStatus getChainStatus() {
        return chainStatus;
    }

    @Override
    public ChainNodeStatus getStatus() {
        // 将ChainStatus转换为ChainNodeStatus
        switch (chainStatus) {
            case READY:
                return ChainNodeStatus.READY;
            case RUNNING:
                return ChainNodeStatus.RUNNING;
            case FINISHED_NORMAL:
                return ChainNodeStatus.FINISHED;
            case FINISHED_ABNORMAL:
                return ChainNodeStatus.FINISHED_ABNORMAL;
            case ERROR:
                return ChainNodeStatus.FAILED;
            case SUSPEND:
                return ChainNodeStatus.READY; // 暂时映射为READY
            default:
                return ChainNodeStatus.READY;
        }
    }

    public void setException(Exception exception) {
        this.exception = exception;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public void setEventListeners(Map<Class<?>, List<ChainEventListener>> eventListeners) {
        this.eventListeners = eventListeners;
    }

    public void setOutputListeners(List<ChainOutputListener> outputListeners) {
        this.outputListeners = outputListeners;
    }

    public void setChainErrorListeners(List<ChainErrorListener> chainErrorListeners) {
        this.chainErrorListeners = chainErrorListeners;
    }

    public void setNodeErrorListeners(List<NodeErrorListener> nodeErrorListeners) {
        this.nodeErrorListeners = nodeErrorListeners;
    }

    public void setSuspendListeners(List<ChainSuspendListener> suspendListeners) {
        this.suspendListeners = suspendListeners;
    }

    public void setAsyncNodeExecutors(ExecutorService asyncNodeExecutors) {
        this.asyncNodeExecutors = asyncNodeExecutors;
    }

    public void setPhaser(Phaser phaser) {
        this.phaser = phaser;
    }

    public void setNodeContexts(Map<String, NodeContext> nodeContexts) {
        this.nodeContexts = nodeContexts;
    }

    public void setSuspendNodes(Map<String, ChainNode> suspendNodes) {
        this.suspendNodes = suspendNodes;
    }

    public void setSuspendForParameters(List<Parameter> suspendForParameters) {
        this.suspendForParameters = suspendForParameters;
    }

    public void addSuspendForParameter(Parameter suspendForParameter) {
        if (this.suspendForParameters == null) {
            this.suspendForParameters = new ArrayList<>();
        }
        this.suspendForParameters.add(suspendForParameter);
    }

    /**
     * 添加执行监听器
     *
     * @param listener 监听器
     */
    public void addListener(ChainExecutionListener listener) {
        if (listener != null && !listeners.contains(listener)) {
            listeners.add(listener);
        }
    }

    /**
     * 移除执行监听器
     *
     * @param listener 监听器
     */
    public void removeListener(ChainExecutionListener listener) {
        listeners.remove(listener);
    }

    /**
     * 异步执行工作流（非阻塞）
     * 支持实时状态更新和进度监听
     *
     * @param variables 输入变量
     * @return CompletableFuture 执行结果
     */
    public CompletableFuture<Map<String, Object>> executeAsync(Map<String, Object> variables) {
        if (asyncExecutionFuture != null && !asyncExecutionFuture.isDone()) {
            return asyncExecutionFuture;
        }

        asyncExecutionCompleted = false;
        chainStatus = ChainStatus.RUNNING;

        if (variables != null) {
            this.memory.putAll(variables);
        }

        asyncExecutionFuture = CompletableFuture.supplyAsync(() -> {
            try {
                // 通知监听器执行开始
                notifyExecutionStart();

                // 启动进度更新定时器
                ScheduledFuture<?> progressUpdateTask = startProgressUpdateTask();

                // 执行工作流核心逻辑
                List<ChainNode> startNodes = getStartNodes();
                if (startNodes != null && !startNodes.isEmpty()) {
                    doExecuteChainNodesAsync(startNodes);
                }

                // 等待所有节点完成
                waitForCompletion();

                // 停止进度更新
                progressUpdateTask.cancel(false);

                // 检查执行结果
                if (chainStatus == ChainStatus.FINISHED_ABNORMAL) {
                    Exception executionException = this.exception;
                    if (executionException != null) {
                        notifyExecutionComplete(null, executionException);
                        if (executionException instanceof RuntimeException) {
                            throw (RuntimeException) executionException;
                        } else {
                            throw new ChainException(executionException);
                        }
                    } else {
                        String errorMsg = this.message != null ? this.message : "Chain execute error";
                        notifyExecutionComplete(null, new ChainException(errorMsg));
                        throw new ChainException(errorMsg);
                    }
                }

                asyncExecutionCompleted = true;
                chainStatus = ChainStatus.FINISHED_NORMAL;
                notifyExecutionComplete(outputResult, null);

                return outputResult;

            } catch (Exception e) {
                chainStatus = ChainStatus.FINISHED_ABNORMAL;
                this.exception = e;
                notifyExecutionComplete(null, e);
                throw e;
            }
        }, asyncNodeExecutors);

        return asyncExecutionFuture;
    }

    /**
     * 启动进度更新定时任务
     *
     * @return ScheduledFuture
     */
    private ScheduledFuture<?> startProgressUpdateTask() {
        return progressUpdateExecutor.scheduleAtFixedRate(() -> {
            if (!asyncExecutionCompleted) {
                try {
                    int totalNodes = nodes != null ? nodes.size() : 0;
                    int completedNodes = 0;

                    if (executeInfoMap != null) {
                        completedNodes = (int) executeInfoMap.values().stream()
                                .filter(info -> info.getStatus() == ChainNodeStatus.FINISHED ||
                                        info.getStatus() == ChainNodeStatus.FAILED ||
                                        info.getStatus() == ChainNodeStatus.SKIPPED)
                                .count();
                    }

                    notifyProgressUpdate(completedNodes, totalNodes);
                } catch (Exception e) {
                    log.warn("进度更新异常", e);
                }
            }
        }, 100, 100, TimeUnit.MILLISECONDS); // 每100ms更新一次
    }

    /**
     * 等待工作流执行完成
     */
    private void waitForCompletion() {
        while (!asyncExecutionCompleted && chainStatus != ChainStatus.FINISHED_ABNORMAL) {
            try {
                // 检查是否所有节点都已完成
                boolean allCompleted = true;
                if (nodes != null) {
                    for (ChainNode node : nodes) {
                        ChainNodeStatus status = node.getStatus();
                        if (status == ChainNodeStatus.RUNNING || status == ChainNodeStatus.READY || status == ChainNodeStatus.WAIT) {
                            allCompleted = false;
                            break;
                        }
                    }
                }

                if (allCompleted) {
                    asyncExecutionCompleted = true;
                    break;
                }

                Thread.sleep(50); // 短暂休眠避免CPU占用过高
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                break;
            }
        }
    }

    /**
     * 异步执行节点集合
     *
     * @param list 节点集合
     */
    private void doExecuteChainNodesAsync(List<ChainNode> list) {
        for (ChainNode chainNode : list) {
            asyncNodeExecutors.execute(() -> {
                try {
                    doExecuteChainNodeAsync(chainNode);
                } catch (Exception e) {
                    log.error("异步执行节点失败: {}", chainNode.getId(), e);
                }
            });
        }
    }

    /**
     * 异步执行单个节点
     *
     * @param chainNode 节点
     */
    private void doExecuteChainNodeAsync(ChainNode chainNode) {
        doExecuteNodeInternal(chainNode, true);
    }

    // 通知方法
    private void notifyExecutionStart() {
        for (ChainExecutionListener listener : listeners) {
            try {
                listener.onExecutionStart(this.getId());
            } catch (Exception e) {
                log.warn("监听器通知异常", e);
            }
        }
    }

    private void notifyNodeStatusChanged(String nodeId, ChainNodeExecuteInfo executeInfo) {
        if (parent != null) {
            for (ChainExecutionListener listener : parent.getListeners()) {
                try {
                    listener.onNodeStatusChanged(this.getId(), nodeId, executeInfo);
                } catch (Exception e) {
                    log.warn("监听器通知异常", e);
                }
            }
        }

        for (ChainExecutionListener listener : listeners) {
            try {
                listener.onNodeStatusChanged(this.getId(), nodeId, executeInfo);
            } catch (Exception e) {
                log.warn("监听器通知异常", e);
            }
        }
    }

    private void notifyExecutionComplete(Map<String, Object> result, Exception exception) {
        for (ChainExecutionListener listener : listeners) {
            try {
                listener.onExecutionComplete(this.getId(), result, exception);
            } catch (Exception e) {
                log.warn("监听器通知异常", e);
            }
        }
    }

    private void notifyProgressUpdate(int completedNodes, int totalNodes) {
        for (ChainExecutionListener listener : listeners) {
            try {
                listener.onProgressUpdate(this.getId(), executeInfoMap, completedNodes, totalNodes);
            } catch (Exception e) {
                log.warn("监听器通知异常", e);
            }
        }
    }

    /**
     * 关闭异步执行相关资源
     */
    public void shutdownAsyncExecution() {
        if (progressUpdateExecutor != null && !progressUpdateExecutor.isShutdown()) {
            progressUpdateExecutor.shutdown();
            try {
                if (!progressUpdateExecutor.awaitTermination(5, TimeUnit.SECONDS)) {
                    progressUpdateExecutor.shutdownNow();
                }
            } catch (InterruptedException e) {
                progressUpdateExecutor.shutdownNow();
                Thread.currentThread().interrupt();
            }
        }
    }

    /**
     * 获取节点参数数据（兼容旧API）
     */
    public Map<String, Object> getParametersData(ChainNode node) {
        List<Parameter> parameters = node.getParameters();
        Map<String, Object> result = new HashMap<>();
        List<String> validParameters = new ArrayList<>();
        for (Parameter parameter : parameters) {
            Object value = null;
            if (parameter.getRefType() == RefType.REF) {
                List<String> refValue = parameter.getRefValue();
                if (refValue.size() >= 2) {
                    Object nodeResult = getMemory().get(refValue.get(0));
                    if (nodeResult instanceof Map) {
                        Map<String, Object> nodeResultMap = (Map<String, Object>) nodeResult;
                        value = nodeResultMap.get(refValue.get(1));
                    }
                }
            } else {
                value = parameter.getDefaultValue();
            }
            if (value == null) {
                value = parameter.getDefaultValue();
            }
            if (parameter.isRequire() && value == null) {
                validParameters.add("参数 " + parameter.getName() + " 缺失");
            }
            result.put(parameter.getName(), value);
        }
        if (!validParameters.isEmpty()) {
            throw new RuntimeException("参数验证失败：" + String.join(",", validParameters));
        }

        return result;
    }

    public void clearExecuteInfoMap(){
        this.executeInfoMap.clear();
    }
}
