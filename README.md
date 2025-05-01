# 后端接口文档

## 用户认证模块

### 管理员登录
- **URL**: `/api/admin/auth/login`
- **Method**: POST
- **Request Body**:
  ```json
  {
    "username": "string",
    "password": "string"
  }
  ```
- **Response**:
  ```json
  {
    "success": true/false,
    "message": "string",
    "token": "string",
    "role": 1,
    "user": {
      "userId": 1,
      "username": "string",
      "realName": "string"
    }
  }
  ```

## 在线用户模块

### 获取在线用户列表
- **URL**: `/api/online-users`
- **Method**: GET
- **Response**:
  ```json
  [
    {
      "userId": 1,
      "username": "string",
      "realName": "string",
      "isCurrentUser": true/false
    }
  ]
  ```

## 商品管理模块

### 获取所有商品
- **URL**: `/api/products`
- **Method**: GET
- **Response**:
  ```json
  [
    {
      "productId": 1,
      "name": "string",
      "price": 100.0,
      "stock": 10
    }
  ]
  ```

### 添加商品
- **URL**: `/api/products`
- **Method**: POST
- **Request Body**:
  ```json
  {
    "name": "string",
    "price": 100.0,
    "stock": 10
  }
  ```
- **Response**:
  ```json
  {
    "success": true/false,
    "message": "string",
    "productId": 1,
    "product": {
      "productId": 1,
      "name": "string",
      "price": 100.0,
      "stock": 10
    }
  }
  ```

## 订单管理模块

### 创建订单
- **URL**: `/api/orders`
- **Method**: POST
- **Request Body**:
  ```json
  {
    "items": [
      {
        "productId": 1,
        "quantity": 1
      }
    ]
  }
  ```
- **Response**:
  ```json
  {
    "success": true/false,
    "message": "string",
    "orderId": 1,
    "order": {
      "orderId": 1,
      "userId": 1,
      "status": 0
    }
  }
  ```

### 支付订单
- **URL**: `/api/orders/{orderId}/pay`
- **Method**: POST
- **Response**:
  ```json
  {
    "success": true/false,
    "message": "string"
  }
  ```

## 客户端订单模块

### 获取订单列表
- **URL**: `/api/client/orders`
- **Method**: GET
- **Query Parameters**:
  - `page`: 页码
  - `size`: 每页数量
  - `status`: 订单状态(可选)
- **Response**:
  ```json
  {
    "success": true,
    "content": [
      {
        "orderId": 1,
        "status": 0
      }
    ],
    "totalPages": 1,
    "totalElements": 1,
    "size": 5,
    "number": 1
  }
  ```