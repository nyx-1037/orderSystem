package com.ordersystem.service;

import java.util.Map;

/**
 * Redis服务接口
 */
public interface RedisService {
    
    /**
     * 存储Token
     * @param userId 用户ID
     * @param token Token字符串
     * @param expireSeconds 过期时间（秒）
     */
    void setToken(Integer userId, String token, long expireSeconds);
    
    /**
     * 获取Token
     * @param userId 用户ID
     * @return Token字符串
     */
    String getToken(Integer userId);
    
    /**
     * 删除Token
     * @param userId 用户ID
     */
    void deleteToken(Integer userId);
    
    /**
     * 获取所有用户的Token
     * @return 用户ID和Token的映射
     */
    Map<Integer, String> getAllUserTokens();
    
    /**
     * 存储验证码
     * @param username 用户名
     * @param code 验证码
     * @param expireSeconds 过期时间（秒）
     */
    void setVerificationCode(String username, String code, long expireSeconds);
    
    /**
     * 获取验证码
     * @param username 用户名
     * @return 验证码
     */
    String getVerificationCode(String username);
    
    /**
     * 删除验证码
     * @param username 用户名
     */
    void deleteVerificationCode(String username);

    /**
     * 获取缓存并转换为目标类型
     * @param key 键
     * @param clazz 目标类型
     * @return 转换后的对象
     */
    <T> T get(String key, Class<T> clazz);

    /**
     * 设置缓存并设置过期时间
     * @param key 键
     * @param value 值
     * @param timeout 过期时间（秒）
     */
    void set(String key, Object value, long timeout);
}