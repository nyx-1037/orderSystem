package com.ordersystem.service;

import com.ordersystem.entity.User;
import java.util.List;

/**
 * 用户服务接口
 */
public interface UserService {
    
    /**
     * 添加用户
     * @param user 用户信息
     * @return 是否成功
     */
    boolean addUser(User user);
    
    /**
     * 删除用户
     * @param userId 用户ID
     * @return 是否成功
     */
    boolean deleteUser(Integer userId);
    
    /**
     * 更新用户信息
     * @param user 用户信息
     * @return 是否成功
     */
    boolean updateUser(User user);
    
    /**
     * 根据ID查询用户
     * @param userId 用户ID
     * @return 用户信息
     */
    User getUserById(Integer userId);
    
    /**
     * 根据用户名查询用户
     * @param username 用户名
     * @return 用户信息
     */
    User getUserByUsername(String username);
    
    /**
     * 查询所有用户
     * @return 用户列表
     */
    List<User> getAllUsers();
    
    /**
     * 用户登录
     * @param username 用户名
     * @param password 密码
     * @return 用户信息，登录失败返回null
     */
    User login(String username, String password);
}