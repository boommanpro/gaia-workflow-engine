package cn.boommanpro.gaia.workflow.infra.manage.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import cn.boommanpro.gaia.workflow.infra.manage.entity.AgentToolDefinition;
import org.apache.ibatis.annotations.Delete;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

/**
 * Agent 工具定义 Mapper
 */
@Mapper
public interface AgentToolDefinitionMapper extends BaseMapper<AgentToolDefinition> {

    /**
     * 物理删除（绕过 @TableLogic 软删）：MCP 工具下线时使用。
     * 软删行会占住 tool_name 的 UNIQUE 索引，导致服务器重连后无法重新插入。
     */
    @Delete("DELETE FROM agent_tool_definition WHERE tool_name = #{toolName}")
    int physicalDeleteByName(@Param("toolName") String toolName);

    /** 含软删行的精确查找（重插前的占位检测） */
    @Select("SELECT * FROM agent_tool_definition WHERE tool_name = #{toolName} LIMIT 1")
    AgentToolDefinition selectAnyByName(@Param("toolName") String toolName);
}
