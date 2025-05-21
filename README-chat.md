# 聊天功能实现文档

## 功能概述

本系统实现了一个基于WebSocket的实时聊天功能，支持以下特性：

- 用户与客服（管理员）之间的一对一聊天
- 管理员向所有用户发送全站广播消息
- 消息已读/未读状态显示
- 未读消息计数
- 聊天历史记录查询
- 最近聊天列表

## 技术架构

- 前端：HTML5、CSS3、JavaScript、jQuery、Bootstrap 5
- 后端：Spring Boot、WebSocket、MyBatis
- 数据库：MySQL

## 数据库设计

### 聊天消息表 (chat_message)

| 字段名 | 类型 | 说明 |
| --- | --- | --- |
| message_id | bigint | 主键，消息ID |
| sender_id | bigint | 发送者ID |
| receiver_id | bigint | 接收者ID，为空表示广播消息 |
| content | text | 消息内容 |
| message_type | tinyint | 消息类型：0-普通消息，1-系统消息，2-广播消息 |
| read_status | tinyint | 读取状态：0-未读，1-已读 |
| create_time | datetime | 创建时间 |
| update_time | datetime | 更新时间 |

## 后端实现

### 核心类

1. **WebSocket服务器端点**
   - `ChatWebSocketServer.java`: 处理WebSocket连接和消息传输

2. **HTTP会话配置器**
   - `HttpSessionConfigurator.java`: 在WebSocket连接中获取HTTP会话信息

3. **聊天消息服务**
   - `ChatMessageService.java`: 聊天消息服务接口
   - `ChatMessageServiceImpl.java`: 聊天消息服务实现类

4. **数据访问层**
   - `ChatMessageMapper.java`: 聊天消息数据库操作接口
   - `ChatMessageMapper.xml`: MyBatis映射文件

5. **控制器**
   - `ChatController.java`: 处理聊天相关的HTTP请求

### 主要功能实现

#### WebSocket消息处理

```java
@ServerEndpoint(value = "/websocket/chat/{userId}", configurator = HttpSessionConfigurator.class)
@Component
public class ChatWebSocketServer {
    // 存储所有在线用户的WebSocket连接
    private static final ConcurrentHashMap<Long, ChatWebSocketServer> webSocketMap = new ConcurrentHashMap<>();
    // 与某个客户端的连接会话
    private Session session;
    // 当前连接用户ID
    private Long userId;
    
    // 连接建立成功调用的方法
    @OnOpen
    public void onOpen(Session session, EndpointConfig config, @PathParam("userId") Long userId) {
        // 实现连接建立逻辑
    }
    
    // 收到客户端消息后调用的方法
    @OnMessage
    public void onMessage(String message, Session session) {
        // 实现消息处理逻辑
    }
    
    // 连接关闭调用的方法
    @OnClose
    public void onClose() {
        // 实现连接关闭逻辑
    }
    
    // 发生错误时调用的方法
    @OnError
    public void onError(Session session, Throwable error) {
        // 实现错误处理逻辑
    }
    
    // 发送消息方法
    public void sendMessage(String message) {
        // 实现消息发送逻辑
    }
}
```

#### 聊天消息服务

```java
public interface ChatMessageService {
    // 添加聊天消息
    ChatMessage addChatMessage(ChatMessage chatMessage);
    
    // 获取聊天记录
    PageInfo<ChatMessage> getChatHistory(Long userId, Long otherUserId, int pageNum, int pageSize);
    
    // 获取未读消息数量
    int getUnreadCount(Long userId, Long senderId);
    
    // 标记消息为已读
    boolean markMessageRead(Long messageId);
    
    // 标记所有消息为已读
    boolean markAllRead(Long userId, Long otherUserId);
    
    // 获取最近聊天列表
    List<RecentChat> getRecentChatList(Long userId);
}
```

## 前端实现

### 客户端聊天页面

- `chat.html`: 客户端聊天页面，位于 `/pages/client/` 目录下
- `chat-client.js`: 客户端聊天JavaScript文件，处理WebSocket连接和消息交互

### 管理端聊天页面

- `chat.html`: 管理端聊天页面，位于 `/pages/admin/` 目录下
- `chat-admin.js`: 管理端聊天JavaScript文件，处理WebSocket连接和消息交互

### 共用样式

- `chat.css`: 聊天页面共用样式文件

## 使用方法

### 客户端用户

1. 登录系统后，点击导航栏中的"聊天"按钮进入聊天页面
2. 在聊天页面可以：
   - 查看与客服的聊天历史
   - 发送消息给客服
   - 查看未读消息数量
   - 选择特定客服进行对话

### 管理员用户

1. 登录系统后，点击导航栏中的"聊天管理"按钮进入聊天管理页面
2. 在聊天管理页面可以：
   - 查看与所有用户的聊天历史
   - 发送消息给特定用户
   - 发送全站广播消息
   - 标记消息为已读
   - 查看未读消息数量

## 接口说明

### WebSocket接口

- 连接地址：`ws://{host}/websocket/chat/{userId}`
- 消息格式：JSON格式，包含以下字段：
  - `senderId`: 发送者ID
  - `receiverId`: 接收者ID
  - `content`: 消息内容
  - `messageType`: 消息类型
  - `createTime`: 创建时间

### HTTP接口

#### 获取聊天历史

- 请求方式：GET
- 请求地址：`/api/chat/history`
- 请求参数：
  - `otherUserId`: 对方用户ID
  - `pageNum`: 页码
  - `pageSize`: 每页记录数
- 返回数据：分页的聊天记录列表

#### 获取最近聊天列表

- 请求方式：GET
- 请求地址：`/api/chat/recent`
- 返回数据：最近聊天的用户列表，包含最后一条消息和未读消息数量

#### 获取未读消息数量

- 请求方式：GET
- 请求地址：`/api/chat/unread`
- 请求参数：
  - `senderId`: 发送者ID（可选）
- 返回数据：未读消息数量

#### 标记消息为已读

- 请求方式：POST
- 请求地址：`/api/chat/read`
- 请求参数：
  - `messageId`: 消息ID
- 返回数据：操作结果

#### 标记所有消息为已读

- 请求方式：POST
- 请求地址：`/api/chat/read/all`
- 请求参数：
  - `otherUserId`: 对方用户ID
- 返回数据：操作结果

#### 获取客服列表

- 请求方式：GET
- 请求地址：`/api/chat/admins`
- 返回数据：客服用户列表

## 注意事项

1. 确保数据库中已创建 `chat_message` 表
2. 确保用户表中已有管理员用户（role=1）
3. WebSocket连接需要用户已登录
4. 广播消息只能由管理员发送

## 扩展建议

1. 添加消息加密功能
2. 实现消息撤回功能
3. 添加图片、文件等多媒体消息支持
4. 实现群聊功能
5. 添加消息通知功能