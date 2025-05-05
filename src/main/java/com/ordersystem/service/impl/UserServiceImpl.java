package com.ordersystem.service.impl;

import com.ordersystem.dao.UserDao;
import com.ordersystem.entity.User;
import com.ordersystem.service.UserService;
import com.ordersystem.util.MD5Util;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

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
        //检查是否为禁用状态
        if (user.getStatus() == 0) {
            throw new RuntimeException("该用户已被禁用");
        }
        // 更新更新时间
        user.setUpdateTime(new java.util.Date());
        userDao.updateUser(user);
        
        return user;
    }
    
    @Override
    public Map<String, Object> getUsersByPage(Integer pageNum, Integer pageSize, String username, Integer role, Integer status) {
        // 使用PageHelper进行分页查询
        com.github.pagehelper.PageHelper.startPage(pageNum, pageSize);
        
        // 构建查询条件
        User filter = new User();
        if (username != null && !username.trim().isEmpty()) {
            filter.setUsername(username);
        }
        if (role != null) {
            filter.setRole(role);
        }
        if (status != null) {
            filter.setStatus(status);
        }
        
        // 执行查询
        List<User> users = userDao.getUsersByFilter(filter);
        
        // 处理查询结果
        com.github.pagehelper.PageInfo<User> pageInfo = new com.github.pagehelper.PageInfo<>(users);
        
        // 构建返回结果
        Map<String, Object> result = new HashMap<>();
        result.put("total", pageInfo.getTotal());
        result.put("pages", pageInfo.getPages());
        result.put("pageNum", pageInfo.getPageNum());
        result.put("pageSize", pageInfo.getPageSize());
        
        // 处理用户数据，移除敏感信息
        List<User> userList = pageInfo.getList();
        userList.forEach(user -> user.setPassword(null));
        result.put("list", userList);
        
        return result;
    }

    @Override
    public byte[] getUserAvatar(Integer userId) {
        byte[] avatarData = userDao.getUserByAvatarData(userId);
        return avatarData;
    }
}