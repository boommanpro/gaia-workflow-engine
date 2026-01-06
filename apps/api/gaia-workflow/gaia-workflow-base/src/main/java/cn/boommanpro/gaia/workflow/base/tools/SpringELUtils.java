package cn.boommanpro.gaia.workflow.base.tools;

import java.time.Duration;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

public class SpringELUtils {

    public static String date2String(LocalDateTime now) {
        return now.format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"));
    }

    public static String dateDiff(LocalDateTime end, LocalDateTime start) {
        Duration duration = Duration.between(start, end);

        long hours = duration.toHours();
        long minutes = duration.toMinutes() % 60;
        long seconds = duration.getSeconds() % 60;

        return hours + "小时" + minutes + "分钟" + seconds + "秒";
    }
}
