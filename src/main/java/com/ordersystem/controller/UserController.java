package com.ordersystem.controller;

import com.ordersystem.dto.ChangePasswordRequest;
import com.ordersystem.entity.User;
import com.ordersystem.service.RedisService;
import com.ordersystem.service.UserService;
import com.ordersystem.util.JwtTokenUtil;
import com.ordersystem.util.MD5Util;
import com.ordersystem.util.UUIDGenerater;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpSession;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.util.*;

/**
 * 用户控制器
 * 提供用户相关的RESTful API
 */
@RestController
@RequestMapping("/api/users")
public class UserController {

    @Autowired
    private UserService userService;
    
    @Autowired
    private JwtTokenUtil jwtTokenUtil;
    
    @Autowired
    private RedisService redisService;
    
    /**
     * 获取所有用户列表
     * 
     * @return 用户列表数据
     */
    @GetMapping
    public ResponseEntity<List<User>> getAllUsers() {
        List<User> users = userService.getAllUsers();
        return ResponseEntity.ok(users);
    }
    
    /**
     * 根据ID获取用户
     * 
     * @param userId 用户ID
     * @return 用户数据
     */
    @GetMapping("/{userId}")
    public ResponseEntity<?> getUserById(@PathVariable Integer userId) {
        User user = userService.getUserById(userId);
        if (user != null) {
            // 不返回密码等敏感信息
            user.setPassword(null);
            return ResponseEntity.ok(user);
        }
        return ResponseEntity.notFound().build();
    }
    
    /**
     * 用户登录
     * 
     * @param loginUser 登录信息
     * @return 登录结果
     */
    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody User loginUser) {
        // 调用service层的login方法进行用户验证
        String username = loginUser.getUsername();
        String password = loginUser.getPassword();

        try {
            User user = userService.login(username, password);
            
            // 用户登录成功
            
            // 登录成功，生成Token
            String token = jwtTokenUtil.generateToken(user);
            
            // 将Token存入Redis，有效期24小时
            redisService.setToken(user.getUserId(), token, 24 * 60 * 60);
            
            // 返回Token和用户信息
            Map<String, Object> result = new HashMap<>();
            result.put("success", true);
            result.put("token", token);
            result.put("userId", user.getUserId());
            result.put("role", user.getRole());
            
            // 不返回密码等敏感信息
            user.setPassword(null);
            result.put("user", user);
            
            return ResponseEntity.ok().body(result);
        } catch (RuntimeException e) {
            // 登录失败，返回具体错误信息
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("message", e.getMessage());
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(errorResponse);
        }
    }
    
    /**
     * 检查用户名是否存在
     * 
     * @param username 用户名
     * @return 检查结果
     */
    @GetMapping("/check-username")
    public ResponseEntity<?> checkUsernameExists(@RequestParam String username) {
        User existingUser = userService.getUserByUsername(username);
        Map<String, Object> response = new HashMap<>();
        response.put("exists", existingUser != null);
        return ResponseEntity.ok().body(response);
    }
    
    /**
     * 用户注册
     * 
     * @param user 用户信息
     * @return 注册结果
     */
    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody User user) {
        // 检查用户名是否已存在
        User existingUser = userService.getUserByUsername(user.getUsername());
        if (existingUser != null) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("error_code", "username_exists");
            errorResponse.put("message", "用户名已存在");
            return ResponseEntity.status(HttpStatus.CONFLICT).body(errorResponse);
        }
        
        // 初始化用户信息
        
        // 加密密码
        user.setPassword(MD5Util.encode(user.getPassword()));
        
        // 设置创建时间
        user.setCreateTime(new Date());
        user.setUpdateTime(new Date());
        
        // 保存用户信息
        boolean success = userService.addUser(user);
        
        if (success) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "注册成功");
            response.put("userId", user.getUserId());
            return ResponseEntity.status(HttpStatus.CREATED).body(response);
        } else {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("error_code", "registration_failed");
            errorResponse.put("message", "注册失败，请稍后再试");
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorResponse);
        }
    }
    
    /**
     * 用户退出登录
     * 
     * @param request HTTP请求
     * @return 退出结果
     */
    @PostMapping("/logout")
    public ResponseEntity<?> logout(HttpServletRequest request) {
        // 获取当前登录用户ID
        Integer userId = (Integer) request.getAttribute("userId");
        if (userId != null) {
            // 从Redis中删除Token
            redisService.deleteToken(userId);
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "退出成功");
            return ResponseEntity.ok().body(response);
        }
        
        Map<String, Object> response = new HashMap<>();
        response.put("success", false);
        response.put("message", "未登录状态");
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(response);
    }
    
    /**
     * 获取当前登录用户信息
     * 
     * @param request HTTP请求
     * @return 当前用户信息
     */
    @GetMapping("/current")
    public ResponseEntity<?> getCurrentUser(HttpServletRequest request) {
        // 从请求属性中获取用户ID（由拦截器设置）
        Integer userId = (Integer) request.getAttribute("userId");
        if (userId != null) {
            User user = userService.getUserById(userId);
            if (user != null) {
                // 不返回密码等敏感信息
                user.setPassword(null);
                return ResponseEntity.ok(user);
            }
        }
        
        Map<String, Object> response = new HashMap<>();
        response.put("success", false);
        response.put("message", "未登录或用户不存在");
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(response);
    }
    
    /**
     * 更新用户信息
     * 
     * @param uuid 用户UUID
     * @param user 用户信息
     * @param request HTTP请求
     * @return 更新结果
     */
    @PutMapping("/{userId}")
    public ResponseEntity<?> updateUser(
            @PathVariable Integer userId,
            @RequestBody User user,
            HttpServletRequest request) {
        // 从请求属性中获取用户ID（由拦截器设置）
        Integer currentUserId = (Integer) request.getAttribute("userId");
        if (currentUserId == null) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", "未登录");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(response);
        }
        
        // 查找用户
        User existingUser = userService.getUserById(userId);
        
        if (existingUser == null) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", "用户不存在");
            return ResponseEntity.notFound().build();
        }
        
        // 验证当前用户是否有权限更新此用户信息
        if (!currentUserId.equals(existingUser.getUserId()) && existingUser.getRole() != 1) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", "无权限修改其他用户信息");
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(response);
        }
        
        // 保留原始ID和密码
        user.setUserId(existingUser.getUserId());
        user.setPassword(existingUser.getPassword()); // 不通过此接口修改密码
        user.setUpdateTime(new Date());
        
        boolean result = userService.updateUser(user);
        if (result) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "用户信息更新成功");
            
            // 不返回密码等敏感信息
            user.setPassword(null);
            response.put("user", user);
            
            return ResponseEntity.ok(response);
        } else {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", "用户信息更新失败");
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }
    
    /**
     * 修改密码
     * 
     * @param uuid 用户UUID
     * @param request 修改密码请求
     * @param httpRequest HTTP请求
     * @return 修改结果
     */
    @PutMapping("/{userId}/password")
    public ResponseEntity<?> changePassword(
            @PathVariable Integer userId,
            @RequestBody ChangePasswordRequest request,
            HttpServletRequest httpRequest) {
        // 从请求属性中获取用户ID（由拦截器设置）
        Integer currentUserId = (Integer) httpRequest.getAttribute("userId");
        if (currentUserId == null) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", "未登录");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(response);
        }
        
        // 查找用户
        User user = userService.getUserById(userId);
        
        if (user == null) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", "用户不存在");
            return ResponseEntity.notFound().build();
        }
        
        // 验证当前用户是否有权限修改此用户密码
        if (!currentUserId.equals(user.getUserId())) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", "无权限修改其他用户密码");
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(response);
        }
        
        // 验证旧密码
        String oldPasswordEncrypted = MD5Util.encode(request.getCurrentPassword());
        if (!oldPasswordEncrypted.equals(user.getPassword())) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", "旧密码不正确");
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
        }
        
        // 更新密码
        user.setPassword(MD5Util.encode(request.getNewPassword()));
        user.setUpdateTime(new Date());
        
        boolean result = userService.updateUser(user);
        if (result) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "密码修改成功");
            return ResponseEntity.ok(response);
        } else {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", "密码修改失败");
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }
    
    /**
     * 上传用户头像
     * 
     * @param uuid 用户UUID
     * @param file 头像文件
     * @param request HTTP请求
     * @return 上传结果
     */
    @PostMapping("/{userId}/avatar")
    public ResponseEntity<?> uploadAvatar(
            @PathVariable Integer userId,
            @RequestParam("file") MultipartFile file,
            HttpServletRequest request) {
        // 从请求属性中获取用户ID（由拦截器设置）
        Integer currentUserId = (Integer) request.getAttribute("userId");
        if (currentUserId == null) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", "未登录");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(response);
        }
        
        // 查找用户
        User user = userService.getUserById(userId);
        
        if (user == null) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", "用户不存在");
            return ResponseEntity.notFound().build();
        }
        
        // 验证当前用户是否有权限更新此用户头像
        if (!currentUserId.equals(user.getUserId())) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", "无权限修改其他用户头像");
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(response);
        }
        
        if (file.isEmpty()) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", "上传文件不能为空");
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
        }

        try {
            // 读取文件内容为字节数组
            byte[] avatarData = file.getBytes();
            
            // 更新用户头像信息
            user.setAvatarData(avatarData);
            user.setUpdateTime(new Date());
            boolean result = userService.updateUser(user);
            
            if (result) {
                Map<String, Object> response = new HashMap<>();
                response.put("success", true);
                response.put("message", "头像上传成功");
                return ResponseEntity.ok().body(response);
            } else {
                Map<String, Object> response = new HashMap<>();
                response.put("success", false);
                response.put("message", "头像上传失败");
                return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
            }
        } catch (IOException e) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", "上传失败: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }
    
    /**
     * 获取用户头像
     * 
     * @param uuid 用户UUID
     * @return 头像数据
     */
    @GetMapping("/{userId}/avatar")
    public ResponseEntity<?> getUserAvatar(@PathVariable Integer userId) {
        try {
            // 查找用户
            User user = userService.getUserById(userId);
            
            if (user == null) {
                return ResponseEntity.notFound().build();
            }
            
            byte[] avatarData = user.getAvatarData();
            
            // 如果头像不存在，返回默认头像
            if (avatarData == null || avatarData.length == 0) {
                try {
                    // 读取默认头像
                    avatarData = Files.readAllBytes(Paths.get("src/main/resources/static/images/default-avatar.jpg"));
                } catch (IOException e) {
                    Map<String, Object> response = new HashMap<>();
                    response.put("success", false);
                    response.put("message", "获取默认头像失败");
                    return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
                }
            }
            
            // 设置响应头
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.IMAGE_JPEG);
            
            return new ResponseEntity<>(avatarData, headers, HttpStatus.OK);
        } catch (Exception e) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", "获取头像失败：" + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }
    
    /**
     * 删除用户
     * 
     * @param uuid 用户UUID
     * @param request HTTP请求
     * @return 删除结果
     */
    @DeleteMapping("/{userId}")
    public ResponseEntity<?> deleteUser(
            @PathVariable Integer userId,
            HttpServletRequest request) {
        // 从请求属性中获取用户ID（由拦截器设置）
        Integer currentUserId = (Integer) request.getAttribute("userId");
        User currentUser = userService.getUserById(currentUserId);
        
        if (currentUser == null || currentUser.getRole() != 1) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", "无权限删除用户");
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(response);
        }
        
        // 查找要删除的用户
        User userToDelete = userService.getUserById(userId);
        
        if (userToDelete == null) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", "用户不存在");
            return ResponseEntity.notFound().build();
        }
        
        // 不允许删除自己
        if (userToDelete.getUserId().equals(currentUserId)) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", "不能删除当前登录的用户");
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
        }
        
        boolean result = userService.deleteUser(userToDelete.getUserId());
        if (result) {
            // 如果用户在线，强制下线
            redisService.deleteToken(userToDelete.getUserId());
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "用户删除成功");
            return ResponseEntity.ok(response);
        } else {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", "用户删除失败");
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }
}