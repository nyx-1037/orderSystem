package com.ordersystem.controller;

import com.ordersystem.entity.ChatMessage;
import com.ordersystem.entity.User;
import com.ordersystem.service.ChatMessageService;
import com.ordersystem.service.UserService;
import com.ordersystem.websocket.ChatWebSocketServer;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import javax.servlet.http.HttpSession;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 聊天控制器
 * 处理聊天相关的HTTP请求
 */
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
     * @param session      HTTP会话
     * @return 聊天历史记录
     */
    @GetMapping("/history")
    public ResponseEntity<?> getChatHistory(
            @RequestParam("targetUserId") Long targetUserId,
            @RequestParam(value = "pageNum", defaultValue = "1") int pageNum,
            @RequestParam(value = "pageSize", defaultValue = "20") int pageSize,
            HttpSession session) {
        
        User currentUser = (User) session.getAttribute("user");
        if (currentUser == null) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("message", "未登录");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(errorResponse);
        }

        List<ChatMessage> chatHistory = chatMessageService.getChatHistory(
                currentUser.getUserId().longValue(), targetUserId, pageNum, pageSize);

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
     * @param session     HTTP会话
     * @return 操作结果
     */
    @PostMapping("/send")
    public ResponseEntity<?> sendMessage(@RequestBody ChatMessage chatMessage, HttpSession session) {
        User currentUser = (User) session.getAttribute("user");
        if (currentUser == null) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("message", "未登录");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(errorResponse);
        }

        // 设置发送者ID
        chatMessage.setSenderId(currentUser.getUserId().longValue());

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
     * @param session HTTP会话
     * @return 最近聊天列表
     */
    @GetMapping("/recent")
    public ResponseEntity<?> getRecentChats(HttpSession session) {
        User currentUser = (User) session.getAttribute("user");
        if (currentUser == null) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("message", "未登录");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(errorResponse);
        }

        List<ChatMessage> recentChats = chatMessageService.getRecentChatList(currentUser.getUserId().longValue());
        
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("data", recentChats);
        return ResponseEntity.ok(response);
    }

    /**
     * 获取未读消息数量
     *
     * @param session HTTP会话
     * @return 未读消息数量
     */
    @GetMapping("/unread/count")
    public ResponseEntity<?> getUnreadMessageCount(HttpSession session) {
        User currentUser = (User) session.getAttribute("user");
        if (currentUser == null) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("message", "未登录");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(errorResponse);
        }

        int count = chatMessageService.getUnreadMessageCount(currentUser.getUserId().longValue());
        
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("count", count);
        return ResponseEntity.ok(response);
    }

    /**
     * 标记消息为已读
     *
     * @param messageId 消息ID
     * @param session   HTTP会话
     * @return 操作结果
     */
    @PostMapping("/read/{messageId}")
    public ResponseEntity<?> markMessageAsRead(@PathVariable("messageId") Long messageId, HttpSession session) {
        User currentUser = (User) session.getAttribute("user");
        if (currentUser == null) {
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
     * @param session HTTP会话
     * @return 操作结果
     */
    @PostMapping("/read/all")
    public ResponseEntity<?> markAllMessagesAsRead(HttpSession session) {
        User currentUser = (User) session.getAttribute("user");
        if (currentUser == null) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("message", "未登录");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(errorResponse);
        }

        boolean success = chatMessageService.markAllMessagesAsRead(currentUser.getUserId().longValue());
        
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
    @GetMapping("/customer-service")
    public ResponseEntity<?> getCustomerServiceList() {
        List<User> adminUsers = userService.getAdminUsers();
        
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("data", adminUsers);
        return ResponseEntity.ok(response);
    }
}