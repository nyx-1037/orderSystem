package com.ordersystem.dao;

import com.ordersystem.entity.Cart;
import org.apache.ibatis.annotations.*;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * 购物车数据访问接口
 */
@Repository
@Mapper
public interface CartDao {
    
    /**
     * 添加购物车项
     * 
     * @param cart 购物车信息
     * @return 影响行数
     */
    @Insert("INSERT INTO cart (user_id, product_id, quantity, selected) VALUES (#{userId}, #{productId}, #{quantity}, #{selected})")
    @Options(useGeneratedKeys = true, keyProperty = "cartId")
    int addCart(Cart cart);
    
    /**
     * 更新购物车项
     * 
     * @param cart 购物车信息
     * @return 影响行数
     */
    @Update("UPDATE cart SET quantity = #{quantity}, selected = #{selected}, update_time = NOW() WHERE cart_id = #{cartId}")
    int updateCart(Cart cart);
    
    /**
     * 更新购物车项数量
     * 
     * @param cartId 购物车ID
     * @param quantity 数量
     * @return 影响行数
     */
    @Update("UPDATE cart SET quantity = #{quantity}, update_time = NOW() WHERE cart_id = #{cartId}")
    int updateCartQuantity(@Param("cartId") Integer cartId, @Param("quantity") Integer quantity);
    
    /**
     * 更新购物车项选中状态
     * 
     * @param cartId 购物车ID
     * @param selected 选中状态
     * @return 影响行数
     */
    @Update("UPDATE cart SET selected = #{selected}, update_time = NOW() WHERE cart_id = #{cartId}")
    int updateCartSelected(@Param("cartId") Integer cartId, @Param("selected") Integer selected);
    
    /**
     * 删除购物车项
     * 
     * @param cartId 购物车ID
     * @return 影响行数
     */
    @Delete("DELETE FROM cart WHERE cart_id = #{cartId}")
    int deleteCart(Integer cartId);
    
    /**
     * 根据用户ID和商品ID删除购物车项
     * 
     * @param userId 用户ID
     * @param productId 商品ID
     * @return 影响行数
     */
    @Delete("DELETE FROM cart WHERE user_id = #{userId} AND product_id = #{productId}")
    int deleteCartByUserIdAndProductId(@Param("userId") Integer userId, @Param("productId") Integer productId);
    
    /**
     * 清空用户购物车
     * 
     * @param userId 用户ID
     * @return 影响行数
     */
    @Delete("DELETE FROM cart WHERE user_id = #{userId}")
    int clearCart(Integer userId);
    
    /**
     * 根据ID查询购物车项
     * 
     * @param cartId 购物车ID
     * @return 购物车信息
     */
    @Select("SELECT * FROM cart WHERE cart_id = #{cartId}")
    Cart getCartById(Integer cartId);
    
    /**
     * 根据用户ID和商品ID查询购物车项
     * 
     * @param userId 用户ID
     * @param productId 商品ID
     * @return 购物车信息
     */
    @Select("SELECT * FROM cart WHERE user_id = #{userId} AND product_id = #{productId}")
    Cart getCartByUserIdAndProductId(@Param("userId") Integer userId, @Param("productId") Integer productId);
    
    /**
     * 查询用户购物车列表
     * 
     * @param userId 用户ID
     * @return 购物车列表
     */
    @Select("SELECT c.*, p.product_name, p.price, p.stock, p.status, p.product_image "
            + "FROM cart c "
            + "LEFT JOIN product p ON c.product_id = p.product_id "
            + "WHERE c.user_id = #{userId} "
            + "ORDER BY c.create_time DESC")
    @Results({
        @Result(property = "cartId", column = "cart_id"),
        @Result(property = "userId", column = "user_id"),
        @Result(property = "productId", column = "product_id"),
        @Result(property = "quantity", column = "quantity"),
        @Result(property = "selected", column = "selected"),
        @Result(property = "createTime", column = "create_time"),
        @Result(property = "updateTime", column = "update_time"),
        // Map joined product fields directly to Cart entity fields
        @Result(property = "productName", column = "product_name"),
        @Result(property = "productPrice", column = "price"),
        @Result(property = "productStock", column = "stock"),
        @Result(property = "productStatus", column = "status"),
        @Result(property = "productImage", column = "product_image")
    })
    List<Cart> getCartListByUserId(Integer userId);
    
    /**
     * 查询用户购物车中已选中的商品列表
     * 
     * @param userId 用户ID
     * @return 购物车列表
     */
    @Select("SELECT c.*, p.product_name, p.price, p.stock, p.status, p.product_image "
            + "FROM cart c "
            + "LEFT JOIN product p ON c.product_id = p.product_id "
            + "WHERE c.user_id = #{userId} AND c.selected = 1 "
            + "ORDER BY c.create_time DESC")
    @Results({
        @Result(property = "cartId", column = "cart_id"),
        @Result(property = "userId", column = "user_id"),
        @Result(property = "productId", column = "product_id"),
        @Result(property = "quantity", column = "quantity"),
        @Result(property = "selected", column = "selected"),
        @Result(property = "createTime", column = "create_time"),
        @Result(property = "updateTime", column = "update_time"),
        // Map joined product fields directly to Cart entity fields
        @Result(property = "productName", column = "product_name"),
        @Result(property = "productPrice", column = "price"),
        @Result(property = "productStock", column = "stock"),
        @Result(property = "productStatus", column = "status"),
        @Result(property = "productImage", column = "product_image")
    })
    List<Cart> getSelectedCartListByUserId(Integer userId);
    
    /**
     * 统计用户购物车商品总数
     * 
     * @param userId 用户ID
     * @return 商品总数
     */
    @Select("SELECT COUNT(*) FROM cart WHERE user_id = #{userId}")
    int countCartByUserId(Integer userId);
    
    /**
     * 批量更新购物车项选中状态
     * 
     * @param userId 用户ID
     * @param selected 选中状态
     * @return 影响行数
     */
    @Update("UPDATE cart SET selected = #{selected}, update_time = NOW() WHERE user_id = #{userId}")
    int updateCartSelectedByUserId(@Param("userId") Integer userId, @Param("selected") Integer selected);
}