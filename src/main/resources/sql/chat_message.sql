/*
 聊天消息表结构
*/

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ----------------------------
-- Table structure for chat_message
-- ----------------------------
DROP TABLE IF EXISTS `chat_message`;
CREATE TABLE `chat_message`  (
  `message_id` int NOT NULL AUTO_INCREMENT COMMENT '消息ID',
  `sender_id` int NOT NULL COMMENT '发送者ID',
  `receiver_id` int NULL DEFAULT NULL COMMENT '接收者ID，如果为空表示全站广播',
  `content` text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT '消息内容',
  `message_type` tinyint NOT NULL DEFAULT 0 COMMENT '消息类型：0-普通消息，1-系统消息，2-全站广播',
  `read_status` tinyint NOT NULL DEFAULT 0 COMMENT '读取状态：0-未读，1-已读',
  `create_time` datetime NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`message_id`) USING BTREE,
  INDEX `idx_sender_id`(`sender_id` ASC) USING BTREE,
  INDEX `idx_receiver_id`(`receiver_id` ASC) USING BTREE,
  INDEX `idx_create_time`(`create_time` ASC) USING BTREE,
  CONSTRAINT `fk_chat_sender` FOREIGN KEY (`sender_id`) REFERENCES `user` (`user_id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_chat_receiver` FOREIGN KEY (`receiver_id`) REFERENCES `user` (`user_id`) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci COMMENT = '聊天消息表' ROW_FORMAT = Dynamic;

SET FOREIGN_KEY_CHECKS = 1;