package com.ordersystem.controller;

import io.swagger.annotations.Api;
import io.swagger.annotations.ApiOperation;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 商品分类控制器
 * 提供商品分类相关的RESTful API
 */
@Api(tags = "商品分类管理", description = "商品分类的增删改查接口")
@RestController
public class CategoryController {

    private static final Logger log = LoggerFactory.getLogger(CategoryController.class);

    /**
     * 获取所有商品分类
     * 支持两种API路径，解决前端请求404问题
     * 
     * @return 分类列表
     */
    @ApiOperation(value = "获取所有商品分类", notes = "返回系统中所有可用的商品分类列表")
    @GetMapping("/api/categories")
    public ResponseEntity<?> getAllCategories() {
        log.info("获取所有商品分类");
        return ResponseEntity.ok(getDefaultCategories());
    }
    
    /**
     * 获取所有商品分类（备用API路径）
     * 
     * @return 分类列表
     */
    @ApiOperation(value = "获取所有商品分类(备用路径)", notes = "通过备用API路径返回系统中所有可用的商品分类列表")
    @GetMapping("/api/category/list")
    public ResponseEntity<?> getCategoryList() {
        log.info("通过备用API路径获取所有商品分类");
        return ResponseEntity.ok(getDefaultCategories());
    }
    
    /**
     * 获取默认分类列表
     * 
     * @return 默认分类列表
     */
    private List<Map<String, Object>> getDefaultCategories() {
        List<Map<String, Object>> categories = new ArrayList<>();
        
        // 添加默认分类
        Map<String, Object> category1 = new HashMap<>();
        category1.put("id", 1);
        category1.put("name", "电子产品");
        categories.add(category1);
        
        Map<String, Object> category2 = new HashMap<>();
        category2.put("id", 2);
        category2.put("name", "服装");
        categories.add(category2);
        
        Map<String, Object> category3 = new HashMap<>();
        category3.put("id", 3);
        category3.put("name", "食品");
        categories.add(category3);
        
        Map<String, Object> category4 = new HashMap<>();
        category4.put("id", 4);
        category4.put("name", "图书");
        categories.add(category4);
        
        Map<String, Object> category5 = new HashMap<>();
        category5.put("id", 5);
        category5.put("name", "家居");
        categories.add(category5);
        
        return categories;
    }
}