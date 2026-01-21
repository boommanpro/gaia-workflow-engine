package cn.boommanpro.gaia.workflow.app.config;

import org.apache.ibatis.type.BaseTypeHandler;
import org.apache.ibatis.type.JdbcType;
import org.springframework.boot.autoconfigure.jackson.JacksonProperties;
import org.springframework.lang.NonNull;
import org.springframework.lang.Nullable;
import org.springframework.stereotype.Component;

import javax.annotation.Resource;
import java.sql.CallableStatement;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Calendar;
import java.util.Date;

/**
 * @author Mr.X
 * @since 2022-07-30 12:19
 */
@Component
public class LocalDateTimeHandler extends BaseTypeHandler<LocalDateTime> {

    @Resource
    private JacksonProperties jacksonProperties;

    @Override
    public void setNonNullParameter(@NonNull PreparedStatement ps, int i, LocalDateTime parameter, JdbcType jdbcType) throws SQLException {
        ps.setObject(i, parameter);
    }

    @Override
    public LocalDateTime getNullableResult(@NonNull ResultSet rs, String columnName) throws SQLException {
        long aLong = rs.getLong(columnName);
        return aLong < 167375 ? str2LocalDateTime(rs.getString(columnName)) : ts2LocalDateTime(aLong);
    }

    @Override
    public LocalDateTime getNullableResult(@NonNull ResultSet rs, int columnIndex) throws SQLException {
        return ts2LocalDateTime(rs.getLong(columnIndex));
    }

    @Override
    public LocalDateTime getNullableResult(@NonNull CallableStatement cs, int columnIndex) throws SQLException {
        return ts2LocalDateTime(cs.getLong(columnIndex));
    }

    @Nullable
    private LocalDateTime str2LocalDateTime(@Nullable String time) {
        if (time == null) return null;
        
        // 尝试解析多种日期时间格式
        try {
            // 尝试解析 yyyy-MM-dd'T'HH:mm:ss.SSSSSS 格式
            return LocalDateTime.parse(time, DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss.SSSSSS"));
        } catch (Exception e) {
            try {
                // 尝试解析 yyyy-MM-dd'T'HH:mm:ss.SSS 格式
                return LocalDateTime.parse(time, DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss.SSS"));
            } catch (Exception ex) {
                // 如果两种格式都失败，则尝试最通用的格式
                return LocalDateTime.parse(time, DateTimeFormatter.ISO_LOCAL_DATE_TIME);
            }
        }
    }

    @NonNull
    private LocalDateTime ts2LocalDateTime(@NonNull Long timeStamp) {
        Calendar calendar = Calendar.getInstance();
        calendar.setTime(new Date(timeStamp));
        return LocalDateTime.of(calendar.get(Calendar.YEAR), calendar.get(Calendar.MONTH) + 1, calendar.get(Calendar.DAY_OF_MONTH), calendar.get(Calendar.HOUR_OF_DAY), calendar.get(Calendar.MINUTE));
    }

}
