package com.ordersystem.controller;

import com.github.pagehelper.PageInfo;
import com.ordersystem.entity.Order;
import com.ordersystem.entity.User;
import com.ordersystem.service.OrderService;
import com.ordersystem.util.UUIDGenerater;
import io.swagger.annotations.Api;
import io.swagger.annotations.ApiImplicitParam;
import io.swagger.annotations.ApiImplicitParams;
import io.swagger.annotations.ApiOperation;
import io.swagger.annotations.ApiParam;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import javax.servlet.http.HttpServletRequest;
import java.util.HashMap;
import java.util.Map;

/**
 * 客户端订单控制器
 * 提供客户端订单相关的RESTful API
 */
@Api(tags = "客户端订单管理", description = "客户端订单的查询和操作接口")
@RestController
@RequestMapping("/api/client/orders")
public class ClientOrderController {

    private static final Logger log = LoggerFactory.getLogger(ClientOrderController.class);

    @Autowired
    private OrderService orderService;
    
    /**
     * 获取客户端订单列表（支持分页和状态筛选）
     * 
     * @param page 页码，默认为1
     * @param size 每页数量，默认为5
     * @param status 订单状态，可选
     * @param keyword 搜索关键词，可选
     * @param request HTTP请求
     * @return 分页订单数据
     */
    @ApiOperation(value = "获取客户端订单列表", notes = "支持分页和状态筛选")
    @ApiImplicitParams({
        @ApiImplicitParam(name = "page", value = "页码", defaultValue = "1", paramType = "query", dataType = "int"),
        @ApiImplicitParam(name = "size", value = "每页数量", defaultValue = "5", paramType = "query", dataType = "int"),
        @ApiImplicitParam(name = "status", value = "订单状态", paramType = "query", dataType = "int"),
        @ApiImplicitParam(name = "keyword", value = "搜索关键词", paramType = "query", dataType = "string")
    })
    @GetMapping
    public ResponseEntity<?> getClientOrders(
            @RequestParam(value = "page", defaultValue = "1") Integer page,
            @RequestParam(value = "size", defaultValue = "5") Integer size,
            @RequestParam(value = "status", required = false) Integer status,
            @RequestParam(value = "keyword", required = false) String keyword,
            HttpServletRequest request) {
        
        // 从请求属性中获取用户ID（由拦截器设置）
        Integer userId = (Integer) request.getAttribute("userId");
        
        if (userId == null) {
            // 用户未登录，返回错误
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", "未登录，无法查看订单");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(response);
        }
        
        try {
            // 查询该用户的订单，支持状态筛选
            PageInfo<Order> pageInfo;
            if (status != null) {
                pageInfo = orderService.getOrdersByUserIdAndStatusWithPage(userId, status, page, size);
            } else {
                pageInfo = orderService.getOrdersByUserIdWithPage(userId, page, size);
            }
            
            // 确保每个订单都有UUID
            for (Order order : pageInfo.getList()) {
                if (order.getOrderUuid() == null || order.getOrderUuid().isEmpty()) {
                    order.setOrderUuid(UUIDGenerater.generateUUID());
                    orderService.updateOrder(order);
                }
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
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }
    
    /**
     * 获取订单详情
     * 
     * @param uuid 订单UUID
     * @param request HTTP请求
     * @return 订单详情
     */
    @ApiOperation(value = "获取订单详情", notes = "根据订单UUID获取订单详细信息")
    @ApiImplicitParam(name = "uuid", value = "订单UUID", required = true, paramType = "path", dataType = "string")
    @GetMapping("/{uuid}")
    public ResponseEntity<?> getOrderByUuid(
            @PathVariable String uuid,
            HttpServletRequest request) {
        // 从请求属性中获取用户ID（由拦截器设置）
        Integer userId = (Integer) request.getAttribute("userId");
        
        if (userId == null) {
            // 用户未登录，返回错误
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", "未登录，无法查看订单");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(response);
        }
        
        try {
            // 获取订单详情
            Order order = orderService.getOrderDetailByUuid(uuid);
            
            if (order == null) {
                Map<String, Object> response = new HashMap<>();
                response.put("success", false);
                response.put("message", "订单不存在或已被删除");
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(response);
            }
            
            // 验证订单所属用户
            if (!userId.equals(order.getUserId())) {
                Map<String, Object> response = new HashMap<>();
                response.put("success", false);
                response.put("message", "您无权查看此订单");
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(response);
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
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }
    
    /**
     * 取消订单
     * 
     * @param uuid 订单UUID
     * @param request HTTP请求
     * @return 取消结果
     */
    @ApiOperation(value = "取消订单", notes = "客户取消未发货的订单")
    @ApiImplicitParam(name = "uuid", value = "订单UUID", required = true, paramType = "path", dataType = "string")
    @PostMapping("/{uuid}/cancel")
    public ResponseEntity<?> cancelOrder(
            @PathVariable String uuid,
            HttpServletRequest request) {
        // 从请求属性中获取用户ID（由拦截器设置）
        Integer userId = (Integer) request.getAttribute("userId");
        
        if (userId == null) {
            // 用户未登录，返回错误
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", "未登录，无法操作订单");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(response);
        }
        
        try {
            // 获取订单信息
            Order order = orderService.getOrderDetailByUuid(uuid);
            
            if (order == null) {
                Map<String, Object> response = new HashMap<>();
                response.put("success", false);
                response.put("message", "订单不存在或已被删除");
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(response);
            }
            
            // 验证订单所属用户
            if (!userId.equals(order.getUserId())) {
                Map<String, Object> response = new HashMap<>();
                response.put("success", false);
                response.put("message", "您无权操作此订单");
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(response);
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
                return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
            }
        } catch (Exception e) {
            log.error("取消订单失败", e);
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", "取消订单失败: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }
    
    /**
     * 确认收货
     * 
     * @param uuid 订单UUID
     * @param request HTTP请求
     * @return 确认结果
     */
    @ApiOperation(value = "确认收货", notes = "客户确认已收到商品")
    @ApiImplicitParam(name = "uuid", value = "订单UUID", required = true, paramType = "path", dataType = "string")
    @PostMapping("/{uuid}/confirm")
    public ResponseEntity<?> confirmOrder(
            @PathVariable String uuid,
            HttpServletRequest request) {
        // 从请求属性中获取用户ID（由拦截器设置）
        Integer userId = (Integer) request.getAttribute("userId");
        
        if (userId == null) {
            // 用户未登录，返回错误
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", "未登录，无法操作订单");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(response);
        }
        
        try {
            // 获取订单信息
            Order order = orderService.getOrderDetailByUuid(uuid);
            
            if (order == null) {
                Map<String, Object> response = new HashMap<>();
                response.put("success", false);
                response.put("message", "订单不存在或已被删除");
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(response);
            }
            
            // 验证订单所属用户
            if (!userId.equals(order.getUserId())) {
                Map<String, Object> response = new HashMap<>();
                response.put("success", false);
                response.put("message", "您无权操作此订单");
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(response);
            }
            
            // 确认收货
            boolean success = orderService.completeOrder(order.getOrderId());
            
            Map<String, Object> response = new HashMap<>();
            if (success) {
                response.put("success", true);
                response.put("message", "确认收货成功");
                return ResponseEntity.ok(response);
            } else {
                response.put("success", false);
                response.put("message", "确认收货失败");
                return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
            }
        } catch (Exception e) {
            log.error("确认收货失败", e);
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", "确认收货失败: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }
    
    /**
     * 支付订单
     * 
     * @param uuid 订单UUID
     * @param request HTTP请求
     * @return 支付结果
     */
    @ApiOperation(value = "支付订单", notes = "客户支付订单")
    @ApiImplicitParam(name = "uuid", value = "订单UUID", required = true, paramType = "path", dataType = "string")
    @PostMapping("/{uuid}/pay")
    public ResponseEntity<?> payOrder(
            @PathVariable String uuid,
            HttpServletRequest request) {
        // 从请求属性中获取用户ID（由拦截器设置）
        Integer userId = (Integer) request.getAttribute("userId");
        
        if (userId == null) {
            // 用户未登录，返回错误
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", "未登录，无法操作订单");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(response);
        }
        
        try {
            // 获取订单信息
            Order order = orderService.getOrderDetailByUuid(uuid);
            
            if (order == null) {
                Map<String, Object> response = new HashMap<>();
                response.put("success", false);
                response.put("message", "订单不存在或已被删除");
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(response);
            }
            
            // 验证订单所属用户
            if (!userId.equals(order.getUserId())) {
                Map<String, Object> response = new HashMap<>();
                response.put("success", false);
                response.put("message", "您无权操作此订单");
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(response);
            }
            
            // 支付订单
            boolean success = orderService.payOrder(order.getOrderId());
            
            Map<String, Object> response = new HashMap<>();
            if (success) {
                response.put("success", true);
                response.put("message", "订单支付成功");
                return ResponseEntity.ok(response);
            } else {
                response.put("success", false);
                response.put("message", "订单支付失败");
                return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
            }
        } catch (Exception e) {
            log.error("支付订单失败", e);
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", "支付订单失败: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }
}