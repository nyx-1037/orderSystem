package com.ordersystem.controller;

import com.ordersystem.entity.Product;
import com.ordersystem.service.ProductService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Paths;
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
    
    /**
     * 上传商品图片
     * @param productId 商品ID
     * @param file 图片文件
     * @return 操作结果
     */
    @PostMapping("/{productId}/image")
    public ResponseEntity<?> uploadProductImage(@PathVariable Integer productId, @RequestParam("file") MultipartFile file) {
        try {
            Product product = productService.getProductById(productId);
            if (product == null) {
                return ResponseEntity.notFound().build();
            }
            
            if (file.isEmpty()) {
                return ResponseEntity.badRequest().body("请选择要上传的图片");
            }
            
            // 获取文件内容
            byte[] imageData = file.getBytes();
            
            // 更新商品图片
            boolean result = productService.updateProductImage(productId, imageData);
            if (result) {
                return ResponseEntity.ok().body("图片上传成功");
            } else {
                return ResponseEntity.badRequest().body("图片上传失败");
            }
        } catch (IOException e) {
            System.err.println("上传商品图片时发生IO错误: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("图片上传失败：IO错误");
        } catch (Exception e) {
            System.err.println("上传商品图片时发生错误: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("图片上传失败：服务器内部错误");
        }
    }
    
    /**
     * 获取商品图片
     * @param productId 商品ID
     * @return 图片数据
     */
    @GetMapping("/{productId}/image")
    public ResponseEntity<?> getProductImage(@PathVariable Integer productId) {
        try {
            // 获取商品图片
            byte[] imageData = productService.getProductImage(productId);
            
            // 如果图片不存在，返回默认图片
            if (imageData == null || imageData.length == 0) {
                try {
                    // 读取默认图片
                    imageData = Files.readAllBytes(Paths.get("src/main/resources/static/images/default-product.jpg"));
                } catch (IOException e) {
                    System.err.println("读取默认商品图片时发生错误: " + e.getMessage());
                    return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("获取默认图片失败");
                }
            }
            
            // 设置响应头
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.IMAGE_JPEG);
            
            return new ResponseEntity<>(imageData, headers, HttpStatus.OK);
        } catch (Exception e) {
            System.err.println("获取商品图片时发生错误: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("获取图片失败：服务器内部错误");
        }
    }
    
    /**
     * 删除商品图片
     * @param productId 商品ID
     * @return 操作结果
     */
    @DeleteMapping("/{productId}/image")
    public ResponseEntity<?> deleteProductImage(@PathVariable Integer productId) {
        try {
            Product product = productService.getProductById(productId);
            if (product == null) {
                return ResponseEntity.notFound().build();
            }
            
            // 将图片设置为null
            boolean result = productService.updateProductImage(productId, null);
            if (result) {
                return ResponseEntity.ok().body("图片删除成功");
            } else {
                return ResponseEntity.badRequest().body("图片删除失败");
            }
        } catch (Exception e) {
            System.err.println("删除商品图片时发生错误: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("删除图片失败：服务器内部错误");
        }
    }
}