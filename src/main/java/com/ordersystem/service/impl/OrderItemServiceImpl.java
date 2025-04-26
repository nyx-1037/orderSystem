package com.ordersystem.service.impl;

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
public class OrderItemServiceImpl implements OrderItemService {

    @Autowired
    private OrderItemDao orderItemDao;
    
    @Override
    public boolean addOrderItem(OrderItem orderItem) {
        return orderItemDao.insertOrderItem(orderItem) > 0;
    }
    
    @Override
    public boolean batchAddOrderItems(List<OrderItem> orderItems) {
        return orderItemDao.batchInsertOrderItems(orderItems) > 0;
    }
    
    @Override
    public boolean deleteOrderItem(Integer itemId) {
        return orderItemDao.deleteOrderItemById(itemId) > 0;
    }
    
    @Override
    public boolean deleteOrderItemsByOrderId(Integer orderId) {
        return orderItemDao.deleteOrderItemsByOrderId(orderId) > 0;
    }
    
    @Override
    public boolean updateOrderItem(OrderItem orderItem) {
        return orderItemDao.updateOrderItem(orderItem) > 0;
    }
    
    @Override
    public OrderItem getOrderItemById(Integer itemId) {
        return orderItemDao.getOrderItemById(itemId);
    }
    
    @Override
    public List<OrderItem> getOrderItemsByOrderId(Integer orderId) {
        return orderItemDao.getOrderItemsByOrderId(orderId);
    }
    
    @Override
    public List<OrderItem> getOrderItemsByProductId(Integer productId) {
        return orderItemDao.getOrderItemsByProductId(productId);
    }
    
    @Override
    public List<OrderItem> getOrderItemsWithProduct(Integer orderId) {
        return orderItemDao.getOrderItemsWithProduct(orderId);
    }
}