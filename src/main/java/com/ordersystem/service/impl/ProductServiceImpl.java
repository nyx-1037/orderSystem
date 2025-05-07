package com.ordersystem.service.impl;

import com.ordersystem.dao.OrderItemDao;
import com.ordersystem.dao.ProductDao;
import com.ordersystem.entity.OrderItem;
import com.ordersystem.entity.Product;
import com.ordersystem.service.ProductService;
import com.ordersystem.service.RedisService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * 商品服务实现类
 */
@Service
public class ProductServiceImpl implements ProductService, CommandLineRunner {

    private static final Logger logger = LoggerFactory.getLogger(ProductServiceImpl.class);
    
    @Autowired
    private RedisTemplate<String, Object> redisTemplate;
    
    @Autowired
    private ProductDao productDao;
    
    @Autowired
    private OrderItemDao orderItemDao; // 注入OrderItemDao
    
    @Autowired
    private RedisService redisService;
    
    /**
     * 项目启动时初始化商品数据到Redis缓存
     */
    @Override
    public void run(String... args) throws Exception {
        logger.info("开始初始化商品数据到Redis缓存...");
        List<Product> products = productDao.getAllProducts();
        for (Product product : products) {
            String key = "product:" + product.getProductId();
            redisService.set(key, product, 24 * 60 * 60); // 缓存24小时
        }
        logger.info("商品数据缓存初始化完成，共缓存{}条记录", products.size());
    }
    
    @Override
    @Transactional
    public boolean addProduct(Product product) {
        boolean result = productDao.insertProduct(product) > 0;
        if (result) {
            try {
                // 更新Redis缓存
                String key = "product:" + product.getProductId();
                redisService.set(key, product, 24 * 60 * 60); // 缓存24小时
                
                // 不再需要清除allProducts缓存，因为我们不再使用它
                // redisTemplate.delete("allProducts");
            } catch (Exception e) {
                logger.error("添加商品后更新缓存失败", e);
                // 缓存更新失败不影响业务操作
            }
        }
        return result;
    }

    @Override
    @Transactional
    public boolean deleteProduct(Integer productId) {
        // 检查是否有订单项关联此商品
        List<OrderItem> relatedItems = orderItemDao.getOrderItemsByProductId(productId);
        if (relatedItems != null && !relatedItems.isEmpty()) {
            // 如果有关联的订单项，则不允许删除
            logger.error("无法删除商品ID {}，因为它已被订单引用。", productId);
            return false;
        }
        // 没有关联的订单项，可以删除
        boolean result = productDao.deleteProductById(productId) > 0;
        if (result) {
            try {
                // 从Redis缓存中删除
                String key = "product:" + productId;
                redisService.delete(key);
                
                // 不再需要清除allProducts缓存，因为我们不再使用它
                // redisTemplate.delete("allProducts");
            } catch (Exception e) {
                logger.error("删除商品后清除缓存失败", e);
                // 缓存操作失败不影响业务操作
            }
        }
        return result;
    }

    @Override
    @Transactional
    public boolean updateProduct(Product product) {
        boolean result = productDao.updateProduct(product) > 0;
        if (result) {
            try {
                // 获取更新后的商品信息
                Product updatedProduct = productDao.getProductById(product.getProductId());
                if (updatedProduct != null) {
                    // 更新Redis缓存
                    String key = "product:" + product.getProductId();
                    redisService.set(key, updatedProduct, 24 * 60 * 60); // 缓存24小时
                    
                    // 不再需要清除allProducts缓存，因为我们不再使用它
                    // redisTemplate.delete("allProducts");
                }
            } catch (Exception e) {
                logger.error("更新商品后更新缓存失败", e);
                // 缓存操作失败不影响业务操作
            }
        }
        return result;
    }

    @Override
    public Product getProductById(Integer productId) {
        Product product = null;
        String key = "product:" + productId;
        
        try {
            // 先从Redis缓存中获取
            product = redisService.get(key, Product.class);
            if (product != null) {
                logger.debug("从Redis缓存中获取商品数据，productId={}", productId);
                return product;
            }
        } catch (Exception e) {
            logger.error("从Redis获取商品数据失败，将从数据库获取, productId={}", productId, e);
            // Redis获取失败，继续从数据库获取
        }
        
        // 缓存中没有或获取失败，从数据库获取
        product = productDao.getProductById(productId);
        if (product != null) {
            try {
                // 放入缓存
                redisService.set(key, product, 24 * 60 * 60); // 缓存24小时
            } catch (Exception e) {
                logger.error("将商品数据放入Redis缓存失败, productId={}", productId, e);
                // 缓存操作失败不影响业务操作
            }
        }
        return product;
    }

    @Override
    public List<Product> getAllProducts() {
        // 直接从数据库获取所有商品，不使用Redis缓存整个列表
        // 这样可以让PageHelper正确处理分页
        List<Product> products = productDao.getAllProducts();
        
        try {
            if (products != null && !products.isEmpty()) {
                // 只缓存单个商品，不缓存整个列表
                // 这样可以保证分页功能正常工作
                for (Product product : products) {
                    String key = "product:" + product.getProductId();
                    redisService.set(key, product, 24 * 60 * 60); // 缓存24小时
                }
                
                // 不再缓存整个列表，因为这会导致分页失效
                // redisService.set("allProducts", products, 24 * 60 * 60);
            }
        } catch (Exception e) {
            logger.error("将商品数据放入Redis缓存失败", e);
            // 缓存操作失败不影响业务操作
        }
        
        return products;
    }

    @Override
    public List<Product> getProductsByName(String productName) {
        return productDao.getProductsByName(productName);
    }
    
    @Override
    @Transactional
    public boolean updateProductStock(Integer productId, Integer stock) {
        Product product = getProductById(productId);
        if (product != null) {
            // 计算新库存
            int newStock = product.getStock() + stock;
            // 库存不能小于0
            if (newStock < 0) {
                return false;
            }
            product.setStock(newStock);
            boolean result = productDao.updateProduct(product) > 0;
            if (result) {
                // 更新Redis缓存
                String key = "product:" + productId;
                redisService.set(key, product, 24 * 60 * 60); // 缓存24小时
            }
            return result;
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
        
        // 如果没有通过名称筛选，但需要其他筛选条件，直接从数据库获取所有商品
        // 不使用缓存，确保PageHelper可以正确处理分页
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