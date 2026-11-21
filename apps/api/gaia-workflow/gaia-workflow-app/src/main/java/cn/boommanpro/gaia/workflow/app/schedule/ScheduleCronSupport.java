package cn.boommanpro.gaia.workflow.app.schedule;

import org.springframework.scheduling.support.CronExpression;

import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * 定时任务 cron 支持 —— 解析/校验/下次触发计算。
 *
 * 统一使用 Spring 内置 {@link CronExpression}（6 位：秒 分 时 日 月 周，Boot 2.7 / Spring 5.3 起可用），
 * 零新增依赖。为兼容用户熟悉的 5 位 unix cron（分 时 日 月 周），入库前一律补秒位规范化为 6 位。
 */
public final class ScheduleCronSupport {

    private ScheduleCronSupport() {
    }

    /**
     * 规范化：5 位（分 时 日 月 周）补 "0 " 秒位；6 位原样；7 位截掉年字段；其余形状非法。
     *
     * @return 6 位 Spring cron；形状非法返回 null
     */
    public static String normalize(String cron) {
        if (cron == null) {
            return null;
        }
        String[] parts = cron.trim().split("\\s+");
        if (parts.length == 5) {
            return "0 " + String.join(" ", parts);
        }
        if (parts.length == 6 || parts.length == 7) {
            StringBuilder sb = new StringBuilder();
            for (int i = 0; i < 6; i++) {
                if (i > 0) {
                    sb.append(' ');
                }
                sb.append(parts[i]);
            }
            return sb.toString();
        }
        return null;
    }

    /**
     * 校验并返回规范化表达式（可直接入库的 6 位形式）。
     *
     * @return 合法返回 6 位 cron；非法返回 null
     */
    public static String validate(String cron) {
        String normalized = normalize(cron);
        if (normalized == null) {
            return null;
        }
        try {
            CronExpression.parse(normalized);
            return normalized;
        } catch (IllegalArgumentException e) {
            return null;
        }
    }

    /**
     * 下一次触发时间（严格晚于 after，按 zone 解释墙钟）。
     *
     * @return 解析非法或 4 年内无解返回 null
     */
    public static ZonedDateTime nextFire(String cron, ZoneId zone, ZonedDateTime after) {
        String normalized = normalize(cron);
        if (normalized == null) {
            return null;
        }
        try {
            return CronExpression.parse(normalized)
                .next(after.withZoneSameInstant(zone != null ? zone : ZoneId.systemDefault()));
        } catch (IllegalArgumentException e) {
            return null;
        }
    }

    /** 未来 count 次触发时间（预览用） */
    public static List<ZonedDateTime> nextFires(String cron, ZoneId zone, ZonedDateTime after, int count) {
        List<ZonedDateTime> times = new ArrayList<>(count);
        ZonedDateTime cursor = after;
        for (int i = 0; i < count; i++) {
            ZonedDateTime next = nextFire(cron, zone, cursor);
            if (next == null) {
                break;
            }
            times.add(next);
            cursor = next;
        }
        return times;
    }
}
