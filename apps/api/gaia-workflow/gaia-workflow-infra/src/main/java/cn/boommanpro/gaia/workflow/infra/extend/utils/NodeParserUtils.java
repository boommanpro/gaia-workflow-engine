package cn.boommanpro.gaia.workflow.infra.extend.utils;

import cn.boommanpro.gaia.workflow.base.GaiaWorkflow;
import cn.boommanpro.gaia.workflow.base.tools.ParameterParseUtils;
import cn.boommanpro.gaia.workflow.base.model.ChainNode;
import cn.boommanpro.gaia.workflow.base.type.NodeTypeEnum;
import cn.hutool.json.JSONObject;

/**
 * 节点解析器工具类
 * 提供通用的节点解析功能，减少各NodeParser中的重复代码
 *
 * @author <a href="mailto:boommanpro@gmail.com">boommanpro</a>
 * @date 2025/08/22
 */
public class NodeParserUtils {

    /**
     * 通用的节点基础属性解析
     *
     * @param nodeJSONObject 节点JSON对象
     * @param workflow 工作流实例
     * @param node 节点实例
     * @return 设置好基础属性的节点
     */
    public static <T extends ChainNode> T parseBaseNodeProperties(JSONObject nodeJSONObject, GaiaWorkflow workflow, T node) {
        if (node == null) {
            return null;
        }

        // 设置基础属性
        node.setId(nodeJSONObject.getStr("id"));
        node.setName(nodeJSONObject.getStr("name"));
        node.setNodeType(NodeTypeEnum.of(nodeJSONObject.getStr("type")));

        return node;
    }

    /**
     * 解析配置对象（如timeout、api等）
     *
     * @param nodeJSONObject 节点JSON对象
     * @param configPath 配置对象路径（如 "$.data.timeout"）
     * @param configClass 配置类类型
     * @param <T> 配置类型
     * @return 配置对象，如果解析失败则返回null
     */
    public static <T> T parseConfig(JSONObject nodeJSONObject, String configPath, Class<T> configClass) {
        try {
            JSONObject configObj = ParameterParseUtils.getJSONObjectByPath(nodeJSONObject, configPath);
            if (configObj == null) {
                return null;
            }

            // 这里可以使用更复杂的JSON到对象的映射逻辑
            // 目前简单返回null，由具体解析器处理
            return null;
        } catch (Exception e) {
            return null;
        }
    }

    /**
     * 解析超时配置
     *
     * @param nodeJSONObject 节点JSON对象
     * @param configPath 配置路径
     * @param defaultTimeout 默认超时时间（毫秒）
     * @param defaultRetryTimes 默认重试次数
     * @return 超时配置对象
     */
    public static TimeoutConfig parseTimeoutConfig(JSONObject nodeJSONObject, String configPath,
                                                   int defaultTimeout, int defaultRetryTimes) {
        try {
            JSONObject timeoutObj = ParameterParseUtils.getJSONObjectByPath(nodeJSONObject, configPath);
            if (timeoutObj == null) {
                return new TimeoutConfig(defaultTimeout, defaultRetryTimes);
            }

            int timeout = timeoutObj.getInt("timeout", defaultTimeout);
            int retryTimes = timeoutObj.getInt("retryTimes", defaultRetryTimes);

            return new TimeoutConfig(timeout, retryTimes);
        } catch (Exception e) {
            return new TimeoutConfig(defaultTimeout, defaultRetryTimes);
        }
    }

    /**
     * 解析API配置
     *
     * @param nodeJSONObject 节点JSON对象
     * @param configPath 配置路径
     * @return API配置对象
     */
    public static ApiConfig parseApiConfig(JSONObject nodeJSONObject, String configPath) {
        try {
            JSONObject apiObj = ParameterParseUtils.getJSONObjectByPath(nodeJSONObject, configPath);
            if (apiObj == null) {
                return null;
            }

            String method = apiObj.getStr("method");
            Object url = apiObj.get("url");

            return new ApiConfig(method, url);
        } catch (Exception e) {
            return null;
        }
    }

    /**
     * 解析值映射对象
     *
     * @param nodeJSONObject 节点JSON对象
     * @param valuesPath 值映射路径
     * @return 值映射对象
     */
    public static JSONObject parseValuesObject(JSONObject nodeJSONObject, String valuesPath) {
        return ParameterParseUtils.getJSONObjectByPath(nodeJSONObject, valuesPath);
    }

    /**
     * 获取节点数据对象
     *
     * @param nodeJSONObject 节点JSON对象
     * @return 数据对象
     */
    public static JSONObject getDataObject(JSONObject nodeJSONObject) {
        return nodeJSONObject.getJSONObject("data");
    }

    /**
     * 超时配置类
     */
    public static class TimeoutConfig {
        private final int timeout;
        private final int retryTimes;

        public TimeoutConfig(int timeout, int retryTimes) {
            this.timeout = timeout;
            this.retryTimes = retryTimes;
        }

        public int getTimeout() {
            return timeout;
        }

        public int getRetryTimes() {
            return retryTimes;
        }
    }

    /**
     * API配置类
     */
    public static class ApiConfig {
        private final String method;
        private final Object url;

        public ApiConfig(String method, Object url) {
            this.method = method;
            this.url = url;
        }

        public String getMethod() {
            return method;
        }

        public Object getUrl() {
            return url;
        }
    }
}

