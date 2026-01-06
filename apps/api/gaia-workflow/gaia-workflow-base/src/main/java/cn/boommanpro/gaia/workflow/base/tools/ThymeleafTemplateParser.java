package cn.boommanpro.gaia.workflow.base.tools;

import org.thymeleaf.TemplateEngine;
import org.thymeleaf.context.Context;
import org.thymeleaf.templateresolver.StringTemplateResolver;

import java.util.Locale;
import java.util.Map;

public class ThymeleafTemplateParser {
    public static String parse(String template, Map<String, Object> variables){
        StringTemplateResolver templateResolver = new StringTemplateResolver();
        templateResolver.setTemplateMode("TEXT");
        TemplateEngine templateEngine = new TemplateEngine();
        templateEngine.setTemplateResolver(templateResolver);

        return templateEngine.process(template, new Context(Locale.CHINA, variables));
    }
}
