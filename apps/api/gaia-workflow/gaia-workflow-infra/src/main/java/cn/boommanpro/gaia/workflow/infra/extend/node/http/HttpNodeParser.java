package cn.boommanpro.gaia.workflow.infra.extend.node.http;

import cn.boommanpro.gaia.workflow.base.GaiaWorkflow;
import cn.boommanpro.gaia.workflow.infra.extend.node.BaseNodeParser;
import cn.hutool.json.JSONObject;

/**
 * HttpNode解析器
 *
 * @author <a href="mailto:boommanpro@gmail.com">boommanpro</a>
 */
public class HttpNodeParser extends BaseNodeParser<HttpNode> {

    @Override
    public HttpNode buildInstance(JSONObject nodeJSONObject, GaiaWorkflow workflow) {
        HttpNode httpNode = new HttpNode();

        // 解析data对象
        JSONObject dataObj = nodeJSONObject.getJSONObject("data");
        if (dataObj == null) {
            return httpNode;
        }

        // 解析api配置
        JSONObject apiObj = dataObj.getJSONObject("api");
        if (apiObj != null) {
            HttpNode.ApiConfig apiConfig = new HttpNode.ApiConfig();
            apiConfig.setMethod(apiObj.getStr("method"));
            apiConfig.setUrl(apiObj.get("url"));
            httpNode.setApi(apiConfig);
        }

        // 解析headersValues
        JSONObject headersValuesObj = dataObj.getJSONObject("headersValues");
        if (headersValuesObj != null) {
            httpNode.setHeadersValues(headersValuesObj);
        }

        // 解析paramsValues
        JSONObject paramsValuesObj = dataObj.getJSONObject("paramsValues");
        if (paramsValuesObj != null) {
            httpNode.setParamsValues(paramsValuesObj);
        }

        // 解析body配置
        JSONObject bodyObj = dataObj.getJSONObject("body");
        if (bodyObj != null) {
            HttpNode.BodyConfig bodyConfig = new HttpNode.BodyConfig();
            bodyConfig.setBodyType(bodyObj.getStr("bodyType"));
            bodyConfig.setJson(bodyObj.get("json"));
            httpNode.setBody(bodyConfig);
        }

        // 解析timeout配置
        JSONObject timeoutObj = dataObj.getJSONObject("timeout");
        if (timeoutObj != null) {
            HttpNode.TimeoutConfig timeoutConfig = new HttpNode.TimeoutConfig();
            timeoutConfig.setTimeout(timeoutObj.getInt("timeout", 10000));
            timeoutConfig.setRetryTimes(timeoutObj.getInt("retryTimes", 1));
            httpNode.setTimeout(timeoutConfig);
        }

        return httpNode;
    }
}
