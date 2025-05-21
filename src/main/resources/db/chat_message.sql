-- 聊天消息表
CREATE TABLE IF NOT EXISTS `chat_message` (
  `message_id` bigint(20) NOT NULL AUTO_INCREMENT COMMENT '消息ID',
  `sender_id` bigint(20) NOT NULL COMMENT '发送者ID',
  `receiver_id` bigint(20) DEFAULT NULL COMMENT '接收者ID，为空表示广播消息',
  `content` text NOT NULL COMMENT '消息内容',
  `message_type` tinyint(4) NOT NULL DEFAULT '0' COMMENT '消息类型：0-普通消息，1-系统消息，2-广播消息',
  `read_status` tinyint(4) NOT NULL DEFAULT '0' COMMENT '读取状态：0-未读，1-已读',
  `create_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`message_id`),
  KEY `idx_sender_receiver` (`sender_id`, `receiver_id`),
  KEY `idx_receiver_sender` (`receiver_id`, `sender_id`),
  KEY `idx_create_time` (`create_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='聊天消息表';

-- 添加外键约束（如果需要）
-- ALTER TABLE `chat_message` ADD CONSTRAINT `fk_chat_message_sender` FOREIGN KEY (`sender_id`) REFERENCES `user` (`user_id`) ON DELETE CASCADE ON UPDATE CASCADE;
-- ALTER TABLE `chat_message` ADD CONSTRAINT `fk_chat_message_receiver` FOREIGN KEY (`receiver_id`) REFERENCES `user` (`user_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- 创建触发器，当插入新消息时，更新相关用户的未读消息数（如果需要）
-- DELIMITER //
-- CREATE TRIGGER `tr_chat_message_after_insert` AFTER INSERT ON `chat_message`
-- FOR EACH ROW
-- BEGIN
--   IF NEW.receiver_id IS NOT NULL THEN
--     -- 更新接收者的未读消息数
--     -- 这里可以根据实际需求实现
--   END IF;
-- END //
-- DELIMITER ;