package com.ordersystem.config;

import com.google.code.kaptcha.impl.DefaultKaptcha;
import com.google.code.kaptcha.util.Config;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.Properties;

/**
 * Kaptcha验证码配置类
 */
@Configuration
public class KaptchaConfig {

    /**
     * 配置Kaptcha验证码生成器
     *
     * @return DefaultKaptcha实例
     */
    @Bean
    public DefaultKaptcha captchaProducer() {
        DefaultKaptcha defaultKaptcha = new DefaultKaptcha();
        Properties properties = new Properties();
        
        // 验证码宽度
        properties.setProperty("kaptcha.image.width", "120");
        // 验证码高度
        properties.setProperty("kaptcha.image.height", "45");
        // 验证码文本字符大小
        properties.setProperty("kaptcha.textproducer.font.size", "32");
        // 验证码文本字符颜色
        properties.setProperty("kaptcha.textproducer.font.color", "blue");
        // 验证码文本字符长度
        properties.setProperty("kaptcha.textproducer.char.length", "4");
        // 验证码文本字符间距
        properties.setProperty("kaptcha.textproducer.char.space", "4");
        // 验证码噪点颜色
        properties.setProperty("kaptcha.noise.color", "black");
        // 验证码样式引擎
        properties.setProperty("kaptcha.obscurificator.impl", "com.google.code.kaptcha.impl.WaterRipple");
        // 验证码文本字符渲染
        properties.setProperty("kaptcha.word.impl", "com.google.code.kaptcha.text.impl.DefaultWordRenderer");
        // 验证码文本字符集合
        properties.setProperty("kaptcha.textproducer.char.string", "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ");
        
        Config config = new Config(properties);
        defaultKaptcha.setConfig(config);
        
        return defaultKaptcha;
    }
}