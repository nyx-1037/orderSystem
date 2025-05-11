package com.ordersystem.config;

import io.swagger.v3.oas.annotations.OpenAPIDefinition;
import io.swagger.v3.oas.annotations.info.Info;
import org.springframework.context.annotation.Configuration;

@Configuration
@OpenAPIDefinition(info = @Info(title = "订单系统API", version = "1.0", description = "订单系统接口文档"))
public class OpenApiConfig {
    // 使用Springdoc的自动配置，无需额外实现
}