package com.ordersystem.interceptor;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.ordersystem.service.RedisService;
import com.ordersystem.util.JwtTokenUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.HashMap;
import java.util.Map;

/**
 * Token拦截器
 * 用于验证请求中的Token是否有效
 */
@Component
public class
TokenInterceptor implements HandlerInterceptor {

    @Autowired
    private JwtTokenUtil jwtTokenUtil;
    
    @Autowired
    private RedisService redisService;
    
    private static final String AUTH_HEADER = "Authorization";
    private static final String TOKEN_PREFIX = "Bearer ";
    
    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) throws Exception {
        // 放行OPTIONS请求
        if ("OPTIONS".equals(request.getMethod())) {
            return true;
        }
        
        // 获取请求头中的Token
        String authHeader = request.getHeader(AUTH_HEADER);
        
        // 验证Token是否存在
        if (authHeader == null || !authHeader.startsWith(TOKEN_PREFIX)) {
            responseError(response, "未提供有效的Token");
            return false;
        }
        
        // 提取Token
        String token = authHeader.substring(TOKEN_PREFIX.length());
        
        // 验证Token是否有效
        if (!jwtTokenUtil.validateToken(token)) {
            responseError(response, "Token已过期或无效");
            return false;
        }
        
        // 获取用户ID
        Integer userId = jwtTokenUtil.getUserIdFromToken(token);
        if (userId == null) {
            responseError(response, "Token中不包含用户信息");
            return false;
        }
        
        // 验证Redis中是否存在该Token
        String cachedToken = redisService.getToken(userId);
        if (cachedToken == null || !cachedToken.equals(token)) {
            responseError(response, "Token已失效，请重新登录");
            return false;
        }
        
        // 将用户ID存入请求属性中，方便后续使用
        request.setAttribute("userId", userId);
        request.setAttribute("username", jwtTokenUtil.getUsernameFromToken(token));
        
        return true;
    }
    
    /**
     * 返回错误信息
     */
    private void responseError(HttpServletResponse response, String message) throws IOException {
        response.setContentType("application/json;charset=UTF-8");
        response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
        
        Map<String, Object> result = new HashMap<>();
        result.put("success", false);
        result.put("message", message);
        
        ObjectMapper mapper = new ObjectMapper();
        response.getWriter().write(mapper.writeValueAsString(result));
    }
}