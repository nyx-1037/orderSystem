package com.ordersystem.websocket;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.ordersystem.entity.ChatMessage;
import com.ordersystem.entity.User;
import com.ordersystem.service.ChatMessageService;
import com.ordersystem.service.UserService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import javax.servlet.http.HttpSession;
import javax.websocket.*;
import javax.websocket.server.PathParam;
import javax.websocket.server.ServerEndpoint;
import java.io.IOException;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * WebSocket服务器端点
 * 处理WebSocket连接和消息传输
 */
@ServerEndpoint(value = "/websocket/chat/{userId}", configurator = HttpSessionConfigurator.class)
@Component
public class ChatWebSocketServer {

    private static final Logger logger = LoggerFactory.getLogger(ChatWebSocketServer.class);

    // 使用ConcurrentHashMap存储WebSocket会话，key为用户ID
    private static final Map<Long, ChatWebSocketServer> webSocketMap = new ConcurrentHashMap<>();

    // 与某个客户端的连接会话，需要通过它来给客户端发送数据
    private Session session;

    // 当前连接用户ID
    private Long userId;

    // 当前用户信息
    private User user;

    // 注入服务（由于WebSocket是多例的，需要使用静态注入）
    private static ChatMessageService chatMessageService;
    private static UserService userService;
    private static ObjectMapper objectMapper;

    @Autowired
    public void setChatMessageService(ChatMessageService chatMessageService) {
        ChatWebSocketServer.chatMessageService = chatMessageService;
    }

    @Autowired
    public void setUserService(UserService userService) {
        ChatWebSocketServer.userService = userService;
    }

    @Autowired
    public void setObjectMapper(ObjectMapper objectMapper) {
        ChatWebSocketServer.objectMapper = objectMapper;
    }

    /**
     * 连接建立成功调用的方法
     */
    @OnOpen
    public void onOpen(Session session, EndpointConfig config, @PathParam("userId") Long userId) {
        this.session = session;
        this.userId = userId;

        // 首先尝试从配置中获取用户信息（可能是通过JWT验证的）
        User configUser = (User) config.getUserProperties().get("user");
        if (configUser != null && configUser.getUserId().equals(userId)) {
            this.user = configUser;
        } else {
            // 如果没有通过JWT验证，尝试从HttpSession获取
            HttpSession httpSession = (HttpSession) config.getUserProperties().get(HttpSession.class.getName());
            if (httpSession != null) {
                User sessionUser = (User) httpSession.getAttribute("user");
                if (sessionUser != null && sessionUser.getUserId().equals(userId)) {
                    this.user = sessionUser;
                } else {
                    // 用户身份验证失败，关闭连接
                    try {
                        session.close(new CloseReason(CloseReason.CloseCodes.VIOLATED_POLICY, "身份验证失败"));
                    } catch (IOException e) {
                        logger.error("关闭WebSocket连接失败", e);
                    }
                    return;
                }
            } else {
                // 获取不到用户信息，关闭连接
                try {
                    session.close(new CloseReason(CloseReason.CloseCodes.VIOLATED_POLICY, "未登录"));
                } catch (IOException e) {
                    logger.error("关闭WebSocket连接失败", e);
                }
                return;
            }
        }

        // 加入连接池
        webSocketMap.put(userId, this);
        logger.info("用户{}连接成功，当前在线人数为{}", userId, getOnlineCount());

        try {
            // 发送连接成功消息
            sendMessage("连接成功");
        } catch (IOException e) {
            logger.error("发送消息失败", e);
        }
    }

    /**
     * 连接关闭调用的方法
     */
    @OnClose
    public void onClose() {
        if (userId != null) {
            // 从连接池中移除
            if (webSocketMap.remove(userId) != null) {
                 logger.info("用户{}断开连接，当前在线人数为{}", userId, getOnlineCount());
            } else {
                // This case might happen if onOpen failed before adding to map, but userId was set.
                logger.warn("用户{}尝试断开连接（可能未在连接池中或已移除），当前在线人数为{}", userId, getOnlineCount());
            }
        }
    }

    /**
     * 收到客户端消息后调用的方法
     *
     * @param message 客户端发送过来的消息
     */
    @OnMessage
    public void onMessage(String message, Session session) {
        logger.info("收到来自用户{}的消息:{}", userId, message);
        try {
            // 解析消息
            ChatMessage chatMessage = objectMapper.readValue(message, ChatMessage.class);
            
            // 设置发送者ID
            chatMessage.setSenderId(userId);
            
            // 保存消息到数据库
            chatMessageService.addChatMessage(chatMessage);
            
            // 发送消息给接收者
            Long receiverId = chatMessage.getReceiverId();
            if (receiverId != null && webSocketMap.containsKey(receiverId)) {
                webSocketMap.get(receiverId).sendMessage(objectMapper.writeValueAsString(chatMessage));
            }
            
        } catch (Exception e) {
            logger.error("处理消息失败", e);
        }
    }

    /**
     * 发生错误时调用
     */
    @OnError
    public void onError(Session session, Throwable error) {
        logger.error("用户{}发生错误:{}", userId, error.getMessage());
        error.printStackTrace();
    }

    /**
     * 发送消息
     *
     * @param message 消息内容
     * @throws IOException IO异常
     */
    public void sendMessage(String message) throws IOException {
        this.session.getBasicRemote().sendText(message);
    }

    /**
     * 发送消息给指定用户
     *
     * @param message  消息内容
     * @param toUserId 接收消息用户ID
     */
    public static void sendMessageToUser(String message, Long toUserId) {
        if (webSocketMap.containsKey(toUserId)) {
            try {
                webSocketMap.get(toUserId).sendMessage(message);
            } catch (IOException e) {
                logger.error("发送消息给用户{}失败", toUserId, e);
            }
        } else {
            logger.warn("用户{}不在线", toUserId);
        }
    }

    /**
     * 广播消息给所有用户
     *
     * @param message 消息内容
     */
    public static void broadcastMessage(String message) {
        for (ChatWebSocketServer item : webSocketMap.values()) {
            try {
                item.sendMessage(message);
            } catch (IOException e) {
                logger.error("广播消息失败", e);
            }
        }
    }

    /**
     * 获取当前在线连接数
     *
     * @return 在线连接数
     */
    public static synchronized int getOnlineCount() {
        return webSocketMap.size();
    }
}