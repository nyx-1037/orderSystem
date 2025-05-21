package com.ordersystem.dao;

import com.ordersystem.entity.ChatMessage;
import org.apache.ibatis.annotations.Param;

import java.util.List;

/**
 * 聊天消息Mapper接口
 */
public interface ChatMessageDao {

    /**
     * 插入聊天消息
     *
     * @param chatMessage 聊天消息对象
     * @return 影响的行数
     */
    int insert(ChatMessage chatMessage);

    /**
     * 根据主键查询聊天消息
     *
     * @param messageId 消息ID
     * @return 聊天消息对象
     */
    ChatMessage selectByPrimaryKey(Long messageId);

    /**
     * 查询两个用户之间的聊天记录
     * 按照创建时间降序排序
     *
     * @param userId1 用户ID1
     * @param userId2 用户ID2
     * @return 聊天记录列表
     */
    List<ChatMessage> selectChatHistory(@Param("userId1") Long userId1, @Param("userId2") Long userId2);

    /**
     * 统计用户的未读消息数量
     *
     * @param userId 用户ID
     * @return 未读消息数量
     */
    int countUnreadMessages(Long userId);

    /**
     * 更新消息的读取状态
     *
     * @param messageId  消息ID
     * @param readStatus 读取状态：0-未读，1-已读
     * @return 影响的行数
     */
    int updateReadStatus(@Param("messageId") Long messageId, @Param("readStatus") Integer readStatus);

    /**
     * 更新用户的所有未读消息为已读
     *
     * @param userId     用户ID
     * @param readStatus 读取状态：0-未读，1-已读
     * @return 影响的行数
     */
    int updateAllReadStatus(@Param("userId") Long userId, @Param("readStatus") Integer readStatus);

    /**
     * 查询用户的最近聊天列表
     * 返回与每个用户的最新一条消息
     *
     * @param userId 用户ID
     * @return 最近聊天列表
     */
    List<ChatMessage> selectRecentChats(Long userId);
}