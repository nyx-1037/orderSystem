package com.ordersystem.service.impl;

import com.github.pagehelper.PageHelper;
import com.ordersystem.entity.ChatMessage;
import com.ordersystem.entity.User;
import com.ordersystem.dao.ChatMessageDao;
import com.ordersystem.dao.UserDao;
import com.ordersystem.service.ChatMessageService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.Base64;

import java.util.Date;
import java.util.List;

/**
 * 聊天消息服务实现类
 */
@Service
public class ChatMessageServiceImpl implements ChatMessageService {

    @Autowired
    private ChatMessageDao chatMessageDao;

    @Autowired
    private UserDao userDao;

    @Override
    public boolean addChatMessage(ChatMessage chatMessage) {
        if (chatMessage.getCreateTime() == null) {
            chatMessage.setCreateTime(new Date());
        }
        if (chatMessage.getReadStatus() == null) {
            chatMessage.setReadStatus(0); // 默认未读
        }
        return chatMessageDao.insert(chatMessage) > 0;
    }

    @Override
    public List<ChatMessage> getChatHistory(Long userId1, Long userId2, int pageNum, int pageSize) {
        // 使用PageHelper进行分页查询
        PageHelper.startPage(pageNum, pageSize);
        List<ChatMessage> chatMessages = chatMessageDao.selectChatHistory(userId1, userId2);
        
        // 填充发送者和接收者信息
        for (ChatMessage message : chatMessages) {
            User sender = userDao.getUserById(message.getSenderId().intValue());
            User receiver = userDao.getUserById(message.getReceiverId().intValue());
            
            if (sender != null) {
                message.setSenderName(sender.getUsername());
                // 直接设置头像二进制数据
                if (sender.getAvatarData() != null) {
                    message.setSenderAvatar(sender.getAvatarData());
                }
            }
            
            if (receiver != null) {
                message.setReceiverName(receiver.getUsername());
            }
        }
        
        return chatMessages;
    }

    @Override
    public int getUnreadMessageCount(Long userId) {
        return chatMessageDao.countUnreadMessages(userId);
    }

    @Override
    public boolean markMessageAsRead(Long messageId) {
        return chatMessageDao.updateReadStatus(messageId, 1) > 0;
    }

    @Override
    public boolean markAllMessagesAsRead(Long userId) {
        return chatMessageDao.updateAllReadStatus(userId, 1) > 0;
    }

    @Override
    public List<ChatMessage> getRecentChatList(Long userId) {
        List<ChatMessage> recentChats = chatMessageDao.selectRecentChats(userId);
        
        // 填充用户信息
        for (ChatMessage chat : recentChats) {
            Long otherUserId;
            if (chat.getSenderId().equals(userId)) {
                otherUserId = chat.getReceiverId();
            } else {
                otherUserId = chat.getSenderId();
            }
            
            User otherUser = userDao.getUserById(otherUserId.intValue());
            if (otherUser != null) {
                if (chat.getSenderId().equals(userId)) {
                    chat.setReceiverName(otherUser.getUsername());
                } else {
                    chat.setSenderName(otherUser.getUsername());
                    // 直接设置头像二进制数据
                    if (otherUser.getAvatarData() != null) {
                        chat.setSenderAvatar(otherUser.getAvatarData());
                    }
                }
            }
        }
        
        return recentChats;
    }
}