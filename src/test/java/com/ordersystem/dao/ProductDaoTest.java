package com.ordersystem.dao;

import com.ordersystem.OrderSystemApplication;
import com.ordersystem.entity.Product;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

/**
 * ProductDao测试类
 */
@SpringBootTest(classes = OrderSystemApplication.class)
public class ProductDaoTest {

    @Autowired
    private ProductDao productDao;

    /**
     * 测试查询所有商品
     */
    @Test
    public void testGetAllProducts() {
        List<Product> products = productDao.getAllProducts();
        // 验证查询结果不为null
        assertNotNull(products);
        // 打印查询结果
        System.out.println("查询到" + products.size() + "条商品记录");
        products.forEach(product -> System.out.println("商品ID: " + product.getProductId() + ", 商品名称: " + product.getProductName()));
    }

    /**
     * 测试根据ID查询商品
     */
    @Test
    public void testGetProductById() {
        // 假设数据库中存在ID为1的商品，如果不存在请修改为实际存在的ID
        Integer productId = 1;
        Product product = productDao.getProductById(productId);
        // 验证查询结果
        if (product != null) {
            System.out.println("商品详情: " + product.getProductName());
            assertEquals(productId, product.getProductId());
        } else {
            System.out.println("未找到ID为" + productId + "的商品");
        }
    }

    /**
     * 测试插入商品
     * 使用@Transactional注解确保测试后回滚，不影响数据库
     */
    @Test
    @Transactional
    public void testInsertProduct() {
        // 创建测试商品对象
        Product product = new Product();
        product.setProductName("测试商品");
        product.setProductDesc("这是一个测试商品描述");
        product.setPrice(new BigDecimal("99.99"));
        product.setStock(100);
        product.setStatus(1); // 上架状态
        
        // 执行插入操作
        int result = productDao.insertProduct(product);
        
        // 验证插入结果
        assertEquals(1, result);
        assertNotNull(product.getProductId()); // 验证自增ID是否已赋值
        System.out.println("插入商品成功，ID: " + product.getProductId() + ", 商品名称: " + product.getProductName());
    }

    /**
     * 测试更新商品
     * 使用@Transactional注解确保测试后回滚，不影响数据库
     */
    @Test
    @Transactional
    public void testUpdateProduct() {
        // 假设数据库中存在ID为1的商品，如果不存在请修改为实际存在的ID
        Integer productId = 1;
        Product product = productDao.getProductById(productId);
        
        if (product != null) {
            // 修改商品价格和库存
            BigDecimal newPrice = product.getPrice().add(new BigDecimal("10.00"));
            int newStock = product.getStock() + 50;
            
            product.setPrice(newPrice);
            product.setStock(newStock);
            
            // 执行更新操作
            int result = productDao.updateProduct(product);
            
            // 验证更新结果
            assertEquals(1, result);
            
            // 重新查询验证更新是否成功
            Product updatedProduct = productDao.getProductById(productId);
            assertEquals(newPrice, updatedProduct.getPrice());
            assertEquals(newStock, updatedProduct.getStock());
            
            System.out.println("更新商品成功，新价格: " + newPrice + ", 新库存: " + newStock);
        } else {
            System.out.println("未找到ID为" + productId + "的商品，无法进行更新测试");
        }
    }

    /**
     * 测试更新商品库存
     * 使用@Transactional注解确保测试后回滚，不影响数据库
     */
    @Test
    @Transactional
    public void testUpdateProductStock() {
        // 假设数据库中存在ID为1的商品，如果不存在请修改为实际存在的ID
        Integer productId = 1;
        Product product = productDao.getProductById(productId);
        
        if (product != null) {
            int originalStock = product.getStock();
            int stockChange = -5; // 减少5个库存
            
            // 执行库存更新操作
            int result = productDao.updateProductStock(productId, stockChange);
            
            // 验证更新结果
            assertEquals(1, result);
            
            // 重新查询验证更新是否成功
            Product updatedProduct = productDao.getProductById(productId);
            assertEquals(originalStock + stockChange, updatedProduct.getStock());
            
            System.out.println("更新商品库存成功，原库存: " + originalStock + ", 变化量: " + stockChange + ", 新库存: " + updatedProduct.getStock());
        } else {
            System.out.println("未找到ID为" + productId + "的商品，无法进行库存更新测试");
        }
    }
}