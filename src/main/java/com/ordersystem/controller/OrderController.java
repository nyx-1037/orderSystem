package com.ordersystem.controller;

import com.github.pagehelper.PageInfo;
import com.ordersystem.entity.Order;
import com.ordersystem.entity.OrderItem;
import com.ordersystem.entity.User;
import com.ordersystem.service.OrderItemService;
import com.ordersystem.service.OrderService;
import com.ordersystem.service.UserService;
import com.ordersystem.service.impl.UserServiceImpl;
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
import org.springframework.validation.BindingResult;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.annotation.*;

import javax.servlet.http.HttpServletRequest;
import javax.validation.Valid;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * 订单控制器
 * 提供订单相关的RESTful API
 */
@Api(tags = "订单管理", description = "订单的增删改查接口")
@RestController
@RequestMapping("/api/orders")
public class OrderController {

    private static final Logger log = LoggerFactory.getLogger(OrderController.class);

    @Autowired
    private OrderService orderService;

    @Autowired
    private UserService userService;

    @Autowired
    private OrderItemService orderItemService;
	@Autowired
	private UserServiceImpl userServiceImpl;

    /**
     * 获取订单列表（支持分页）
     * 
     * @param pageNum 页码，默认为1
     * @param pageSize 每页数量，默认为10
     * @param request HTTP请求
     * @return 分页订单数据
     */
    @ApiOperation(value = "获取订单列表", notes = "支持分页和多条件筛选")
    @ApiImplicitParams({
        @ApiImplicitParam(name = "pageNum", value = "页码", defaultValue = "1", paramType = "query", dataType = "int"),
        @ApiImplicitParam(name = "pageSize", value = "每页数量", defaultValue = "10", paramType = "query", dataType = "int"),
        @ApiImplicitParam(name = "keyword", value = "搜索关键词", paramType = "query", dataType = "string"),
        @ApiImplicitParam(name = "status", value = "订单状态", paramType = "query", dataType = "int"),
        @ApiImplicitParam(name = "startDate", value = "开始日期", paramType = "query", dataType = "string"),
        @ApiImplicitParam(name = "endDate", value = "结束日期", paramType = "query", dataType = "string")
    })
    @GetMapping
    public ResponseEntity<?> getAllOrders(
            @RequestParam(value = "pageNum", defaultValue = "1") Integer pageNum,
            @RequestParam(value = "pageSize", defaultValue = "10") Integer pageSize,
            @RequestParam(value = "keyword", required = false) String keyword,
            @RequestParam(value = "status", required = false) Integer status,
            @RequestParam(value = "startDate", required = false) String startDate,
            @RequestParam(value = "endDate", required = false) String endDate,
            HttpServletRequest request) {
        // 从请求属性中获取用户ID（由拦截器设置）
        Integer userId = (Integer) request.getAttribute("userId");
        User user = new User();
        if( userId != null ){
            user = userService.getUserById(userId);

        }

        PageInfo<Order> pageInfo;
        
        // 检查用户角色
        if (user.getRole() == 1) {
            // 管理员可以查看所有订单
            // 处理筛选条件
            Map<String, Object> filters = new HashMap<>();
            if (keyword != null && !keyword.trim().isEmpty()) {
                filters.put("keyword", keyword.trim());
            }
            if (status != null) {
                filters.put("status", status);
            }
            if (startDate != null && !startDate.trim().isEmpty()) {
                filters.put("startDate", startDate);
            }
            if (endDate != null && !endDate.trim().isEmpty()) {
                filters.put("endDate", endDate);
            }
            
            // 使用筛选条件查询订单
            pageInfo = orderService.getAllOrdersByPageWithFilters(pageNum, pageSize, filters);
            log.info("管理员查询订单，页码：{}，每页数量：{}，筛选条件：{}", pageNum, pageSize, filters);
        } else if (user.getRole() == 0 && userId != null && user.getStatus() == 1) {
            // 普通用户只能查看自己的订单
            pageInfo = orderService.getOrdersByUserIdWithPage(userId, pageNum, pageSize);
            log.info("用户 {} 查询自己的订单，页码：{}，每页数量：{}", userId, pageNum, pageSize);
        } else {
            // 未登录用户无权查看订单
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", "未登录或账号被禁用，无法查看订单");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(response);
        }
        
        // 返回订单列表
        
        return ResponseEntity.ok(pageInfo);
    }

    /**
     * 根据ID获取订单详情
     * 
     * @param orderId 订单ID
     * @param request HTTP请求
     * @return 订单详情
     */
    @ApiOperation(value = "根据ID获取订单详情", notes = "获取订单的详细信息，包含订单项")
    @ApiImplicitParam(name = "orderId", value = "订单ID", required = true, paramType = "path", dataType = "int")
    @GetMapping("/{orderId}")
    public ResponseEntity<?> getOrderById(
            @PathVariable Integer orderId,
            HttpServletRequest request) {
        // 从请求属性中获取用户ID和用户信息（由拦截器设置）
        Integer userId = (Integer) request.getAttribute("userId");
        User user = (User) request.getAttribute("user");
        
        if (userId == null) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", "未登录，无法查看订单");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(response);
        }
        
        // 获取订单详情（包含订单项信息）
        Order order = orderService.getOrderById(orderId);
        
        if (order == null) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", "订单不存在或已被删除");
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(response);
        }
        
        // 验证当前用户是否有权限查看该订单
        boolean isAdmin = (user != null && user.getRole() == 1);
        if (isAdmin || userId.equals(order.getUserId())) {
            return ResponseEntity.ok(order);
        } else {
            // 用户无权限查看该订单
            log.warn("用户 {} 尝试访问不属于他的订单 {}", userId, orderId);
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", "您无权查看此订单");
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(response);
        }
    }
    
    /**
     * 根据UUID获取订单详情
     * 新增方法，解决前端使用UUID请求订单详情的问题
     * 
     * @param uuid 订单UUID
     * @param request HTTP请求
     * @return 订单详情
     */
    @ApiOperation(value = "根据UUID获取订单详情", notes = "通过订单UUID获取订单的详细信息")
    @ApiImplicitParam(name = "uuid", value = "订单UUID", required = true, paramType = "query", dataType = "string")
    @GetMapping("/by-uuid")
    public ResponseEntity<?> getOrderByUuid(
            @RequestParam("uuid") String uuid,
            HttpServletRequest request) {
        // 从请求属性中获取用户ID和用户信息（由拦截器设置）
        Integer userId = (Integer) request.getAttribute("userId");
        User user = userService.getUserById(userId);

        
        if (userId == null) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", "未登录，无法查看订单");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(response);
        }
        
        // 通过UUID获取订单详情
        Order order = orderService.getOrderDetailByUuid(uuid);
        log.info("通过UUID获取订单详情，UUID：{}", uuid);



        if (order == null) {

            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", "订单不存在或已被删除");
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(response);
        }
        
        // 验证当前用户是否有权限查看该订单
        boolean isAdmin = (user.getRole() == 1);
        if (isAdmin || userId.equals(order.getUserId())) {
            return ResponseEntity.ok(order);
        } else {
            // 用户无权限查看该订单
            log.warn("用户 {} 尝试访问不属于他的订单 UUID: {}", userId, uuid);
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", "您无权查看此订单");
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(response);
        }
    }
    
    /**
     * 创建订单
     * 
     * @param order 订单信息
     * @param bindingResult 验证结果
     * @param request HTTP请求
     * @return 创建结果
     */
    @ApiOperation(value = "创建订单", notes = "创建新订单，需要包含订单项信息")
    @PostMapping
    public ResponseEntity<?> createOrder(
            @Valid @RequestBody Order order,
            BindingResult bindingResult,
            HttpServletRequest request) {
        log.info("接收到创建订单请求数据: {}", order);
        log.info("订单明细项数据: {}", order.getItems() != null ? order.getItems() : "null");

        // 检查验证错误
        if (bindingResult.hasErrors()) {
            String errorMsg = bindingResult.getFieldErrors().stream()
                    .map(FieldError::getDefaultMessage)
                    .collect(Collectors.joining(", "));
            log.error("订单数据验证失败: {}", errorMsg);
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", "订单信息有误: " + errorMsg);
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
        }

        // 从请求属性中获取用户ID（由TokenInterceptor设置）
        Integer userId = (Integer) request.getAttribute("userId");
        if (userId == null) {
            log.warn("用户未登录，无法创建订单");
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", "用户未登录，无法创建订单");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(response);
        }
        
        // 设置用户ID
        order.setUserId(userId);
        log.info("为用户 {} 创建订单", userId);
        
        // 创建订单
        try {
            boolean success = orderService.createOrder(order);
            if (success) {
                log.info("订单创建成功, 订单ID: {}", order.getOrderId());
                
                Map<String, Object> response = new HashMap<>();
                response.put("success", true);
                response.put("message", "订单创建成功");
                response.put("orderId", order.getOrderId());
                response.put("order", order);
                return ResponseEntity.status(HttpStatus.CREATED).body(response);
            } else {
                log.error("订单服务未能成功创建订单");
                Map<String, Object> response = new HashMap<>();
                response.put("success", false);
                response.put("message", "订单创建失败");
                return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
            }
        } catch (Exception e) {
            log.error("创建订单时发生异常", e);
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", "订单创建失败: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }
    
    /**
     * 取消订单
     * 
     * @param orderId 订单ID
     * @param request HTTP请求
     * @return 取消结果
     */
    @ApiOperation(value = "取消订单", notes = "取消未发货的订单")
    @ApiImplicitParam(name = "orderId", value = "订单ID", required = true, paramType = "path", dataType = "int")
    @PostMapping("/{orderId}/cancel")
    public ResponseEntity<?> cancelOrder(
            @PathVariable Integer orderId,
            HttpServletRequest request) {
        // 从请求属性中获取用户ID和用户信息（由拦截器设置）
        Integer userId = (Integer) request.getAttribute("userId");
        User user = (User) request.getAttribute("user");
        User admin = userService.getUserById(userId);
        if (userId == null) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", "未登录，无法操作订单");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(response);
        }
        
        // 获取订单信息
        Order order = orderService.getOrderById(orderId);
        
        if (order == null) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", "订单不存在或已被删除");
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(response);
        }
        
        // 验证当前用户是否有权限操作该订单

        if (admin.getRole() == 1 || userId.equals(order.getUserId())) {
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
        } else {
            // 用户无权限操作该订单
            log.warn("用户 {} 尝试取消不属于他的订单 {}", userId, orderId);
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", "您无权操作此订单");
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(response);
        }
    }
    
    /**
     * 支付订单
     * 
     * @param orderId 订单ID
     * @param request HTTP请求
     * @return 支付结果
     */
    @ApiOperation(value = "支付订单", notes = "支付待付款状态的订单")
    @ApiImplicitParam(name = "orderId", value = "订单ID", required = true, paramType = "path", dataType = "int")
    @PostMapping("/{orderId}/pay")
    public ResponseEntity<?> payOrder(
            @PathVariable Integer orderId,
            HttpServletRequest request) {
        // 从请求属性中获取用户ID和用户信息（由拦截器设置）
        Integer userId = (Integer) request.getAttribute("userId");
        User user = (User) request.getAttribute("user");
        
        if (userId == null) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", "未登录，无法操作订单");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(response);
        }
        
        // 获取订单信息
        Order order = orderService.getOrderById(orderId);
        
        if (order == null) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", "订单不存在或已被删除");
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(response);
        }
        
        // 验证当前用户是否有权限操作该订单
        if (userId.equals(order.getUserId())) {
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
        } else {
            // 用户无权限操作该订单
            log.warn("用户 {} 尝试支付不属于他的订单 {}", userId, orderId);
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", "您无权操作此订单");
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(response);
        }
    }
    
    /**
     * 确认收货
     * 
     * @param orderId 订单ID
     * @param request HTTP请求
     * @return 确认结果
     */
    @ApiOperation(value = "确认收货", notes = "确认已收到商品，完成订单")
    @ApiImplicitParam(name = "orderId", value = "订单ID", required = true, paramType = "path", dataType = "int")
    @PostMapping("/{orderId}/confirm")
    public ResponseEntity<?> confirmOrder(
            @PathVariable Integer orderId,
            HttpServletRequest request) {
        // 从请求属性中获取用户ID和用户信息（由拦截器设置）
        Integer userId = (Integer) request.getAttribute("userId");
        User user = (User) request.getAttribute("user");

        if (userId == null) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", "未登录，无法操作订单");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(response);
        }
        User admin = userService.getUserById(userId);
        // 获取订单信息
        Order order = orderService.getOrderById(orderId);
        
        if (order == null) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", "订单不存在或已被删除");
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(response);
        }
        
        // 验证当前用户是否有权限操作该订单
        if (admin.getRole()==1 || userId.equals(order.getUserId())) {
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
        } else {
            // 用户无权限操作该订单
            log.warn("用户 {} 尝试确认收货不属于他的订单 {}", userId, orderId);
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", "您无权操作此订单");
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(response);
        }
    }
    
    /**
     * 发货订单（管理员操作）
     * 
     * @param orderId 订单ID
     * @param request HTTP请求
     * @return 发货结果
     */
    @ApiOperation(value = "发货订单", notes = "管理员操作：将订单状态更新为已发货")
    @ApiImplicitParam(name = "orderId", value = "订单ID", required = true, paramType = "path", dataType = "int")
    @PostMapping("/{orderId}/ship")
    public ResponseEntity<?> shipOrder(
            @PathVariable Integer orderId,
            HttpServletRequest request) {
        // 从请求属性中获取用户ID和用户信息（由拦截器设置）
        Integer userId = (Integer) request.getAttribute("userId");
        User user = (User) request.getAttribute("user");

        
        if (userId == null) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", "未登录，无法操作订单");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(response);
        }
        User admin = userService.getUserById(userId);
        // 验证是否为管理员

        if (admin.getRole() != 1) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", "只有管理员可以执行发货操作");
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(response);
        }
        
        // 获取订单信息
        Order order = orderService.getOrderById(orderId);
        
        if (order == null) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", "订单不存在或已被删除");
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(response);
        }
        
        boolean success = orderService.shipOrder(order.getOrderId());
        
        Map<String, Object> response = new HashMap<>();
        if (success) {
            response.put("success", true);
            response.put("message", "订单发货成功");
            return ResponseEntity.ok(response);
        } else {
            response.put("success", false);
            response.put("message", "订单发货失败");
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }
    
    /**
     * 获取指定用户的所有订单
     * 
     * @param userId 用户ID
     * @param pageNum 页码，默认为1
     * @param pageSize 每页数量，默认为10
     * @param request HTTP请求
     * @return 用户订单列表
     */
    @GetMapping("/by-user/{userId}")
    public ResponseEntity<?> getUserOrders(
            @PathVariable Integer userId,
            @RequestParam(value = "page", defaultValue = "1") Integer pageNum,
            @RequestParam(value = "size", defaultValue = "10") Integer pageSize,
            HttpServletRequest request) {
        // 从请求属性中获取当前用户ID和用户信息（由拦截器设置）
        Integer currentUserId = (Integer) request.getAttribute("userId");
        User currentUser = (User) request.getAttribute("user");
        
        if (currentUserId == null) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", "未登录，无法查看订单");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(response);
        }
        
        // 验证是否为管理员或查询自己的订单
        boolean isAdmin = (currentUser != null && currentUser.getRole() == 1);
        boolean isSelfQuery = userId.equals(currentUserId);
        
        if (!isAdmin && !isSelfQuery) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", "您无权查看其他用户的订单");
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(response);
        }
        
        // 设置目标用户ID
        Integer targetUserId = userId;
        
        PageInfo<Order> pageInfo = orderService.getOrdersByUserIdWithPage(targetUserId, pageNum, pageSize);
        
        // 返回订单列表
        
        return ResponseEntity.ok(pageInfo);
    }
    
    /**
     * 批量删除订单（支持单个和多个订单ID）
     * 
     * @param orderIds 订单ID列表
     * @param request HTTP请求
     * @return 删除结果
     */
    @DeleteMapping("/batch")
    public ResponseEntity<?> batchDeleteOrders(
            @RequestBody List<Integer> orderIds,
            HttpServletRequest request) {
        log.info("批量删除订单，ID列表: {}", orderIds);
        
        // 从请求属性中获取用户ID和用户信息（由拦截器设置）
        Integer userId = (Integer) request.getAttribute("userId");
        User admin = userService.getUserById(userId);
        
        if (userId == null) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", "未登录，无法操作订单");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(response);
        }
        
        // 验证是否为管理员
        if (admin.getRole() != 1) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", "只有管理员可以删除订单");
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(response);
        }
        
        if (orderIds == null || orderIds.isEmpty()) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", "未选择要删除的订单");
            return ResponseEntity.badRequest().body(response);
        }
        
        int successCount = 0;
        for (Integer orderId : orderIds) {
            if (orderService.deleteOrder(orderId)) {
                successCount++;
            }
        }
        
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("message", String.format("成功删除 %d/%d 个订单", successCount, orderIds.size()));
        return ResponseEntity.ok(response);
    }

}