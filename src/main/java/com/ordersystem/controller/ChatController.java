package com.ordersystem.controller;

import com.ordersystem.entity.ChatMessage;
import com.ordersystem.entity.User;
import com.ordersystem.service.ChatMessageService;
import com.ordersystem.service.UserService;
import com.ordersystem.websocket.ChatWebSocketServer;
import io.swagger.annotations.Api;
import io.swagger.annotations.ApiImplicitParam;
import io.swagger.annotations.ApiImplicitParams;
import io.swagger.annotations.ApiOperation;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpSession;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 聊天控制器
 * 处理聊天相关的HTTP请求
 */
@Api(tags = "聊天管理", description = "聊天消息的发送、接收和管理接口")
@RestController
@RequestMapping("/api/chat")
public class ChatController {

    @Autowired
    private ChatMessageService chatMessageService;

    @Autowired
    private UserService userService;

    /**
     * 获取聊天历史记录
     *
     * @param targetUserId 目标用户ID
     * @param pageNum      页码
     * @param pageSize     每页记录数
     * @param request      HTTP请求
     * @return 聊天历史记录
     */
    @ApiOperation(value = "获取聊天历史记录", notes = "获取与指定用户的聊天历史记录")
    @ApiImplicitParams({
        @ApiImplicitParam(name = "targetUserId", value = "目标用户ID", required = true, paramType = "query", dataType = "long"),
        @ApiImplicitParam(name = "pageNum", value = "页码", defaultValue = "1", paramType = "query", dataType = "int"),
        @ApiImplicitParam(name = "pageSize", value = "每页记录数", defaultValue = "20", paramType = "query", dataType = "int")
    })
    @GetMapping("/history")
    public ResponseEntity<?> getChatHistory(
            @RequestParam("targetUserId") Long targetUserId,
            @RequestParam(value = "pageNum", defaultValue = "1") int pageNum,
            @RequestParam(value = "pageSize", defaultValue = "20") int pageSize,
            HttpServletRequest request) {
        
        // 从请求属性中获取用户ID（由拦截器设置）
        Integer userId = (Integer) request.getAttribute("userId");
        if (userId == null) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("message", "未登录");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(errorResponse);
        }

        List<ChatMessage> chatHistory = chatMessageService.getChatHistory(
                userId.longValue(), targetUserId, pageNum, pageSize);

        // 将消息标记为已读
        // chatMessageService.markAllMessagesAsRead(currentUser.getUserId().longValue()); // 标记所有消息已读应该在切换聊天对象时进行，而不是获取历史记录时

        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        // getChatHistory方法已经使用了PageHelper，返回的List实际上是Page对象，包含了分页信息
        response.put("data", chatHistory);
        return ResponseEntity.ok(response);
    }

    /**
     * 发送消息
     *
     * @param chatMessage 聊天消息
     * @param request     HTTP请求
     * @return 操作结果
     */
    @ApiOperation(value = "发送消息", notes = "发送聊天消息到指定用户")
    @PostMapping("/send")
    public ResponseEntity<?> sendMessage(@RequestBody ChatMessage chatMessage, HttpServletRequest request) {
        // 从请求属性中获取用户ID（由拦截器设置）
        Integer userId = (Integer) request.getAttribute("userId");
        if (userId == null) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("message", "未登录");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(errorResponse);
        }

        // 设置发送者ID
        chatMessage.setSenderId(userId.longValue());

        // 保存消息到数据库
        boolean success = chatMessageService.addChatMessage(chatMessage);
        if (!success) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("message", "发送失败");
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorResponse);
        }

        // 通过WebSocket发送消息给接收者
        try {
            ChatWebSocketServer.sendMessageToUser(
                    chatMessage.getContent(), chatMessage.getReceiverId());
        } catch (Exception e) {
            // WebSocket发送失败不影响HTTP请求的结果
        }

        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("message", "发送成功");
        return ResponseEntity.ok(response);
    }

    /**
     * 获取最近聊天列表
     *
     * @param request HTTP请求
     * @return 最近聊天列表
     */
    @ApiOperation(value = "获取最近聊天列表", notes = "获取当前用户的最近聊天列表")
    @GetMapping("/recent")
    public ResponseEntity<?> getRecentChats(HttpServletRequest request) {
        // 从请求属性中获取用户ID（由拦截器设置）
        Integer userId = (Integer) request.getAttribute("userId");
        if (userId == null) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("message", "未登录");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(errorResponse);
        }

        List<ChatMessage> recentChats = chatMessageService.getRecentChatList(userId.longValue());
        
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("data", recentChats);
        return ResponseEntity.ok(response);
    }

    /**
     * 获取未读消息数量
     *
     * @param request HTTP请求
     * @return 未读消息数量
     */
    @ApiOperation(value = "获取未读消息数量", notes = "获取当前用户的未读消息数量")
    @GetMapping("/unread/count")
    public ResponseEntity<?> getUnreadMessageCount(HttpServletRequest request) {
        // 从请求属性中获取用户ID（由拦截器设置）
        Integer userId = (Integer) request.getAttribute("userId");
        if (userId == null) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("message", "未登录");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(errorResponse);
        }

        int count = chatMessageService.getUnreadMessageCount(userId.longValue());
        
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("count", count);
        return ResponseEntity.ok(response);
    }

    /**
     * 标记消息为已读
     *
     * @param messageId 消息ID
     * @param request   HTTP请求
     * @return 操作结果
     */
    @ApiOperation(value = "标记消息为已读", notes = "将指定消息标记为已读状态")
    @ApiImplicitParam(name = "messageId", value = "消息ID", required = true, paramType = "path", dataType = "long")
    @PostMapping("/read/{messageId}")
    public ResponseEntity<?> markMessageAsRead(@PathVariable("messageId") Long messageId, HttpServletRequest request) {
        // 从请求属性中获取用户ID（由拦截器设置）
        Integer userId = (Integer) request.getAttribute("userId");
        if (userId == null) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("message", "未登录");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(errorResponse);
        }

        boolean success = chatMessageService.markMessageAsRead(messageId);
        
        Map<String, Object> response = new HashMap<>();
        if (success) {
            response.put("success", true);
            response.put("message", "标记成功");
            return ResponseEntity.ok(response);
        } else {
            response.put("success", false);
            response.put("message", "标记失败");
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    /**
     * 标记所有消息为已读
     *
     * @param request HTTP请求
     * @return 操作结果
     */
    @ApiOperation(value = "标记所有消息为已读", notes = "将当前用户的所有未读消息标记为已读状态")
    @PostMapping("/read/all")
    public ResponseEntity<?> markAllMessagesAsRead(HttpServletRequest request) {
        // 从请求属性中获取用户ID（由拦截器设置）
        Integer userId = (Integer) request.getAttribute("userId");
        if (userId == null) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("message", "未登录");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(errorResponse);
        }

        boolean success = chatMessageService.markAllMessagesAsRead(userId.longValue());
        
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        if (success) {
            response.put("message", "标记成功");
        } else {
            response.put("message", "没有未读消息");
        }
        return ResponseEntity.ok(response);
    }

    /**
     * 获取客服列表（管理员用户）
     *
     * @return 客服列表
     */
    @ApiOperation(value = "获取客服列表", notes = "获取系统中所有管理员用户作为客服列表")
    @GetMapping("/customer-service")
    public ResponseEntity<?> getCustomerServiceList() {
        List<User> adminUsers = userService.getAdminUsers();
        
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("data", adminUsers);
        return ResponseEntity.ok(response);
    }
}