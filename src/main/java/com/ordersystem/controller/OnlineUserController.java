package com.ordersystem.controller;

import com.ordersystem.entity.User;
import com.ordersystem.service.RedisService;
import com.ordersystem.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import javax.servlet.http.HttpServletRequest;
import java.util.*;
import java.util.stream.Collectors;

/**
 * 在线用户控制器
 * 提供在线用户相关的RESTful API
 */
@RestController
@RequestMapping("/api/online-users")
public class OnlineUserController {

    @Autowired
    private RedisService redisService;
    
    @Autowired
    private UserService userService;
    
    /**
     * 获取所有在线用户
     * 
     * @param request HTTP请求
     * @return 在线用户列表
     */
    @GetMapping
    public ResponseEntity<?> getOnlineUsers(HttpServletRequest request) {
        // 从Redis中获取所有在线用户的Token
        Map<Integer, String> userTokens = redisService.getAllUserTokens();
        
        if (userTokens.isEmpty()) {
            return ResponseEntity.ok(Collections.emptyList());
        }
        
        // 获取当前用户ID（用于标记当前用户）
        Integer currentUserId = (Integer) request.getAttribute("userId");
        
        // 获取所有在线用户的详细信息
        List<Map<String, Object>> onlineUsers = new ArrayList<>();
        for (Map.Entry<Integer, String> entry : userTokens.entrySet()) {
            Integer userId = entry.getKey();
            User user = userService.getUserById(userId);
            
            if (user != null) {
                Map<String, Object> userInfo = new HashMap<>();
                userInfo.put("userId", user.getUserId());
                userInfo.put("username", user.getUsername());
                userInfo.put("realName", user.getRealName());
                userInfo.put("isCurrentUser", Objects.equals(userId, currentUserId));
                
                onlineUsers.add(userInfo);
            }
        }
        
        return ResponseEntity.ok(onlineUsers);
    }
}