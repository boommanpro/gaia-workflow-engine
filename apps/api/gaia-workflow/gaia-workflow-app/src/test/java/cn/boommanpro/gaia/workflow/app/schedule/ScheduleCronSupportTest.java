package cn.boommanpro.gaia.workflow.app.schedule;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;

/**
 * 定时任务 cron 支持：规范化 / 校验 / 下次触发计算。
 * 用固定时刻钉住跨月、月末无解、工作日、时区换算等边界。
 */
class ScheduleCronSupportTest {

    private static final ZoneId SHANGHAI = ZoneId.of("Asia/Shanghai");

    /** 2026-11-21 是周六，10:00（上海）——所有「下次」推算的基准 */
    private static final ZonedDateTime BASE = ZonedDateTime.of(2026, 11, 21, 10, 0, 0, 0, SHANGHAI);

    @Test
    @DisplayName("规范化：5 位补秒位 / 6 位原样 / 7 位截掉年 / 其它形状非法")
    void normalize() {
        assertEquals("0 0 9 * * *", ScheduleCronSupport.normalize("0 9 * * *"));
        assertEquals("0 0 9 * * *", ScheduleCronSupport.normalize("0 0 9 * * *"));
        assertEquals("0 0 9 * * *", ScheduleCronSupport.normalize("0 0 9 * * * 2027"));
        assertEquals("0 */15 * * * *", ScheduleCronSupport.normalize("*/15 * * * *"));
        assertNull(ScheduleCronSupport.normalize("* * * *"));
        assertNull(ScheduleCronSupport.normalize("* * * * * * * *"));
        assertNull(ScheduleCronSupport.normalize(null));
        assertNull(ScheduleCronSupport.normalize(""));
    }

    @Test
    @DisplayName("校验：合法返回 6 位规范式，非法返回 null")
    void validate() {
        assertEquals("0 0 9 * * *", ScheduleCronSupport.validate("0 9 * * *"));
        assertEquals("0 30 8 * * 1-5", ScheduleCronSupport.validate("0 30 8 * * 1-5"));
        assertNull(ScheduleCronSupport.validate("99 * * * *"), "分钟越界（5 位 unix 的分位）");
        assertNull(ScheduleCronSupport.validate("0 0 25 * * *"), "小时越界");
        assertNull(ScheduleCronSupport.validate("abc def * * * *"), "非数字字段");
        assertNull(ScheduleCronSupport.validate("0 0 9 *"), "4 位不是合法 cron 形状");
        assertEquals("0 0 0 9 * *", ScheduleCronSupport.validate("0 0 9 * *"),
            "5 位 unix（分 时 日 月 周）合法：每月 9 日 00:00");
    }

    @Test
    @DisplayName("下次触发：每天 09:00 → 明天（周日）09:00")
    void nextFireDaily() {
        ZonedDateTime next = ScheduleCronSupport.nextFire("0 0 9 * * *", SHANGHAI, BASE);
        assertNotNull(next);
        assertEquals(ZonedDateTime.of(2026, 11, 22, 9, 0, 0, 0, SHANGHAI), next);
    }

    @Test
    @DisplayName("下次触发：每小时第 5 分 → 今天 10:05（基准 10:00 之后最近的 :05）")
    void nextFireHourly() {
        ZonedDateTime next = ScheduleCronSupport.nextFire("0 5 * * * *", SHANGHAI, BASE);
        assertEquals(ZonedDateTime.of(2026, 11, 21, 10, 5, 0, 0, SHANGHAI), next);
    }

    @Test
    @DisplayName("下次触发：每月 1 日 → 跨月到 12-01")
    void nextFireMonthly() {
        ZonedDateTime next = ScheduleCronSupport.nextFire("0 0 9 1 * *", SHANGHAI, BASE);
        assertEquals(ZonedDateTime.of(2026, 12, 1, 9, 0, 0, 0, SHANGHAI), next);
    }

    @Test
    @DisplayName("下次触发：每月 31 日 → 11 月没有 31 日，落到 12-31")
    void nextFireMonthEnd() {
        ZonedDateTime next = ScheduleCronSupport.nextFire("0 0 9 31 * *", SHANGHAI, BASE);
        assertEquals(ZonedDateTime.of(2026, 12, 31, 9, 0, 0, 0, SHANGHAI), next);
    }

    @Test
    @DisplayName("下次触发：工作日 09:00（周六基准 → 下周一）")
    void nextFireWorkday() {
        ZonedDateTime next = ScheduleCronSupport.nextFire("0 0 9 * * 1-5", SHANGHAI, BASE);
        assertEquals(ZonedDateTime.of(2026, 11, 23, 9, 0, 0, 0, SHANGHAI), next);
    }

    @Test
    @DisplayName("下次触发：秒位非 0（30 秒）→ 当前分钟的 30 秒处")
    void nextFireSeconds() {
        ZonedDateTime next = ScheduleCronSupport.nextFire("30 * * * * *", SHANGHAI, BASE);
        assertEquals(ZonedDateTime.of(2026, 11, 21, 10, 0, 30, 0, SHANGHAI), next);
    }

    @Test
    @DisplayName("下次触发：永不满足的组合（2 月 31 日）返回 null")
    void nextFireNever() {
        assertNull(ScheduleCronSupport.nextFire("0 0 9 31 2 *", SHANGHAI, BASE));
    }

    @Test
    @DisplayName("时区：同一时刻基准（周六 10:00 上海 = 02:00 UTC），两地各自的下次 9 点墙钟不同")
    void nextFireTimezone() {
        ZonedDateTime shanghai = ScheduleCronSupport.nextFire("0 0 9 * * *", SHANGHAI, BASE);
        ZonedDateTime utc = ScheduleCronSupport.nextFire("0 0 9 * * *", ZoneId.of("UTC"), BASE);
        // 上海：周六 10:00 → 下一个 09:00 是周日（+08）
        assertEquals(ZonedDateTime.of(2026, 11, 22, 9, 0, 0, 0, SHANGHAI), shanghai);
        // UTC：周六 02:00 → 当天 09:00 UTC（= 上海 17:00）就是下次
        assertEquals(ZonedDateTime.of(2026, 11, 21, 9, 0, 0, 0, ZoneId.of("UTC")), utc);
    }

    @Test
    @DisplayName("预览序列：每 20 分钟 ×3 次，严格递增")
    void nextFiresSequence() {
        List<ZonedDateTime> times = ScheduleCronSupport.nextFires("0 */20 * * * *", SHANGHAI, BASE, 3);
        assertEquals(3, times.size());
        assertEquals(ZonedDateTime.of(2026, 11, 21, 10, 20, 0, 0, SHANGHAI), times.get(0));
        assertEquals(ZonedDateTime.of(2026, 11, 21, 10, 40, 0, 0, SHANGHAI), times.get(1));
        assertEquals(ZonedDateTime.of(2026, 11, 21, 11, 0, 0, 0, SHANGHAI), times.get(2));
    }
}
