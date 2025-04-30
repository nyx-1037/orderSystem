package com.ordersystem.controller;

import com.ordersystem.entity.User;
import com.ordersystem.service.RedisService;
import com.ordersystem.service.UserService;
import com.ordersystem.util.JwtTokenUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.Map;

/**
 * 管理员认证控制器
 * 提供管理员登录相关的RESTful API
 */
@RestController
@RequestMapping("/api/admin/auth")
public class AdminAuthController {

    @Autowired
    private UserService userService;
    
    @Autowired
    private JwtTokenUtil jwtTokenUtil;
    
    @Autowired
    private RedisService redisService;
    
    /**
     * 管理员登录
     * 
     * @param loginUser 登录信息
     * @return 登录结果
     */
    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody User loginUser) {
        // 调用service层的login方法进行用户验证
        String username = loginUser.getUsername();
        String password = loginUser.getPassword();

        try {
            User user = userService.login(username, password);
            
            // 验证是否为管理员
            if (user.getRole() != 1) {
                Map<String, Object> response = new HashMap<>();
                response.put("success", false);
                response.put("message", "非管理员账户，无法登录管理后台");
                return ResponseEntity.badRequest().body(response);
            }
            
            // 生成Token
            String token = jwtTokenUtil.generateToken(user);
            
            // 将Token存入Redis，有效期24小时
            redisService.setToken(user.getUserId(), token, 24 * 60 * 60);
            
            // 返回登录成功信息
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "登录成功");
            response.put("token", token);
            response.put("role", user.getRole());
            response.put("user", user);
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", e.getMessage());
            return ResponseEntity.badRequest().body(response);
        }
    }
}