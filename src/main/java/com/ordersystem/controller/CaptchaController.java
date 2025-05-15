package com.ordersystem.controller;

import com.google.code.kaptcha.Producer;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import javax.imageio.ImageIO;
import javax.servlet.ServletOutputStream;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import javax.servlet.http.HttpSession;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.Base64;
import java.util.HashMap;
import java.util.Map;

/**
 * 验证码控制器
 * 提供验证码生成和验证功能
 */
@RestController
@RequestMapping("/api/captcha")
public class CaptchaController {

    @Autowired
    private Producer captchaProducer;

    /**
     * 生成验证码
     *
     * @param request HTTP请求
     * @param response HTTP响应
     * @throws IOException IO异常
     */
    @GetMapping("/image")
    public void getCaptcha(HttpServletRequest request, HttpServletResponse response) throws IOException {
        // 设置响应类型
        response.setContentType("image/jpeg");
        response.setDateHeader("Expires", 0);
        response.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
        response.addHeader("Cache-Control", "post-check=0, pre-check=0");
        response.setHeader("Pragma", "no-cache");

        // 生成验证码文本
        String capText = captchaProducer.createText();
        
        // 将验证码存入session
        HttpSession session = request.getSession();
        session.setAttribute("captchaCode", capText);
        
        // 创建验证码图片
        BufferedImage bi = captchaProducer.createImage(capText);
        
        // 输出图片
        ServletOutputStream out = response.getOutputStream();
        ImageIO.write(bi, "jpg", out);
        out.flush();
        out.close();
    }

    /**
     * 获取Base64编码的验证码图片
     *
     * @param request HTTP请求
     * @return Base64编码的验证码图片
     * @throws IOException IO异常
     */
    @GetMapping("/image/base64")
    public ResponseEntity<?> getCaptchaBase64(HttpServletRequest request) throws IOException {
        // 生成验证码文本
        String capText = captchaProducer.createText();
        
        // 将验证码存入session
        HttpSession session = request.getSession();
        session.setAttribute("captchaCode", capText);
        
        // 创建验证码图片
        BufferedImage bi = captchaProducer.createImage(capText);
        
        // 转换为Base64
        ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
        ImageIO.write(bi, "jpg", outputStream);
        String base64Image = Base64.getEncoder().encodeToString(outputStream.toByteArray());
        
        Map<String, String> response = new HashMap<>();
        response.put("captchaImage", "data:image/jpeg;base64," + base64Image);
        
        return ResponseEntity.ok(response);
    }

    /**
     * 验证验证码
     *
     * @param captchaCode 用户输入的验证码
     * @param request HTTP请求
     * @return 验证结果
     */
    @PostMapping("/verify")
    public ResponseEntity<?> verifyCaptcha(@RequestParam String captchaCode, HttpServletRequest request) {
        HttpSession session = request.getSession();
        String sessionCaptcha = (String) session.getAttribute("captchaCode");
        
        Map<String, Object> response = new HashMap<>();
        
        // 验证码为空或已过期
        if (sessionCaptcha == null) {
            response.put("success", false);
            response.put("message", "验证码已过期，请刷新验证码");
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
        }
        
        // 验证码不区分大小写
        boolean isValid = sessionCaptcha.equalsIgnoreCase(captchaCode);
        
        // 使用后清除session中的验证码，防止重复使用
        session.removeAttribute("captchaCode");
        
        if (isValid) {
            response.put("success", true);
            response.put("message", "验证码正确");
            return ResponseEntity.ok(response);
        } else {
            response.put("success", false);
            response.put("message", "验证码错误");
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
        }
    }
}