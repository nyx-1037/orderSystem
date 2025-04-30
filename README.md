# 企业级后端接口文档

本项目为订单管理系统，后端采用RESTful风格，所有接口均以`/api`开头，支持标准HTTP方法。接口分为用户、订单、商品、日志、在线用户等模块，详细说明如下：

---

## 1. 用户模块（UserController）

### 1.1 获取所有用户
- **接口地址**：`GET /api/users`
- **功能**：获取所有用户列表
- **参数**：无
- **返回值**：用户列表（不含密码）

### 1.2 根据UUID获取用户
- **接口地址**：`GET /api/users/{uuid}`
- **功能**：根据UUID获取用户信息
- **参数**：
  - `uuid`：用户UUID（路径参数）
- **返回值**：用户信息（不含密码）

### 1.3 用户登录
- **接口地址**：`POST /api/users/login`
- **功能**：用户登录，返回Token
- **参数**：
  - `username`：用户名（JSON体）
  - `password`：密码（JSON体）
- **返回值**：登录结果、Token、用户信息

### 1.4 检查用户名是否存在
- **接口地址**：`GET /api/users/check-username?username=xxx`
- **功能**：检查用户名是否已存在
- **参数**：
  - `username`：用户名（查询参数）
- **返回值**：`exists`布尔值

### 1.5 用户注册
- **接口地址**：`POST /api/users/register`
- **功能**：用户注册
- **参数**：用户信息（JSON体）
- **返回值**：注册结果、UUID

### 1.6 用户退出登录
- **接口地址**：`POST /api/users/logout`
- **功能**：用户退出登录
- **参数**：无
- **返回值**：退出结果

---

## 2. 订单模块（OrderController, ClientOrderController）

### 2.1 获取订单列表（管理员/用户）
- **接口地址**：`GET /api/orders`
- **功能**：获取订单列表（分页）
- **参数**：
  - `page`：页码（默认1）
  - `size`：每页数量（默认10）
  - `keyword`：搜索关键词（可选）
- **返回值**：分页订单数据

### 2.2 根据UUID获取订单详情
- **接口地址**：`GET /api/orders/{uuid}`
- **功能**：获取订单详情
- **参数**：
  - `uuid`：订单UUID（路径参数）
- **返回值**：订单详情

### 2.3 创建订单
- **接口地址**：`POST /api/orders`
- **功能**：创建新订单
- **参数**：订单信息（JSON体）
- **返回值**：创建结果、UUID

### 2.4 客户端订单相关
- **接口地址**：`GET /api/client/orders`
- **功能**：获取当前用户订单列表（分页、状态筛选）
- **参数**：
  - `page`：页码（默认1）
  - `size`：每页数量（默认5）
  - `status`：订单状态（可选）
  - `keyword`：搜索关键词（可选）
- **返回值**：分页订单数据

- **接口地址**：`GET /api/client/orders/{uuid}`
- **功能**：获取订单详情（当前用户）
- **参数**：
  - `uuid`：订单UUID（路径参数）
- **返回值**：订单详情

- **接口地址**：`POST /api/client/orders/{uuid}/cancel`
- **功能**：取消订单
- **参数**：
  - `uuid`：订单UUID（路径参数）
- **返回值**：取消结果

- **接口地址**：`POST /api/client/orders/{uuid}/confirm`
- **功能**：确认收货
- **参数**：
  - `uuid`：订单UUID（路径参数）
- **返回值**：确认结果

- **接口地址**：`POST /api/client/orders/{uuid}/pay`
- **功能**：支付订单
- **参数**：
  - `uuid`：订单UUID（路径参数）
- **返回值**：支付结果

---

## 3. 商品模块（ProductController）

### 3.1 获取所有商品
- **接口地址**：`GET /api/products`
- **功能**：获取所有商品列表
- **参数**：无
- **返回值**：商品列表

### 3.2 根据UUID获取商品
- **接口地址**：`GET /api/products/{uuid}`
- **功能**：根据UUID获取商品信息
- **参数**：
  - `uuid`：商品UUID（路径参数）
- **返回值**：商品信息

### 3.3 添加商品
- **接口地址**：`POST /api/products`
- **功能**：添加新商品
- **参数**：商品信息（JSON体）
- **返回值**：添加结果、UUID

### 3.4 更新商品
- **接口地址**：`PUT /api/products/{uuid}`
- **功能**：更新商品信息
- **参数**：
  - `uuid`：商品UUID（路径参数）
  - 商品信息（JSON体）
- **返回值**：更新结果

### 3.5 删除商品
- **接口地址**：`DELETE /api/products/{uuid}`
- **功能**：删除商品
- **参数**：
  - `uuid`：商品UUID（路径参数）
- **返回值**：删除结果

---

## 4. 日志模块（SysLogController）

### 4.1 获取日志列表
- **接口地址**：`GET /api/system-logs`
- **功能**：获取系统日志（分页、多条件筛选）
- **参数**：
  - `pageNum`：页码（默认1）
  - `pageSize`：每页数量（默认10）
  - `username`：用户名（可选）
  - `operation`：操作类型（可选）
  - `statusCode`：状态码（可选）
  - `ip`：IP地址（可选）
  - `startTime`：开始时间（可选）
  - `endTime`：结束时间（可选）
- **返回值**：分页日志数据

### 4.2 根据用户ID/用户名/操作类型获取日志
- **接口地址**：`GET /api/system-logs/by-user-id/{userId}`
- **接口地址**：`GET /api/system-logs/by-username/{username}`
- **接口地址**：`GET /api/system-logs/by-operation/{operation}`
- **功能**：根据条件获取日志（分页）
- **参数**：同上
- **返回值**：分页日志数据

### 4.3 删除日志
- **接口地址**：`DELETE /api/system-logs/{logId}`
- **功能**：删除指定日志
- **参数**：
  - `logId`：日志ID（路径参数）
- **返回值**：操作结果

### 4.4 批量删除日志
- **接口地址**：`DELETE /api/system-logs/batch`
- **功能**：批量删除日志
- **参数**：日志ID列表（JSON体）
- **返回值**：操作结果

### 4.5 强制用户登出
- **接口地址**：`POST /api/system-logs/users/{userId}/force-logout`
- **功能**：强制指定用户登出
- **参数**：
  - `userId`：用户ID（路径参数）
- **返回值**：操作结果

### 4.6 手动同步Redis日志到数据库
- **接口地址**：`POST /api/system-logs/synchronize`
- **功能**：手动同步Redis中的日志到MySQL
- **参数**：无
- **返回值**：同步结果

---

## 5. 在线用户模块（OnlineUserController）

### 5.1 获取所有在线用户
- **接口地址**：`GET /api/online-users`
- **功能**：获取所有在线用户信息
- **参数**：无
- **返回值**：在线用户列表

---

## 6. 首页模块（HomeController）

### 6.1 访问首页
- **接口地址**：`GET /`
- **功能**：重定向到静态首页
- **参数**：无
- **返回值**：HTML页面

---

### 说明
- 所有接口均为RESTful风格，参数类型、返回值结构详见各接口注释。
- 需要登录的接口需携带有效Token。
- 返回值均为JSON格式，包含`success`、`message`等字段。
- 详细参数和示例可参考各Controller源码及注释。