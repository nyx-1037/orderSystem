package com.ordersystem.dao;

import com.ordersystem.entity.Order;
import java.util.List;

/**
 * 订单DAO接口
 */
public interface OrderDao {
    
    /**
     * 添加订单
     * @param order 订单信息
     * @return 影响行数
     */
    int insertOrder(Order order);
    
    /**
     * 根据ID删除订单
     * @param orderId 订单ID
     * @return 影响行数
     */
    int deleteOrderById(Integer orderId);
    
    /**
     * 更新订单信息
     * @param order 订单信息
     * @return 影响行数
     */
    int updateOrder(Order order);
    
    /**
     * 根据ID查询订单
     * @param orderId 订单ID
     * @return 订单信息
     */
    Order getOrderById(Integer orderId);
    
    /**
     * 根据订单编号查询订单
     * @param orderNo 订单编号
     * @return 订单信息
     */
    Order getOrderByOrderNo(String orderNo);
    
    /**
     * 查询所有订单
     * @return 订单列表
     */
    List<Order> getAllOrders();
    
    /**
     * 根据用户ID查询订单
     * @param userId 用户ID
     * @return 订单列表
     */
    List<Order> getOrdersByUserId(Integer userId);
    
    /**
     * 根据订单状态查询订单
     * @param status 订单状态
     * @return 订单列表
     */
    List<Order> getOrdersByStatus(Integer status);
    
    /**
     * 查询订单详情（包含用户信息和订单明细）
     * @param orderId 订单ID
     * @return 订单详情
     */
    Order getOrderDetail(Integer orderId);
    
    /**
     * 根据UUID查询订单
     * @param orderUuid 订单UUID
     * @return 订单信息
     */
    Order getOrderByUuid(String orderUuid);
    
    /**
     * 根据UUID查询订单详情（包含用户信息和订单明细）
     * @param orderUuid 订单UUID
     * @return 订单详情
     */
    Order getOrderDetailByUuid(String orderUuid);
    
    /**
     * 更新订单状态
     * @param orderId 订单ID
     * @param status 订单状态
     * @return 影响行数
     */
    int updateOrderStatus(Integer orderId, Integer status);
    
    /**
     * 分页查询订单列表
     * @param pageNum 页码
     * @param pageSize 每页数量
     * @return 订单列表
     */
    List<Order> getOrdersByPage(Integer pageNum, Integer pageSize);
    
    /**
     * 根据用户ID分页查询订单
     * @param userId 用户ID
     * @param pageNum 页码
     * @param pageSize 每页数量
     * @return 订单列表
     */
    List<Order> getOrdersByUserIdWithPage(Integer userId, Integer pageNum, Integer pageSize);
    
    /**
     * 根据订单状态分页查询订单
     * @param status 订单状态
     * @param pageNum 页码
     * @param pageSize 每页数量
     * @return 订单列表
     */
    List<Order> getOrdersByStatusWithPage(Integer status, Integer pageNum, Integer pageSize);
    
    /**
     * 获取订单总数
     * @return 订单总数
     */
    int getOrderCount();
    
    /**
     * 获取指定用户的订单总数
     * @param userId 用户ID
     * @return 订单总数
     */
    int getOrderCountByUserId(Integer userId);
    
    /**
     * 获取指定状态的订单总数
     * @param status 订单状态
     * @return 订单总数
     */
    int getOrderCountByStatus(Integer status);
    
    /**
     * 根据用户ID和订单状态查询订单
     * @param userId 用户ID
     * @param status 订单状态
     * @return 订单列表
     */
    List<Order> getOrdersByUserIdAndStatus(Integer userId, Integer status);
}