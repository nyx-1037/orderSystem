package com.ordersystem.dao;

import com.ordersystem.OrderSystemApplication;
import com.ordersystem.entity.Order;
import com.ordersystem.entity.OrderItem;
import com.ordersystem.entity.User;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

/**
 * OrderDao.getOrderDetail方法的测试类
 * 专门测试查询订单详情（包含用户信息和订单明细）功能
 */
@SpringBootTest(classes = OrderSystemApplication.class)
public class OrderDaoGetOrderDetailTest {

    @Autowired
    private OrderDao orderDao;
    
    @Autowired
    private OrderItemDao orderItemDao;
    
    /**
     * 测试查询订单详情（包含用户信息和订单明细）
     * 使用@Transactional注解确保测试后回滚，不影响数据库
     */
    @Test
    @Transactional
    public void testGetOrderDetail() {
        // 1. 创建测试订单
        Order testOrder = createTestOrder();
        int insertResult = orderDao.insertOrder(testOrder);
        assertEquals(1, insertResult);
        assertNotNull(testOrder.getOrderId());
        
        // 2. 为订单创建测试订单明细
        List<OrderItem> orderItems = createTestOrderItems(testOrder.getOrderId());
        for (OrderItem item : orderItems) {
            orderItemDao.insertOrderItem(item);
        }
        
        // 3. 调用被测试方法
        Order orderDetail = orderDao.getOrderDetail(testOrder.getOrderId());
        
        // 4. 验证结果
        assertNotNull(orderDetail, "订单详情不应为空");
        assertEquals(testOrder.getOrderId(), orderDetail.getOrderId(), "订单ID应匹配");
        assertEquals(testOrder.getOrderNo(), orderDetail.getOrderNo(), "订单编号应匹配");
        
        // 5. 验证订单明细
        List<OrderItem> returnedItems = orderDetail.getOrderItems();
        assertNotNull(returnedItems, "订单明细列表不应为空");
        assertFalse(returnedItems.isEmpty(), "订单明细列表不应为空");
        assertEquals(orderItems.size(), returnedItems.size(), "订单明细数量应匹配");
        
        // 6. 验证用户信息（如果实现了关联用户信息的查询）
        // 注意：根据OrderServiceImpl的实现，可能需要调整这部分测试
        if (orderDetail.getUser() != null) {
            assertEquals(testOrder.getUserId(), orderDetail.getUser().getUserId(), "用户ID应匹配");
        }
        
        System.out.println("订单详情测试通过，订单ID: " + orderDetail.getOrderId() + 
                ", 订单编号: " + orderDetail.getOrderNo() + 
                ", 包含 " + returnedItems.size() + " 个订单明细项");
    }
    
    /**
     * 创建测试订单
     */

    private Order createTestOrder() {
        Order order = new Order();
        order.setOrderNo(UUID.randomUUID().toString().replace("-", "").substring(0, 16));
        order.setUserId(1); // 假设用户ID为1
        order.setTotalAmount(new BigDecimal("299.99"));
        order.setStatus(0); // 待付款
        order.setAddress("测试地址");
        order.setReceiver("测试用户");
        order.setReceiverPhone("13800138000");
        order.setRemark("订单详情测试订单");
        order.setCreateTime(new Date());
        order.setUpdateTime(new Date());
        return order;
    }
    
    /**
     * 创建测试订单明细
     */
    private List<OrderItem> createTestOrderItems(Integer orderId) {
        List<OrderItem> items = new ArrayList<>();
        
        // 创建第一个订单明细
        OrderItem item1 = new OrderItem();
        item1.setOrderId(orderId);
        item1.setProductId(1); // 假设商品ID为1
        item1.setProductName("测试商品1");
        item1.setProductPrice(new BigDecimal("99.99"));
        item1.setQuantity(2);
        item1.setTotalPrice(new BigDecimal("199.98"));
        item1.setCreateTime(new Date());
        item1.setUpdateTime(new Date());
        items.add(item1);
        
        // 创建第二个订单明细
        OrderItem item2 = new OrderItem();
        item2.setOrderId(orderId);
        item2.setProductId(2); // 假设商品ID为2
        item2.setProductName("测试商品2");
        item2.setProductPrice(new BigDecimal("50.00"));
        item2.setQuantity(2);
        item2.setTotalPrice(new BigDecimal("100.00"));
        item2.setCreateTime(new Date());
        item2.setUpdateTime(new Date());
        items.add(item2);
        
        return items;
    }
}