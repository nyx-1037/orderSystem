package com.ordersystem.controller;

import com.ordersystem.entity.User;
import com.ordersystem.service.RedisService;
import com.ordersystem.service.UserService;
import com.ordersystem.service.SysLogService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import javax.servlet.http.HttpServletRequest;
import java.util.*;
import java.util.stream.Collectors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * 在线用户控制器
 * 提供在线用户相关的RESTful API
 */
@RestController
@RequestMapping("/api/online-users")
public class OnlineUserController {
    
    private static final Logger log = LoggerFactory.getLogger(OnlineUserController.class);

    @Autowired
    private RedisService redisService;
    
    @Autowired
    private UserService userService;
    
    @Autowired
    private SysLogService sysLogService;
    
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
        if (userService.getUserById(currentUserId).getRole() != 1){
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("无权限");
        }
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
    
    /**
     * 强制用户登出
     * 
     * @param userId 用户ID
     * @param request HTTP请求
     * @return 操作结果
     */
    @PostMapping("/{userId}/force-logout")
    public ResponseEntity<?> forceLogout(@PathVariable("userId") Integer userId, HttpServletRequest request) {
        // 记录操作者信息
        Integer operatorId = (Integer) request.getAttribute("userId");
        String operatorName = (String) request.getAttribute("username");
        
        log.info("用户 {} (ID: {}) 正在强制登出用户 ID: {}", operatorName, operatorId, userId);
        
        boolean success = sysLogService.forceLogout(userId);
        return success ? 
                ResponseEntity.ok().body("用户已被强制登出") : 
                ResponseEntity.badRequest().body("强制登出失败");
    }
}