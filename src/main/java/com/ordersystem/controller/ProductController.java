package com.ordersystem.controller;

import com.github.pagehelper.PageHelper;
import com.github.pagehelper.PageInfo;
import com.ordersystem.entity.Product;
import com.ordersystem.service.ProductService;
import com.ordersystem.util.UUIDGenerater;
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
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 商品控制器
 * 提供商品相关的RESTful API
 */
@RestController
@RequestMapping("/api/products")
public class ProductController {

    @Autowired
    private ProductService productService;

    /**
     * 获取商品列表（支持分页和筛选）
     * 使用PageHelper实现分页
     * 
     * @param pageNum 页码
     * @param pageSize 每页数量
     * @param name 商品名称（可选）
     * @param category 商品分类（可选）
     * @param status 商品状态（可选）
     * @return 分页商品数据
     */
    @GetMapping
    public ResponseEntity<?> getAllProducts(
            @RequestParam(value = "pageNum", defaultValue = "1") Integer pageNum,
            @RequestParam(value = "pageSize", defaultValue = "8") Integer pageSize,
            @RequestParam(value = "name", required = false) String name,
            @RequestParam(value = "category", required = false) Integer category,
            @RequestParam(value = "status", required = false) Integer status,
            @RequestParam(value = "sort", required = false) String sort,
            @RequestParam(value = "order", required = false) String order) {
        
        // 处理筛选条件
        Map<String, Object> filters = new HashMap<>();
        if (name != null && !name.trim().isEmpty()) {
            filters.put("name", name.trim());
        }
        if (category != null) {
            filters.put("category", category);
        }
        if (status != null) {
            filters.put("status", status);
        }
        
        // 构建排序条件
        String orderBy = null;
        if (sort != null && !sort.isEmpty() && order != null && !order.isEmpty()) {
            // 防止SQL注入，只允许特定字段排序
            if ("price".equals(sort)) {
                String orderDirection = "asc".equalsIgnoreCase(order) ? "asc" : "desc";
                orderBy = sort + " " + orderDirection;
            } else if ("createTime".equals(sort)) {
                // 将Java属性名映射到数据库列名
                String orderDirection = "asc".equalsIgnoreCase(order) ? "asc" : "desc";
                orderBy = "create_time " + orderDirection;
            }
        }
        
        // 使用PageHelper设置分页参数和排序
        if (orderBy != null) {
            PageHelper.startPage(pageNum, pageSize, orderBy);
        } else {
            PageHelper.startPage(pageNum, pageSize);
        }
        
        // 使用筛选条件查询商品
        List<Product> products;
        if (filters.isEmpty()) {
            products = productService.getAllProducts();
        } else {
            products = productService.getProductsByFilters(filters);
        }
        
        // 使用PageInfo包装查询结果
        PageInfo<Product> pageInfo = new PageInfo<>(products);
        
        // 创建符合前端期望的分页格式响应
        Map<String, Object> response = new HashMap<>();
        response.put("list", pageInfo.getList());
        response.put("total", pageInfo.getTotal());
        response.put("pages", pageInfo.getPages());
        response.put("pageNum", pageInfo.getPageNum());
        response.put("pageSize", pageInfo.getPageSize());
        response.put("hasNextPage", pageInfo.isHasNextPage());
        
        return ResponseEntity.ok(response);
    }

    /**
     * 根据ID获取商品
     * 
     * @param productId 商品ID
     * @return 商品数据
     */
    @GetMapping("/{productId}")
    public ResponseEntity<?> getProductById(@PathVariable Integer productId) {
        Product product = productService.getProductById(productId);
        if (product != null) {
            return ResponseEntity.ok(product);
        }
        return ResponseEntity.notFound().build();
    }
    
    /**
     * 根据ID获取商品（内部使用）
     * 注意：此接口仅供系统内部使用，不对外暴露
     * 
     * @param productId 商品ID
     * @return 商品数据
     */
    @GetMapping("/internal/{productId}")
    public ResponseEntity<Product> getProductByIdInternal(@PathVariable Integer productId) {
        Product product = productService.getProductById(productId);
        if (product != null) {
            return ResponseEntity.ok(product);
        } else {
            return ResponseEntity.notFound().build();
        }
    }

    /**
     * 添加商品
     * 
     * @param product 商品信息
     * @return 操作结果
     */
    @PostMapping
    public ResponseEntity<?> createProduct(@RequestBody Product product) {
        // 初始化商品信息
        
        // 生成UUID
        if (product.getProductUuid() == null || product.getProductUuid().isEmpty()) {
            product.setProductUuid(UUIDGenerater.generateUUID());
        }
        
        // 设置默认分类
        if (product.getCategory() == null) {
            product.setCategory(0); // 默认为其他分类
        }
        
        // 设置创建和更新时间
        if (product.getCreateTime() == null) {
            product.setCreateTime(new java.util.Date());
        }
        product.setUpdateTime(new java.util.Date());
        
        boolean result = productService.addProduct(product);
        if (result) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "商品添加成功");
            response.put("productId", product.getProductId());
            response.put("product", product);
            return ResponseEntity.status(HttpStatus.CREATED).body(response);
        } else {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", "商品添加失败");
            return ResponseEntity.badRequest().body(response);
        }
    }

    /**
     * 更新商品信息
     * 
     * @param productId 商品ID
     * @param product 商品信息
     * @return 操作结果
     */
    @PutMapping("/{productId}")
    public ResponseEntity<?> updateProduct(@PathVariable Integer productId, @RequestBody Product product) {
        // 查找商品
        Product existingProduct = productService.getProductById(productId);
        
        if (existingProduct == null) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", "商品不存在");
            return ResponseEntity.notFound().build();
        }
        
        // 更新商品信息，保留ID
        product.setProductId(existingProduct.getProductId());
        product.setUpdateTime(new java.util.Date());
        
        boolean result = productService.updateProduct(product);
        if (result) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "商品更新成功");
            response.put("product", product);
            return ResponseEntity.ok(response);
        } else {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", "商品更新失败");
            return ResponseEntity.badRequest().body(response);
        }
    }

    /**
     * 删除商品
     * 
     * @param productId 商品ID
     * @return 操作结果
     */
    @DeleteMapping("/{productId}")
    public ResponseEntity<?> deleteProduct(@PathVariable Integer productId) {
        try {
            // 查找商品
            Product productToDelete = productService.getProductById(productId);
            
            if (productToDelete == null) {
                Map<String, Object> response = new HashMap<>();
                response.put("success", false);
                response.put("message", "商品不存在");
                return ResponseEntity.notFound().build();
            }

            boolean result = productService.deleteProduct(productToDelete.getProductId());
            if (result) {
                Map<String, Object> response = new HashMap<>();
                response.put("success", true);
                response.put("message", "商品删除成功");
                return ResponseEntity.ok(response);
            } else {
                Map<String, Object> response = new HashMap<>();
                response.put("success", false);
                response.put("message", "商品删除失败，可能已被订单引用");
                return ResponseEntity.status(HttpStatus.CONFLICT).body(response);
            }
        } catch (DataIntegrityViolationException e) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", "删除失败：该商品已被引用，无法删除");
            return ResponseEntity.status(HttpStatus.CONFLICT).body(response);
        } catch (Exception e) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", "删除失败：" + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }
    
    /**
     * 根据名称搜索商品
     * 
     * @param productName 商品名称
     * @return 商品列表
     */
    @GetMapping("/search")
    public ResponseEntity<?> searchProducts(@RequestParam("name") String productName) {
        List<Product> products = productService.getProductsByName(productName);
        
        // 创建符合前端期望的分页格式响应
        Map<String, Object> response = new HashMap<>();
        response.put("list", products);
        response.put("total", products.size());
        response.put("pages", 1); // 由于返回所有数据，所以只有1页
        response.put("pageNum", 1);
        response.put("pageSize", products.size());
        
        return ResponseEntity.ok(response);
    }
    
    /**
     * 更新商品库存
     * 
     * @param productId 商品ID
     * @param stock 库存变化量（正数增加，负数减少）
     * @return 操作结果
     */
    @PutMapping("/{productId}/stock")
    public ResponseEntity<?> updateStock(
            @PathVariable Integer productId,
            @RequestParam Integer stock) {
        // 查找商品
        Product productToUpdate = productService.getProductById(productId);
        
        if (productToUpdate == null) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", "商品不存在");
            return ResponseEntity.notFound().build();
        }
        
        boolean result = productService.updateProductStock(productToUpdate.getProductId(), stock);
        if (result) {
            // 获取更新后的商品信息
            Product updatedProduct = productService.getProductById(productToUpdate.getProductId());
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "库存更新成功");
            response.put("currentStock", updatedProduct.getStock());
            return ResponseEntity.ok(response);
        } else {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", "库存更新失败，可能库存不足");
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
        }
    }
    
    /**
     * 上传商品图片
     * 
     * @param productId 商品ID
     * @param file 图片文件
     * @return 操作结果
     */
    @PostMapping("/{productId}/image")
    public ResponseEntity<?> uploadImage(
            @PathVariable Integer productId,
            @RequestParam("file") MultipartFile file) {
        try {
            // 查找商品
            Product productToUpdate = productService.getProductById(productId);
            
            if (productToUpdate == null) {
                Map<String, Object> response = new HashMap<>();
                response.put("success", false);
                response.put("message", "商品不存在");
                return ResponseEntity.notFound().build();
            }
            
            if (file.isEmpty()) {
                Map<String, Object> response = new HashMap<>();
                response.put("success", false);
                response.put("message", "请选择要上传的图片");
                return ResponseEntity.badRequest().body(response);
            }
            
            // 读取图片数据
            byte[] imageData = file.getBytes();
            
            // 更新商品图片
            boolean result = productService.updateProductImage(productToUpdate.getProductId(), imageData);
            if (result) {
                Map<String, Object> response = new HashMap<>();
                response.put("success", true);
                response.put("message", "图片上传成功");
                return ResponseEntity.ok(response);
            } else {
                Map<String, Object> response = new HashMap<>();
                response.put("success", false);
                response.put("message", "图片上传失败");
                return ResponseEntity.badRequest().body(response);
            }
        } catch (IOException e) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", "图片上传失败：" + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }
    
    /**
     * 获取商品图片
     * 
     * @param productId 商品ID
     * @return 图片数据
     */
    @GetMapping("/{productId}/image")
    public ResponseEntity<?> getImage(@PathVariable Integer productId) {
        try {
            // 查找商品
            Product product = productService.getProductById(productId);
            
            if (product == null) {
                return ResponseEntity.notFound().build();
            }
            
            byte[] imageData = productService.getProductImage(product.getProductId());
            
            // 如果图片不存在，返回默认图片
            if (imageData == null || imageData.length == 0) {
                try {
                    // 读取默认图片
                    imageData = Files.readAllBytes(Paths.get("src/main/resources/static/images/default-product.jpg"));
                } catch (IOException e) {
                    Map<String, Object> response = new HashMap<>();
                    response.put("success", false);
                    response.put("message", "获取默认图片失败");
                    return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
                }
            }
            
            // 设置响应头
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.IMAGE_JPEG);
            
            return new ResponseEntity<>(imageData, headers, HttpStatus.OK);
        } catch (Exception e) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", "获取图片失败：" + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }
    
    /**
     * 删除商品图片
     * 
     * @param productId 商品ID
     * @return 操作结果
     */
    @DeleteMapping("/{productId}/image")
    public ResponseEntity<?> deleteProductImage(@PathVariable Integer productId) {
        try {
            // 查找商品
            Product product = productService.getProductById(productId);
            
            if (product == null) {
                Map<String, Object> response = new HashMap<>();
                response.put("success", false);
                response.put("message", "商品不存在");
                return ResponseEntity.notFound().build();
            }
            
            // 将图片设置为null
            boolean result = productService.updateProductImage(product.getProductId(), null);
            if (result) {
                Map<String, Object> response = new HashMap<>();
                response.put("success", true);
                response.put("message", "图片删除成功");
                return ResponseEntity.ok(response);
            } else {
                Map<String, Object> response = new HashMap<>();
                response.put("success", false);
                response.put("message", "图片删除失败");
                return ResponseEntity.badRequest().body(response);
            }
        } catch (Exception e) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", "删除图片失败：" + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }
}