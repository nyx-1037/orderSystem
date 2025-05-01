package com.ordersystem.dao;

import com.ordersystem.entity.User;
import java.util.List;

/**
 * 用户DAO接口
 */
public interface UserDao {
    
    /**
     * 添加用户
     * @param user 用户信息
     * @return 影响行数
     */
    int insertUser(User user);
    
    /**
     * 根据ID删除用户
     * @param userId 用户ID
     * @return 影响行数
     */
    int deleteUserById(Integer userId);
    
    /**
     * 更新用户信息
     * @param user 用户信息
     * @return 影响行数
     */
    int updateUser(User user);
    
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
     * 根据条件筛选查询用户
     * @param filter 筛选条件
     * @return 用户列表
     */
    List<User> getUsersByFilter(User filter);
}