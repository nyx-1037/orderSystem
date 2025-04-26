package com.ordersystem.service.impl;

import com.github.pagehelper.PageHelper;
import com.github.pagehelper.PageInfo;
import com.ordersystem.dao.SysLogDao;
import com.ordersystem.entity.SysLog;
import com.ordersystem.service.RedisService;
import com.ordersystem.service.SysLogService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * 系统日志服务实现类
 */
@Service
public class SysLogServiceImpl implements SysLogService {

    @Autowired
    private SysLogDao sysLogDao;
    
    @Autowired
    private RedisService redisService;
    
    @Override
    public boolean saveLog(SysLog sysLog) {
        return sysLogDao.save(sysLog) > 0;
    }
    
    @Override
    public PageInfo<SysLog> getAllLogsWithPage(int pageNum, int pageSize) {
        PageHelper.startPage(pageNum, pageSize);
        List<SysLog> logs = sysLogDao.findAll();
        return new PageInfo<>(logs);
    }
    
    @Override
    public PageInfo<SysLog> getLogsByUserIdWithPage(Integer userId, int pageNum, int pageSize) {
        PageHelper.startPage(pageNum, pageSize);
        List<SysLog> logs = sysLogDao.findByUserId(userId);
        return new PageInfo<>(logs);
    }
    
    @Override
    public PageInfo<SysLog> getLogsByUsernameWithPage(String username, int pageNum, int pageSize) {
        PageHelper.startPage(pageNum, pageSize);
        List<SysLog> logs = sysLogDao.findByUsername(username);
        return new PageInfo<>(logs);
    }
    
    @Override
    public PageInfo<SysLog> getLogsByOperationWithPage(String operation, int pageNum, int pageSize) {
        PageHelper.startPage(pageNum, pageSize);
        List<SysLog> logs = sysLogDao.findByOperation(operation);
        return new PageInfo<>(logs);
    }
    
    @Override
    public boolean deleteLog(Integer logId) {
        return sysLogDao.deleteById(logId) > 0;
    }
    
    @Override
    public boolean forceLogout(Integer userId) {
        // 从Redis中删除用户的Token，实现强制登出
        try {
            redisService.deleteToken(userId);
            return true;
        } catch (Exception e) {
            return false;
        }
    }
    
    @Override
    public PageInfo<SysLog> getLogsWithFilter(SysLog filter, String startTime, String endTime, int pageNum, int pageSize) {
        PageHelper.startPage(pageNum, pageSize);
        List<SysLog> logs = sysLogDao.findByFilter(filter, startTime, endTime);
        return new PageInfo<>(logs);
    }
}