package cn.boommanpro.gaia.workflow.base.model;

import cn.boommanpro.gaia.workflow.base.type.DataType;
import cn.boommanpro.gaia.workflow.base.type.RefType;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@NoArgsConstructor
@Data
public class Parameter {
    private String name;
    private boolean require;
    private DataType type;
    private String description;
    private RefType refType;
    //默认值
    private Object defaultValue;
    //ref 链接
    private List<String> refValue;
    private List<Parameter> children;
}
