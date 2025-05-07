package com.ordersystem.service.impl;

import com.ordersystem.dao.OrderItemDao;
import com.ordersystem.entity.OrderItem;
import com.ordersystem.service.OrderItemService;
import com.ordersystem.service.RedisService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.CachePut;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

import com.ordersystem.dao.OrderItemDao;
import com.ordersystem.entity.OrderItem;
import com.ordersystem.service.OrderItemService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * 订单明细服务实现类
 */
@Service
public class OrderItemServiceImpl implements OrderItemService, CommandLineRunner {

    private static final Logger logger = LoggerFactory.getLogger(OrderItemServiceImpl.class);
    
    @Autowired
    private OrderItemDao orderItemDao;
    
    @Autowired
    private RedisService redisService;
    
    /**
     * 项目启动时初始化订单明细数据到Redis缓存
     */
    @Override
    public void run(String... args) throws Exception {
        logger.info("开始初始化订单明细数据到Redis缓存...");
        List<OrderItem> orderItems = orderItemDao.getAllOrderItems();
        for (OrderItem orderItem : orderItems) {
            String key = "orderItem:" + orderItem.getItemId();
            redisService.set(key, orderItem, 24 * 60 * 60); // 缓存24小时
            
            // 按订单ID缓存订单明细列表
            String orderItemsKey = "order:items:" + orderItem.getOrderId();
            List<OrderItem> items = redisService.get(orderItemsKey, List.class);
            if (items == null) {
                items = orderItemDao.getOrderItemsByOrderId(orderItem.getOrderId());
                redisService.set(orderItemsKey, items, 24 * 60 * 60); // 缓存24小时
            }
        }
        logger.info("订单明细数据缓存初始化完成，共缓存{}条记录", orderItems.size());
    }
    
    @Override
    @Transactional
    @CachePut(value = "orderItems", key = "#orderItem.itemId")
    public boolean addOrderItem(OrderItem orderItem) {
        boolean result = orderItemDao.insertOrderItem(orderItem) > 0;
        if (result) {
            // 更新Redis缓存
            String key = "orderItem:" + orderItem.getItemId();
            redisService.set(key, orderItem, 24 * 60 * 60); // 缓存24小时
            
            // 清除订单明细列表缓存，以便重新加载
            String orderItemsKey = "order:items:" + orderItem.getOrderId();
            redisService.delete(orderItemsKey);
        }
        return result;
    }
    
    @Override
    public boolean batchAddOrderItems(List<OrderItem> orderItems) {
        return orderItemDao.batchInsertOrderItems(orderItems) > 0;
    }
    
    @Override
    @Transactional
    @CacheEvict(value = "orderItems", key = "#itemId")
    public boolean deleteOrderItem(Integer itemId) {
        // 先获取订单明细，以便后续清除缓存
        OrderItem orderItem = getOrderItemById(itemId);
        boolean result = orderItemDao.deleteOrderItemById(itemId) > 0;
        if (result && orderItem != null) {
            // 从Redis缓存中删除
            String key = "orderItem:" + itemId;
            redisService.delete(key);
            
            // 清除订单明细列表缓存，以便重新加载
            String orderItemsKey = "order:items:" + orderItem.getOrderId();
            redisService.delete(orderItemsKey);
        }
        return result;
    }
    
    @Override
    public boolean deleteOrderItemsByOrderId(Integer orderId) {
        return orderItemDao.deleteOrderItemsByOrderId(orderId) > 0;
    }
    
    @Override
    @Transactional
    @CachePut(value = "orderItems", key = "#orderItem.itemId")
    public boolean updateOrderItem(OrderItem orderItem) {
        boolean result = orderItemDao.updateOrderItem(orderItem) > 0;
        if (result) {
            // 更新Redis缓存
            String key = "orderItem:" + orderItem.getItemId();
            redisService.set(key, orderItem, 24 * 60 * 60); // 缓存24小时
            
            // 清除订单明细列表缓存，以便重新加载
            String orderItemsKey = "order:items:" + orderItem.getOrderId();
            redisService.delete(orderItemsKey);
        }
        return result;
    }
    
    @Override
    @Cacheable(value = "orderItems", key = "#itemId", unless = "#result == null")
    public OrderItem getOrderItemById(Integer itemId) {
        // 先从Redis缓存中获取
        String key = "orderItem:" + itemId;
        OrderItem orderItem = redisService.get(key, OrderItem.class);
        if (orderItem != null) {
            logger.debug("从Redis缓存中获取订单明细数据，itemId={}", itemId);
            return orderItem;
        }
        
        // 缓存中没有，从数据库获取
        orderItem = orderItemDao.getOrderItemById(itemId);
        if (orderItem != null) {
            // 放入缓存
            redisService.set(key, orderItem, 24 * 60 * 60); // 缓存24小时
        }
        return orderItem;
    }
    
    @Override
    @Cacheable(value = "orderItemsByOrder", key = "#orderId", unless = "#result == null || #result.isEmpty()")
    public List<OrderItem> getOrderItemsByOrderId(Integer orderId) {
        // 先从Redis缓存中获取
        String key = "order:items:" + orderId;
        List<OrderItem> orderItems = redisService.get(key, List.class);
        if (orderItems != null && !orderItems.isEmpty()) {
            logger.debug("从Redis缓存中获取订单明细列表数据，orderId={}", orderId);
            return orderItems;
        }
        
        // 缓存中没有，从数据库获取
        orderItems = orderItemDao.getOrderItemsByOrderId(orderId);
        if (orderItems != null && !orderItems.isEmpty()) {
            // 放入缓存
            redisService.set(key, orderItems, 24 * 60 * 60); // 缓存24小时
            
            // 同时缓存每个订单明细
            for (OrderItem orderItem : orderItems) {
                String itemKey = "orderItem:" + orderItem.getItemId();
                redisService.set(itemKey, orderItem, 24 * 60 * 60); // 缓存24小时
            }
        }
        return orderItems;
    }
    
    @Override
    @Cacheable(value = "orderItemsByProduct", key = "#productId", unless = "#result == null || #result.isEmpty()")
    public List<OrderItem> getOrderItemsByProductId(Integer productId) {
        // 先从Redis缓存中获取
        String key = "product:items:" + productId;
        List<OrderItem> orderItems = redisService.get(key, List.class);
        if (orderItems != null && !orderItems.isEmpty()) {
            logger.debug("从Redis缓存中获取商品相关订单明细数据，productId={}", productId);
            return orderItems;
        }
        
        // 缓存中没有，从数据库获取
        orderItems = orderItemDao.getOrderItemsByProductId(productId);
        if (orderItems != null && !orderItems.isEmpty()) {
            // 放入缓存
            redisService.set(key, orderItems, 24 * 60 * 60); // 缓存24小时
        }
        return orderItems;
    }
    
    @Override
    public List<OrderItem> getOrderItemsWithProduct(Integer orderId) {
        return orderItemDao.getOrderItemsWithProduct(orderId);
    }
}