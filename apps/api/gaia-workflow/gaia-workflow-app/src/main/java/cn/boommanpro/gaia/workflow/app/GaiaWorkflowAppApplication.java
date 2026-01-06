package cn.boommanpro.gaia.workflow.app;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.ComponentScan;

/**
 * Gaia工作流服务启动类
 *
 * @author <a href="mailto:boommanpro@gmail.com">boommanpro</a>
 */
@SpringBootApplication
@ComponentScan(basePackages = {"cn.boommanpro.gaia.workflow.app","cn.boommanpro.gaia.workflow.base", "cn.boommanpro.gaia.workflow.infra"})
public class GaiaWorkflowAppApplication {

    public static void main(String[] args) {
        SpringApplication.run(GaiaWorkflowAppApplication.class, args);
    }



}
