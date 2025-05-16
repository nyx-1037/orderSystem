package com.ordersystem.service;

import com.ordersystem.entity.Order;
import com.github.pagehelper.PageInfo;
import java.util.List;
import java.util.Map;

/**
 * 订单服务接口
 */
public interface OrderService {
    
    /**
     * 创建订单
     * @param order 订单信息
     * @return 是否成功
     */
    boolean createOrder(Order order);
    
    /**
     * 删除订单
     * @param orderId 订单ID
     * @return 是否成功
     */
    boolean deleteOrder(Integer orderId);
    
    /**
     * 更新订单信息
     * @param order 订单信息
     * @return 是否成功
     */
    boolean updateOrder(Order order);
    
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
     * 分页查询所有订单
     * @param pageNum 页码
     * @param pageSize 每页数量
     * @return 分页订单信息
     */
    PageInfo<Order> getAllOrdersByPage(Integer pageNum, Integer pageSize);
    
    /**
     * 根据用户ID查询订单
     * @param userId 用户ID
     * @return 订单列表
     */
    List<Order> getOrdersByUserId(Integer userId);
    
    /**
     * 根据用户ID分页查询订单
     * @param userId 用户ID
     * @param pageNum 页码
     * @param pageSize 每页数量
     * @return 分页订单信息
     */
    PageInfo<Order> getOrdersByUserIdWithPage(Integer userId, Integer pageNum, Integer pageSize);
    
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
     * 根据筛选条件分页查询所有订单
     * @param pageNum 页码
     * @param pageSize 每页数量
     * @param filters 筛选条件
     * @return 分页订单信息
     */
    PageInfo<Order> getAllOrdersByPageWithFilters(Integer pageNum, Integer pageSize, Map<String, Object> filters);
    
    /**
     * 根据用户ID和订单状态分页查询订单
     * @param userId 用户ID
     * @param status 订单状态
     * @param pageNum 页码
     * @param pageSize 每页数量
     * @return 分页订单信息
     */
    PageInfo<Order> getOrdersByUserIdAndStatusWithPage(Integer userId, Integer status, Integer pageNum, Integer pageSize);
    
    /**
     * 根据UUID查询订单详情（包含用户信息和订单明细）
     * @param orderUuid 订单UUID
     * @return 订单详情
     */
    Order getOrderDetailByUuid(String orderUuid);
    
    /**
     * 支付订单
     * @param orderId 订单ID
     * @return 是否成功
     */
    boolean payOrder(Integer orderId);
    
    /**
     * 发货
     * @param orderId 订单ID
     * @return 是否成功
     */
    boolean shipOrder(Integer orderId);
    
    /**
     * 完成订单
     * @param orderId 订单ID
     * @return 是否成功
     */
    boolean completeOrder(Integer orderId);
    
    /**
     * 取消订单
     * @param orderId 订单ID
     * @return 是否成功
     */
    boolean cancelOrder(Integer orderId);
    
    /**
     * 获取订单总数
     * @return 订单总数
     */
    Integer getOrderCount();
    
    /**
     * 获取近期订单数量和金额统计
     * @param days 天数，如获取最近15天的数据
     * @return 按日期分组的订单数量和金额统计
     */
    List<Map<String, Object>> getRecentOrdersCount(Integer days);
    
    /**
     * 获取订单状态分布
     * @return 订单状态分布统计
     */
    List<Map<String, Object>> getOrderStatusDistribution();
    
    /**
     * 获取商品类别销售分布
     * @return 商品类别销售分布统计
     */
    List<Map<String, Object>> getProductCategoryDistribution();
    
    /**
     * 获取支付方式分布
     * @return 支付方式分布统计
     */
    List<Map<String, Object>> getPaymentMethodDistribution();
}