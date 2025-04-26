package com.ordersystem.service.impl;

import com.ordersystem.service.RedisService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.TimeUnit;

/**
 * Redis服务实现类
 */
@Service
public class RedisServiceImpl implements RedisService {

    @Autowired
    private RedisTemplate<String, Object> redisTemplate;
    
    /**
     * 设置缓存
     * @param key 键
     * @param value 值
     */
    private void set(String key, Object value) {
        redisTemplate.opsForValue().set(key, value);
    }
    
    /**
     * 设置缓存并设置过期时间
     * @param key 键
     * @param value 值
     * @param timeout 过期时间（秒）
     */
    @Override
    public void set(String key, Object value, long timeout) {
        redisTemplate.opsForValue().set(key, value, timeout, TimeUnit.SECONDS);
    }
    
    /**
     * 获取缓存
     * @param key 键
     * @return 值
     */
    @Override
    public <T> T get(String key, Class<T> clazz) {
        Object value = redisTemplate.opsForValue().get(key);
        if (value == null) {
            return null;
        }
        // 如果是字符串类型，尝试反序列化为目标类型
        if (clazz.isInstance(value)) {
            return clazz.cast(value);
        }
        throw new IllegalArgumentException("无法将缓存值转换为目标类型: " + clazz.getName());
    }

    /**
     * 删除缓存
     * @param key 键
     */
    private void delete(String key) {
        redisTemplate.delete(key);
    }
    
    /**
     * 判断是否存在缓存
     * @param key 键
     * @return 是否存在
     */
    private boolean hasKey(String key) {
        return Boolean.TRUE.equals(redisTemplate.hasKey(key));
    }
    
    @Override
    public void setToken(Integer userId, String token, long expireSeconds) {
        String key = "token:" + userId;
        set(key, token, expireSeconds);
    }
    
    @Override
    public String getToken(Integer userId) {
        String key = "token:" + userId;
        Object token = get(key, String.class);
        return token != null ? token.toString() : null;
    }
    
    @Override
    public void deleteToken(Integer userId) {
        String key = "token:" + userId;
        delete(key);
    }
    
    @Override
    public void setVerificationCode(String username, String code, long expireSeconds) {
        String key = "verification_code:" + username;
        set(key, code, expireSeconds);
    }
    
    @Override
    public String getVerificationCode(String username) {
        String key = "verification_code:" + username;
        Object code = get(key, String.class);
        return code != null ? code.toString() : null;
    }
    
    @Override
    public void deleteVerificationCode(String username) {
        String key = "verification_code:" + username;
        delete(key);
    }
    
    @Override
    public Map<Integer, String> getAllUserTokens() {
        Map<Integer, String> userTokens = new HashMap<>();
        Set<String> keys = redisTemplate.keys("token:*");
        
        if (keys != null) {
            for (String key : keys) {
                try {
                    // 从key中提取用户ID
                    String userIdStr = key.substring("token:".length());
                    Integer userId = Integer.parseInt(userIdStr);
                    
                    // 获取对应的token
                    Object tokenObj = redisTemplate.opsForValue().get(key);
                    if (tokenObj != null) {
                        userTokens.put(userId, tokenObj.toString());
                    }
                } catch (Exception e) {
                    // 忽略解析错误
                }
            }
        }
        
        return userTokens;
    }
}