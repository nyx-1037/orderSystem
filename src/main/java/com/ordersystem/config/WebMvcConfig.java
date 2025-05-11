package com.ordersystem.config;

import com.ordersystem.interceptor.TokenInterceptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.PathMatchConfigurer;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * Web MVC配置类
 * 用于配置API路径前缀映射和拦截器
 */
@Configuration
public class WebMvcConfig implements WebMvcConfigurer {

    @Autowired
    private TokenInterceptor tokenInterceptor;

    /**
     * 配置路径匹配
     * 将/api前缀的请求映射到对应的控制器
     */
    @Override
    public void configurePathMatch(PathMatchConfigurer configurer) {
        // 控制器已经使用了@RequestMapping("/api/xxx")注解，不需要再添加前缀
        // configurer.addPathPrefix("/api", c -> c.getPackage().getName().contains("controller"));
    }
    
    /**
     * 配置拦截器
     * 添加Token验证拦截器
     */
    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        // 添加Token拦截器，拦截所有API请求，但排除登录和注册接口
        registry.addInterceptor(tokenInterceptor)
                .addPathPatterns("/api/**")
                .excludePathPatterns(
                    "/api/users/login", 
                    "/api/users/register", 
                    "/api/admin/auth/login",
                    "/api/products",
                    "/api/products/**",
                    "/swagger-resources/**",
                    "/swagger-ui.html",
                    "/v2/api-docs",
                    "/webjars/**"
                );
    }
    
    /**
     * 配置静态资源处理
     * 添加Swagger UI资源映射
     */
    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        registry.addResourceHandler("swagger-ui.html")
                .addResourceLocations("classpath:/META-INF/resources/");
        registry.addResourceHandler("/webjars/**")
                .addResourceLocations("classpath:/META-INF/resources/webjars/");
    }
}