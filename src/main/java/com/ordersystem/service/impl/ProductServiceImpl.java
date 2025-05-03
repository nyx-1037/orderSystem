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

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

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
    
    @Override
    public boolean updateProductImage(Integer productId, byte[] imageData) {
        if (productId == null || imageData == null || imageData.length == 0) {
            return false;
        }
        return productDao.updateProductImage(productId, imageData) > 0;
    }
    
    @Override
    public byte[] getProductImage(Integer productId) {
        if (productId == null) {
            return null;
        }
        Product product = productDao.getProductById(productId);
        return product != null ? product.getProductImage() : null;
    }
    
    /**
     * 根据筛选条件查询商品
     * @param filters 筛选条件，可包含name(商品名称)、category(分类)、status(状态)等
     * @return 商品列表
     */
    @Override
    public List<Product> getProductsByFilters(Map<String, Object> filters) {
        // 如果没有筛选条件，返回所有商品
        if (filters == null || filters.isEmpty()) {
            return productDao.getAllProducts();
        }
        
        List<Product> result = new ArrayList<>();
        
        // 根据商品名称筛选
        if (filters.containsKey("name")) {
            String name = (String) filters.get("name");
            if (name != null && !name.trim().isEmpty()) {
                // 如果已经有其他筛选条件，需要对结果进行二次筛选
                if (!result.isEmpty()) {
                    result.removeIf(product -> !product.getProductName().contains(name));
                } else {
                    // 否则直接查询数据库
                    result = productDao.getProductsByName(name);
                }
                // 如果没有匹配的结果，直接返回空列表
                if (result.isEmpty()) {
                    return result;
                }
            }
        }
        
        // 如果没有通过名称筛选，但需要其他筛选条件，先获取所有商品
        if (result.isEmpty()) {
            result = productDao.getAllProducts();
        }
        
        // 根据分类筛选
        if (filters.containsKey("category")) {
            Integer category = (Integer) filters.get("category");
            if (category != null) {
                result.removeIf(product -> !category.equals(product.getCategory()));
            }
        }
        
        // 根据状态筛选
        if (filters.containsKey("status")) {
            Integer status = (Integer) filters.get("status");
            if (status != null) {
                result.removeIf(product -> !status.equals(product.getStatus()));
            }
        }
        
        // 根据价格范围筛选
        if (filters.containsKey("minPrice")) {
            java.math.BigDecimal minPrice = (java.math.BigDecimal) filters.get("minPrice");
            if (minPrice != null) {
                result.removeIf(product -> product.getPrice().compareTo(minPrice) < 0);
            }
        }
        
        if (filters.containsKey("maxPrice")) {
            java.math.BigDecimal maxPrice = (java.math.BigDecimal) filters.get("maxPrice");
            if (maxPrice != null) {
                result.removeIf(product -> product.getPrice().compareTo(maxPrice) > 0);
            }
        }
        
        // 根据库存筛选
        if (filters.containsKey("minStock")) {
            Integer minStock = (Integer) filters.get("minStock");
            if (minStock != null) {
                result.removeIf(product -> product.getStock() < minStock);
            }
        }
        
        if (filters.containsKey("maxStock")) {
            Integer maxStock = (Integer) filters.get("maxStock");
            if (maxStock != null) {
                result.removeIf(product -> product.getStock() > maxStock);
            }
        }
        
        return result;
    }
}