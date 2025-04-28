package com.ordersystem;

import org.mybatis.spring.annotation.MapperScan;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

/**
 * 订单管理系统SpringBoot启动类
 */
@SpringBootApplication
@MapperScan("com.ordersystem.dao")
@EnableScheduling // 启用定时任务
public class OrderSystemApplication {

    public static void main(String[] args) {
        SpringApplication.run(OrderSystemApplication.class, args);
        System.out.println("启动成功");
        System.out.println(
                        "\033[34m█▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀█\033[0m\n" +
                        "\033[34m█ \033[32m🚀 启动成功！(๑•̀ㅂ•́)و✧ \033[34m█\033[0m\n" +
                        "\033[34m█▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄█\033[0m\n" +
                        "\033[33m⇨ 访问地址: http://localhost:8087\033[0m");

    }
}