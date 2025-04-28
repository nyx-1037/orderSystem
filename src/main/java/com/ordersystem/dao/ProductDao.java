package com.ordersystem.dao;

import com.ordersystem.entity.Product;
import java.util.List;

/**
 * 商品DAO接口
 */
public interface ProductDao {
    
    /**
     * 添加商品
     * @param product 商品信息
     * @return 影响行数
     */
    int insertProduct(Product product);
    
    /**
     * 根据ID删除商品
     * @param productId 商品ID
     * @return 影响行数
     */
    int deleteProductById(Integer productId);
    
    /**
     * 更新商品信息
     * @param product 商品信息
     * @return 影响行数
     */
    int updateProduct(Product product);
    
    /**
     * 根据ID查询商品
     * @param productId 商品ID
     * @return 商品信息
     */
    Product getProductById(Integer productId);
    
    /**
     * 查询所有商品
     * @return 商品列表
     */
    List<Product> getAllProducts();
    
    /**
     * 根据商品名称模糊查询
     * @param productName 商品名称
     * @return 商品列表
     */
    List<Product> getProductsByName(String productName);
    
    /**
     * 更新商品库存
     * @param productId 商品ID
     * @param stock 库存数量
     * @return 影响行数
     */
    int updateProductStock(Integer productId, Integer stock);
    
    /**
     * 更新商品图片
     * @param productId 商品ID
     * @param productImage 商品图片二进制数据
     * @return 影响行数
     */
    int updateProductImage(Integer productId, byte[] productImage);
}