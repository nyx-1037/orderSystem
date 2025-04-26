package com.ordersystem.controller;

import com.ordersystem.entity.Product;
import com.ordersystem.service.ProductService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * 产品控制器
 */
@RestController
@RequestMapping("/api/product")
public class ProductController {

    @Autowired
    private ProductService productService;

    /**
     * 获取产品列表
     * @return 产品列表数据
     */
    @GetMapping("/list")
    public ResponseEntity<List<Product>> list() {
        List<Product> products = productService.getAllProducts();
        return ResponseEntity.ok(products);
    }

    /**
     * 根据ID获取产品
     * @param productId 产品ID
     * @return 产品数据
     */
    @GetMapping("/{productId}")
    public ResponseEntity<Product> getProduct(@PathVariable Integer productId) {
        Product product = productService.getProductById(productId);
        if (product != null) {
            return ResponseEntity.ok(product);
        } else {
            return ResponseEntity.notFound().build();
        }
    }

    /**
     * 添加产品
     * @param product 产品信息
     * @return 操作结果
     */
    @PostMapping("/add")
    public ResponseEntity<?> addProduct(@RequestBody Product product) {
        boolean result = productService.addProduct(product);
        if (result) {
            return ResponseEntity.ok().body("添加成功");
        } else {
            return ResponseEntity.badRequest().body("添加失败");
        }
    }

    /**
     * 更新产品
     * @param product 产品信息
     * @return 操作结果
     */
    @PutMapping("/update")
    public ResponseEntity<?> updateProduct(@RequestBody Product product) {
        boolean result = productService.updateProduct(product);
        if (result) {
            return ResponseEntity.ok().body("更新成功");
        } else {
            return ResponseEntity.badRequest().body("更新失败");
        }
    }

    /**
     * 删除产品
     * @param productId 产品ID
     * @return 操作结果
     */
    @DeleteMapping("/{productId}")
    public ResponseEntity<?> deleteProduct(@PathVariable Integer productId) {
        try {
            Product product = productService.getProductById(productId);
            if (product == null) {
                return ResponseEntity.notFound().build();
            }

            boolean result = productService.deleteProduct(productId);
            if (result) {
                return ResponseEntity.ok().body("删除成功");
            } else {
                return ResponseEntity.status(HttpStatus.CONFLICT).body("删除失败：商品可能已被订单引用或存在其他约束。");
            }
        } catch (DataIntegrityViolationException e) {
            System.err.println("删除商品时发生数据完整性约束错误: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.CONFLICT).body("删除失败：商品已被订单引用，无法删除。");
        } catch (Exception e) {
            System.err.println("删除商品时发生错误: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("删除失败：服务器内部错误。");
        }
    }
}