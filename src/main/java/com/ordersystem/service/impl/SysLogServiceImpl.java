package com.ordersystem.service.impl;

import com.github.pagehelper.PageHelper;
import com.github.pagehelper.PageInfo;
import com.ordersystem.dao.SysLogDao;
import com.ordersystem.entity.SysLog;
import com.ordersystem.service.RedisService;
import com.ordersystem.service.SysLogService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * 系统日志服务实现类
 */
@Service
public class SysLogServiceImpl implements SysLogService {
    
    private static final Logger logger = LoggerFactory.getLogger(SysLogServiceImpl.class);

    @Autowired
    private SysLogDao sysLogDao;
    
    @Autowired
    private RedisService redisService;
    
    @Override
    @Transactional
    public boolean saveLog(SysLog sysLog) {
        boolean result = sysLogDao.save(sysLog) > 0;
        if (result) {
            // 更新最近日志缓存
            String key = "recent:logs";
            List<SysLog> recentLogs = redisService.get(key, List.class);
            if (recentLogs != null) {
                // 移除最旧的日志，添加新日志
                if (recentLogs.size() >= 100) {
                    recentLogs.remove(recentLogs.size() - 1);
                }
                recentLogs.add(0, sysLog); // 添加到列表开头
                redisService.set(key, recentLogs, 24 * 60 * 60); // 更新缓存
            }
            
            // 缓存单个日志
            String logKey = "log:" + sysLog.getLogId();
            redisService.set(logKey, sysLog, 24 * 60 * 60); // 缓存24小时
        }
        return result;
    }
    
    @Override
    @Transactional(rollbackFor = Exception.class)
    public boolean batchSaveLog(List<SysLog> logs) {
        if (logs == null || logs.isEmpty()) {
            return true;
        }
        
        try {
            // 使用批量插入提高性能
            int result = sysLogDao.batchSave(logs);
            logger.info("批量保存日志完成，总数: {}，成功插入: {}", logs.size(), result);
            return result == logs.size();
        } catch (Exception e) {
            logger.error("批量保存日志失败: {}", e.getMessage());
            throw e;
        }
    }
    
    @Override
    @Cacheable(value = "logsByPage", key = "#pageNum + '-' + #pageSize", unless = "#result == null")
    public PageInfo<SysLog> getAllLogsWithPage(int pageNum, int pageSize) {
        // 先从Redis缓存中获取
        String key = "logs:page:" + pageNum + ":" + pageSize;
        PageInfo<SysLog> pageInfo = redisService.get(key, PageInfo.class);
        if (pageInfo != null) {
            logger.debug("从Redis缓存中获取分页日志数据，pageNum={}, pageSize={}", pageNum, pageSize);
            return pageInfo;
        }
        
        // 缓存中没有，从数据库获取
        PageHelper.startPage(pageNum, pageSize);
        List<SysLog> logs = sysLogDao.findAll();
        pageInfo = new PageInfo<>(logs);
        
        // 放入缓存
        redisService.set(key, pageInfo, 1 * 60 * 60); // 缓存1小时，日志更新频繁，缓存时间短一些
        
        return pageInfo;
    }
    
    @Override
    @Cacheable(value = "logsByUser", key = "#userId + '-' + #pageNum + '-' + #pageSize", unless = "#result == null")
    public PageInfo<SysLog> getLogsByUserIdWithPage(Integer userId, int pageNum, int pageSize) {
        // 先从Redis缓存中获取
        String key = "logs:user:" + userId + ":page:" + pageNum + ":" + pageSize;
        PageInfo<SysLog> pageInfo = redisService.get(key, PageInfo.class);
        if (pageInfo != null) {
            logger.debug("从Redis缓存中获取用户日志分页数据，userId={}, pageNum={}, pageSize={}", userId, pageNum, pageSize);
            return pageInfo;
        }
        
        // 缓存中没有，从数据库获取
        PageHelper.startPage(pageNum, pageSize);
        List<SysLog> logs = sysLogDao.findByUserId(userId);
        pageInfo = new PageInfo<>(logs);
        
        // 放入缓存
        redisService.set(key, pageInfo, 1 * 60 * 60); // 缓存1小时
        
        return pageInfo;
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
    @Transactional
    @CacheEvict(value = "logs", key = "#logId")
    public boolean deleteLog(Integer logId) {
        boolean result = sysLogDao.deleteById(logId) > 0;
        if (result) {
            // 从Redis缓存中删除
            String key = "log:" + logId;
            redisService.delete(key);
            
            // 更新最近日志缓存
            String recentKey = "recent:logs";
            List<SysLog> recentLogs = redisService.get(recentKey, List.class);
            if (recentLogs != null) {
                recentLogs.removeIf(log -> log.getLogId().equals(logId));
                redisService.set(recentKey, recentLogs, 24 * 60 * 60); // 更新缓存
            }
        }
        return result;
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
    
    @Override
    @Cacheable(value = "logs", key = "#logId", unless = "#result == null")
    public SysLog getLogById(Integer logId) {
        if (logId == null) {
            return null;
        }
        // 先从Redis缓存中获取
        String key = "log:" + logId;
        SysLog log = redisService.get(key, SysLog.class);
        if (log != null) {
            logger.debug("从Redis缓存中获取日志数据，logId={}", logId);
            return log;
        }
        
        // 缓存中没有，从数据库获取
        log = sysLogDao.findById(logId);
        if (log != null) {
            // 放入缓存
            redisService.set(key, log, 24 * 60 * 60); // 缓存24小时
        }
        return log;
    }
}