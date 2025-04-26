package com.ordersystem.entity;

import java.util.Date;

/**
 * 系统日志实体类
 */
public class SysLog {
    private Integer logId;        // 日志ID
    private String username;      // 操作用户名
    private Integer userId;       // 用户ID
    private String operation;     // 操作类型
    private String method;        // 请求方法
    private String params;        // 请求参数
    private String ip;            // IP地址
    private Integer statusCode;   // 状态码
    private String errorMsg;      // 错误信息
    private Date createTime;      // 创建时间
    
    public Integer getLogId() {
        return logId;
    }

    public void setLogId(Integer logId) {
        this.logId = logId;
    }

    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public Integer getUserId() {
        return userId;
    }

    public void setUserId(Integer userId) {
        this.userId = userId;
    }

    public String getOperation() {
        return operation;
    }

    public void setOperation(String operation) {
        this.operation = operation;
    }

    public String getMethod() {
        return method;
    }

    public void setMethod(String method) {
        this.method = method;
    }

    public String getParams() {
        return params;
    }

    public void setParams(String params) {
        this.params = params;
    }

    public String getIp() {
        return ip;
    }

    public void setIp(String ip) {
        this.ip = ip;
    }

    public Integer getStatusCode() {
        return statusCode;
    }

    public void setStatusCode(Integer statusCode) {
        this.statusCode = statusCode;
    }

    public String getErrorMsg() {
        return errorMsg;
    }

    public void setErrorMsg(String errorMsg) {
        this.errorMsg = errorMsg;
    }

    public Date getCreateTime() {
        return createTime;
    }

    public void setCreateTime(Date createTime) {
        this.createTime = createTime;
    }

    @Override
    public String toString() {
        return "SysLog{" +
                "logId=" + logId +
                ", username='" + username + '\'' +
                ", userId=" + userId +
                ", operation='" + operation + '\'' +
                ", method='" + method + '\'' +
                ", params='" + params + '\'' +
                ", ip='" + ip + '\'' +
                ", statusCode=" + statusCode +
                ", errorMsg='" + errorMsg + '\'' +
                ", createTime=" + createTime +
                '}';
    }
}