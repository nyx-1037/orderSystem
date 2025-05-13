package com.ordersystem.service.impl;

import com.ordersystem.dao.OrderDao;
import com.ordersystem.dao.OrderItemDao;
import com.ordersystem.dao.ProductDao;
import com.ordersystem.dao.UserDao;
import com.ordersystem.entity.Order;
import com.ordersystem.entity.OrderItem;
import com.ordersystem.service.OrderService;
import com.ordersystem.service.ProductService;
import com.ordersystem.service.RedisService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.github.pagehelper.PageHelper;
import com.github.pagehelper.PageInfo;

import java.util.*;

/**
 * 订单服务实现类
 */
@Service
public class OrderServiceImpl implements OrderService, CommandLineRunner {


    private static final Logger logger = LoggerFactory.getLogger(OrderServiceImpl.class);
    
    @Autowired
    private RedisTemplate<String, Object> redisTemplate;
    
    @Autowired
    private OrderDao orderDao;
    
    @Autowired
    private OrderItemDao orderItemDao;
    
    @Autowired
    private UserDao userDao;
    
    @Autowired
    private ProductDao productDao;
    
    @Autowired
    private RedisService redisService;
    
    @Autowired
    private ProductService productService;
    
    /**
     * 项目启动时初始化订单数据到Redis缓存
     */
    @Override
    public void run(String... args) throws Exception {
        logger.info("开始初始化订单数据到Redis缓存...");
        List<Order> orders = orderDao.getAllOrders();
        for (Order order : orders) {
            String key = "order:" + order.getOrderId();
            redisService.set(key, order, 24 * 60 * 60); // 缓存24小时
        }
        logger.info("订单数据缓存初始化完成，共缓存{}条记录", orders.size());
    }
    
    @Override
    @Transactional
    public boolean createOrder(Order order) {
        // 生成订单编号
        String orderNo = generateOrderNo();
        order.setOrderNo(orderNo);
        // 生成订单UUID
        String orderUuid = UUID.randomUUID().toString();
        order.setOrderUuid(orderUuid);
        order.setStatus(0); // 默认状态：待付款
        
        // 计算订单总金额
        if (order.getOrderItems() != null && !order.getOrderItems().isEmpty()) {
            java.math.BigDecimal totalAmount = java.math.BigDecimal.ZERO;
            
            // 处理订单项数据并计算总价
            for (OrderItem item : order.getOrderItems()) {
                // 验证 productPrice 和 quantity 是否存在
                if (item.getProductPrice() != null && item.getQuantity() != null && item.getQuantity() > 0) {
                    java.math.BigDecimal itemTotal = item.getProductPrice().multiply(new java.math.BigDecimal(item.getQuantity()));
                    item.setTotalPrice(itemTotal); // 设置当前项的总价
                    totalAmount = totalAmount.add(itemTotal); // 累加到订单总金额
                } else {
                    // 如果价格或数量无效，可以抛出异常或记录错误
                    // 这里简单地跳过，或者可以返回创建失败
                    // throw new IllegalArgumentException("订单项数据无效: " + item);
                     System.err.println("订单项数据无效，跳过计算: " + item);
                     // 根据业务需求决定是否应该中断订单创建
                     // return false; 
                }
            }
            
            // 设置订单总金额
            if (order.getTotalAmount() == null) {
                order.setTotalAmount(totalAmount);
            }
        }
        
        // 保存订单
        int result = orderDao.insertOrder(order);
        if (result > 0 && order.getOrderItems() != null && !order.getOrderItems().isEmpty()) {
            // 设置订单明细的订单ID
            for (OrderItem item : order.getOrderItems()) {
                item.setOrderId(order.getOrderId());
                // 减少商品库存
                productService.updateProductStock(item.getProductId(), -item.getQuantity());
            }
            // 批量保存订单明细
            boolean success = orderItemDao.batchInsertOrderItems(order.getOrderItems()) > 0;
            if (success) {
                try {
                    // 更新Redis缓存
                    String key = "order:" + order.getOrderId();
                    redisService.set(key, order, 24 * 60 * 60); // 缓存24小时
                    // 清除相关缓存
                    redisTemplate.delete("allOrders");
                } catch (Exception e) {
                    logger.error("添加订单后更新缓存失败", e);
                    // 缓存更新失败不影响业务操作
                }
            }
            return success;
        }
        if (result > 0) {
            try {
                // 更新Redis缓存
                String key = "order:" + order.getOrderId();
                redisService.set(key, order, 24 * 60 * 60); // 缓存24小时
                // 清除相关缓存
                redisTemplate.delete("allOrders");
            } catch (Exception e) {
                logger.error("添加订单后更新缓存失败", e);
                // 缓存更新失败不影响业务操作
            }
        }
        return result > 0;
    }
    
    @Override
    @Transactional
    public boolean deleteOrder(Integer orderId) {
        // 先删除订单明细，再删除订单
        orderItemDao.deleteOrderItemsByOrderId(orderId);
        boolean result = orderDao.deleteOrderById(orderId) > 0;
        if (result) {
            try {
                // 从Redis缓存中删除
                String key = "order:" + orderId;
                redisService.delete(key);
                // 清除相关缓存
                redisTemplate.delete("allOrders");
            } catch (Exception e) {
                logger.error("删除订单后清除缓存失败", e);
                // 缓存操作失败不影响业务操作
            }
        }
        return result;
    }
    
    @Override
    public boolean updateOrder(Order order) {
        boolean result = orderDao.updateOrder(order) > 0;
        if (result) {
            try {
                // 获取更新后的订单信息
                Order updatedOrder = orderDao.getOrderById(order.getOrderId());
                if (updatedOrder != null) {
                    // 更新Redis缓存
                    String key = "order:" + order.getOrderId();
                    redisService.set(key, updatedOrder, 24 * 60 * 60); // 缓存24小时
                    // 清除相关缓存
                    redisTemplate.delete("allOrders");
                    if (updatedOrder.getUserId() != null) {
                        redisTemplate.delete("ordersByUser::" + updatedOrder.getUserId());
                    }
                }
            } catch (Exception e) {
                logger.error("更新订单后更新缓存失败", e);
                // 缓存操作失败不影响业务操作
            }
        }
        return result;
    }
    
    @Override
    public Order getOrderById(Integer orderId) {
        Order order = null;
        String key = "order:" + orderId;
        
        try {
            // 先从Redis缓存中获取
            order = redisService.get(key, Order.class);
            if (order != null) {
                logger.debug("从Redis缓存中获取订单数据，orderId={}", orderId);
                return order;
            }
        } catch (Exception e) {
            logger.error("从Redis获取订单数据失败，将从数据库获取, orderId={}", orderId, e);
            // Redis获取失败，继续从数据库获取
        }
        
        // 缓存中没有或获取失败，从数据库获取
        order = orderDao.getOrderById(orderId);
        if (order != null) {
            try {
                // 放入缓存
                redisService.set(key, order, 24 * 60 * 60); // 缓存24小时
            } catch (Exception e) {
                logger.error("将订单数据放入Redis缓存失败, orderId={}", orderId, e);
                // 缓存操作失败不影响业务操作
            }
        }
        return order;
    }
    
    @Override
    public Order getOrderByOrderNo(String orderNo) {
        return orderDao.getOrderByOrderNo(orderNo);
    }
    
    @Override
    public List<Order> getAllOrders() {
        return orderDao.getAllOrders();
    }
    
    @Override
    public PageInfo<Order> getAllOrdersByPage(Integer pageNum, Integer pageSize) {
        // 使用PageHelper进行分页查询
        PageHelper.startPage(pageNum, pageSize);
        List<Order> orders = orderDao.getAllOrders();
        return new PageInfo<>(orders);
    }
    
    @Override
    public List<Order> getOrdersByUserId(Integer userId) {
        return orderDao.getOrdersByUserId(userId);
    }
    
    @Override
    public PageInfo<Order> getOrdersByUserIdWithPage(Integer userId, Integer pageNum, Integer pageSize) {
        // 使用PageHelper进行分页查询
        PageHelper.startPage(pageNum, pageSize);
        List<Order> orders = orderDao.getOrdersByUserId(userId);
        return new PageInfo<>(orders);
    }
    
    @Override
    public List<Order> getOrdersByStatus(Integer status) {
        return orderDao.getOrdersByStatus(status);
    }
    
    @Override
    public PageInfo<Order> getOrdersByUserIdAndStatusWithPage(Integer userId, Integer status, Integer pageNum, Integer pageSize) {
        // 使用PageHelper进行分页查询
        PageHelper.startPage(pageNum, pageSize);
        List<Order> orders = orderDao.getOrdersByUserIdAndStatus(userId, status);
        return new PageInfo<>(orders);
    }
    
    @Override
    public Order getOrderDetail(Integer orderId) {
        if (orderId == null) {
            return null;
        }
        Order order = orderDao.getOrderById(orderId);
        if (order != null) {
            // 获取订单关联的明细项
            List<OrderItem> items = orderItemDao.getOrderItemsByOrderId(orderId);
            order.setOrderItems(items);
        }
        return order;   
    }
    
    @Override
    public Order getOrderByUuid(String orderUuid) {
        if (orderUuid == null || orderUuid.trim().isEmpty()) {
            return null;
        }
        return orderDao.getOrderByUuid(orderUuid);
    }
    
    @Override
    public Order getOrderDetailByUuid(String orderUuid) {
        if (orderUuid == null || orderUuid.trim().isEmpty()) {
            return null;
        }
        Order order = orderDao.getOrderDetailByUuid(orderUuid);
        if (order != null) {
            // 获取订单关联的明细项
            List<OrderItem> items = orderItemDao.getOrderItemsByOrderId(order.getOrderId());
            order.setOrderItems(items);
        }
        return order;
    }
    
    @Override
    @Transactional
    public boolean payOrder(Integer orderId) {
        Order order = orderDao.getOrderById(orderId);
        if (order != null && order.getStatus() == 0) { // 待付款状态
            order.setStatus(1); // 已付款
            order.setPaymentTime(new Date());
            return orderDao.updateOrder(order) > 0;
        }
        return false;
    }
    
    @Override
    @Transactional
    public boolean shipOrder(Integer orderId) {
        Order order = orderDao.getOrderById(orderId);
        if (order != null && order.getStatus() == 1) { // 已付款状态
            order.setStatus(2); // 已发货
            order.setShippingTime(new Date());
            return orderDao.updateOrder(order) > 0;
        }
        return false;
    }
    

    
    @Override
    @Transactional
    public boolean completeOrder(Integer orderId) {
        Order order = orderDao.getOrderById(orderId);
        if (order != null && order.getStatus() == 2) { // 已发货状态
            order.setStatus(3); // 已完成
            order.setCompleteTime(new Date());
            return orderDao.updateOrder(order) > 0;
        }
        return false;
    }
    
    @Override
    @Transactional
    public boolean cancelOrder(Integer orderId) {
        Order order = orderDao.getOrderById(orderId);
        if (order != null && order.getStatus() <= 1) { // 待付款或已付款状态
            order.setStatus(4); // 已取消
            
            // 如果订单已付款，需要退还库存
            if (order.getStatus() == 1) {
                // 获取订单明细
                List<OrderItem> items = orderItemDao.getOrderItemsByOrderId(orderId);
                for (OrderItem item : items) {
                    // 恢复商品库存
                    productService.updateProductStock(item.getProductId(), item.getQuantity());
                }
            }
            
            return orderDao.updateOrder(order) > 0;
        }
        return false;
    }
    
    @Override
    public Integer getOrderCount() {
        try {
            // 尝试从Redis缓存获取
            Object cachedCount = redisTemplate.opsForValue().get("orderCount");
            if (cachedCount != null) {
                return (Integer) cachedCount;
            }
        } catch (Exception e) {
            logger.error("从Redis获取订单总数失败", e);
            // 继续从数据库获取
        }
        
        // 从数据库获取订单总数
        Integer count = orderDao.getOrderCount();
        
        try {
            // 缓存订单总数，设置5分钟过期
            redisTemplate.opsForValue().set("orderCount", count, 5, java.util.concurrent.TimeUnit.MINUTES);
        } catch (Exception e) {
            logger.error("缓存订单总数失败", e);
            // 缓存失败不影响业务
        }
        
        return count;
    }
    
    @Override
    public List<Map<String, Object>> getRecentOrdersCount(Integer days) {
        if (days == null || days <= 0) {
            days = 15; // 默认获取最近15天的数据
        }
        
        String cacheKey = "recentOrdersCount:" + days;
        
        try {
            // 尝试从Redis缓存获取
            Object cachedData = redisTemplate.opsForValue().get(cacheKey);
            if (cachedData != null) {
                return (List<Map<String, Object>>) cachedData;
            }
        } catch (Exception e) {
            logger.error("从Redis获取近期订单统计失败", e);
            // 继续从数据库获取
        }
        
        // 计算日期范围
        java.util.Calendar calendar = java.util.Calendar.getInstance();
        java.util.Date endDate = calendar.getTime(); // 当前日期
        
        calendar.add(java.util.Calendar.DAY_OF_MONTH, -days + 1); // 减去天数（加1是为了包含今天）
        java.util.Date startDate = calendar.getTime();
        
        // 格式化日期
        java.text.SimpleDateFormat sdf = new java.text.SimpleDateFormat("yyyy-MM-dd");
        String startDateStr = sdf.format(startDate) + " 00:00:00";
        String endDateStr = sdf.format(endDate) + " 23:59:59";
        
        // 构建查询参数
        Map<String, Object> params = new HashMap<>();
        params.put("startDate", startDateStr);
        params.put("endDate", endDateStr);
        
        // 从数据库获取数据
        List<Map<String, Object>> result = orderDao.getRecentOrdersCount(params);
        
        // 确保每一天都有数据，如果某天没有订单，则添加0
        Map<String, Object> filledResult = fillMissingDates(result, startDate, endDate);
        // 使用流操作进行类型转换，确保类型安全
        List<Map<String, Object>> sortedResult = filledResult.values().stream()
                .map(obj -> (Map<String, Object>) obj)
                .collect(java.util.stream.Collectors.toList());
        
        // 按日期排序
        sortedResult.sort((a, b) -> a.get("orderDate").toString().compareTo(b.get("orderDate").toString()));
        
        try {
            // 缓存结果，设置1小时过期
            redisTemplate.opsForValue().set(cacheKey, sortedResult, 1, java.util.concurrent.TimeUnit.HOURS);
        } catch (Exception e) {
            logger.error("缓存近期订单统计失败", e);
            // 缓存失败不影响业务
        }
        
        return sortedResult;
    }
    
    /**
     * 填充缺失的日期数据
     * @param data 原始数据
     * @param startDate 开始日期
     * @param endDate 结束日期
     * @return 填充后的数据
     */
    private Map<String, Object> fillMissingDates(List<Map<String, Object>> data, java.util.Date startDate, java.util.Date endDate) {
        Map<String, Object> result = new HashMap<>();
        java.text.SimpleDateFormat sdf = new java.text.SimpleDateFormat("yyyy-MM-dd");
        
        // 将原始数据转换为Map，以日期为键
        for (Map<String, Object> item : data) {
            result.put(item.get("orderDate").toString(), item);
        }
        
        // 填充缺失的日期
        java.util.Calendar calendar = java.util.Calendar.getInstance();
        calendar.setTime(startDate);
        
        while (!calendar.getTime().after(endDate)) {
            String dateStr = sdf.format(calendar.getTime());
            if (!result.containsKey(dateStr)) {
                Map<String, Object> emptyData = new HashMap<>();
                emptyData.put("orderDate", dateStr);
                emptyData.put("orderCount", 0);
                result.put(dateStr, emptyData);
            }
            calendar.add(java.util.Calendar.DAY_OF_MONTH, 1);
        }
        
        return result;
    }
    
    /**
     * 根据筛选条件分页查询所有订单
     * @param pageNum 页码
     * @param pageSize 每页数量
     * @param filters 筛选条件
     * @return 分页订单信息
     */
    @Override
    public PageInfo<Order> getAllOrdersByPageWithFilters(Integer pageNum, Integer pageSize, Map<String, Object> filters) {
        // 设置默认值
        if (pageNum == null || pageNum < 1) {
            pageNum = 1;
        }
        if (pageSize == null || pageSize < 1) {
            pageSize = 10; // 默认每页10条
        }
        
        // 使用PageHelper进行分页查询
        PageHelper.startPage(pageNum, pageSize);
        
        List<Order> orders;
        
        // 处理订单号模糊搜索（优先级最高）
        if (filters != null && filters.containsKey("orderUuid")) {
            String orderUuid = (String) filters.get("orderUuid");
            if (orderUuid != null && !orderUuid.trim().isEmpty()) {
                Order order = orderDao.getOrderByUuid(orderUuid);
                orders = new ArrayList<>();
                if (order != null) {
                    orders.add(order);
                }
            } else {
                orders = orderDao.getAllOrders();
            }
        } 
        // 处理其他筛选条件
        else if (filters != null && !filters.isEmpty()) {
            orders = orderDao.getOrdersByFilters(filters);
        } 
        // 无筛选条件时返回所有订单
        else {
            orders = orderDao.getAllOrders();
        }
        
        // 为每个订单加载订单项
        if (orders != null && !orders.isEmpty()) {
            for (Order order : orders) {
                if (order.getOrderId() != null) {
                    List<OrderItem> items = orderItemDao.getOrderItemsByOrderId(order.getOrderId());
                    order.setOrderItems(items);
                }
            }
        }
        
        return new PageInfo<>(orders);
    }
    
    /**
     * 生成订单编号
     * @return 订单编号
     */
    private String generateOrderNo() {
        // 生成格式：ORD + 年月日 + 6位随机数
        return "ORD" + System.currentTimeMillis() + UUID.randomUUID().toString().substring(0, 6);
    }
}