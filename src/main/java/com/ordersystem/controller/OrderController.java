package com.ordersystem.controller;

import com.github.pagehelper.PageInfo;
import com.ordersystem.entity.Order;
import com.ordersystem.entity.User;
import com.ordersystem.service.OrderService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.BindingResult;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.bind.annotation.RestController;

import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpSession;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import javax.validation.Valid;

/**
 * 订单控制器
 */
@RestController
@RequestMapping("/api/order")
public class OrderController {

    private static final Logger log = LoggerFactory.getLogger(OrderController.class);

    @Autowired
    private OrderService orderService;
    
    /**
     * 获取订单列表（支持分页）
     * @param pageNum 页码，默认为1
     * @param pageSize 每页数量，默认为10
     * @return 分页订单数据
     */
    @GetMapping("/list")
    public ResponseEntity<?> list(
            @RequestParam(value = "pageNum", defaultValue = "1") Integer pageNum,
            @RequestParam(value = "pageSize", defaultValue = "10") Integer pageSize,
            HttpServletRequest request) {
        // 从请求属性中获取用户ID（由拦截器设置）
        Integer userId = (Integer) request.getAttribute("userId");
        PageInfo<Order> pageInfo;
        
        if (userId != null) {
            // 如果用户已登录，查询该用户的订单
            pageInfo = orderService.getOrdersByUserIdWithPage(userId, pageNum, pageSize);
        } else {
            // 如果用户未登录，查询所有订单（管理员视图）
            pageInfo = orderService.getAllOrdersByPage(pageNum, pageSize);
        }
        
        return ResponseEntity.ok(pageInfo);
    }
    
    /**
     * 获取订单详情（通过UUID访问，更安全）
     */
    @GetMapping("/detail/{uuid}")
    public ResponseEntity<?> detailByUuid(@PathVariable("uuid") String uuid, HttpServletRequest request) {
        // 从请求属性中获取用户ID（由拦截器设置）
        Integer userId = (Integer) request.getAttribute("userId");
        
        // 获取订单详情（包含订单项信息）
        Order order = orderService.getOrderDetailByUuid(uuid);
        
        if (order != null) {
            // 验证当前用户是否有权限查看该订单
            if (userId != null && userId.equals(order.getUserId())) {
                return ResponseEntity.ok(order);
            } else {
                // 用户无权限查看该订单
                log.warn("用户 {} 尝试访问不属于他的订单 {}", userId, uuid);
                return ResponseEntity.status(403).body("您无权查看此订单");
            }
        } else {
            // 订单不存在，返回错误信息
            return ResponseEntity.badRequest().body("订单不存在或已被删除");
        }
    }
    
    /**
     * 获取订单详情（通过ID访问，仅供内部使用）
     * @deprecated 使用UUID方式访问更安全
     */
    @GetMapping("/admin/detail/{id}")
    public ResponseEntity<?> detailById(@PathVariable("id") Integer id) {
        // 获取订单详情（包含订单项信息）
        Order order = orderService.getOrderDetail(id);
        if (order != null) {
            return ResponseEntity.ok(order);
        } else {
            // 订单不存在，返回错误信息
            return ResponseEntity.badRequest().body("订单不存在或已被删除");
        }
    }
    
    /**
     * 获取创建订单所需数据
     */
    @GetMapping("/create")
    public ResponseEntity<?> createPage() {
        // 可以在这里添加一些初始化数据，如商品列表等
        return ResponseEntity.ok(new Order());
    }
    
    /**
     * 处理创建订单请求
     */
    @PostMapping("/create")
    public ResponseEntity<?> create(@Valid @RequestBody Order order, BindingResult bindingResult, HttpSession session, HttpServletRequest request) {
        log.info("接收到创建订单请求数据: {}", order.toString());
        log.info("订单明细项数据: {}", order.getItems() != null ? order.getItems().toString() : "null");

        // 检查验证错误
        if (bindingResult.hasErrors()) {
            String errorMsg = bindingResult.getFieldErrors().stream()
                    .map(FieldError::getDefaultMessage)
                    .collect(Collectors.joining(", "));
            log.error("订单数据验证失败: {}", errorMsg);
            // 返回具体的验证错误信息给前端
            return ResponseEntity.badRequest().body("订单信息有误: " + errorMsg);
        }

        // 从请求属性中获取用户ID（由TokenInterceptor设置）
        Integer userId = (Integer) request.getAttribute("userId");
        if (userId != null) {
            // 设置用户ID
            order.setUserId(userId);
            log.info("为用户 {} 创建订单", userId);
            // 创建订单
            try {
                boolean success = orderService.createOrder(order);
                if (success) {
                    log.info("订单创建成功, 订单ID: {}", order.getOrderId());
                    // 返回包含订单UUID和success标志的对象，以便前端获取
                    Map<String, Object> response = new HashMap<>();
                    response.put("success", true);
                    response.put("orderId", order.getOrderId()); // 保留orderId以兼容旧代码
                    response.put("orderUuid", order.getOrderUuid()); // 添加orderUuid用于安全访问
                    response.put("message", "订单创建成功");
                    return ResponseEntity.ok().body(response);
                } else {
                    log.error("订单服务未能成功创建订单");
                    return ResponseEntity.badRequest().body("订单创建失败");
                }
            } catch (Exception e) {
                log.error("创建订单时发生异常", e);
                return ResponseEntity.badRequest().body("订单创建失败: " + e.getMessage());
            }
        } else {
            log.warn("用户未登录，无法创建订单");
            // 创建失败或用户未登录
            return ResponseEntity.badRequest().body("用户未登录，无法创建订单");
        }
    }
    
    /**
     * 取消订单
     */
    @PostMapping("/cancel/{id}")
    public ResponseEntity<?> cancelOrderById(@PathVariable("id") Integer id, HttpServletRequest request) {
        // 从请求属性中获取用户ID（由拦截器设置）
        Integer userId = (Integer) request.getAttribute("userId");
        
        // 获取订单信息
        Order order = orderService.getOrderById(id);
        
        if (order != null) {
            // 验证当前用户是否有权限操作该订单
            if (userId != null && userId.equals(order.getUserId())) {
                boolean success = orderService.cancelOrder(order.getOrderId());
                return success ? ResponseEntity.ok().body("订单取消成功") : ResponseEntity.badRequest().body("订单取消失败");
            } else {
                // 用户无权限操作该订单
                log.warn("用户 {} 尝试取消不属于他的订单 {}", userId, id);
                return ResponseEntity.status(403).body("您无权操作此订单");
            }
        } else {
            // 订单不存在，返回错误信息
            return ResponseEntity.badRequest().body("订单不存在或已被删除");
        }
    }
    
    /**
     * 支付订单
     */
    @PostMapping("/pay/{id}")
    public ResponseEntity<?> payOrder(@PathVariable("id") Integer id) {
        boolean success = orderService.payOrder(id);
        return success ? ResponseEntity.ok().body("订单支付成功") : ResponseEntity.badRequest().body("订单支付失败");
    }
    
    /**
     * 确认收货
     */
    @PostMapping("/confirm/{id}")
    public ResponseEntity<?> confirmOrder(@PathVariable("id") Integer id, HttpServletRequest request) {
        // 从请求属性中获取用户ID（由拦截器设置）
        Integer userId = (Integer) request.getAttribute("userId");
        
        // 获取订单信息
        Order order = orderService.getOrderDetail(id);
        
        if (order != null) {
            // 验证当前用户是否有权限操作该订单
            if (userId != null && userId.equals(order.getUserId())) {
                boolean success = orderService.completeOrder(id);
                return success ? ResponseEntity.ok().body("确认收货成功") : ResponseEntity.badRequest().body("确认收货失败");
            } else {
                // 用户无权限操作该订单
                log.warn("用户 {} 尝试确认收货不属于他的订单 {}", userId, id);
                return ResponseEntity.status(403).body("您无权操作此订单");
            }
        } else {
            // 订单不存在，返回错误信息
            return ResponseEntity.badRequest().body("订单不存在或已被删除");
        }
    }
    
    /**
     * 发货订单
     */
    @PostMapping("/ship/{id}")
    public ResponseEntity<?> shipOrder(@PathVariable("id") Integer id, HttpServletRequest request) {
        // 从请求属性中获取用户ID（由拦截器设置）
        Integer userId = (Integer) request.getAttribute("userId");
        
        // 获取订单信息
        Order order = orderService.getOrderDetail(id);
        
        if (order != null) {
            // 验证当前用户是否有权限操作该订单
            if (userId != null && userId.equals(order.getUserId())) {
                boolean success = orderService.shipOrder(id);
                return success ? ResponseEntity.ok().body("订单发货成功") : ResponseEntity.badRequest().body("订单发货失败");
            } else {
                // 用户无权限操作该订单
                log.warn("用户 {} 尝试发货不属于他的订单 {}", userId, id);
                return ResponseEntity.status(403).body("您无权操作此订单");
            }
        } else {
            // 订单不存在，返回错误信息
            return ResponseEntity.badRequest().body("订单不存在或已被删除");
        }
    }
}