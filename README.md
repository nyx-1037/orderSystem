# 七洛商城系统&后台订单管理系统

最近修订日期：2025/05/16

## 项目简介
基于Spring Boot 2.7构建的分布式小电商平台，带有后台订单管理，集成MyBatis+MySQL数据持久化方案，提供完整的订单生命周期管理功能。

## 功能特性
- 多状态订单管理（创建/支付/发货/完成）
- JWT鉴权与RBAC权限控制
- Redis缓存热点数据
- AOP实现操作日志追踪
- PageHelper分页查询/前端界面懒加载
- MD5密码加密
- swagger-ui接口文档
- echarts 数据可视化
- kaptcha 验证码

## 技术栈
- **核心框架**: Spring Boot 2.7.0
- **持久层**: MyBatis 2.2.2 + MySQL 8.0.28
- **安全认证**: JJWT 0.9.1
- **缓存**: Spring Data Redis
- **连接池**: Druid 1.2.8
- **分页插件**: PageHelper 1.4.2
- **日志系统**: SLF4J 1.7.36 + Logback 1.2.11
- **api文档**: Swagger 2.9.2
- **前端**: HTML5 + CSS3 + JavaScript + Bootstrap 4.6.1 响应式布局
- **图表**：Apache ECharts 5.0.0
- **验证码**：Kaptcha 2.3.2

## 环境要求
- JDK 1.8+
- MySQL 8.0+
- Redis 3.0+
- Maven 3.6+

## 快速开始
启动后api文档访问：[http://localhost:8087/swagger-ui.html](http://localhost:8087/swagger-ui.html)

```bash
# 1. 克隆项目
git clone https://github.com/nyx-1037/orderSystem.git

# 2. 初始化数据库
mysql -u root -p < docs/sql/order-system.sql

# 3. 修改配置
vim src/main/resources/application.properties

# 4. 打包运行
mvn clean package
java -jar target/order-management.jar
```

## 配置说明
`application.properties` 主要配置项：
```properties
# 数据源配置
spring.datasource.url=jdbc:mysql://localhost:3306/order_system?useSSL=false
spring.datasource.username=root
spring.datasource.password=123456

# Redis配置
spring.redis.host=localhost
spring.redis.port=6379

# JWT配置
jwt.secret=your-256-bit-secret
jwt.expiration=86400000
```



## 项目结构
```
src/main/java
├── com.ordersystem
│   ├── config       # 配置类
│   ├── controller   # REST接口
│   ├── service      # 业务逻辑
│   ├── dao          # 数据持久
│   ├── entity       # 数据实体
│   ├── aspect       # AOP切面
│   └── OrderSystemApplication.java # 启动类
```

