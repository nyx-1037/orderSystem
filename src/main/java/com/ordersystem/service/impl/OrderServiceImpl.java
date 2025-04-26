package com.ordersystem.service.impl;

import com.ordersystem.dao.OrderDao;
import com.ordersystem.dao.OrderItemDao;
import com.ordersystem.entity.Order;
import com.ordersystem.entity.OrderItem;
import com.ordersystem.service.OrderService;
import com.ordersystem.service.ProductService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.github.pagehelper.PageHelper;
import com.github.pagehelper.PageInfo;

import java.util.Date;
import java.util.List;
import java.util.UUID;

/**
 * 订单服务实现类
 */
@Service
public class OrderServiceImpl implements OrderService {

    @Autowired
    private OrderDao orderDao;
    
    @Autowired
    private OrderItemDao orderItemDao;
    
    @Autowired
    private ProductService productService;
    
    @Override
    @Transactional
    public boolean createOrder(Order order) {
        // 生成订单编号
        String orderNo = generateOrderNo();
        order.setOrderNo(orderNo);
        // 生成订单UUID
        String orderUuid = UUID.randomUUID().toString();
        order.setOrderUuid(orderUuid);
        order.setStatus(0); // 默认状态：待付款
        
        // 计算订单总金额
        if (order.getOrderItems() != null && !order.getOrderItems().isEmpty()) {
            java.math.BigDecimal totalAmount = java.math.BigDecimal.ZERO;
            
            // 处理订单项数据并计算总价
            for (OrderItem item : order.getOrderItems()) {
                // 验证 productPrice 和 quantity 是否存在
                if (item.getProductPrice() != null && item.getQuantity() != null && item.getQuantity() > 0) {
                    java.math.BigDecimal itemTotal = item.getProductPrice().multiply(new java.math.BigDecimal(item.getQuantity()));
                    item.setTotalPrice(itemTotal); // 设置当前项的总价
                    totalAmount = totalAmount.add(itemTotal); // 累加到订单总金额
                } else {
                    // 如果价格或数量无效，可以抛出异常或记录错误
                    // 这里简单地跳过，或者可以返回创建失败
                    // throw new IllegalArgumentException("订单项数据无效: " + item);
                     System.err.println("订单项数据无效，跳过计算: " + item);
                     // 根据业务需求决定是否应该中断订单创建
                     // return false; 
                }
            }
            
            // 设置订单总金额
            if (order.getTotalAmount() == null) {
                order.setTotalAmount(totalAmount);
            }
        }
        
        // 保存订单
        int result = orderDao.insertOrder(order);
        if (result > 0 && order.getOrderItems() != null && !order.getOrderItems().isEmpty()) {
            // 设置订单明细的订单ID
            for (OrderItem item : order.getOrderItems()) {
                item.setOrderId(order.getOrderId());
                // 减少商品库存
                productService.updateProductStock(item.getProductId(), -item.getQuantity());
            }
            // 批量保存订单明细
            return orderItemDao.batchInsertOrderItems(order.getOrderItems()) > 0;
        }
        return result > 0;
    }
    
    @Override
    @Transactional
    public boolean deleteOrder(Integer orderId) {
        // 先删除订单明细，再删除订单
        orderItemDao.deleteOrderItemsByOrderId(orderId);
        return orderDao.deleteOrderById(orderId) > 0;
    }
    
    @Override
    public boolean updateOrder(Order order) {
        return orderDao.updateOrder(order) > 0;
    }
    
    @Override
    public Order getOrderById(Integer orderId) {
        return orderDao.getOrderById(orderId);
    }
    
    @Override
    public Order getOrderByOrderNo(String orderNo) {
        return orderDao.getOrderByOrderNo(orderNo);
    }
    
    @Override
    public List<Order> getAllOrders() {
        return orderDao.getAllOrders();
    }
    
    @Override
    public PageInfo<Order> getAllOrdersByPage(Integer pageNum, Integer pageSize) {
        // 使用PageHelper进行分页查询
        PageHelper.startPage(pageNum, pageSize);
        List<Order> orders = orderDao.getAllOrders();
        return new PageInfo<>(orders);
    }
    
    @Override
    public List<Order> getOrdersByUserId(Integer userId) {
        return orderDao.getOrdersByUserId(userId);
    }
    
    @Override
    public PageInfo<Order> getOrdersByUserIdWithPage(Integer userId, Integer pageNum, Integer pageSize) {
        // 使用PageHelper进行分页查询
        PageHelper.startPage(pageNum, pageSize);
        List<Order> orders = orderDao.getOrdersByUserId(userId);
        return new PageInfo<>(orders);
    }
    
    @Override
    public List<Order> getOrdersByStatus(Integer status) {
        return orderDao.getOrdersByStatus(status);
    }
    
    @Override
    public Order getOrderDetail(Integer orderId) {
        if (orderId == null) {
            return null;
        }
        Order order = orderDao.getOrderById(orderId);
        if (order != null) {
            // 获取订单关联的明细项
            List<OrderItem> items = orderItemDao.getOrderItemsByOrderId(orderId);
            order.setOrderItems(items);
        }
        return order;   
    }
    
    @Override
    public Order getOrderByUuid(String orderUuid) {
        if (orderUuid == null || orderUuid.trim().isEmpty()) {
            return null;
        }
        return orderDao.getOrderByUuid(orderUuid);
    }
    
    @Override
    public Order getOrderDetailByUuid(String orderUuid) {
        if (orderUuid == null || orderUuid.trim().isEmpty()) {
            return null;
        }
        Order order = orderDao.getOrderDetailByUuid(orderUuid);
        if (order != null) {
            // 获取订单关联的明细项
            List<OrderItem> items = orderItemDao.getOrderItemsByOrderId(order.getOrderId());
            order.setOrderItems(items);
        }
        return order;
    }
    
    @Override
    @Transactional
    public boolean payOrder(Integer orderId) {
        Order order = orderDao.getOrderById(orderId);
        if (order != null && order.getStatus() == 0) { // 待付款状态
            order.setStatus(1); // 已付款
            order.setPaymentTime(new Date());
            return orderDao.updateOrder(order) > 0;
        }
        return false;
    }
    
    @Override
    @Transactional
    public boolean shipOrder(Integer orderId) {
        Order order = orderDao.getOrderById(orderId);
        if (order != null && order.getStatus() == 1) { // 已付款状态
            order.setStatus(2); // 已发货
            order.setShippingTime(new Date());
            return orderDao.updateOrder(order) > 0;
        }
        return false;
    }
    

    
    @Override
    @Transactional
    public boolean completeOrder(Integer orderId) {
        Order order = orderDao.getOrderById(orderId);
        if (order != null && order.getStatus() == 2) { // 已发货状态
            order.setStatus(3); // 已完成
            order.setCompleteTime(new Date());
            return orderDao.updateOrder(order) > 0;
        }
        return false;
    }
    
    @Override
    @Transactional
    public boolean cancelOrder(Integer orderId) {
        Order order = orderDao.getOrderById(orderId);
        if (order != null && order.getStatus() <= 1) { // 待付款或已付款状态
            order.setStatus(4); // 已取消
            
            // 如果订单已付款，需要退还库存
            if (order.getStatus() == 1) {
                // 获取订单明细
                List<OrderItem> items = orderItemDao.getOrderItemsByOrderId(orderId);
                for (OrderItem item : items) {
                    // 恢复商品库存
                    productService.updateProductStock(item.getProductId(), item.getQuantity());
                }
            }
            
            return orderDao.updateOrder(order) > 0;
        }
        return false;
    }
    
    /**
     * 生成订单编号
     * @return 订单编号
     */
    private String generateOrderNo() {
        // 生成格式：ORD + 年月日 + 6位随机数
        return "ORD" + System.currentTimeMillis() + UUID.randomUUID().toString().substring(0, 6);
    }
}