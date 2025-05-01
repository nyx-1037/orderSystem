package com.ordersystem.service;

import com.github.pagehelper.PageInfo;
import com.ordersystem.entity.SysLog;

import java.util.List;

/**
 * 系统日志服务接口
 */
public interface SysLogService {
    
    /**
     * 保存日志
     * @param sysLog 日志信息
     * @return 是否成功
     */
    boolean saveLog(SysLog sysLog);
    
    /**
     * 批量保存日志
     * @param logs 日志列表
     * @return 是否成功
     */
    boolean batchSaveLog(List<SysLog> logs);
    
    /**
     * 获取所有日志（分页）
     * @param pageNum 页码
     * @param pageSize 每页数量
     * @return 分页日志数据
     */
    PageInfo<SysLog> getAllLogsWithPage(int pageNum, int pageSize);
    
    /**
     * 根据用户ID获取日志（分页）
     * @param userId 用户ID
     * @param pageNum 页码
     * @param pageSize 每页数量
     * @return 分页日志数据
     */
    PageInfo<SysLog> getLogsByUserIdWithPage(Integer userId, int pageNum, int pageSize);
    
    /**
     * 根据用户名获取日志（分页）
     * @param username 用户名
     * @param pageNum 页码
     * @param pageSize 每页数量
     * @return 分页日志数据
     */
    
    /**
     * 根据日志ID获取日志详情
     * @param logId 日志ID
     * @return 日志详情
     */
    SysLog getLogById(Integer logId);
    PageInfo<SysLog> getLogsByUsernameWithPage(String username, int pageNum, int pageSize);
    
    /**
     * 根据操作类型获取日志（分页）
     * @param operation 操作类型
     * @param pageNum 页码
     * @param pageSize 每页数量
     * @return 分页日志数据
     */
    
    /**
     * 根据多条件筛选获取日志（分页）
     * @param filter 筛选条件对象
     * @param startTime 开始时间（可选，格式：yyyy-MM-dd HH:mm:ss）
     * @param endTime 结束时间（可选，格式：yyyy-MM-dd HH:mm:ss）
     * @param pageNum 页码
     * @param pageSize 每页数量
     * @return 分页日志数据
     */
    PageInfo<SysLog> getLogsWithFilter(SysLog filter, String startTime, String endTime, int pageNum, int pageSize);
    PageInfo<SysLog> getLogsByOperationWithPage(String operation, int pageNum, int pageSize);
    
    /**
     * 删除日志
     * @param logId 日志ID
     * @return 是否成功
     */
    boolean deleteLog(Integer logId);
    
    /**
     * 强制用户登出
     * @param userId 用户ID
     * @return 是否成功
     */
    boolean forceLogout(Integer userId);
}