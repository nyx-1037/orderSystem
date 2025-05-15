package com.ordersystem.config;

import org.springframework.beans.BeansException;
import org.springframework.beans.factory.config.BeanPostProcessor;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.util.ReflectionUtils;
import org.springframework.web.filter.ForwardedHeaderFilter;
import org.springframework.web.servlet.config.annotation.PathMatchConfigurer;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;
import org.springframework.web.servlet.mvc.method.RequestMappingInfoHandlerMapping;
import springfox.documentation.builders.ApiInfoBuilder;
import springfox.documentation.builders.PathSelectors;
import springfox.documentation.builders.RequestHandlerSelectors;
import springfox.documentation.service.ApiInfo;
import springfox.documentation.service.Contact;
import springfox.documentation.spi.DocumentationType;
import springfox.documentation.spring.web.plugins.Docket;
import springfox.documentation.spring.web.plugins.WebMvcRequestHandlerProvider;
import springfox.documentation.swagger2.annotations.EnableSwagger2;

import java.lang.reflect.Field;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Swagger配置类
 * 用于配置API文档生成及解决Spring Boot 2.7.0与Springfox Swagger 2.9.2的兼容性问题
 */
@Configuration
@EnableSwagger2
public class SwaggerConfig implements WebMvcConfigurer {

    /**
     * 创建API文档配置
     *
     * @return Docket实例
     */
    @Bean
    public Docket createRestApi() {
        return new Docket(DocumentationType.SWAGGER_2)
                .apiInfo(apiInfo())
                .select()
                // 指定扫描的包路径
                .apis(RequestHandlerSelectors.basePackage("com.ordersystem.controller"))
                .paths(PathSelectors.any())
                .build();
    }

    /**
     * 创建API基本信息
     *
     * @return ApiInfo实例
     */
    private ApiInfo apiInfo() {
        return new ApiInfoBuilder()
                .title("七洛商城系统API文档")
                .description("提供七洛商城系统的所有API接口说明")
                .contact(new Contact("nyx1037", "http://www.nyx-1037.github.io", "1037678078@qq.com"))
                .version("2.0.20250515")
                .build();
    }

    /**
     * 配置路径匹配策略
     * Spring Boot 2.7.0默认使用PathPatternParser，而Springfox Swagger 2.9.2使用AntPathMatcher
     * 这里将路径匹配策略设置为使用AntPathMatcher
     */
    @Override
    public void configurePathMatch(PathMatchConfigurer configurer) {
        // 禁用PathPatternParser，使用AntPathMatcher
        configurer.setUseTrailingSlashMatch(true);
        configurer.setUseRegisteredSuffixPatternMatch(true);
        configurer.setUseSuffixPatternMatch(false);
    }

    /**
     * 添加ForwardedHeaderFilter以支持代理环境
     */
    @Bean
    public FilterRegistrationBean<ForwardedHeaderFilter> forwardedHeaderFilter() {
        FilterRegistrationBean<ForwardedHeaderFilter> filterRegistrationBean = new FilterRegistrationBean<>();
        filterRegistrationBean.setFilter(new ForwardedHeaderFilter());
        filterRegistrationBean.setOrder(0);
        return filterRegistrationBean;
    }

    /**
     * 创建一个BeanPostProcessor，用于修复Springfox的RequestHandlerMapping
     * 这个问题是由于Spring Boot 2.7.0默认使用PathPatternParser，而Springfox 2.9.2使用AntPathMatcher
     * 通过反射修改handlerMappings字段，移除不兼容的RequestMappingHandlerMapping
     *
     * @return BeanPostProcessor实例
     */
    @Bean
    public static BeanPostProcessor springfoxHandlerProviderBeanPostProcessor() {
        return new BeanPostProcessor() {
            @Override
            public Object postProcessAfterInitialization(Object bean, String beanName) throws BeansException {
                if (bean instanceof WebMvcRequestHandlerProvider) {
                    customizeSpringfoxHandlerMappings(getHandlerMappings(bean));
                }
                return bean;
            }

            private <T extends RequestMappingInfoHandlerMapping> void customizeSpringfoxHandlerMappings(List<T> mappings) {
                List<T> copy = mappings.stream()
                        .filter(mapping -> mapping.getPatternParser() == null)
                        .collect(Collectors.toList());
                mappings.clear();
                mappings.addAll(copy);
            }

            @SuppressWarnings("unchecked")
            private List<RequestMappingInfoHandlerMapping> getHandlerMappings(Object bean) {
                try {
                    Field field = ReflectionUtils.findField(bean.getClass(), "handlerMappings");
                    field.setAccessible(true);
                    return (List<RequestMappingInfoHandlerMapping>) field.get(bean);
                } catch (IllegalArgumentException | IllegalAccessException e) {
                    throw new IllegalStateException(e);
                }
            }
        };
    }
}