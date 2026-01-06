package cn.boommanpro.gaia.workflow.infra.extend.node.variable;

import cn.boommanpro.gaia.workflow.base.model.Chain;
import cn.boommanpro.gaia.workflow.base.type.DataType;
import cn.boommanpro.gaia.workflow.base.model.Parameter;
import cn.boommanpro.gaia.workflow.base.type.RefType;
import cn.boommanpro.gaia.workflow.base.tools.SpringExpressionParser;
import cn.boommanpro.gaia.workflow.infra.extend.node.BaseNode;
import cn.hutool.json.JSONObject;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.extern.slf4j.Slf4j;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 变量节点，用于处理变量声明和赋值操作
 *
 * @author <a href="mailto:boommanpro@gmail.com">boommanpro</a>
 */
@Slf4j
@Data
@EqualsAndHashCode(callSuper = true)
public class VariableNode extends BaseNode {

    // 变量赋值操作列表
    private List<VariableAssign> assigns = new ArrayList<>();

    @Override
    public Map<String, Object> execute(Chain chain) {
        Map<String, Object> result = new HashMap<>();

        // 执行所有赋值操作
        for (VariableAssign assign : assigns) {
            // 检查左值是否为引用类型
            if (assign.getLeftType() != null && assign.getLeftType() == RefType.REF) {
                // 处理引用类型的左值
                handleReferenceLeftValue(assign, chain);
            } else {
                // 处理普通变量名的左值
                Object value = evaluateValue(assign.getRight(), chain);
                result.put(assign.getLeft(), value);
            }
        }

        return result;
    }



    /**
     * 处理引用类型的左值赋值
     * @param assign 赋值操作
     * @param chain 工作流链
     */
    private void handleReferenceLeftValue(VariableAssign assign, Chain chain) {
        Object leftContent = assign.getLeftContent();
        if (!(leftContent instanceof List)) {
            return;
        }

        List<String> refPath = (List<String>) leftContent;
        if (refPath.size() < 2) {
            return;
        }
        // 获取右值
        Object value = evaluateValue(assign.getRight(), chain);
        Map<String, Object> target = chain.getMemory();
        for (int i = 0; i < refPath.size()-1; i++) {
            target = (Map<String, Object>) target.get(refPath.get(i));
        }
        if (target != null) {
            target.put(refPath.get(refPath.size() - 1), value);
        }
    }

    /**
     * 计算右侧表达式的值
     * @param value 变量值定义
     * @param chain 工作流链
     * @return 计算结果
     */
    private Object evaluateValue(VariableValue value, Chain chain) {
        if (value.getType() == RefType.CONSTANT) {
            return value.getContent();
        } else if (value.getType() == RefType.REF) {
            Object content = value.getContent();
            if (content instanceof List) {
                List<?> refPath = (List<?>) content;
                if (refPath != null && refPath.size() >= 2) {
                    String nodeId = refPath.get(0).toString();
                    String paramName = refPath.get(1).toString();
                    Object nodeResult = SpringExpressionParser.getInstance().getValue(nodeId,chain.getMemory());;
                    if (nodeResult instanceof Map) {
                        return ((Map<?, ?>) nodeResult).get(paramName);
                    }
                }
            }
        }
        return null;
    }

    @Override
    public List<Parameter> getOutputParameters() {
        List<Parameter> parameters = new ArrayList<>();
        for (VariableAssign assign : assigns) {
            // 只有当左值不是引用类型时才添加到输出参数中
            if (assign.getLeftType() == null || assign.getLeftType() != RefType.REF) {
                Parameter param = new Parameter();
                param.setName(assign.getLeft());

                // 根据右值的schema确定数据类型
                DataType dataType = inferDataType(assign.getRight());
                param.setType(dataType);

                // 如果是常量类型，设置默认值
                if (assign.getRight() != null && assign.getRight().getType() == RefType.CONSTANT) {
                    Object content = assign.getRight().getContent();
                    Object convertedValue = convertDefaultValue(content, dataType);
                    param.setDefaultValue(convertedValue);
                }

                parameters.add(param);
            }
        }
        return parameters;
    }

    /**
     * 根据VariableValue的schema推断数据类型
     * @param value 变量值定义
     * @return 推断出的数据类型
     */
    private DataType inferDataType(VariableValue value) {
        if (value == null) {
            return DataType.String;
        }

        // 如果有schema定义，优先使用schema
        if (value.getSchema() != null) {
            JSONObject schema = value.getSchema();
            String schemaType = schema.getStr("type");

            if ("array".equals(schemaType)) {
                // 检查数组元素的类型
                Object items = schema.get("items");
                if (items instanceof Map) {
                    JSONObject itemsObj = (JSONObject) items;
                    String itemsType = itemsObj.getStr("type");
                    return getArrayType(itemsType);
                }
                // 默认使用Array_Object
                return DataType.Array_Object;
            } else if ("object".equals(schemaType)) {
                return DataType.Object;
            } else if ("number".equals(schemaType) || "integer".equals(schemaType)) {
                return DataType.Number;
            } else if ("boolean".equals(schemaType)) {
                return DataType.Boolean;
            }
        }

        // 根据内容类型推断
        if (value.getType() == RefType.CONSTANT) {
            Object content = value.getContent();
            if (content instanceof List) {
                // 检查列表中元素的类型来确定具体的数组类型
                return inferListContentType((List<?>) content);
            } else if (content instanceof Map) {
                return DataType.Object;
            } else if (content instanceof Number) {
                return DataType.Number;
            } else if (content instanceof Boolean) {
                return DataType.Boolean;
            }
        }

        // 默认返回String类型
        return DataType.String;
    }

    /**
     * 根据数组元素类型获取对应的数组数据类型
     * @param itemsType 数组元素类型
     * @return 对应的数组数据类型
     */
    private DataType getArrayType(String itemsType) {
        if ("string".equals(itemsType)) {
            return DataType.Array_String;
        } else if ("number".equals(itemsType) || "integer".equals(itemsType)) {
            return DataType.Array_Number;
        } else if ("boolean".equals(itemsType)) {
            return DataType.Array_Boolean;
        } else if ("object".equals(itemsType)) {
            return DataType.Array_Object;
        } else if ("file".equals(itemsType)) {
            return DataType.Array_File;
        }
        // 默认使用Array_Object
        return DataType.Array_Object;
    }

    /**
     * 根据列表内容推断列表的数据类型
     * @param list 列表对象
     * @return 对应的数组数据类型
     */
    private DataType inferListContentType(List<?> list) {
        if (list == null || list.isEmpty()) {
            return DataType.Array_Object;
        }

        // 检查第一个元素的类型
        Object firstElement = list.get(0);
        if (firstElement instanceof String) {
            return DataType.Array_String;
        } else if (firstElement instanceof Number) {
            return DataType.Array_Number;
        } else if (firstElement instanceof Boolean) {
            return DataType.Array_Boolean;
        } else if (firstElement instanceof Map) {
            return DataType.Array_Object;
        }

        // 默认使用Array_String（示例中数组包含字符串）
        return DataType.Array_String;
    }

    /**
     * 根据数据类型转换默认值
     * @param content 原始内容
     * @param dataType 目标数据类型
     * @return 转换后的值
     */
    private Object convertDefaultValue(Object content, DataType dataType) {
        if (content == null) {
            return null;
        }

        try {
            // 对于数组类型，需要特殊处理
            if (dataType.name().startsWith("Array_")) {
                return convertArrayDefaultValue(content, dataType);
            }

            // 对于非数组类型的基本转换
            switch (dataType) {
                case Number:
                    if (content instanceof Number) {
                        return content;
                    } else if (content instanceof String) {
                        return Double.parseDouble((String) content);
                    }
                    break;
                case Boolean:
                    if (content instanceof Boolean) {
                        return content;
                    } else if (content instanceof String) {
                        return Boolean.parseBoolean((String) content);
                    }
                    break;
                case Object:
                    if (content instanceof Map) {
                        return content;
                    } else if (content instanceof String) {
                        // 尝试解析为JSON对象
                        try {
                            return new JSONObject((String) content);
                        } catch (Exception e) {
                            // 解析失败，返回原字符串
                            return content;
                        }
                    }
                    break;
                case String:
                default:
                    // 对于String类型或其他类型，直接返回toString()
                    return content.toString();
            }
        } catch (Exception e) {
            log.warn("Failed to convert default value {} to type {}, using original value", content, dataType, e);
        }

        // 转换失败时返回原值
        return content;
    }

    /**
     * 转换数组类型的默认值
     * @param content 原始内容
     * @param dataType 数组数据类型
     * @return 转换后的数组值
     */
    private Object convertArrayDefaultValue(Object content, DataType dataType) {
        try {
            List<Object> resultList = new ArrayList<>();

            if (content instanceof List) {
                // 如果已经是List，直接处理
                resultList = (List<Object>) content;
            } else if (content instanceof String) {
                // 如果是JSON字符串，解析为数组
                try {
                    cn.hutool.json.JSONArray jsonArray = new cn.hutool.json.JSONArray((String) content);
                    for (int i = 0; i < jsonArray.size(); i++) {
                        resultList.add(jsonArray.get(i));
                    }
                } catch (Exception e) {
                    // 如果不是JSON数组格式，作为单个元素处理
                    resultList.add(content);
                }
            } else {
                // 其他类型作为单个元素处理
                resultList.add(content);
            }

            // 根据具体的数组类型进行元素类型转换
            return convertArrayElements(resultList, dataType);

        } catch (Exception e) {
            log.warn("Failed to convert array default value {} to type {}, using original value", content, dataType, e);
            return content;
        }
    }

    /**
     * 转换数组中元素的类型
     * @param list 原始数组列表
     * @param dataType 目标数组数据类型
     * @return 转换后的数组列表
     */
    private List<Object> convertArrayElements(List<Object> list, DataType dataType) {
        List<Object> convertedList = new ArrayList<>();

        for (Object item : list) {
            try {
                Object convertedItem = convertArrayElement(item, dataType);
                convertedList.add(convertedItem);
            } catch (Exception e) {
                // 元素转换失败，保留原值
                convertedList.add(item);
            }
        }

        return convertedList;
    }

    /**
     * 转换单个数组元素的类型
     * @param item 数组元素
     * @param arrayType 数组数据类型
     * @return 转换后的元素
     */
    private Object convertArrayElement(Object item, DataType arrayType) {
        switch (arrayType) {
            case Array_String:
                return item != null ? item.toString() : null;
            case Array_Number:
                if (item instanceof Number) {
                    return item;
                } else if (item instanceof String) {
                    return Double.parseDouble((String) item);
                }
                return 0.0;
            case Array_Boolean:
                if (item instanceof Boolean) {
                    return item;
                } else if (item instanceof String) {
                    return Boolean.parseBoolean((String) item);
                }
                return false;
            case Array_Object:
                if (item instanceof Map) {
                    return item;
                } else if (item instanceof String) {
                    try {
                        return new JSONObject((String) item);
                    } catch (Exception e) {
                        // 解析失败，返回原字符串
                        return item;
                    }
                }
                return item;
            case Array_File:
                // 对于File类型，暂时返回原字符串
                return item.toString();
            default:
                return item;
        }
    }

    /**
     * 变量赋值操作
     */
    @Data
    public static class VariableAssign {
        // 操作符 (declare, assign)
        private String operator;
        // 左值 (变量名)
        private String left;
        // 左值类型
        private RefType leftType;
        // 左值内容（用于引用类型）
        private Object leftContent;
        // 右值
        private VariableValue right;
    }

    /**
     * 变量值定义
     */
    @Data
    public static class VariableValue {
        // 值类型 (constant, ref, expression)
        private RefType type;
        // 值内容
        private Object content;
        // 值的schema定义
        private JSONObject schema;
    }


    @Override
    public List<Parameter> getParameters() {
        return super.getParameters();
    }

    @Override
    protected Map<String, Object> getParametersData(Chain chain) {
        return chain.getParametersData(this);
    }
}
