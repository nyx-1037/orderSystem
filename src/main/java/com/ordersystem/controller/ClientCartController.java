package com.ordersystem.controller;

import com.github.pagehelper.PageInfo;
import com.ordersystem.entity.Cart;
import com.ordersystem.service.CartService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import javax.servlet.http.HttpServletRequest;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 客户端购物车控制器
 * 提供客户端购物车相关的RESTful API
 */
@RestController
@RequestMapping("/api/client/cart")
public class ClientCartController {

    private static final Logger log = LoggerFactory.getLogger(ClientCartController.class);

    @Autowired
    private CartService cartService;

    /**
     * 获取购物车列表（支持分页）
     *
     * @param pageNum  页码，默认为1
     * @param pageSize 每页数量，默认为10
     * @param request  HTTP请求
     * @return 分页购物车数据
     */
    @GetMapping
    public ResponseEntity<?> getCartList(
            @RequestParam(value = "pageNum", defaultValue = "1") Integer pageNum,
            @RequestParam(value = "pageSize", defaultValue = "10") Integer pageSize,
            HttpServletRequest request) {

        // 从请求属性中获取用户ID（由拦截器设置）
        Integer userId = (Integer) request.getAttribute("userId");

        if (userId == null) {
            // 用户未登录，返回错误
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", "未登录，无法查看购物车");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(response);
        }

        try {
            // 查询该用户的购物车，支持分页
            PageInfo<Cart> pageInfo = cartService.getCartListWithPage(userId, pageNum, pageSize);

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
            log.error("获取购物车列表失败", e);
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", "获取购物车列表失败: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    /**
     * 添加商品到购物车
     *
     * @param productId 商品ID
     * @param quantity  数量
     * @param request   HTTP请求
     * @return 添加结果
     */
    @PostMapping
    public ResponseEntity<?> addToCart(
            @RequestParam("productId") Integer productId,
            @RequestParam(value = "quantity", defaultValue = "1") Integer quantity,
            HttpServletRequest request) {

        // 从请求属性中获取用户ID（由拦截器设置）
        Integer userId = (Integer) request.getAttribute("userId");

        if (userId == null) {
            // 用户未登录，返回错误
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", "未登录，无法添加商品到购物车");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(response);
        }

        // 验证数量
        if (quantity <= 0) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", "商品数量必须大于0");
            return ResponseEntity.badRequest().body(response);
        }

        try {
            // 添加商品到购物车
            boolean success = cartService.addToCart(userId, productId, quantity);

            Map<String, Object> response = new HashMap<>();
            if (success) {
                response.put("success", true);
                response.put("message", "添加商品到购物车成功");
                // 返回购物车商品数量
                response.put("cartCount", cartService.getCartCount(userId));
                return ResponseEntity.ok(response);
            } else {
                response.put("success", false);
                response.put("message", "添加商品到购物车失败，可能是商品已下架或库存不足");
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
            }
        } catch (Exception e) {
            log.error("添加商品到购物车失败", e);
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", "添加商品到购物车失败: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    /**
     * 更新购物车商品数量
     *
     * @param cartId   购物车ID
     * @param quantity 数量
     * @param request  HTTP请求
     * @return 更新结果
     */
    @PutMapping("/{cartId}/quantity")
    public ResponseEntity<?> updateCartQuantity(
            @PathVariable Integer cartId,
            @RequestParam("quantity") Integer quantity,
            HttpServletRequest request) {

        // 从请求属性中获取用户ID（由拦截器设置）
        Integer userId = (Integer) request.getAttribute("userId");

        if (userId == null) {
            // 用户未登录，返回错误
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", "未登录，无法更新购物车");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(response);
        }

        // 验证数量
        if (quantity <= 0) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", "商品数量必须大于0");
            return ResponseEntity.badRequest().body(response);
        }

        try {
            // 验证购物车项是否属于当前用户
            Cart cart = cartService.getCartList(userId).stream()
                    .filter(c -> c.getCartId().equals(cartId))
                    .findFirst()
                    .orElse(null);

            if (cart == null) {
                Map<String, Object> response = new HashMap<>();
                response.put("success", false);
                response.put("message", "购物车项不存在或不属于您");
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(response);
            }

            // 更新购物车商品数量
            boolean success = cartService.updateCartQuantity(cartId, quantity);

            Map<String, Object> response = new HashMap<>();
            if (success) {
                response.put("success", true);
                response.put("message", "更新购物车商品数量成功");
                return ResponseEntity.ok(response);
            } else {
                response.put("success", false);
                response.put("message", "更新购物车商品数量失败");
                return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
            }
        } catch (Exception e) {
            log.error("更新购物车商品数量失败", e);
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", "更新购物车商品数量失败: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    /**
     * 更新购物车商品选中状态
     *
     * @param cartId   购物车ID
     * @param selected 选中状态：0-未选中，1-已选中
     * @param request  HTTP请求
     * @return 更新结果
     */
    @PutMapping("/{cartId}/selected")
    public ResponseEntity<?> updateCartSelected(
            @PathVariable Integer cartId,
            @RequestParam("selected") Integer selected,
            HttpServletRequest request) {

        // 从请求属性中获取用户ID（由拦截器设置）
        Integer userId = (Integer) request.getAttribute("userId");

        if (userId == null) {
            // 用户未登录，返回错误
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", "未登录，无法更新购物车");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(response);
        }

        // 验证选中状态
        if (selected != 0 && selected != 1) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", "选中状态参数无效");
            return ResponseEntity.badRequest().body(response);
        }

        try {
            // 验证购物车项是否属于当前用户
            Cart cart = cartService.getCartList(userId).stream()
                    .filter(c -> c.getCartId().equals(cartId))
                    .findFirst()
                    .orElse(null);

            if (cart == null) {
                Map<String, Object> response = new HashMap<>();
                response.put("success", false);
                response.put("message", "购物车项不存在或不属于您");
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(response);
            }

            // 更新购物车商品选中状态
            boolean success = cartService.updateCartSelected(cartId, selected);

            Map<String, Object> response = new HashMap<>();
            if (success) {
                response.put("success", true);
                response.put("message", "更新购物车商品选中状态成功");
                return ResponseEntity.ok(response);
            } else {
                response.put("success", false);
                response.put("message", "更新购物车商品选中状态失败");
                return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
            }
        } catch (Exception e) {
            log.error("更新购物车商品选中状态失败", e);
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", "更新购物车商品选中状态失败: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    /**
     * 全选/取消全选购物车商品
     *
     * @param selected 选中状态：0-未选中，1-已选中
     * @param request  HTTP请求
     * @return 更新结果
     */
    @PutMapping("/selected/all")
    public ResponseEntity<?> selectAllCart(
            @RequestParam("selected") Integer selected,
            HttpServletRequest request) {

        // 从请求属性中获取用户ID（由拦截器设置）
        Integer userId = (Integer) request.getAttribute("userId");

        if (userId == null) {
            // 用户未登录，返回错误
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", "未登录，无法更新购物车");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(response);
        }

        // 验证选中状态
        if (selected != 0 && selected != 1) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", "选中状态参数无效");
            return ResponseEntity.badRequest().body(response);
        }

        try {
            // 全选/取消全选购物车商品
            boolean success = cartService.selectAllCart(userId, selected);

            Map<String, Object> response = new HashMap<>();
            if (success) {
                response.put("success", true);
                response.put("message", selected == 1 ? "全选购物车商品成功" : "取消全选购物车商品成功");
                return ResponseEntity.ok(response);
            } else {
                response.put("success", false);
                response.put("message", "操作购物车失败");
                return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
            }
        } catch (Exception e) {
            log.error("全选/取消全选购物车商品失败", e);
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", "操作购物车失败: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    /**
     * 删除购物车商品
     *
     * @param cartId  购物车ID
     * @param request HTTP请求
     * @return 删除结果
     */
    @DeleteMapping("/{cartId}")
    public ResponseEntity<?> deleteCart(
            @PathVariable Integer cartId,
            HttpServletRequest request) {

        // 从请求属性中获取用户ID（由拦截器设置）
        Integer userId = (Integer) request.getAttribute("userId");

        if (userId == null) {
            // 用户未登录，返回错误
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", "未登录，无法删除购物车商品");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(response);
        }

        try {
            // 验证购物车项是否属于当前用户
            Cart cart = cartService.getCartList(userId).stream()
                    .filter(c -> c.getCartId().equals(cartId))
                    .findFirst()
                    .orElse(null);

            if (cart == null) {
                Map<String, Object> response = new HashMap<>();
                response.put("success", false);
                response.put("message", "购物车项不存在或不属于您");
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(response);
            }

            // 删除购物车商品
            boolean success = cartService.deleteCart(cartId);

            Map<String, Object> response = new HashMap<>();
            if (success) {
                response.put("success", true);
                response.put("message", "删除购物车商品成功");
                // 返回购物车商品数量
                response.put("cartCount", cartService.getCartCount(userId));
                return ResponseEntity.ok(response);
            } else {
                response.put("success", false);
                response.put("message", "删除购物车商品失败");
                return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
            }
        } catch (Exception e) {
            log.error("删除购物车商品失败", e);
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", "删除购物车商品失败: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    /**
     * 清空购物车
     *
     * @param request HTTP请求
     * @return 清空结果
     */
    @DeleteMapping
    public ResponseEntity<?> clearCart(HttpServletRequest request) {

        // 从请求属性中获取用户ID（由拦截器设置）
        Integer userId = (Integer) request.getAttribute("userId");

        if (userId == null) {
            // 用户未登录，返回错误
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", "未登录，无法清空购物车");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(response);
        }

        try {
            // 清空购物车
            boolean success = cartService.clearCart(userId);

            Map<String, Object> response = new HashMap<>();
            if (success) {
                response.put("success", true);
                response.put("message", "清空购物车成功");
                return ResponseEntity.ok(response);
            } else {
                response.put("success", false);
                response.put("message", "清空购物车失败");
                return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
            }
        } catch (Exception e) {
            log.error("清空购物车失败", e);
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", "清空购物车失败: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    /**
     * 获取购物车商品数量
     *
     * @param request HTTP请求
     * @return 购物车商品数量
     */
    @GetMapping("/count")
    public ResponseEntity<?> getCartCount(HttpServletRequest request) {

        // 从请求属性中获取用户ID（由拦截器设置）
        Integer userId = (Integer) request.getAttribute("userId");

        if (userId == null) {
            // 用户未登录，返回错误
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", "未登录，无法获取购物车信息");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(response);
        }

        try {
            // 获取购物车商品数量
            int count = cartService.getCartCount(userId);

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("count", count);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("获取购物车商品数量失败", e);
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", "获取购物车商品数量失败: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    /**
     * 获取已选中的购物车商品列表
     *
     * @param request HTTP请求
     * @return 已选中的购物车商品列表
     */
    @GetMapping("/selected")
    public ResponseEntity<?> getSelectedCartList(HttpServletRequest request) {

        // 从请求属性中获取用户ID（由拦截器设置）
        Integer userId = (Integer) request.getAttribute("userId");

        if (userId == null) {
            // 用户未登录，返回错误
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", "未登录，无法获取购物车信息");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(response);
        }

        try {
            // 获取已选中的购物车商品列表
            List<Cart> selectedCartList = cartService.getSelectedCartList(userId);

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("data", selectedCartList);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("获取已选中的购物车商品列表失败", e);
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", "获取已选中的购物车商品列表失败: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }
    
    /**
     * 清空已选中的购物车商品
     * 用于订单创建成功后清空已选中的购物车商品
     *
     * @param request HTTP请求
     * @return 清空结果
     */
    @DeleteMapping("/selected/clear")
    public ResponseEntity<?> clearSelectedCart(HttpServletRequest request) {

        // 从请求属性中获取用户ID（由拦截器设置）
        Integer userId = (Integer) request.getAttribute("userId");

        if (userId == null) {
            // 用户未登录，返回错误
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", "未登录，无法清空购物车");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(response);
        }

        try {
            // 获取已选中的购物车商品列表
            List<Cart> selectedCartList = cartService.getSelectedCartList(userId);
            
            // 删除已选中的购物车商品
            boolean success = true;
            for (Cart cart : selectedCartList) {
                success = success && cartService.deleteCart(cart.getCartId());
            }

            Map<String, Object> response = new HashMap<>();
            if (success) {
                response.put("success", true);
                response.put("message", "清空已选中的购物车商品成功");
                return ResponseEntity.ok(response);
            } else {
                response.put("success", false);
                response.put("message", "清空已选中的购物车商品失败");
                return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
            }
        } catch (Exception e) {
            log.error("清空已选中的购物车商品失败", e);
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", "清空已选中的购物车商品失败: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }
}