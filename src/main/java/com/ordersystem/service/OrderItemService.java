package com.ordersystem.service;

import com.ordersystem.entity.OrderItem;
import java.util.List;

/**
 * 订单明细服务接口
 */
public interface OrderItemService {
    
    /**
     * 添加订单明细
     * @param orderItem 订单明细信息
     * @return 是否成功
     */
    boolean addOrderItem(OrderItem orderItem);
    
    /**
     * 批量添加订单明细
     * @param orderItems 订单明细列表
     * @return 是否成功
     */
    boolean batchAddOrderItems(List<OrderItem> orderItems);
    
    /**
     * 删除订单明细
     * @param itemId 明细ID
     * @return 是否成功
     */
    boolean deleteOrderItem(Integer itemId);
    
    /**
     * 根据订单ID删除订单明细
     * @param orderId 订单ID
     * @return 是否成功
     */
    boolean deleteOrderItemsByOrderId(Integer orderId);
    
    /**
     * 更新订单明细信息
     * @param orderItem 订单明细信息
     * @return 是否成功
     */
    boolean updateOrderItem(OrderItem orderItem);
    
    /**
     * 根据ID查询订单明细
     * @param itemId 明细ID
     * @return 订单明细信息
     */
    OrderItem getOrderItemById(Integer itemId);
    
    /**
     * 根据订单ID查询订单明细
     * @param orderId 订单ID
     * @return 订单明细列表
     */
    List<OrderItem> getOrderItemsByOrderId(Integer orderId);
    
    /**
     * 根据商品ID查询订单明细
     * @param productId 商品ID
     * @return 订单明细列表
     */
    List<OrderItem> getOrderItemsByProductId(Integer productId);
    
    /**
     * 查询订单明细（包含商品信息）
     * @param orderId 订单ID
     * @return 订单明细列表（包含商品信息）
     */
    List<OrderItem> getOrderItemsWithProduct(Integer orderId);
}