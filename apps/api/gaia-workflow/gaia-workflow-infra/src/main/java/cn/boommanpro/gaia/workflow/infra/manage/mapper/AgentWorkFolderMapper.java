package cn.boommanpro.gaia.workflow.infra.manage.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import cn.boommanpro.gaia.workflow.infra.manage.entity.AgentWorkFolder;
import org.apache.ibatis.annotations.Mapper;

/**
 * 工作空间文件夹 Mapper
 */
@Mapper
public interface AgentWorkFolderMapper extends BaseMapper<AgentWorkFolder> {
}
