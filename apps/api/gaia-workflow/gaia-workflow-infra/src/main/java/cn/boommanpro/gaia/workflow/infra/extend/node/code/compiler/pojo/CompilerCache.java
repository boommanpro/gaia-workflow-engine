package cn.boommanpro.gaia.workflow.infra.extend.node.code.compiler.pojo;

import lombok.Data;

import java.util.Map;

@Data
public class CompilerCache {
    private String mainClassName;
    private Map<String, String> encodeClassMap;
}
