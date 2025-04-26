下面是为你的订单管理系统项目撰写的详细、规范的README.md文档，涵盖了项目简介、功能、技术栈、部署、接口说明、测试和常见问题等内容，便于开发者和测试人员快速了解和上手项目。

```markdown:e:\Java code\test20250413\README.md
# 订单管理系统

## 项目简介

本项目为一个基于Spring Boot的订单管理系统，支持用户注册、登录、商品浏览、下单、订单管理等核心业务流程。前端采用HTML+Bootstrap+JQuery实现，后端采用Spring Boot框架，数据持久层使用MyBatis，数据库为MySQL。系统适合中小型电商平台或企业内部订单管理使用。

---

## 目录

- [项目结构](#项目结构)
- [主要功能](#主要功能)
- [技术栈](#技术栈)
- [快速开始](#快速开始)
- [接口说明](#接口说明)
- [前端页面说明](#前端页面说明)
- [单元测试](#单元测试)
- [常见问题](#常见问题)
- [联系方式](#联系方式)

---

## 项目结构

```
e:\Java code\test20250413\
├── src
│   ├── main
│   │   ├── java/com/ordersystem/       # 后端Java代码
│   │   ├── resources
│   │   │   ├── static/                 # 前端静态资源
│   │   │   │   ├── css/
│   │   │   │   ├── js/
│   │   │   │   └── pages/
│   │   │   └── application.yml         # Spring Boot配置
│   └── test/java/com/ordersystem/      # 单元测试代码
└── README.md
```

---

## 主要功能

- **用户管理**
  - 用户注册、登录、登出
  - 用户信息展示

- **商品管理**
  - 商品列表浏览
  - 商品库存管理

- **订单管理**
  - 创建订单（支持多商品下单）
  - 订单列表查询
  - 订单详情查看
  - 订单状态管理（如待付款、已付款、已发货等）

- **安全认证**
  - 基于JWT的Token认证
  - 登录态校验，未登录自动跳转登录页

---

## 技术栈

- **后端**
  - Spring Boot
  - MyBatis
  - MySQL
  - JUnit 5（单元测试）

- **前端**
  - HTML5
  - Bootstrap 4
  - JQuery

- **其他**
  - JWT（用户认证）
  - Maven（项目管理）

---

## 快速开始

### 1. 环境准备

- JDK 8 或以上
- Maven 3.6+
- MySQL 5.7/8.0
- Node.js（如需前端构建）

### 2. 数据库初始化

1. 创建数据库（如：ordersystem）
2. 执行`src/main/resources/db/schema.sql`和`data.sql`初始化表结构和基础数据

### 3. 配置数据库连接

编辑`src/main/resources/application.yml`，配置数据库连接信息：

```yaml
spring:
  datasource:
    url: jdbc:mysql://localhost:3306/ordersystem?useUnicode=true&characterEncoding=utf-8
    username: root
    password: yourpassword
```

### 4. 启动项目

```bash
mvn spring-boot:run
```

### 5. 访问系统

- 前端入口：http://localhost:8080/pages/user/login.html
- 后端API入口：http://localhost:8080/api/

---

## 接口说明

### 用户相关

- `POST /api/user/login` 用户登录，返回JWT Token
- `POST /api/user/register` 用户注册
- `GET /api/user/current` 获取当前登录用户信息
- `POST /api/user/logout` 用户登出

### 商品相关

- `GET /api/product/list` 获取商品列表

### 订单相关

- `POST /api/order/create` 创建订单
  - 请求头需携带`Authorization: Bearer <token>`
  - 请求体示例：
    ```json
    {
      "receiver": "张三",
      "receiverPhone": "13800138000",
      "address": "北京市朝阳区建国路88号",
      "remark": "请尽快发货",
      "orderItems": [
        {
          "productId": 1,
          "quantity": 2,
          "price": 100.00
        }
      ]
    }
    ```
- `GET /api/order/list` 查询当前用户订单列表
- `GET /api/order/detail/{orderId}` 查询订单详情

---

## 前端页面说明

- `/pages/user/login.html` 用户登录页
- `/pages/user/register.html` 用户注册页
- `/pages/order/list.html` 订单列表页
- `/pages/order/create.html` 创建订单页
- `/pages/product/list.html` 商品列表页

前端页面通过AJAX与后端API交互，所有API请求需携带JWT Token（存储于localStorage）。

---

## 单元测试

- 测试代码位于`src/test/java/com/ordersystem/`
- 主要测试用例包括DAO层、Service层的核心业务逻辑
- 运行测试：
  ```bash
  mvn test
  ```
- 例如：`OrderDaoGetOrderDetailTest`用于测试订单详情查询功能

---

## 常见问题

1. **接口返回“未提供有效的Token”**
   - 需在请求头中添加`Authorization: Bearer <token>`，token可通过登录接口获取

2. **接口返回“JSON parse error”**
   - 检查请求体格式是否为JSON，且`Content-Type`为`application/json`

3. **页面跳转到登录页**
   - 说明未登录或token已失效，请重新登录

4. **数据库连接失败**
   - 检查`application.yml`中的数据库配置是否正确，数据库服务是否已启动

---

## 联系方式

如有问题或建议，请联系项目维护者：

- 邮箱：support@example.com
- QQ群：123456789

---

感谢使用订单管理系统！
```
如需进一步定制或补充内容，请告知。