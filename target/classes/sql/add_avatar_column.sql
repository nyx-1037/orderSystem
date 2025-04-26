-- 为user表添加avatar字段
ALTER TABLE `user` ADD COLUMN `avatar` VARCHAR(255) DEFAULT '/images/default-avatar.png' COMMENT '用户头像' AFTER `address`;