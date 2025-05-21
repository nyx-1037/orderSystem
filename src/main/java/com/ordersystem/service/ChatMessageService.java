package com.ordersystem.service;

import com.ordersystem.entity.ChatMessage;

import java.util.List;

/**
 * 聊天消息服务接口
 */
public interface ChatMessageService {

    /**
     * 添加聊天消息
     *
     * @param chatMessage 聊天消息对象
     * @return 添加成功返回true，否则返回false
     */
    boolean addChatMessage(ChatMessage chatMessage);

    /**
     * 获取两个用户之间的聊天记录
     *
     * @param userId1 用户ID1
     * @param userId2 用户ID2
     * @param pageNum 页码
     * @param pageSize 每页记录数
     * @return 聊天记录列表
     */
    List<ChatMessage> getChatHistory(Long userId1, Long userId2, int pageNum, int pageSize);

    /**
     * 获取用户的未读消息数量
     *
     * @param userId 用户ID
     * @return 未读消息数量
     */
    int getUnreadMessageCount(Long userId);

    /**
     * 将消息标记为已读
     *
     * @param messageId 消息ID
     * @return 更新成功返回true，否则返回false
     */
    boolean markMessageAsRead(Long messageId);

    /**
     * 将用户的所有未读消息标记为已读
     *
     * @param userId 用户ID
     * @return 更新成功返回true，否则返回false
     */
    boolean markAllMessagesAsRead(Long userId);

    /**
     * 获取用户的最近聊天列表
     * 
     * @param userId 用户ID
     * @return 最近聊天的用户列表
     */
    List<ChatMessage> getRecentChatList(Long userId);
}