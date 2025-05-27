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
        boolean authenticated = false;
        
        // 先尝试获取HttpSession
        HttpSession httpSession = (HttpSession) request.getHttpSession();
        if (httpSession != null) {
            // 将HttpSession存储在ServerEndpointConfig的用户属性中
            sec.getUserProperties().put(HttpSession.class.getName(), httpSession);
            User sessionUser = (User) httpSession.getAttribute("user");
            if (sessionUser != null) {
                sec.getUserProperties().put("user", sessionUser);
                authenticated = true;
                logger.info("WebSocket握手成功：通过HttpSession认证用户 {}", sessionUser.getUsername());
                return;
            }
        }
        
        // 如果HttpSession中没有用户信息，尝试从URL参数中获取token
        Map<String, List<String>> parameters = request.getParameterMap();
        if (parameters.containsKey("token")) {
            String token = parameters.get("token").get(0);
            if (token != null && !token.isEmpty()) {
                logger.info("WebSocket握手：尝试使用JWT token进行认证");
                
                try {
                    // 验证token
                    if (jwtTokenUtil != null && jwtTokenUtil.validateToken(token)) {
                        // 获取用户ID
                        Integer userId = jwtTokenUtil.getUserIdFromToken(token);
                        if (userId != null) {
                            // 验证Redis中是否存在该Token
                            String cachedToken = redisService.getToken(userId);
                            if (cachedToken != null && cachedToken.equals(token)) {
                                // 获取用户信息
                                User user = userService.getUserById(userId.intValue());
                                if (user != null) {
                                    // 将用户信息存储在ServerEndpointConfig的用户属性中
                                    sec.getUserProperties().put("user", user);
                                    authenticated = true;
                                    logger.info("WebSocket握手成功：通过JWT认证用户 {}", user.getUsername());
                                    return; // 认证成功，直接返回
                                } else {
                                    logger.error("WebSocket握手失败：用户ID {} 不存在", userId);
                                }
                            } else {
                                logger.error("WebSocket握手失败：Token已失效或不匹配，用户ID {}，缓存Token: {}, 请求Token: {}", userId, cachedToken, token);
                            }
                        } else {
                            logger.error("WebSocket握手失败：无法从Token中获取用户ID");
                        }
                    } else {
                        logger.error("WebSocket握手失败：Token验证失败，Token: {}", token);
                    }
                } catch (Exception e) {
                    logger.error("WebSocket握手时JWT认证异常：{}", e.getMessage(), e);
                }
            } else {
                logger.error("WebSocket握手失败：Token参数为空");
            }
        } else {
            logger.error("WebSocket握手失败：未提供Token参数");
        }
        
        // 如果认证失败，记录详细信息
        if (!authenticated) {
            logger.error("WebSocket握手失败：用户未通过认证");
        }
    }
}