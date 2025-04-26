package com.ordersystem.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

/**
 * 首页控制器
 */
@Controller
public class HomeController {
    
    /**
     * 访问首页
     * @return 重定向到静态首页
     */
    @GetMapping("/")
    public String index() {
        return "forward:/index.html";
    }
    
    /**
     * 用户登录页面 - 已移除，避免与UserController冲突
     * 首页已重定向到/user/login，由UserController.loginPage()处理
     */
    // 移除冲突的映射，因为UserController已经有了相同的映射
    // @GetMapping("/user/login")
    // public String login() {
    //     return "user/login";
    // }
}