package com.ordersystem.entity;

import java.util.Date;

/**
 * 用户实体类
 */
public class User {
    private Integer userId;     // 用户ID
    private String userUuid;    //  用户UUID
    private String username;    // 用户名 (必须唯一)
    private String password;    // 密码
    private String realName;    // 真实姓名
    private String phone;       // 电话号码
    private String email;       // 邮箱
    private String address;     // 地址
    private byte[] avatarData;  // 用户头像二进制数据
    private Integer role;       // 用户角色：0-普通用户，1-商家/管理员
    private Integer status;     // 用户状态：0-禁用，1-正常
    private Date createTime;    // 创建时间
    private Date updateTime;    // 更新时间
    // 移除了不存在的lastLoginTime字段

    public Integer getUserId() {
        return userId;
    }

    public void setUserId(Integer userId) {
        this.userId = userId;
    }
    
    // 移除了不存在的userUuid字段的getter和setter方法

    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public String getPassword() {
        return password;
    }

    public void setPassword(String password) {
        this.password = password;
    }

    public String getRealName() {
        return realName;
    }

    public void setRealName(String realName) {
        this.realName = realName;
    }

    public String getPhone() {
        return phone;
    }

    public void setPhone(String phone) {
        this.phone = phone;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getAddress() {
        return address;
    }

    public void setAddress(String address) {
        this.address = address;
    }



    public byte[] getAvatarData() {
        return avatarData;
    }

    public void setAvatarData(byte[] avatarData) {
        this.avatarData = avatarData;
    }

    public Date getCreateTime() {
        return createTime;
    }

    public void setCreateTime(Date createTime) {
        this.createTime = createTime;
    }

    public Date getUpdateTime() {
        return updateTime;
    }

    public void setUpdateTime(Date updateTime) {
        this.updateTime = updateTime;
    }

    // 移除了不存在的lastLoginTime字段的getter和setter方法
    
    public Integer getRole() {
        return role;
    }

    public void setRole(Integer role) {
        this.role = role;
    }
    
    public Integer getStatus() {
        return status;
    }

    public void setStatus(Integer status) {
        this.status = status;
    }

    @Override
    public String toString() {
        // Note: Avoid printing large byte arrays in toString
        return "User{" +
                "userId=" + userId +
                // 移除了不存在的userUuid字段
                ", username='" + username + '\'' +
                ", password='" + password + '\'' +
                ", realName='" + realName + '\'' +
                ", phone='" + phone + '\'' +
                ", email='" + email + '\'' +
                ", address='" + address + '\'' +
                ", avatarData=[length=" + (avatarData != null ? avatarData.length : 0) + "]" + // Show length instead of data
                ", role=" + role +
                ", status=" + status +
                ", createTime=" + createTime +
                ", updateTime=" + updateTime +
                // 移除了不存在的lastLoginTime字段
                '}';
    }
}