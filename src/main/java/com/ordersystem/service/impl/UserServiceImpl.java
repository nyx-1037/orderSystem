package com.ordersystem.service.impl;

import com.ordersystem.dao.UserDao;
import com.ordersystem.entity.User;
import com.ordersystem.service.UserService;
import com.ordersystem.util.MD5Util;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * 用户服务实现类
 */
@Service
public class UserServiceImpl implements UserService {

    @Autowired
    private UserDao userDao;
    
    @Override
    public boolean addUser(User user) {
        return userDao.insertUser(user) > 0;
    }
    
    @Override
    public boolean deleteUser(Integer userId) {
        return userDao.deleteUserById(userId) > 0;
    }
    
    @Override
    public boolean updateUser(User user) {
        return userDao.updateUser(user) > 0;
    }
    
    @Override
    public User getUserById(Integer userId) {
        return userDao.getUserById(userId);
    }
    
    @Override
    public User getUserByUsername(String username) {
        return userDao.getUserByUsername(username);
    }
    
    @Override
    public List<User> getAllUsers() {
        return userDao.getAllUsers();
    }
    
    @Override
    public User login(String username, String password) {
        // 先检查用户是否存在
        User user = userDao.getUserByUsername(username);
        if (user == null) {
            throw new RuntimeException("用户不存在");
        }
        
        // 检查密码是否正确
        String encryptedPwd = MD5Util.encode(password);
        if (!user.getPassword().equals(encryptedPwd)) {
            throw new RuntimeException("密码错误");
        }
        
        // 更新最后登录时间
        user.setLastLoginTime(new java.util.Date());
        user.setUpdateTime(new java.util.Date());
        userDao.updateUser(user);
        
        return user;
    }
}