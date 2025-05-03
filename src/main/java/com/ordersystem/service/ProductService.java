package com.ordersystem.service;

import com.ordersystem.entity.Product;
import java.util.List;
import java.util.Map;

/**
 * 商品服务接口
 */
public interface ProductService {
    
    /**
     * 添加商品
     * @param product 商品信息
     * @return 是否成功
     */
    boolean addProduct(Product product);
    
    /**
     * 删除商品
     * @param productId 商品ID
     * @return 是否成功
     */
    boolean deleteProduct(Integer productId);
    
    /**
     * 更新商品信息
     * @param product 商品信息
     * @return 是否成功
     */
    boolean updateProduct(Product product);
    
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
     * @param stock 库存变化量（正数增加，负数减少）
     * @return 是否成功
     */
    boolean updateProductStock(Integer productId, Integer stock);
    
    /**
     * 更新商品图片
     * @param productId 商品ID
     * @param imageData 图片二进制数据
     * @return 是否成功
     */
    boolean updateProductImage(Integer productId, byte[] imageData);
    
    /**
     * 获取商品图片
     * @param productId 商品ID
     * @return 图片二进制数据
     */
    byte[] getProductImage(Integer productId);
    
    /**
     * 根据筛选条件查询商品
     * @param filters 筛选条件，可包含name(商品名称)、category(分类)、status(状态)等
     * @return 商品列表
     */
    List<Product> getProductsByFilters(Map<String, Object> filters);
}