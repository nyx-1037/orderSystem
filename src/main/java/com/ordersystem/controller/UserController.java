package com.ordersystem.controller;

import com.ordersystem.dto.ChangePasswordRequest;
import com.ordersystem.entity.User;
import com.ordersystem.service.RedisService;
import com.ordersystem.service.UserService;
import com.ordersystem.util.JwtTokenUtil;
import com.ordersystem.util.MD5Util;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.PathVariable;

import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpSession;
import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.*;

/**
 * 用户控制器
 */
@RestController
@RequestMapping("/api/user")
public class UserController {

    @Autowired
    private UserService userService;
    
    @Autowired
    private JwtTokenUtil jwtTokenUtil;
    
    @Autowired
    private RedisService redisService;
    
    /**
     * 登录页面
     */
    @GetMapping("/login")
    public String loginPage() {
        return "user/login";
    }
    
    /**
     * 处理登录请求
     */
    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody User loginUser,
                        HttpSession session) {
        // 调用service层的login方法进行用户验证
        String username = loginUser.getUsername();
        String password = loginUser.getPassword();

        try {
            User user = userService.login(username, password);
            
            // 登录成功，生成Token
            String token = jwtTokenUtil.generateToken(user);
            
            // 将Token存入Redis，有效期24小时
            redisService.setToken(user.getUserId(), token, 24 * 60 * 60);
            
            // 返回Token和用户信息
            Map<String, Object> result = new HashMap<>();
            result.put("token", token);
            result.put("user", user);
            
            return ResponseEntity.ok().body(result);
        } catch (RuntimeException e) {
            // 登录失败，返回具体错误信息
            Map<String, String> errorResponse = new HashMap<>();
            errorResponse.put("message", e.getMessage());
            return ResponseEntity.badRequest().body(errorResponse);
        }
    }
    
    /**
     * 注册页面
     */
    @GetMapping("/register")
    public String registerPage() {
        return "user/register";
    }
    
    /**
     * 处理注册请求
     */
    @GetMapping("/checkUsername")
    public ResponseEntity<?> checkUsernameExists(@RequestParam String username) {
        User existingUser = userService.getUserByUsername(username);
        return ResponseEntity.ok().body(Collections.singletonMap("exists", existingUser != null));
    }
    
    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody User user) {
        // 检查用户名是否已存在
        User existingUser = userService.getUserByUsername(user.getUsername());
        if (existingUser != null) {
            Map<String, String> errorResponse = new HashMap<>();
            errorResponse.put("error_code", "username_exists");
            errorResponse.put("message", "用户名已存在");
            return ResponseEntity.badRequest().body(errorResponse);
        }
        
        // 加密密码
        user.setPassword(MD5Util.encode(user.getPassword()));
        
        // 设置创建时间
        user.setCreateTime(new Date());
        user.setUpdateTime(new Date());
        
        // 保存用户信息
        boolean success = userService.addUser(user);
        
        if (success) {
            return ResponseEntity.ok().body("注册成功");
        } else {
            Map<String, String> errorResponse = new HashMap<>();
            errorResponse.put("error_code", "registration_failed");
            errorResponse.put("message", "注册失败，请稍后再试");
            return ResponseEntity.badRequest().body(errorResponse);
        }
    }
    
    /**
     * 退出登录
     */
    @PostMapping("/logout")
    public ResponseEntity<?> logout(HttpServletRequest request) {
        // 获取当前登录用户ID
        Integer userId = (Integer) request.getAttribute("userId");
        if (userId != null) {
            // 从Redis中删除Token
            redisService.deleteToken(userId);
        }
        return ResponseEntity.ok().body("退出成功");
    }
    
    /**
     * 获取当前登录用户
     */
    @GetMapping("/current")
    public ResponseEntity<?> getCurrentUser(HttpServletRequest request) {
        // 从请求属性中获取用户ID（由拦截器设置）
        Integer userId = (Integer) request.getAttribute("userId");
        if (userId != null) {
            User user = userService.getUserById(userId);
            return ResponseEntity.ok(user);
        } else {
            return ResponseEntity.status(401).body("未登录");
        }
    }
    
    /**
     * 上传用户头像
     */
    @PostMapping("/avatar/upload")
    public ResponseEntity<?> uploadAvatar(@RequestParam("avatar") MultipartFile file, HttpServletRequest request) { // Changed @RequestParam name to 'avatar'
        // 从请求属性中获取用户ID（由拦截器设置）
        Integer userId = (Integer) request.getAttribute("userId");
        if (userId == null) {
            return ResponseEntity.status(401).body("未登录");
        }
        
        if (file.isEmpty()) {
            return ResponseEntity.badRequest().body("上传文件不能为空");
        }

        try {
            // 读取文件内容为字节数组
            byte[] avatarData = file.getBytes();
            
            // 更新用户头像信息
            User user = userService.getUserById(userId);
            if (user == null) {
                 return ResponseEntity.status(404).body("用户不存在");
            }
            user.setAvatarData(avatarData); // Assuming User entity has setAvatarData(byte[] data)
            user.setUpdateTime(new Date());
            userService.updateUser(user);
            
            return ResponseEntity.ok().body("头像上传成功");
        } catch (IOException e) {
            System.err.println("上传头像失败: " + e.getMessage());
            return ResponseEntity.badRequest().body("上传失败: " + e.getMessage());
        }
    }
    
    /**
     * 获取用户头像数据
     */
    @GetMapping("/avatar/{userId}")
    public ResponseEntity<?> getUserAvatarData(@PathVariable Integer userId) {
        User user = userService.getUserById(userId);
        if (user != null && user.getAvatarData() != null) {
            // 确保返回的头像数据有效
            byte[] avatarData = user.getAvatarData(); 
            return ResponseEntity.ok()
                    .contentType(MediaType.IMAGE_JPEG) // 或根据实际内容类型调整
                    .body(avatarData);
        } else {
            // 如果头像数据为空，返回默认头像路径
            return ResponseEntity.ok()
                    .header("Location", "/images/default-avatar.png")
                    .build();
        }
    }

    /**
     * 获取用户头像 (This endpoint might be deprecated or removed if avatar URL is no longer stored/used)
     */
    @GetMapping("/avatar")
    public ResponseEntity<?> getUserAvatar(HttpServletRequest request) {
        // 从请求属性中获取用户ID（由拦截器设置）
        Integer userId = (Integer) request.getAttribute("userId");
        if (userId == null) {
            return ResponseEntity.status(401).body("未登录");
        }
        
        User user = userService.getUserById(userId);
        if (user != null && user.getAvatarData() != null) {
            return ResponseEntity.ok().header("Location", "/api/user/avatar/" + userId).build();
        } else {
            return ResponseEntity.notFound().build();
        }
    }
    
    /**
     * 忘记密码 - 发送验证码
     */
    @PostMapping("/forgot-password/send-code")
    public ResponseEntity<?> sendVerificationCode(@RequestParam("username") String username) {
        // 检查用户是否存在
        User user = userService.getUserByUsername(username);
        if (user == null) {
            return ResponseEntity.badRequest().body("用户不存在");
        }
        
        // 生成6位随机验证码
        String verificationCode = String.format("%06d", (int)(Math.random() * 1000000));
        
        // 将验证码存入Redis，有效期10分钟
        redisService.setVerificationCode(username, verificationCode, 10 * 60);
        
        // 在实际应用中，这里应该发送验证码到用户邮箱或手机
        // 为了演示，直接返回验证码
        Map<String, String> result = new HashMap<>();
        result.put("message", "验证码已发送");
        result.put("code", verificationCode); // 实际应用中不应返回验证码
        
        return ResponseEntity.ok().body(result);
    }
    
    /**
     * 忘记密码 - 重置密码
     */
    @PostMapping("/forgot-password/reset")
    public ResponseEntity<?> resetPassword(@RequestParam("username") String username,
                                          @RequestParam("code") String code,
                                          @RequestParam("newPassword") String newPassword) {
        // 检查用户是否存在
        User user = userService.getUserByUsername(username);
        if (user == null) {
            return ResponseEntity.badRequest().body("用户不存在");
        }
        
        // 验证验证码
        String storedCode = redisService.getVerificationCode(username);
        if (storedCode == null || !storedCode.equals(code)) {
            return ResponseEntity.badRequest().body("验证码错误或已过期");
        }
        
        // 更新密码
        user.setPassword(MD5Util.encode(newPassword));
        user.setUpdateTime(new Date());
        boolean success = userService.updateUser(user);
        
        // 删除验证码
        redisService.deleteVerificationCode(username);
        
        if (success) {
            return ResponseEntity.ok().body("密码重置成功");
        } else {
            return ResponseEntity.badRequest().body("密码重置失败");
        }
    }
    
    /**
     * 修改密码
     */
    @PutMapping("/change-password")
    public ResponseEntity<?> changePassword(@RequestBody ChangePasswordRequest changePasswordRequest,
                                          HttpServletRequest request) {
        // 从请求属性中获取用户ID（由拦截器设置）
        Integer userId = (Integer) request.getAttribute("userId");
        if (userId == null) {
            return ResponseEntity.status(401).body("未登录");
        }
        
        // 获取用户信息
        User user = userService.getUserById(userId);
        
        // 验证旧密码
        String encryptedOldPwd = MD5Util.encode(changePasswordRequest.getCurrentPassword());
        if (!user.getPassword().equals(encryptedOldPwd)) {
            return ResponseEntity.badRequest().body("原密码错误");
        }
        
        // 更新密码
        user.setPassword(MD5Util.encode(changePasswordRequest.getNewPassword()));
        user.setUpdateTime(new Date());
        boolean success = userService.updateUser(user);
        
        if (success) {
            return ResponseEntity.ok().body("密码修改成功");
        } else {
            return ResponseEntity.badRequest().body("密码修改失败");
        }
    }

    /**
     * 更新用户个人信息
     */
    @PutMapping("/profile/update")
    public ResponseEntity<?> updateProfile(@RequestBody Map<String, Object> profileData,
                                       HttpServletRequest request) {
        // 从请求属性中获取用户ID（由拦截器设置）
        Integer userId = (Integer) request.getAttribute("userId");
        if (userId == null) {
            return ResponseEntity.status(401).body("未登录");
        }

        // 获取用户信息
        User user = userService.getUserById(userId);
        if (user == null) {
            return ResponseEntity.status(404).body("用户不存在");
        }

        // 更新用户信息
        if (profileData.containsKey("realName")) {
            user.setRealName((String) profileData.get("realName"));
        }
        if (profileData.containsKey("email")) {
            user.setEmail((String) profileData.get("email"));
        }
        if (profileData.containsKey("phone")) {
            user.setPhone((String) profileData.get("phone"));
        }
        if (profileData.containsKey("address")) {
            user.setAddress((String) profileData.get("address"));
        }

        user.setUpdateTime(new Date());
        boolean success = userService.updateUser(user);

        if (success) {
            return ResponseEntity.ok().body("个人信息更新成功");
        } else {
            return ResponseEntity.badRequest().body("更新失败");
        }
    }
}