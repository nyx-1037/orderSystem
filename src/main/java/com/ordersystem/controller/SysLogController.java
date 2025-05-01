package com.ordersystem.controller;

import com.github.pagehelper.PageInfo;
import com.ordersystem.entity.SysLog;
import com.ordersystem.service.SysLogService;
import com.ordersystem.aspect.LogAspect;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import javax.servlet.http.HttpServletRequest;
import java.util.List;
import java.util.HashMap;

/**
 * 系统日志控制器
 * 提供系统日志相关的RESTful API
 */
@RestController
@RequestMapping("/api/system-logs")
public class SysLogController {

    private static final Logger log = LoggerFactory.getLogger(SysLogController.class);

    @Autowired
    private SysLogService sysLogService;
    
    @Autowired
    private LogAspect logAspect;

    /**
     * 获取日志列表（支持分页和多条件筛选）
     * 
     * @param pageNum 页码，默认为1
     * @param pageSize 每页数量，默认为10
     * @param username 用户名（可选）
     * @param operation 操作类型（可选）
     * @param statusCode 状态码（可选）
     * @param ip IP地址（可选）
     * @param startTime 开始时间（可选）
     * @param endTime 结束时间（可选）
     * @return 分页日志数据
     */
    @GetMapping
    public ResponseEntity<?> getSystemLogs(
            @RequestParam(value = "pageNum", defaultValue = "1") Integer pageNum,
            @RequestParam(value = "pageSize", defaultValue = "10") Integer pageSize,
            @RequestParam(value = "username", required = false) String username,
            @RequestParam(value = "operation", required = false) String operation,
            @RequestParam(value = "statusCode", required = false) Integer statusCode,
            @RequestParam(value = "ip", required = false) String ip,
            @RequestParam(value = "startTime", required = false) String startTime,
            @RequestParam(value = "endTime", required = false) String endTime) {
        
        log.info("查询日志列表，条件：username={}, operation={}, statusCode={}, ip={}, startTime={}, endTime={}", 
                username, operation, statusCode, ip, startTime, endTime);
        
        // 创建筛选条件对象
        SysLog filter = new SysLog();
        filter.setUsername(username);
        filter.setOperation(operation);
        filter.setStatusCode(statusCode);
        filter.setIp(ip);
        
        PageInfo<SysLog> pageInfo = sysLogService.getLogsWithFilter(filter, startTime, endTime, pageNum, pageSize);
        return ResponseEntity.ok(pageInfo);
    }

    /**
     * 根据用户ID获取日志
     * 
     * @param userId 用户ID
     * @param pageNum 页码，默认为1
     * @param pageSize 每页数量，默认为10
     * @return 分页日志数据
     */
    @GetMapping("/by-user-id/{userId}")
    public ResponseEntity<?> getLogsByUserId(
            @PathVariable("userId") Integer userId,
            @RequestParam(value = "pageNum", defaultValue = "1") Integer pageNum,
            @RequestParam(value = "pageSize", defaultValue = "10") Integer pageSize) {
        PageInfo<SysLog> pageInfo = sysLogService.getLogsByUserIdWithPage(userId, pageNum, pageSize);
        return ResponseEntity.ok(pageInfo);
    }
    
    /**
     * 根据日志ID获取日志详情
     * 
     * @param logId 日志ID
     * @return 日志详情
     */
    @GetMapping("/by-id/{logId}")
    public ResponseEntity<?> getLogById(@PathVariable("logId") Integer logId) {
        log.info("查询日志详情，ID: {}", logId);
        SysLog sysLog = sysLogService.getLogById(logId);
        if (sysLog != null) {
            return ResponseEntity.ok(sysLog);
        }
        return ResponseEntity.notFound().build();
    }

    /**
     * 根据用户名获取日志
     * 
     * @param username 用户名
     * @param pageNum 页码，默认为1
     * @param pageSize 每页数量，默认为10
     * @return 分页日志数据
     */
    @GetMapping("/by-username/{username}")
    public ResponseEntity<?> getLogsByUsername(
            @PathVariable("username") String username,
            @RequestParam(value = "pageNum", defaultValue = "1") Integer pageNum,
            @RequestParam(value = "pageSize", defaultValue = "10") Integer pageSize) {
        PageInfo<SysLog> pageInfo = sysLogService.getLogsByUsernameWithPage(username, pageNum, pageSize);
        return ResponseEntity.ok(pageInfo);
    }

    /**
     * 根据操作类型获取日志
     * 
     * @param operation 操作类型
     * @param pageNum 页码，默认为1
     * @param pageSize 每页数量，默认为10
     * @return 分页日志数据
     */
    @GetMapping("/by-operation/{operation}")
    public ResponseEntity<?> getLogsByOperation(
            @PathVariable("operation") String operation,
            @RequestParam(value = "pageNum", defaultValue = "1") Integer pageNum,
            @RequestParam(value = "pageSize", defaultValue = "10") Integer pageSize) {
        PageInfo<SysLog> pageInfo = sysLogService.getLogsByOperationWithPage(operation, pageNum, pageSize);
        return ResponseEntity.ok(pageInfo);
    }

    /**
     * 删除日志
     */
    @DeleteMapping("/{logId}")
    public ResponseEntity<?> deleteLog(@PathVariable("logId") Integer logId) {
        boolean success = sysLogService.deleteLog(logId);
        return success ? ResponseEntity.ok().body("日志删除成功") : ResponseEntity.badRequest().body("日志删除失败");
    }

    /**
     * 强制用户登出
     * 
     * @param userId 用户ID
     * @param request HTTP请求
     * @return 操作结果
     */
    @PostMapping("/users/{userId}/force-logout")
    public ResponseEntity<?> forceLogout(@PathVariable("userId") Integer userId, HttpServletRequest request) {
        // 记录操作者信息
        Integer operatorId = (Integer) request.getAttribute("userId");
        String operatorName = (String) request.getAttribute("username");
        
        log.info("用户 {} (ID: {}) 正在强制登出用户 ID: {}", operatorName, operatorId, userId);
        
        boolean success = sysLogService.forceLogout(userId);
        return success ? 
                ResponseEntity.ok().body("用户已被强制登出") : 
                ResponseEntity.badRequest().body("强制登出失败");
    }
    
    /**
     * 批量删除日志
     * 
     * @param logIds 日志ID列表
     * @return 操作结果
     */
    @DeleteMapping("/batch")
    public ResponseEntity<?> batchDelete(@RequestBody List<Integer> logIds) {
        log.info("批量删除日志，ID列表: {}", logIds);
        
        if (logIds == null || logIds.isEmpty()) {
            return ResponseEntity.badRequest().body("未选择要删除的日志");
        }
        
        int count = 0;
        for (Integer logId : logIds) {
            if (sysLogService.deleteLog(logId)) {
                count++;
            }
        }
        
        return ResponseEntity.ok().body(String.format("成功删除 %d 条日志记录", count));
    }
    
    /**
     * 手动同步Redis中的日志到MySQL数据库
     * 
     * @return 同步结果
     */
    @PostMapping("/synchronize")
    public ResponseEntity<?> syncLogs() {
        log.info("手动触发日志同步操作");
        
        try {
            // 调用LogAspect中的同步方法
            int processedCount = logAspect.syncLogsToDatabase();
            
            HashMap<String, Object> result = new HashMap<>();
            result.put("success", true);
            result.put("message", String.format("成功同步 %d 条日志记录", processedCount));
            result.put("count", processedCount);
            
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            log.error("手动同步日志失败: {}", e.getMessage());
            return ResponseEntity.badRequest().body("同步日志失败: " + e.getMessage());
        }
    }
}