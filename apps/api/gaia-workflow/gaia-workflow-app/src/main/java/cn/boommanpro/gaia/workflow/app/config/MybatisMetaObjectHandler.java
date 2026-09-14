package cn.boommanpro.gaia.workflow.app.config;

import com.baomidou.mybatisplus.core.handlers.MetaObjectHandler;
import org.apache.ibatis.reflection.MetaObject;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;

/**
 * MyBatis-Plus 自动填充处理器。
 *
 * 实体上的 {@code @TableField(fill = INSERT / INSERT_UPDATE)} 只有存在
 * MetaObjectHandler 时才会真正生效——此前工程里没有该 Bean，导致
 * {@code created_at} 一直是 NULL，调用看板按天聚合趋势时全部落空。
 * 这里统一在插入/更新时补齐时间字段（严格模式：仅在为 null 时填充）。
 */
@Component
public class MybatisMetaObjectHandler implements MetaObjectHandler {

    @Override
    public void insertFill(MetaObject metaObject) {
        LocalDateTime now = LocalDateTime.now();
        this.strictInsertFill(metaObject, "createdAt", LocalDateTime.class, now);
        this.strictInsertFill(metaObject, "updatedAt", LocalDateTime.class, now);
    }

    @Override
    public void updateFill(MetaObject metaObject) {
        this.strictUpdateFill(metaObject, "updatedAt", LocalDateTime.class, LocalDateTime.now());
    }
}
