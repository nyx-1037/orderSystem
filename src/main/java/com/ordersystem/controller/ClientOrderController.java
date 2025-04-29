package com.ordersystem.controller;

import com.github.pagehelper.PageInfo;
import com.ordersystem.entity.Order;
import com.ordersystem.service.OrderService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import javax.servlet.http.HttpServletRequest;
import java.util.HashMap;
import java.util.Map;

/**
 * 客户端订单控制器
 */
@RestController
@RequestMapping("/api/orders")
public class ClientOrderController {

    private static final Logger log = LoggerFactory.getLogger(ClientOrderController.class);

    @Autowired
    private OrderService orderService;
    
    /**
     * 获取客户端订单列表（支持分页和状态筛选）
     * @param page 页码，默认为1
     * @param size 每页数量，默认为5
     * @param status 订单状态，可选
     * @param search 搜索关键词，可选
     * @return 分页订单数据
     */
    @GetMapping
    public ResponseEntity<?> getClientOrders(
            @RequestParam(value = "page", defaultValue = "1") Integer page,
            @RequestParam(value = "size", defaultValue = "5") Integer size,
            @RequestParam(value = "status", required = false) Integer status,
            @RequestParam(value = "search", required = false) String search,
            HttpServletRequest request) {
        
        // 从请求属性中获取用户ID（由拦截器设置）
        Integer userId = (Integer) request.getAttribute("userId");
        
        if (userId == null) {
            // 用户未登录，返回错误
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", "未提供有效的Token");
            return ResponseEntity.status(401).body(response);
        }
        
        try {
            // 查询该用户的订单，支持状态筛选
            PageInfo<Order> pageInfo;
            if (status != null) {
                pageInfo = orderService.getOrdersByUserIdAndStatusWithPage(userId, status, page, size);
            } else {
                pageInfo = orderService.getOrdersByUserIdWithPage(userId, page, size);
            }
            
            // 构建响应数据
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("content", pageInfo.getList());
            response.put("totalPages", pageInfo.getPages());
            response.put("totalElements", pageInfo.getTotal());
            response.put("size", pageInfo.getPageSize());
            response.put("number", pageInfo.getPageNum());
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("获取客户端订单列表失败", e);
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", "获取订单列表失败: " + e.getMessage());
            return ResponseEntity.badRequest().body(response);
        }
    }
    
    /**
     * 获取订单详情
     */
    @GetMapping("/{uuid}")
    public ResponseEntity<?> getOrderDetail(@PathVariable("uuid") String uuid, HttpServletRequest request) {
        // 从请求属性中获取用户ID（由拦截器设置）
        Integer userId = (Integer) request.getAttribute("userId");
        
        if (userId == null) {
            // 用户未登录，返回错误
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", "未提供有效的Token");
            return ResponseEntity.status(401).body(response);
        }
        
        try {
            // 获取订单详情
            Order order = orderService.getOrderDetailByUuid(uuid);
            
            if (order == null) {
                Map<String, Object> response = new HashMap<>();
                response.put("success", false);
                response.put("message", "订单不存在");
                return ResponseEntity.badRequest().body(response);
            }
            
            // 验证订单所属用户
            if (!userId.equals(order.getUserId())) {
                Map<String, Object> response = new HashMap<>();
                response.put("success", false);
                response.put("message", "无权访问此订单");
                return ResponseEntity.status(403).body(response);
            }
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("data", order);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("获取订单详情失败", e);
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", "获取订单详情失败: " + e.getMessage());
            return ResponseEntity.badRequest().body(response);
        }
    }
    
    /**
     * 取消订单
     */
    @PostMapping("/cancel/{uuid}")
    public ResponseEntity<?> cancelOrder(@PathVariable("uuid") String uuid, HttpServletRequest request) {
        // 从请求属性中获取用户ID（由拦截器设置）
        Integer userId = (Integer) request.getAttribute("userId");
        
        if (userId == null) {
            // 用户未登录，返回错误
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", "未提供有效的Token");
            return ResponseEntity.status(401).body(response);
        }
        
        try {
            // 获取订单信息
            Order order = orderService.getOrderDetailByUuid(uuid);
            
            if (order == null) {
                Map<String, Object> response = new HashMap<>();
                response.put("success", false);
                response.put("message", "订单不存在");
                return ResponseEntity.badRequest().body(response);
            }
            
            // 验证订单所属用户
            if (!userId.equals(order.getUserId())) {
                Map<String, Object> response = new HashMap<>();
                response.put("success", false);
                response.put("message", "无权操作此订单");
                return ResponseEntity.status(403).body(response);
            }
            
            // 取消订单
            boolean success = orderService.cancelOrder(order.getOrderId());
            
            Map<String, Object> response = new HashMap<>();
            if (success) {
                response.put("success", true);
                response.put("message", "订单取消成功");
                return ResponseEntity.ok(response);
            } else {
                response.put("success", false);
                response.put("message", "订单取消失败");
                return ResponseEntity.badRequest().body(response);
            }
        } catch (Exception e) {
            log.error("取消订单失败", e);
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", "取消订单失败: " + e.getMessage());
            return ResponseEntity.badRequest().body(response);
        }
    }
}