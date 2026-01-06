package cn.boommanpro.gaia.workflow.base.tools;

import org.springframework.beans.BeansException;
import org.springframework.context.ApplicationContext;
import org.springframework.context.ApplicationContextException;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.context.expression.BeanExpressionContextAccessor;
import org.springframework.context.expression.BeanFactoryAccessor;
import org.springframework.context.expression.BeanFactoryResolver;
import org.springframework.context.expression.EnvironmentAccessor;
import org.springframework.context.support.GenericApplicationContext;
import org.springframework.expression.Expression;
import org.springframework.expression.ExpressionParser;
import org.springframework.expression.common.TemplateParserContext;
import org.springframework.expression.spel.standard.SpelExpressionParser;
import org.springframework.expression.spel.support.StandardEvaluationContext;
import org.springframework.expression.spel.support.StandardTypeLocator;
import org.springframework.util.StringUtils;

import java.lang.reflect.Method;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

public class SpringExpressionParser   {

    private static final long serialVersionUID = 1L;

    private StandardEvaluationContext context;

    private ExpressionParser expressionParser;

    private final ConcurrentHashMap<String, Expression> EXPRESSION_MAP = new ConcurrentHashMap<>();


    private static final ConcurrentHashMap<String, Expression> TEMPLATE_EXPRESSION_MAP = new ConcurrentHashMap<>();


    private static final ExpressionParser EXPRESSION_PARSER = new SpelExpressionParser();




    public <T> T getValue(String expressionString) {
        return getValue(expressionString, null);
    }

    private static final SpringExpressionParser PARSER = new SpringExpressionParser();

    public static SpringExpressionParser getInstance() {
        return PARSER;
    }

    private SpringExpressionParser() {
        setApplicationContext(new GenericApplicationContext());
    }

    @SuppressWarnings("all")
    public <T> T getValue(String expressionString, Map<String, Object> rootObject) {
        Expression expression = getExpression(expressionString);
        return ((T) expression.getValue(context, rootObject));
    }


    public  String getTemplateStringValue(String templateString, Map<String, Object> rootObject) {
        if (!StringUtils.hasText(templateString)) {
            return "";
        }
        Expression expression = TEMPLATE_EXPRESSION_MAP.computeIfAbsent(templateString, s -> EXPRESSION_PARSER.parseExpression(s, new TemplateParserContext("${", "}")));
        return expression.getValue(context, rootObject, String.class);
    }

    public  String getVueStringValue(String templateString, Map<String, Object> rootObject) {
        if (!StringUtils.hasText(templateString)) {
            return "";
        }
        Expression expression = TEMPLATE_EXPRESSION_MAP.computeIfAbsent(templateString, s -> EXPRESSION_PARSER.parseExpression(s, new TemplateParserContext("{{", "}}")));
        return expression.getValue(context, rootObject, String.class);
    }

    private Expression getExpression(String expressionString) {
        return EXPRESSION_MAP.computeIfAbsent(expressionString, s -> expressionParser.parseExpression(s));
    }


    @SuppressWarnings("all")
    public void setApplicationContext(ApplicationContext applicationContext) throws BeansException {
        if (applicationContext instanceof ConfigurableApplicationContext) {
            ConfigurableApplicationContext ac = (ConfigurableApplicationContext) applicationContext;
            context = new StandardEvaluationContext();
            context.addPropertyAccessor(new BeanExpressionContextAccessor());
            context.addPropertyAccessor(new BeanFactoryAccessor());
            // 使用自定义的 SafeMapAccessor 替代默认的 MapAccessor
            context.addPropertyAccessor(new SafeMapAccessor());
            // 使用安全的反射属性访问器处理链式访问
            context.addPropertyAccessor(new SafeReflectivePropertyAccessor());
            context.addPropertyAccessor(new EnvironmentAccessor());
            context.setBeanResolver(new BeanFactoryResolver(ac.getBeanFactory()));
            context.setTypeLocator(new StandardTypeLocator(ac.getBeanFactory().getBeanClassLoader()));
            //初始化上下文
            expressionParser = new SpelExpressionParser();
            //注册默认工具方法
            registerFunc(context,SpringELUtils.class);
        } else {
            throw new ApplicationContextException("can't cast ConfigurableApplicationContext");
        }
    }

    public void registerFunc(StandardEvaluationContext context, Class clazz) {
        Method[] methods = clazz.getDeclaredMethods();
        for (Method method : methods) {
            if (method.getModifiers() == 9) {
                String name = method.getName();
                context.registerFunction(name, method);
            }
        }
    }

    public void registerFunc(StandardEvaluationContext context, String className) throws ClassNotFoundException {
        Class<?> clazz = Class.forName(className);
        Method[] methods = clazz.getDeclaredMethods();
        for (Method method : methods) {
            if (method.getModifiers() == 9) {
                String name = method.getName();
                context.registerFunction(name, method);
            }
        }
    }
}
