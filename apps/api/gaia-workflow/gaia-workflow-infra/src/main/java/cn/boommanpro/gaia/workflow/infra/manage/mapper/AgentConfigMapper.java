package cn.boommanpro.gaia.workflow.infra.manage.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import cn.boommanpro.gaia.workflow.infra.manage.entity.AgentConfig;
import org.apache.ibatis.annotations.Delete;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

/**
 * Agent 配置 Mapper
 */
@Mapper
public interface AgentConfigMapper extends BaseMapper<AgentConfig> {

    /**
     * 物理删除（绕过 @TableLogic 软删）：软删行占住 config_key 的 UNIQUE 索引，
     * 导致「删除后重新保存」的 INSERT 撞唯一约束 500。重新创建配置前先清残留。
     */
    @Delete("DELETE FROM agent_config WHERE config_key = #{configKey}")
    int physicalDeleteByKey(@Param("configKey") String configKey);
}
