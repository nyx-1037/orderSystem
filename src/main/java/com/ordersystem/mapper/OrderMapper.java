package com.ordersystem.mapper;

import com.ordersystem.entity.Order;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

/**
 * 订单数据访问接口
 */
@Mapper
public interface OrderMapper {
    
    /**
     * 插入订单
     * @param order 订单信息
     * @return 影响行数
     */
    int insert(Order order);
    
    /**
     * 根据主键删除订单
     * @param orderId 订单ID
     * @return 影响行数
     */
    int deleteByPrimaryKey(Integer orderId);
    
    /**
     * 更新订单
     * @param order 订单信息
     * @return 影响行数
     */
    int updateByPrimaryKey(Order order);
    
    /**
     * 根据主键查询订单
     * @param orderId 订单ID
     * @return 订单信息
     */
    Order selectByPrimaryKey(Integer orderId);
    
    /**
     * 查询所有订单
     * @return 订单列表
     */
    List<Order> selectAll();
    
    /**
     * 根据订单编号查询订单
     * @param orderNo 订单编号
     * @return 订单信息
     */
    Order selectByOrderNo(String orderNo);
    
    /**
     * 根据用户ID查询订单
     * @param userId 用户ID
     * @return 订单列表
     */
    List<Order> selectByUserId(Integer userId);
    
    /**
     * 根据订单状态查询订单
     * @param status 订单状态
     * @return 订单列表
     */
    List<Order> selectByStatus(Integer status);
    
    /**
     * 根据用户ID和订单状态查询订单
     * @param userId 用户ID
     * @param status 订单状态
     * @return 订单列表
     */
    List<Order> selectByUserIdAndStatus(@Param("userId") Integer userId, @Param("status") Integer status);
    
    /**
     * 根据UUID查询订单
     * @param orderUuid 订单UUID
     * @return 订单信息
     */
    Order selectByUuid(String orderUuid);
}