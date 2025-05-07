package com.ordersystem.service.impl;

import com.github.pagehelper.PageHelper;
import com.github.pagehelper.PageInfo;
import com.ordersystem.dao.CartDao;
import com.ordersystem.dao.ProductDao;
import com.ordersystem.entity.Cart;
import com.ordersystem.entity.Product;
import com.ordersystem.service.CartService;
import com.ordersystem.service.RedisService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * 购物车服务实现类
 */
@Service
public class CartServiceImpl implements CartService {

    private static final Logger log = LoggerFactory.getLogger(CartServiceImpl.class);

    @Autowired
    private CartDao cartDao;

    @Autowired
    private ProductDao productDao;
    @Autowired
    private RedisService redisService;

    /**
     * 添加商品到购物车
     * 如果购物车中已存在该商品，则增加数量
     *
     * @param userId    用户ID
     * @param productId 商品ID
     * @param quantity  数量
     * @return 是否成功
     */
    @Override
    @Transactional
    public boolean addToCart(Integer userId, Integer productId, Integer quantity) {
        try {
            // 检查商品是否存在且上架
            Product product = productDao.getProductById(productId);
            if (product == null) {
                log.error("添加购物车失败：商品不存在，productId={}", productId);
                return false;
            }
            if (product.getStatus() != 1) {
                log.error("添加购物车失败：商品已下架，productId={}", productId);
                return false;
            }
            if (product.getStock() <= 0) {
                log.error("添加购物车失败：商品库存不足，productId={}", productId);
                return false;
            }

            // 检查购物车中是否已存在该商品
            Cart existCart = cartDao.getCartByUserIdAndProductId(userId, productId);
            if (existCart != null) {
                // 已存在，增加数量
                int newQuantity = existCart.getQuantity() + quantity;
                // 确保不超过库存
                if (newQuantity > product.getStock()) {
                    newQuantity = product.getStock();
                }
                existCart.setQuantity(newQuantity);
                existCart.setSelected(1); // 默认选中
                return cartDao.updateCart(existCart) > 0;
            } else {
                // 不存在，新增
                Cart cart = new Cart();
                cart.setUserId(userId);
                cart.setProductId(productId);
                cart.setQuantity(quantity);
                cart.setSelected(1); // 默认选中
                return cartDao.addCart(cart) > 0;
            }
        } catch (Exception e) {
            log.error("添加购物车异常", e);
            return false;
        }
    }

    /**
     * 更新购物车商品数量
     *
     * @param cartId   购物车ID
     * @param quantity 数量
     * @return 是否成功
     */
    @Override
    public boolean updateCartQuantity(Integer cartId, Integer quantity) {
        try {
            if (quantity <= 0) {
                log.error("更新购物车数量失败：数量必须大于0，cartId={}, quantity={}", cartId, quantity);
                return false;
            }

            // 获取购物车项
            Cart cart = cartDao.getCartById(cartId);
            if (cart == null) {
                log.error("更新购物车数量失败：购物车项不存在，cartId={}", cartId);
                return false;
            }

            // 检查商品库存
            Product product = productDao.getProductById(cart.getProductId());
            if (product == null || product.getStatus() != 1) {
                log.error("更新购物车数量失败：商品不存在或已下架，productId={}", cart.getProductId());
                return false;
            }

            // 确保不超过库存
            if (quantity > product.getStock()) {
                quantity = product.getStock();
                log.warn("购物车数量超过库存，已调整为最大库存，cartId={}, quantity={}, stock={}", cartId, quantity, product.getStock());
            }

            boolean result = cartDao.updateCartQuantity(cartId, quantity) > 0;
            if (result) {
                // 更新Redis缓存
                String key = "cart:" + cartId;
                redisService.set(key, cart, 24 * 60 * 60); // 缓存24小时
                
                // 清除用户购物车列表缓存，以便重新加载
                String userCartKey = "user:cart:" + cart.getUserId();
                redisService.delete(userCartKey);
            }
            return result;
        } catch (Exception e) {
            log.error("更新购物车数量异常", e);
            return false;
        }
    }

    /**
     * 更新购物车商品选中状态
     *
     * @param cartId   购物车ID
     * @param selected 选中状态：0-未选中，1-已选中
     * @return 是否成功
     */
    @Override
    public boolean updateCartSelected(Integer cartId, Integer selected) {
        try {
            if (selected != 0 && selected != 1) {
                log.error("更新购物车选中状态失败：状态值无效，cartId={}, selected={}", cartId, selected);
                return false;
            }

            // 检查购物车项是否存在
            Cart cart = cartDao.getCartById(cartId);
            if (cart == null) {
                log.error("更新购物车选中状态失败：购物车项不存在，cartId={}", cartId);
                return false;
            }

            boolean result = cartDao.updateCartSelected(cartId, selected) > 0;
            if (result) {
                // 更新Redis缓存
                String key = "cart:" + cartId;
                redisService.set(key, cart, 24 * 60 * 60); // 缓存24小时
                
                // 清除用户购物车列表缓存，以便重新加载
                String userCartKey = "user:cart:" + cart.getUserId();
                redisService.delete(userCartKey);
            }
            return result;
        } catch (Exception e) {
            log.error("更新购物车选中状态异常", e);
            return false;
        }
    }

    /**
     * 删除购物车商品
     *
     * @param cartId 购物车ID
     * @return 是否成功
     */
    @Override
    public boolean deleteCart(Integer cartId) {
        try {
            Cart cart = cartDao.getCartById(cartId);
            boolean result = cartDao.deleteCart(cartId) > 0;
            if (result && cart != null) {
                // 从Redis缓存中删除
                String key = "cart:" + cartId;
                redisService.delete(key);
                
                // 清除用户购物车列表缓存，以便重新加载
                String userCartKey = "user:cart:" + cart.getUserId();
                redisService.delete(userCartKey);
            }
            return result;
        } catch (Exception e) {
            log.error("删除购物车异常", e);
            return false;
        }
    }

    /**
     * 清空用户购物车
     *
     * @param userId 用户ID
     * @return 是否成功
     */
    @Override
    public boolean clearCart(Integer userId) {
        try {
            boolean result = cartDao.clearCart(userId) >= 0; // 即使没有记录被删除也视为成功
            if (result) {
                // 清除用户购物车列表缓存
                String userCartKey = "user:cart:" + userId;
                redisService.delete(userCartKey);
                
                // 获取用户所有购物车项并删除缓存
                List<Cart> userCarts = cartDao.getCartListByUserId(userId);
                for (Cart cart : userCarts) {
                    String key = "cart:" + cart.getCartId();
                    redisService.delete(key);
                }
            }
            return result;
        } catch (Exception e) {
            log.error("清空购物车异常", e);
            return false;
        }
    }

    /**
     * 获取购物车商品列表
     *
     * @param userId 用户ID
     * @return 购物车商品列表
     */
    @Override
    public List<Cart> getCartList(Integer userId) {
        try {
            // 先从Redis缓存中获取
            String userCartKey = "user:cart:" + userId;
            List<Cart> carts = redisService.get(userCartKey, List.class);
            if (carts != null && !carts.isEmpty()) {
                log.debug("从Redis缓存中获取购物车数据，userId={}", userId);
                return carts;
            }
            
            // 缓存中没有，从数据库获取
            carts = cartDao.getCartListByUserId(userId);
            if (carts != null && !carts.isEmpty()) {
                // 放入缓存
                redisService.set(userCartKey, carts, 24 * 60 * 60); // 缓存24小时
                
                // 同时缓存每个购物车项
                for (Cart cart : carts) {
                    String key = "cart:" + cart.getCartId();
                    redisService.set(key, cart, 24 * 60 * 60); // 缓存24小时
                }
            }
            return carts;
        } catch (Exception e) {
            log.error("获取购物车列表异常", e);
            return null;
        }
    }

    /**
     * 获取购物车商品列表（分页）
     *
     * @param userId   用户ID
     * @param pageNum  页码
     * @param pageSize 每页数量
     * @return 分页购物车商品列表
     */
    @Override
    public PageInfo<Cart> getCartListWithPage(Integer userId, Integer pageNum, Integer pageSize) {
        try {
            PageHelper.startPage(pageNum, pageSize);
            List<Cart> cartList = cartDao.getCartListByUserId(userId);
            return new PageInfo<>(cartList);
        } catch (Exception e) {
            log.error("获取分页购物车列表异常", e);
            return null;
        }
    }

    /**
     * 获取已选中的购物车商品列表
     *
     * @param userId 用户ID
     * @return 已选中的购物车商品列表
     */
    @Override
    public List<Cart> getSelectedCartList(Integer userId) {
        try {
            return cartDao.getSelectedCartListByUserId(userId);
        } catch (Exception e) {
            log.error("获取已选中的购物车列表异常", e);
            return null;
        }
    }

    /**
     * 全选/取消全选购物车商品
     *
     * @param userId   用户ID
     * @param selected 选中状态：0-未选中，1-已选中
     * @return 是否成功
     */
    @Override
    public boolean selectAllCart(Integer userId, Integer selected) {
        try {
            if (selected != 0 && selected != 1) {
                log.error("全选/取消全选购物车失败：状态值无效，userId={}, selected={}", userId, selected);
                return false;
            }

            return cartDao.updateCartSelectedByUserId(userId, selected) >= 0; // 即使没有记录被更新也视为成功
        } catch (Exception e) {
            log.error("全选/取消全选购物车异常", e);
            return false;
        }
    }

    /**
     * 获取购物车商品数量
     *
     * @param userId 用户ID
     * @return 购物车商品数量
     */
    @Override
    public int getCartCount(Integer userId) {
        try {
            return cartDao.countCartByUserId(userId);
        } catch (Exception e) {
            log.error("获取购物车商品数量异常", e);
            return 0;
        }
    }

    /**
     * 检查商品是否在购物车中
     *
     * @param userId    用户ID
     * @param productId 商品ID
     * @return 是否在购物车中
     */
    @Override
    public boolean isProductInCart(Integer userId, Integer productId) {
        try {
            Cart cart = cartDao.getCartByUserIdAndProductId(userId, productId);
            return cart != null;
        } catch (Exception e) {
            log.error("检查商品是否在购物车中异常", e);
            return false;
        }
    }
}