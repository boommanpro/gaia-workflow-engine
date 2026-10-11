package cn.boommanpro.gaia.workflow.app.config;

import org.slf4j.ILoggerFactory;
import org.slf4j.IMarkerFactory;
import org.slf4j.helpers.BasicMarkerFactory;
import org.slf4j.spi.MDCAdapter;
import org.slf4j.spi.SLF4JServiceProvider;

/**
 * slf4j 2.x ServiceLoader provider → logback 1.2 绑定的桥接器。
 *
 * <p>依赖矩阵的三角债与解法：</p>
 * <ul>
 *   <li>AgentScope Java 2.0 按 slf4j-api <b>2.0.17</b> 编译（必须有 2.x）；</li>
 *   <li>Spring Boot 2.7 的 LogbackLoggingSystem 字节码只兼容 logback <b>1.2</b>
 *       （1.3 起删除了 {@code LoggerContext.getConfigurationLock()}，启动即
 *       NoSuchMethodError）；</li>
 *   <li>logback 1.2 只有 slf4j 1.7 的 {@code StaticLoggerBinder} 绑定机制，
 *       没有 slf4j 2 的 ServiceLoader provider —— 本类补上这个 provider，
 *       把 2.x API 桥接到 1.2 绑定，三方（Boot 直调 binder、agentscope 走 2.x API、
 *       应用 @Slf4j）共用同一个 logback LoggerContext。</li>
 * </ul>
 *
 * <p>注册方式：META-INF/services/org.slf4j.spi.SLF4JServiceProvider。
 * 升级 Spring Boot 3.x（自带 slf4j 2 + logback 1.4/1.5）后应删除本类与 services 文件。</p>
 */
public class GaiaLogback12Slf4j2Provider implements SLF4JServiceProvider {

    private ILoggerFactory loggerFactory;
    private IMarkerFactory markerFactory;
    private MDCAdapter mdcAdapter;

    @Override
    public void initialize() {
        // logback 1.2 的 StaticLoggerBinder：与 Boot LogbackLoggingSystem 直调的是同一份工厂
        this.loggerFactory = org.slf4j.impl.StaticLoggerBinder.getSingleton().getLoggerFactory();
        this.markerFactory = new BasicMarkerFactory();
        try {
            this.mdcAdapter = new ch.qos.logback.classic.util.LogbackMDCAdapter();
        } catch (Throwable t) {
            this.mdcAdapter = new org.slf4j.helpers.NOPMDCAdapter();
        }
    }

    @Override
    public ILoggerFactory getLoggerFactory() {
        return loggerFactory;
    }

    @Override
    public IMarkerFactory getMarkerFactory() {
        return markerFactory;
    }

    @Override
    public MDCAdapter getMDCAdapter() {
        return mdcAdapter;
    }

    @Override
    public String getRequestedApiVersion() {
        return "2.0.17";
    }
}
