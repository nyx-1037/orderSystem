package com.ordersystem.websocket;

import com.ordersystem.entity.User;
import com.ordersystem.service.RedisService;
import com.ordersystem.service.UserService;
import com.ordersystem.util.JwtTokenUtil;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import javax.servlet.http.HttpSession;
import javax.websocket.HandshakeResponse;
import javax.websocket.server.HandshakeRequest;
import javax.websocket.server.ServerEndpointConfig;
import java.util.List;
import java.util.Map;

/**
 * WebSocket握手配置器
 * 用于在WebSocket连接中获取HTTP会话信息和处理JWT认证
 */
@Component
public class HttpSessionConfigurator extends ServerEndpointConfig.Configurator {

    private static final Logger logger = LoggerFactory.getLogger(HttpSessionConfigurator.class);
    
    private static JwtTokenUtil jwtTokenUtil;
    private static UserService userService;
    private static RedisService redisService;
    
    @Autowired
    public void setJwtTokenUtil(JwtTokenUtil jwtTokenUtil) {
        HttpSessionConfigurator.jwtTokenUtil = jwtTokenUtil;
    }
    
    @Autowired
    public void setUserService(UserService userService) {
        HttpSessionConfigurator.userService = userService;
    }
    
    @Autowired
    public void setRedisService(RedisService redisService) {
        HttpSessionConfigurator.redisService = redisService;
    }

    @Override
    public void modifyHandshake(ServerEndpointConfig sec, HandshakeRequest request, HandshakeResponse response) {
        // 先尝试获取HttpSession
        HttpSession httpSession = (HttpSession) request.getHttpSession();
        if (httpSession != null) {
            // 将HttpSession存储在ServerEndpointConfig的用户属性中
            sec.getUserProperties().put(HttpSession.class.getName(), httpSession);
            User sessionUser = (User) httpSession.getAttribute("user");
            if (sessionUser != null) {
                sec.getUserProperties().put("user", sessionUser);
                return;
            }
        }
        
        // 如果HttpSession中没有用户信息，尝试从URL参数中获取token
        Map<String, List<String>> parameters = request.getParameterMap();
        if (parameters.containsKey("token")) {
            String token = parameters.get("token").get(0);
            if (token != null && !token.isEmpty()) {
                // 验证token
                if (jwtTokenUtil != null && jwtTokenUtil.validateToken(token)) {
                    // 获取用户ID
                    Integer userId = jwtTokenUtil.getUserIdFromToken(token);
                    if (userId != null) {
                        // 验证Redis中是否存在该Token
                        String cachedToken = redisService.getToken(userId);
                        if (cachedToken != null && cachedToken.equals(token)) {
                            try {
                                // 获取用户信息
                                User user = userService.getUserById(userId.intValue());
                                if (user != null) {
                                    // 将用户信息存储在ServerEndpointConfig的用户属性中
                                    sec.getUserProperties().put("user", user);
                                } else {
                                    // 用户不存在，记录错误信息
                                    logger.error("WebSocket握手失败：用户ID {} 不存在", userId);
                                }
                            } catch (Exception e) {
                                // 捕获并记录异常
                                logger.error("WebSocket握手时获取用户信息异常：{}", e.getMessage(), e);
                            }
                        }
                    }
                }
            }
        }
    }
}