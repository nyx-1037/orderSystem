package com.ordersystem.service.impl;

import com.ordersystem.dao.UserDao;
import com.ordersystem.entity.User;
import com.ordersystem.service.RedisService;
import com.ordersystem.service.UserService;
import com.ordersystem.util.MD5Util;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 用户服务实现类
 */
@Service
public class UserServiceImpl implements UserService, CommandLineRunner {
    private static final Logger logger = LoggerFactory.getLogger(UserServiceImpl.class);


    @Autowired
    private RedisTemplate<String, Object> redisTemplate;
    
    @Autowired
    private UserDao userDao;
    
    @Autowired
    private RedisService redisService;
    
    /**
     * 项目启动时初始化用户数据到Redis缓存
     */
    @Override
    public void run(String... args) throws Exception {
        logger.info("开始初始化用户数据到Redis缓存...");
        List<User> users = userDao.getAllUsers();
        for (User user : users) {
            // 不缓存密码等敏感信息
            user.setPassword(null);
            String key = "user:" + user.getUserId();
            redisService.set(key, user, 24 * 60 * 60); // 缓存24小时
        }
        logger.info("用户数据缓存初始化完成，共缓存{}条记录", users.size());
    }
    
    @Override
    @Transactional
    public boolean addUser(User user) {
        boolean result = userDao.insertUser(user) > 0;
        if (result) {
            try {
                // 不缓存密码等敏感信息
                User cacheUser = userDao.getUserById(user.getUserId());
                if (cacheUser != null) {
                    cacheUser.setPassword(null);
                    // 更新Redis缓存
                    String key = "user:" + user.getUserId();
                    redisService.set(key, cacheUser, 24 * 60 * 60); // 缓存24小时
                    
                    // 清除相关缓存
                    redisTemplate.delete("allUsers");
                }
            } catch (Exception e) {
                logger.error("添加用户后更新缓存失败", e);
                // 缓存更新失败不影响业务操作
            }
        }
        return result;
    }
    
    @Override
    @Transactional
    public boolean deleteUser(Integer userId) {
        boolean result = userDao.deleteUserById(userId) > 0;
        if (result) {
            try {
                // 从Redis缓存中删除
                String key = "user:" + userId;
                redisService.delete(key);
                
                // 清除相关缓存
                redisTemplate.delete("allUsers");
            } catch (Exception e) {
                logger.error("删除用户后清除缓存失败", e);
                // 缓存操作失败不影响业务操作
            }
        }
        return result;
    }
    
    @Override
    @Transactional
    public boolean updateUser(User user) {
        boolean result = userDao.updateUser(user) > 0;
        if (result) {
            try {
                // 获取更新后的用户信息，不包含密码
                User updatedUser = userDao.getUserById(user.getUserId());
                if (updatedUser != null) {
                    updatedUser.setPassword(null); // 不缓存密码
                    
                    // 更新Redis缓存
                    String key = "user:" + user.getUserId();
                    redisService.set(key, updatedUser, 24 * 60 * 60); // 缓存24小时
                    
                    // 清除相关缓存
                    redisTemplate.delete("allUsers");
                    if (updatedUser.getUsername() != null) {
                        redisTemplate.delete("usersByUsername::" + updatedUser.getUsername());
                    }
                }
            } catch (Exception e) {
                logger.error("更新用户后更新缓存失败", e);
                // 缓存操作失败不影响业务操作
            }
        }
        return result;
    }
    
    @Override
    public User getUserById(Integer userId) {
        User user = null;
        String key = "user:" + userId;
        
        try {
            // 先从Redis缓存中获取
            user = redisService.get(key, User.class);
            if (user != null) {
                logger.debug("从Redis缓存中获取用户数据，userId={}", userId);
                return user;
            }
        } catch (Exception e) {
            logger.error("从Redis获取用户数据失败，将从数据库获取, userId={}", userId, e);
            // Redis获取失败，继续从数据库获取
        }
        
        // 缓存中没有或获取失败，从数据库获取
        user = userDao.getUserById(userId);
        if (user != null) {
            try {
                User cacheUser = new User();
                cacheUser.setUserId(user.getUserId());
                cacheUser.setUsername(user.getUsername());
                cacheUser.setUserUuid(user.getUserUuid());
                cacheUser.setRealName(user.getRealName());
                cacheUser.setPhone(user.getPhone());
                cacheUser.setEmail(user.getEmail());
                cacheUser.setAddress(user.getAddress());
                cacheUser.setRole(user.getRole());
                cacheUser.setStatus(user.getStatus());
                cacheUser.setCreateTime(user.getCreateTime());
                cacheUser.setUpdateTime(user.getUpdateTime());
                // 不缓存密码和头像数据
                
                // 放入缓存
                redisService.set(key, cacheUser, 24 * 60 * 60); // 缓存24小时
            } catch (Exception e) {
                logger.error("将用户数据放入Redis缓存失败, userId={}", userId, e);
                // 缓存操作失败不影响业务操作
            }
        }
        return user;
    }
    
    @Override
    public User getUserByUsername(String username) {
        User user = null;
        String usernameKey = "username:" + username;
        
        try {
            // 尝试从缓存获取用户ID
            Integer userId = redisService.get(usernameKey, Integer.class);
            if (userId != null) {
                // 如果找到用户ID，则获取用户详情
                user = getUserById(userId);
                if (user != null) {
                    return user;
                }
            }
        } catch (Exception e) {
            logger.error("从Redis获取用户名对应的用户数据失败，将从数据库获取, username={}", username, e);
            // Redis获取失败，继续从数据库获取
        }
        
        // 从数据库获取
        user = userDao.getUserByUsername(username);
        if (user != null) {
            try {
                // 缓存用户名到用户ID的映射
                redisService.set(usernameKey, user.getUserId(), 24 * 60 * 60);
                
                // 更新用户缓存
                String key = "user:" + user.getUserId();
                User cacheUser = new User();
                cacheUser.setUserId(user.getUserId());
                cacheUser.setUsername(user.getUsername());
                cacheUser.setUserUuid(user.getUserUuid());
                cacheUser.setRealName(user.getRealName());
                cacheUser.setPhone(user.getPhone());
                cacheUser.setEmail(user.getEmail());
                cacheUser.setAddress(user.getAddress());
                cacheUser.setRole(user.getRole());
                cacheUser.setStatus(user.getStatus());
                cacheUser.setCreateTime(user.getCreateTime());
                cacheUser.setUpdateTime(user.getUpdateTime());
                // 不缓存密码和头像数据
                
                redisService.set(key, cacheUser, 24 * 60 * 60); // 缓存24小时
            } catch (Exception e) {
                logger.error("将用户名对应的用户数据放入Redis缓存失败, username={}", username, e);
                // 缓存操作失败不影响业务操作
            }
        }
        return user;
    }
    
    @Override
    public List<User> getAllUsers() {
        List<User> users = null;
        
        try {
            // 尝试从缓存获取所有用户列表
            users = redisService.get("allUsers", List.class);
            if (users != null && !users.isEmpty()) {
                logger.debug("从Redis缓存中获取所有用户数据");
                return users;
            }
        } catch (Exception e) {
            logger.error("从Redis获取所有用户数据失败，将从数据库获取", e);
            // Redis获取失败，继续从数据库获取
        }
        
        // 从数据库获取所有用户
        users = userDao.getAllUsers();
        
        try {
            if (users != null && !users.isEmpty()) {
                // 创建不包含敏感信息的用户列表用于缓存
                List<User> cacheUsers = new ArrayList<>();
                
                // 更新每个用户的缓存
                for (User user : users) {
                    User cacheUser = new User();
                    cacheUser.setUserId(user.getUserId());
                    cacheUser.setUsername(user.getUsername());
                    cacheUser.setUserUuid(user.getUserUuid());
                    cacheUser.setRealName(user.getRealName());
                    cacheUser.setPhone(user.getPhone());
                    cacheUser.setEmail(user.getEmail());
                    cacheUser.setAddress(user.getAddress());
                    cacheUser.setRole(user.getRole());
                    cacheUser.setStatus(user.getStatus());
                    cacheUser.setCreateTime(user.getCreateTime());
                    cacheUser.setUpdateTime(user.getUpdateTime());
                    // 不缓存密码和头像数据
                    
                    cacheUsers.add(cacheUser);
                    
                    // 单独缓存每个用户
                    String key = "user:" + user.getUserId();
                    redisService.set(key, cacheUser, 24 * 60 * 60); // 缓存24小时
                }
                
                // 缓存整个列表
                redisService.set("allUsers", cacheUsers, 24 * 60 * 60); // 缓存24小时
            }
        } catch (Exception e) {
            logger.error("将所有用户数据放入Redis缓存失败", e);
            // 缓存操作失败不影响业务操作
        }
        
        return users;
    }
    
    @Override
    @Transactional
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