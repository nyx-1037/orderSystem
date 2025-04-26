-- 创建数据库
CREATE DATABASE IF NOT EXISTS order_system DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;

USE order_system;

-- 用户表
CREATE TABLE IF NOT EXISTS `user` (
  `user_id` INT NOT NULL AUTO_INCREMENT COMMENT '用户ID',
  `username` VARCHAR(50) NOT NULL COMMENT '用户名',
  `password` VARCHAR(50) NOT NULL COMMENT '密码',
  `real_name` VARCHAR(50) COMMENT '真实姓名',
  `phone` VARCHAR(20) COMMENT '电话号码',
  `email` VARCHAR(100) COMMENT '邮箱',
  `address` VARCHAR(200) COMMENT '地址',
  `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`user_id`),
  UNIQUE KEY `idx_username` (`username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户表';

-- 商品表
CREATE TABLE IF NOT EXISTS `product` (
  `product_id` INT NOT NULL AUTO_INCREMENT COMMENT '商品ID',
  `product_name` VARCHAR(100) NOT NULL COMMENT '商品名称',
  `product_desc` VARCHAR(500) COMMENT '商品描述',
  `price` DECIMAL(10,2) NOT NULL COMMENT '商品价格',
  `stock` INT NOT NULL DEFAULT 0 COMMENT '库存数量',
  `status` TINYINT NOT NULL DEFAULT 1 COMMENT '状态：0-下架，1-上架',
  `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`product_id`),
  KEY `idx_product_name` (`product_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='商品表';

-- 订单表
CREATE TABLE IF NOT EXISTS `order` (
  `order_id` INT NOT NULL AUTO_INCREMENT COMMENT '订单ID',
  `order_no` VARCHAR(50) NOT NULL COMMENT '订单编号',
  `user_id` INT NOT NULL COMMENT '用户ID',
  `total_amount` DECIMAL(10,2) NOT NULL COMMENT '订单总金额',
  `status` TINYINT NOT NULL DEFAULT 0 COMMENT '订单状态：0-待付款，1-已付款，2-已发货，3-已完成，4-已取消',
  `payment_time` DATETIME COMMENT '支付时间',
  `shipping_time` DATETIME COMMENT '发货时间',
  `complete_time` DATETIME COMMENT '完成时间',
  `address` VARCHAR(200) COMMENT '收货地址',
  `receiver` VARCHAR(50) COMMENT '收货人',
  `receiver_phone` VARCHAR(20) COMMENT '收货人电话',
  `remark` VARCHAR(500) COMMENT '订单备注',
  `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`order_id`),
  UNIQUE KEY `idx_order_no` (`order_no`),
  KEY `idx_user_id` (`user_id`),
  CONSTRAINT `fk_order_user` FOREIGN KEY (`user_id`) REFERENCES `user` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='订单表';

-- 订单明细表
CREATE TABLE IF NOT EXISTS `order_item` (
  `item_id` INT NOT NULL AUTO_INCREMENT COMMENT '明细ID',
  `order_id` INT NOT NULL COMMENT '订单ID',
  `product_id` INT NOT NULL COMMENT '商品ID',
  `product_name` VARCHAR(100) NOT NULL COMMENT '商品名称',
  `product_price` DECIMAL(10,2) NOT NULL COMMENT '商品单价',
  `quantity` INT NOT NULL COMMENT '购买数量',
  `total_price` DECIMAL(10,2) NOT NULL COMMENT '商品总价',
  `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`item_id`),
  KEY `idx_order_id` (`order_id`),
  KEY `idx_product_id` (`product_id`),
  CONSTRAINT `fk_order_item_order` FOREIGN KEY (`order_id`) REFERENCES `order` (`order_id`),
  CONSTRAINT `fk_order_item_product` FOREIGN KEY (`product_id`) REFERENCES `product` (`product_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='订单明细表';

-- 插入测试数据
-- 用户数据
INSERT INTO `user` (`username`, `password`, `real_name`, `phone`, `email`, `address`) VALUES
('admin', '123456', '管理员', '13800138000', 'admin@example.com', '北京市朝阳区'),
('zhangsan', '123456', '张三', '13900139000', 'zhangsan@example.com', '上海市浦东新区'),
('lisi', '123456', '李四', '13700137000', 'lisi@example.com', '广州市天河区');

-- 商品数据
INSERT INTO `product` (`product_name`, `product_desc`, `price`, `stock`, `status`) VALUES
('iPhone 13', 'Apple iPhone 13 128GB', 5999.00, 100, 1),
('MacBook Pro', 'Apple MacBook Pro 14英寸', 12999.00, 50, 1),
('iPad Air', 'Apple iPad Air 10.9英寸', 4799.00, 80, 1),
('小米12', '小米12 8GB+256GB', 3999.00, 120, 1),
('华为P50', '华为P50 8GB+256GB', 4488.00, 60, 1);

-- 订单数据
INSERT INTO `order` (`order_no`, `user_id`, `total_amount`, `status`, `payment_time`, `address`, `receiver`, `receiver_phone`, `remark`) VALUES
('ORD20230501001', 1, 5999.00, 1, '2023-05-01 10:30:00', '北京市朝阳区', '管理员', '13800138000', '尽快发货'),
('ORD20230502001', 2, 12999.00, 2, '2023-05-02 14:20:00', '上海市浦东新区', '张三', '13900139000', '周末送达'),
('ORD20230503001', 3, 8798.00, 0, NULL, '广州市天河区', '李四', '13700137000', '无');

-- 订单明细数据
INSERT INTO `order_item` (`order_id`, `product_id`, `product_name`, `product_price`, `quantity`, `total_price`) VALUES
(1, 1, 'iPhone 13', 5999.00, 1, 5999.00),
(2, 2, 'MacBook Pro', 12999.00, 1, 12999.00),
(3, 3, 'iPad Air', 4799.00, 1, 4799.00),
(3, 4, '小米12', 3999.00, 1, 3999.00);