package cn.boommanpro.gaia.workflow.infra.extend.node.code.compiler.pojo;

import lombok.Data;

import java.util.List;
import java.util.Map;

@Data
public class JavaCompilerResult {

    private Class<?> mainClass;
    private String clazzCode;
    private List<Class<?>> classList;
    private Map<String, byte[]> classBytesMap;

}
