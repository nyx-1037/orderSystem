-- 用户头像表
CREATE TABLE IF NOT EXISTS `user_avatar` (
  `avatar_id` INT NOT NULL AUTO_INCREMENT COMMENT '头像ID',
  `user_id` INT NOT NULL COMMENT '用户ID',
  `avatar_url` VARCHAR(255) NOT NULL COMMENT '头像URL',
  `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`avatar_id`),
  UNIQUE KEY `idx_user_id` (`user_id`),
  CONSTRAINT `fk_avatar_user` FOREIGN KEY (`user_id`) REFERENCES `user` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户头像表';

-- 修改用户表，添加默认头像字段
ALTER TABLE `user` ADD COLUMN `avatar` VARCHAR(255) DEFAULT '/images/default-avatar.png' COMMENT '用户头像' AFTER `email`;