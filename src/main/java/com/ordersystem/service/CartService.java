package com.ordersystem.service;

import com.github.pagehelper.PageInfo;
import com.ordersystem.entity.Cart;

import java.util.List;

/**
 * 购物车服务接口
 */
public interface CartService {
    
    /**
     * 添加商品到购物车
     * 
     * @param userId 用户ID
     * @param productId 商品ID
     * @param quantity 数量
     * @return 是否成功
     */
    boolean addToCart(Integer userId, Integer productId, Integer quantity);
    
    /**
     * 更新购物车商品数量
     * 
     * @param cartId 购物车ID
     * @param quantity 数量
     * @return 是否成功
     */
    boolean updateCartQuantity(Integer cartId, Integer quantity);
    
    /**
     * 更新购物车商品选中状态
     * 
     * @param cartId 购物车ID
     * @param selected 选中状态：0-未选中，1-已选中
     * @return 是否成功
     */
    boolean updateCartSelected(Integer cartId, Integer selected);
    
    /**
     * 删除购物车商品
     * 
     * @param cartId 购物车ID
     * @return 是否成功
     */
    boolean deleteCart(Integer cartId);
    
    /**
     * 清空用户购物车
     * 
     * @param userId 用户ID
     * @return 是否成功
     */
    boolean clearCart(Integer userId);
    
    /**
     * 获取购物车商品列表
     * 
     * @param userId 用户ID
     * @return 购物车商品列表
     */
    List<Cart> getCartList(Integer userId);
    
    /**
     * 获取购物车商品列表（分页）
     * 
     * @param userId 用户ID
     * @param pageNum 页码
     * @param pageSize 每页数量
     * @return 分页购物车商品列表
     */
    PageInfo<Cart> getCartListWithPage(Integer userId, Integer pageNum, Integer pageSize);
    
    /**
     * 获取已选中的购物车商品列表
     * 
     * @param userId 用户ID
     * @return 已选中的购物车商品列表
     */
    List<Cart> getSelectedCartList(Integer userId);
    
    /**
     * 全选/取消全选购物车商品
     * 
     * @param userId 用户ID
     * @param selected 选中状态：0-未选中，1-已选中
     * @return 是否成功
     */
    boolean selectAllCart(Integer userId, Integer selected);
    
    /**
     * 获取购物车商品数量
     * 
     * @param userId 用户ID
     * @return 购物车商品数量
     */
    int getCartCount(Integer userId);
    
    /**
     * 检查商品是否在购物车中
     * 
     * @param userId 用户ID
     * @param productId 商品ID
     * @return 是否在购物车中
     */
    boolean isProductInCart(Integer userId, Integer productId);
}