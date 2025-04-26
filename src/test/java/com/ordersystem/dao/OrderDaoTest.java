package com.ordersystem.dao;

import com.ordersystem.OrderSystemApplication;
import com.ordersystem.entity.Order;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.Date;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

/**
 * OrderDao测试类
 */
@SpringBootTest(classes = OrderSystemApplication.class)
public class OrderDaoTest {

    @Autowired
    private OrderDao orderDao;

    /**
     * 测试查询所有订单
     */
    @Test
    public void testGetAllOrders() {
        List<Order> orders = orderDao.getAllOrders();
        // 验证查询结果不为null
        assertNotNull(orders);
        // 打印查询结果
        System.out.println("查询到" + orders.size() + "条订单记录");
        orders.forEach(order -> System.out.println("订单ID: " + order.getOrderId() + ", 订单编号: " + order.getOrderNo()));
    }

    /**
     * 测试根据ID查询订单
     */
    @Test
    public void testGetOrderById() {
        // 假设数据库中存在ID为1的订单，如果不存在请修改为实际存在的ID
        Integer orderId = 1;
        Order order = orderDao.getOrderById(orderId);
        // 验证查询结果
        if (order != null) {
            System.out.println("订单详情: " + order.getOrderNo());
            assertEquals(orderId, order.getOrderId());
        } else {
            System.out.println("未找到ID为" + orderId + "的订单");
        }
    }

    /**
     * 测试插入订单
     * 使用@Transactional注解确保测试后回滚，不影响数据库
     */
    @Test
    @Transactional
    public void testInsertOrder() {
        // 创建测试订单对象
        Order order = new Order();
        order.setOrderNo(UUID.randomUUID().toString().replace("-", "").substring(0, 16));
        order.setUserId(1); // 假设用户ID为1
        order.setTotalAmount(new BigDecimal("199.99"));
        order.setStatus(0); // 待付款
        order.setAddress("测试地址");
        order.setReceiver("测试用户");
        order.setReceiverPhone("13800138000");
        order.setRemark("测试订单");
        
        // 执行插入操作
        int result = orderDao.insertOrder(order);
        
        // 验证插入结果
        assertEquals(1, result);
        assertNotNull(order.getOrderId()); // 验证自增ID是否已赋值
        System.out.println("插入订单成功，ID: " + order.getOrderId() + ", 订单编号: " + order.getOrderNo());
    }

    /**
     * 测试更新订单
     * 使用@Transactional注解确保测试后回滚，不影响数据库
     */
    @Test
    @Transactional
    public void testUpdateOrder() {
        // 假设数据库中存在ID为1的订单，如果不存在请修改为实际存在的ID
        Integer orderId = 1;
        Order order = orderDao.getOrderById(orderId);
        
        if (order != null) {
            // 修改订单状态为已付款
            order.setStatus(1);
            order.setPaymentTime(new Date());
            
            // 执行更新操作
            int result = orderDao.updateOrder(order);
            
            // 验证更新结果
            assertEquals(1, result);
            
            // 重新查询验证更新是否成功
            Order updatedOrder = orderDao.getOrderById(orderId);
            assertEquals(1, updatedOrder.getStatus());
            assertNotNull(updatedOrder.getPaymentTime());
            
            System.out.println("更新订单成功，订单状态已更新为已付款");
        } else {
            System.out.println("未找到ID为" + orderId + "的订单，无法进行更新测试");
        }
    }
}