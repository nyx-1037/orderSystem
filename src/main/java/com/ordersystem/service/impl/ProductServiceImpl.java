package com.ordersystem.service.impl;

import com.ordersystem.dao.OrderItemDao;
import com.ordersystem.dao.ProductDao;
import com.ordersystem.entity.OrderItem;
import com.ordersystem.entity.Product;
import com.ordersystem.service.ProductService;
import com.ordersystem.service.RedisService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * 商品服务实现类
 */
@Service
public class ProductServiceImpl implements ProductService {

    @Autowired
    private ProductDao productDao;
    

    @Autowired
    private OrderItemDao orderItemDao; // 注入OrderItemDao
    
    @Override
    public boolean addProduct(Product product) {
        return productDao.insertProduct(product) > 0;
    }

    @Override
    public boolean deleteProduct(Integer productId) {
        // 检查是否有订单项关联此商品
        List<OrderItem> relatedItems = orderItemDao.getOrderItemsByProductId(productId);
        if (relatedItems != null && !relatedItems.isEmpty()) {
            // 如果有关联的订单项，则不允许删除
            System.err.println("无法删除商品ID " + productId + "，因为它已被订单引用。");
            return false;
        }
        // 没有关联的订单项，可以删除
        return productDao.deleteProductById(productId) > 0;
    }

    @Override
    public boolean updateProduct(Product product) {
        return productDao.updateProduct(product) > 0;
    }

    @Override
    public Product getProductById(Integer productId) {
        return productDao.getProductById(productId);
    }

    @Override
    public List<Product> getAllProducts() {
        return productDao.getAllProducts();
    }

    @Override
    public List<Product> getProductsByName(String productName) {
        return productDao.getProductsByName(productName);
    }
    
    @Override
    public boolean updateProductStock(Integer productId, Integer stock) {
        Product product = productDao.getProductById(productId);
        if (product != null) {
            // 计算新库存
            int newStock = product.getStock() + stock;
            // 库存不能小于0
            if (newStock < 0) {
                return false;
            }
            product.setStock(newStock);
            return productDao.updateProduct(product) > 0;
        }
        return false;
    }
}