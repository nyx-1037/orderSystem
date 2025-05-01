package com.ordersystem.dao;

import com.ordersystem.entity.SysLog;
import org.apache.ibatis.annotations.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * 系统日志DAO接口
 */
@Repository
public interface SysLogDao {
    
    /**
     * 保存日志
     * @param sysLog 日志信息
     * @return 影响行数
     */
    int save(SysLog sysLog);
    
    /**
     * 批量保存日志
     * @param logs 日志列表
     * @return 影响行数
     */
    int batchSave(List<SysLog> logs);
    
    /**
     * 查询所有日志（分页）
     * @return 日志列表
     */
    List<SysLog> findAll();
    
    /**
     * 根据用户ID查询日志
     * @param userId 用户ID
     * @return 日志列表
     */
    List<SysLog> findByUserId(@Param("userId") Integer userId);
    
    /**
     * 根据用户名查询日志
     * @param username 用户名
     * @return 日志列表
     */
    List<SysLog> findByUsername(@Param("username") String username);
    
    /**
     * 根据操作类型查询日志
     * @param operation 操作类型
     * @return 日志列表
     */
    List<SysLog> findByOperation(@Param("operation") String operation);
    
    /**
     * 根据多条件筛选查询日志
     * @param filter 筛选条件对象
     * @param startTime 开始时间（可选）
     * @param endTime 结束时间（可选）
     * @return 日志列表
     */
    List<SysLog> findByFilter(@Param("filter") SysLog filter, 
                             @Param("startTime") String startTime, 
                             @Param("endTime") String endTime);
    
    /**
     * 删除日志
     * @param logId 日志ID
     * @return 影响行数
     */
    int deleteById(@Param("logId") Integer logId);
    
    /**
     * 根据ID查询日志
     * @param logId 日志ID
     * @return 日志信息
     */
    SysLog findById(@Param("logId") Integer logId);
}