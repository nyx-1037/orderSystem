package com.ordersystem.entity;

import java.util.Date;

/**
 * 聊天消息实体类
 */
public class ChatMessage {

    private Long messageId;      // 消息ID
    private Long senderId;       // 发送者ID
    private Long receiverId;     // 接收者ID
    private String content;      // 消息内容
    private Integer messageType; // 消息类型：0-普通消息，1-系统消息，2-全站广播
    private Integer readStatus;  // 读取状态：0-未读，1-已读
    private Date createTime;     // 创建时间
    
    // 非数据库字段
    private String senderName;   // 发送者名称
    private String receiverName; // 接收者名称
    private String senderAvatar; // 发送者头像
    
    public ChatMessage() {
    }
    
    public ChatMessage(Long senderId, Long receiverId, String content, Integer messageType) {
        this.senderId = senderId;
        this.receiverId = receiverId;
        this.content = content;
        this.messageType = messageType;
        this.readStatus = 0; // 默认未读
        this.createTime = new Date();
    }

    public Long getMessageId() {
        return messageId;
    }

    public void setMessageId(Long messageId) {
        this.messageId = messageId;
    }

    public Long getSenderId() {
        return senderId;
    }

    public void setSenderId(Long senderId) {
        this.senderId = senderId;
    }

    public Long getReceiverId() {
        return receiverId;
    }

    public void setReceiverId(Long receiverId) {
        this.receiverId = receiverId;
    }

    public String getContent() {
        return content;
    }

    public void setContent(String content) {
        this.content = content;
    }

    public Integer getMessageType() {
        return messageType;
    }

    public void setMessageType(Integer messageType) {
        this.messageType = messageType;
    }

    public Integer getReadStatus() {
        return readStatus;
    }

    public void setReadStatus(Integer readStatus) {
        this.readStatus = readStatus;
    }

    public Date getCreateTime() {
        return createTime;
    }

    public void setCreateTime(Date createTime) {
        this.createTime = createTime;
    }

    public String getSenderName() {
        return senderName;
    }

    public void setSenderName(String senderName) {
        this.senderName = senderName;
    }

    public String getReceiverName() {
        return receiverName;
    }

    public void setReceiverName(String receiverName) {
        this.receiverName = receiverName;
    }

    public String getSenderAvatar() {
        return senderAvatar;
    }

    public void setSenderAvatar(String senderAvatar) {
        this.senderAvatar = senderAvatar;
    }

    @Override
    public String toString() {
        return "ChatMessage{" +
                "messageId=" + messageId +
                ", senderId=" + senderId +
                ", receiverId=" + receiverId +
                ", content='" + content + '\'' +
                ", messageType=" + messageType +
                ", readStatus=" + readStatus +
                ", createTime=" + createTime +
                ", senderName='" + senderName + '\'' +
                ", receiverName='" + receiverName + '\'' +
                ", senderAvatar='" + senderAvatar + '\'' +
                '}';
    }
}