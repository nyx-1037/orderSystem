package com.ordersystem.aspect;

import com.ordersystem.entity.SysLog;
import com.ordersystem.service.RedisService;
import com.ordersystem.service.SysLogService;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.aspectj.lang.JoinPoint;
import org.aspectj.lang.annotation.AfterReturning;
import org.aspectj.lang.annotation.AfterThrowing;
import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.annotation.Pointcut;
import org.aspectj.lang.reflect.MethodSignature;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import javax.servlet.http.HttpServletRequest;
import java.lang.reflect.Method;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

/**
 * 日志切面，用于记录系统操作日志
 */
@Aspect
@Component
public class LogAspect {

    private static final Logger logger = LoggerFactory.getLogger(LogAspect.class);

    @Autowired
    private SysLogService sysLogService;
    
    @Autowired
    private RedisService redisService;
    
    @Autowired
    private ObjectMapper objectMapper;
    
    @Autowired
    private org.springframework.data.redis.core.RedisTemplate<String, Object> redisTemplate;
    
    // Redis中日志的key前缀
    private static final String LOG_KEY_PREFIX = "system:log:";
    
    // Redis中存储日志ID列表的key
    private static final String LOG_IDS_KEY = "system:log:ids";

    /**
     * 定义切点 - 所有controller包下的方法
     */
    @Pointcut("execution(* com.ordersystem.controller..*.*(..))")
    public void controllerPointcut() {}
    
    /**
     * 定义切点 - 排除日志相关的方法
     */
    @Pointcut("!execution(* com.ordersystem.controller.SysLogController.*(..))")
    public void excludeLogPointcut() {}
    
    /**
     * 组合切点 - 记录非日志相关的controller方法
     */
    @Pointcut("controllerPointcut() && excludeLogPointcut()")
    public void logPointcut() {}

    /**
     * 方法返回后记录日志
     */
    @AfterReturning(value = "logPointcut()", returning = "result")
    public void doAfterReturning(JoinPoint joinPoint, Object result) {
        handleLog(joinPoint, null, result);
    }

    /**
     * 方法抛出异常后记录日志
     */
    @AfterThrowing(value = "logPointcut()", throwing = "e")
    public void doAfterThrowing(JoinPoint joinPoint, Exception e) {
        handleLog(joinPoint, e, null);
    }

    /**
     * 处理日志记录
     */
    private void handleLog(JoinPoint joinPoint, Exception e, Object result) {
        try {
            // 获取请求信息
            ServletRequestAttributes attributes = (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
            if (attributes == null) {
                return;
            }
            
            HttpServletRequest request = attributes.getRequest();
            
            // 获取方法信息
            MethodSignature signature = (MethodSignature) joinPoint.getSignature();
            Method method = signature.getMethod();
            
            // 创建日志对象
            SysLog sysLog = new SysLog();
            
            // 设置请求方法
            String className = joinPoint.getTarget().getClass().getName();
            String methodName = method.getName();
            String simpleClassName = className.substring(className.lastIndexOf('.') + 1);
            
            // 获取方法的文字描述
            String methodDescription = getMethodDescription(simpleClassName, methodName);
            
            // 设置方法信息，包含文字描述
            sysLog.setMethod(className + "." + methodName + "()" + (methodDescription != null ? " [" + methodDescription + "]" : ""));
            
            // 设置请求参数
            Object[] args = joinPoint.getArgs();
            StringBuilder params = new StringBuilder();
            if (args != null && args.length > 0) {
                for (Object arg : args) {
                    if (arg != null && !(arg instanceof HttpServletRequest) && !(arg instanceof HttpServletRequest)) {
                        // 避免参数内容过长
                        String argStr = arg.toString();
                        if (argStr.length() > 1000) {
                            argStr = argStr.substring(0, 1000) + "... [内容过长已截断]";
                        }
                        params.append(argStr).append("; ");
                    }
                }
            }
            sysLog.setParams(params.toString());
            
            // 设置IP地址
            sysLog.setIp(getIpAddress(request));
            
            // 设置操作类型
            String requestURI = request.getRequestURI();
            String requestMethod = request.getMethod();
            
            // 根据URI和请求方法确定操作类型
            String operation = "";
            if (requestURI.contains("/api/admin/auth/login")) {
                operation = "管理员登录";
            } else if (requestURI.contains("/api/captcha/image") && requestURI.contains("/base64")) {
                operation = "获取Base64编码的验证码图片";
            } else if (requestURI.contains("/api/captcha/image")) {
                operation = "获取验证码图片";
            } else if (requestURI.contains("/api/captcha/verify")) {
                operation = "验证验证码";
            } else if (requestURI.contains("/api/categories") || requestURI.contains("/api/category/list")) {
                operation = "获取所有商品分类";
            } else if (requestURI.contains("/api/client/cart")) {
                if (requestMethod.equals("GET") && requestURI.contains("/count")) {
                    operation = "获取购物车商品数量";
                } else if (requestMethod.equals("GET") && requestURI.contains("/selected")) {
                    operation = "获取购物车已选商品";
                } else if (requestMethod.equals("GET")) {
                    operation = "获取购物车列表";
                } else if (requestMethod.equals("POST")) {
                    operation = "添加商品到购物车";
                } else if (requestMethod.equals("PUT") && requestURI.contains("/quantity")) {
                    operation = "更新购物车商品数量";
                } else if (requestMethod.equals("PUT") && requestURI.contains("/selected") && !requestURI.contains("/selected/all")) {
                    operation = "更新购物车商品选中状态";
                } else if (requestMethod.equals("PUT") && requestURI.contains("/selected/all")) {
                    operation = "全选/取消全选购物车商品";
                } else if (requestMethod.equals("DELETE") && requestURI.contains("/selected/clear")) {
                    operation = "清空已选购物车商品";
                } else if (requestMethod.equals("DELETE") && !requestURI.contains("/") || requestURI.endsWith("/api/client/cart")) {
                    operation = "清空购物车";
                } else if (requestMethod.equals("DELETE")) {
                    operation = "从购物车删除商品";
                }
            } else if (requestURI.contains("/api/client/orders")) {
                if (requestMethod.equals("GET") && requestURI.contains("/payment")) {
                    operation = "获取订单支付页面";
                } else if (requestMethod.equals("GET") && !requestURI.contains("/") || requestURI.endsWith("/api/client/orders")) {
                    operation = "获取客户端订单列表";
                } else if (requestMethod.equals("GET") && requestURI.matches(".*/api/client/orders/[^/]+$")) {
                    operation = "获取订单详情";
                } else if (requestMethod.equals("POST") && requestURI.contains("/cancel")) {
                    operation = "取消订单";
                } else if (requestMethod.equals("POST") && requestURI.contains("/pay")) {
                    operation = "支付订单";
                } else if (requestMethod.equals("POST") && requestURI.contains("/confirm")) {
                    operation = "确认收货";
                } else if (requestMethod.equals("POST") && requestURI.contains("/comment")) {
                    operation = "评价订单";
                }
            } else if (requestURI.contains("/api/online-users")) {
                if (requestMethod.equals("GET")) {
                    operation = "获取在线用户列表";
                } else if (requestMethod.equals("POST") && requestURI.contains("/force-logout")) {
                    operation = "强制用户登出";
                }
            } else if (requestURI.contains("/api/products")) {
                if (requestMethod.equals("GET") && requestURI.contains("/search")) {
                    operation = "搜索商品";
                } else if (requestMethod.equals("GET") && requestURI.contains("/image")) {
                    operation = "获取商品图片";
                } else if (requestMethod.equals("GET") && !requestURI.contains("/") || requestURI.endsWith("/api/products")) {
                    operation = "获取商品列表";
                } else if (requestMethod.equals("GET") && requestURI.contains("/internal/")) {
                    operation = "根据ID获取商品(内部使用)";
                } else if (requestMethod.equals("GET") && requestURI.matches(".*/api/products/[^/]+$")) {
                    operation = "根据ID获取商品";
                } else if (requestMethod.equals("POST") && requestURI.contains("/image")) {
                    operation = "上传商品图片";
                } else if (requestMethod.equals("POST")) {
                    operation = "添加商品";
                } else if (requestMethod.equals("PUT") && requestURI.contains("/stock")) {
                    operation = "更新商品库存";
                } else if (requestMethod.equals("PUT")) {
                    operation = "更新商品";
                } else if (requestMethod.equals("DELETE") && requestURI.contains("/image")) {
                    operation = "删除商品图片";
                } else if (requestMethod.equals("DELETE")) {
                    operation = "删除商品";
                }
            } else if (requestURI.contains("/api/system-logs")) {
                if (requestMethod.equals("GET") && !requestURI.contains("/") || requestURI.endsWith("/api/system-logs")) {
                    operation = "获取日志列表";
                } else if (requestMethod.equals("GET") && requestURI.contains("/by-user-id/")) {
                    operation = "根据用户ID获取日志";
                } else if (requestMethod.equals("GET") && requestURI.contains("/by-id/")) {
                    operation = "根据ID获取日志详情";
                } else if (requestMethod.equals("GET") && requestURI.contains("/by-username/")) {
                    operation = "根据用户名获取日志";
                } else if (requestMethod.equals("GET") && requestURI.contains("/by-operation/")) {
                    operation = "根据操作类型获取日志";
                } else if (requestMethod.equals("DELETE") && requestURI.contains("/batch")) {
                    operation = "批量删除日志";
                } else if (requestMethod.equals("DELETE")) {
                    operation = "删除日志";
                } else if (requestMethod.equals("POST") && requestURI.contains("/force-logout")) {
                    operation = "强制用户登出";
                } else if (requestMethod.equals("POST") && requestURI.contains("/synchronize")) {
                    operation = "同步日志到数据库";
                }
            } else if (requestURI.contains("/api/orders/dashboard")) {
                operation = "获取仪表盘数据";
            } else if (requestURI.contains("/api/orders")) {
                if (requestMethod.equals("GET") && !requestURI.contains("/") || requestURI.endsWith("/api/orders")) {
                    operation = "获取订单列表";
                } else if (requestMethod.equals("GET") && requestURI.contains("/payment")) {
                    operation = "跳转到支付页面";
                } else if (requestMethod.equals("GET") && requestURI.contains("/by-uuid")) {
                    operation = "根据UUID获取订单详情";
                } else if (requestMethod.equals("GET") && requestURI.contains("/by-user/")) {
                    operation = "获取指定用户的所有订单";
                } else if (requestMethod.equals("GET") && requestURI.matches(".*/api/orders/[^/]+$")) {
                    operation = "根据ID获取订单详情";
                } else if (requestMethod.equals("POST") && requestURI.contains("/admin/create")) {
                    operation = "管理员为指定用户创建订单";
                } else if (requestMethod.equals("POST") && requestURI.contains("/cancel")) {
                    operation = "取消订单";
                } else if (requestMethod.equals("POST") && requestURI.contains("/pay")) {
                    operation = "支付订单";
                } else if (requestMethod.equals("POST") && requestURI.contains("/confirm")) {
                    operation = "确认收货";
                } else if (requestMethod.equals("POST") && requestURI.contains("/ship")) {
                    operation = "订单发货（管理员）";
                } else if (requestMethod.equals("DELETE") && requestURI.contains("/batch")) {
                    operation = "批量删除订单";
                } else if (requestMethod.equals("POST") && !requestURI.contains("/") || requestURI.endsWith("/api/orders")) {
                    operation = "创建订单";
                } else if (requestMethod.equals("PUT")) {
                    operation = "更新订单";
                } else if (requestMethod.equals("DELETE")) {
                    operation = "删除订单";
                }
            } else if (requestURI.contains("/api/users")) {
                if (requestMethod.equals("GET") && requestURI.contains("/page/")) {
                    operation = "分页获取用户列表";
                } else if (requestMethod.equals("GET") && requestURI.contains("/check-username")) {
                    operation = "检查用户名是否可用";
                } else if (requestMethod.equals("GET") && requestURI.contains("/current")) {
                    operation = "获取当前用户信息";
                } else if (requestMethod.equals("GET") && requestURI.contains("/avatar/")) {
                    operation = "获取用户头像";
                } else if (requestMethod.equals("GET") && !requestURI.contains("/") || requestURI.endsWith("/api/users")) {
                    operation = "获取用户列表";
                } else if (requestMethod.equals("GET")) {
                    operation = "根据ID获取用户";
                } else if (requestMethod.equals("POST") && requestURI.contains("/login")) {
                    operation = "用户登录";
                } else if (requestMethod.equals("POST") && requestURI.contains("/register")) {
                    operation = "用户注册";
                } else if (requestMethod.equals("POST") && requestURI.contains("/logout")) {
                    operation = "用户登出";
                } else if (requestMethod.equals("POST") && requestURI.contains("/avatar/upload")) {
                    operation = "上传用户头像";
                } else if (requestMethod.equals("POST") && requestURI.contains("/resetPassword")) {
                    operation = "重置用户密码";
                } else if (requestMethod.equals("PUT") && requestURI.contains("/change-password")) {
                    operation = "修改密码";
                } else if (requestMethod.equals("PUT") && requestURI.contains("/profile/update")) {
                    operation = "更新个人资料";
                } else if (requestMethod.equals("PUT")) {
                    operation = "更新用户信息";
                } else if (requestMethod.equals("DELETE")) {
                    operation = "删除用户";
                }
            } else if (requestURI.contains("/api/chat")) {
                if (requestMethod.equals("GET") && requestURI.contains("/history")) {
                    operation = "获取聊天历史记录";
                } else if (requestMethod.equals("POST") && requestURI.contains("/send")) {
                    operation = "发送聊天消息";
                } else if (requestMethod.equals("GET") && requestURI.contains("/recent")) {
                    operation = "获取最近聊天列表";
                } else if (requestMethod.equals("GET") && requestURI.contains("/unread/count")) {
                    operation = "获取未读消息数量";
                } else if (requestMethod.equals("POST") && requestURI.contains("/read/") && requestURI.contains("/read/all")) {
                    operation = "标记所有消息为已读";
                } else if (requestMethod.equals("POST") && requestURI.contains("/read/")) {
                    operation = "标记消息为已读";
                } else if (requestMethod.equals("GET") && requestURI.contains("/customer-service")) {
                    operation = "获取客服列表";
                }
            } else if (requestURI.equals("/") || requestURI.equals("")) {
                operation = "访问首页";
            } else {
                // 默认使用URI最后一段作为操作类型
                operation = requestURI.substring(requestURI.lastIndexOf("/") + 1);
            }
            
            sysLog.setOperation(operation);
            
            // 设置用户信息
            Integer userId = (Integer) request.getAttribute("userId");
            String username = (String) request.getAttribute("username");
            sysLog.setUserId(userId);
            sysLog.setUsername(username);
            
            // 设置状态码和错误信息
            if (e != null) {
                sysLog.setStatusCode(500);
                sysLog.setErrorMsg(e.getMessage());
                logger.error("方法执行异常: " + className + "." + methodName + "(), 错误信息: " + e.getMessage());
            } else {
                // 根据返回结果判断状态码
                int statusCode = 200;
                String resultInfo = "";
                
                if (result != null) {
                    if (result instanceof ResponseEntity) {
                        ResponseEntity<?> responseEntity = (ResponseEntity<?>) result;
                        statusCode = responseEntity.getStatusCodeValue();
                        resultInfo = "状态: " + responseEntity.getStatusCode().toString();
                        
                        // 尝试获取响应体内容摘要
                        Object body = responseEntity.getBody();
                        if (body != null) {
                            String bodyStr = body.toString();
                            if (bodyStr.length() > 1000) {
                                bodyStr = bodyStr.substring(0, 1000) + "... [内容过长已截断]";
                            }
                            resultInfo += ", 响应体: " + bodyStr;
                        }
                    } else if (result instanceof Map) {
                        // 处理返回Map的情况
                        Map<?, ?> resultMap = (Map<?, ?>) result;
                        if (resultMap.containsKey("code")) {
                            Object code = resultMap.get("code");
                            if (code != null) {
                                try {
                                    statusCode = Integer.parseInt(code.toString());
                                } catch (NumberFormatException nfe) {
                                    // 忽略解析错误
                                }
                            }
                        }
                        resultInfo = "返回Map: " + (resultMap.size() > 5 ? "包含" + resultMap.size() + "个键值对" : resultMap.toString());
                    } else {
                        // 其他类型结果
                        String resultStr = result.toString();
                        if (resultStr.length() > 1000) {
                            resultStr = resultStr.substring(0, 1000) + "... [内容过长已截断]";
                        }
                        resultInfo = "返回结果: " + resultStr;
                    }
                } else {
                    resultInfo = "无返回值";
                }
                
                sysLog.setStatusCode(statusCode);
                sysLog.setErrorMsg(resultInfo); // 使用errorMsg字段存储返回结果信息
                
                // 记录成功执行的方法
                if (logger.isDebugEnabled()) {
                    logger.debug("方法执行成功: " + className + "." + methodName + "(), " + resultInfo);
                }
            }
            
            // 设置创建时间
            sysLog.setCreateTime(new Date());
            
            // 生成唯一ID
            String logId = UUID.randomUUID().toString();
            
            try {
                // 将日志对象序列化为JSON字符串
                String logJson = objectMapper.writeValueAsString(sysLog);
                
                // 将日志存入Redis，设置过期时间为1天
                String logKey = LOG_KEY_PREFIX + logId;
                redisService.set(logKey, logJson, 24 * 60 * 60);
                
                // 将日志ID添加到Redis列表中
                redisTemplate.opsForList().rightPush(LOG_IDS_KEY, logId);
                
                logger.debug("日志已存入Redis，ID: {}, 操作: {}", logId, sysLog.getOperation());
            } catch (Exception ee) {
                logger.error("日志存入Redis失败: {}", ee.getMessage());
                // 如果Redis操作失败，直接保存到数据库
                try {
                    sysLogService.saveLog(sysLog);
                    logger.info("日志已直接保存到数据库");
                } catch (Exception ex) {
                    logger.error("保存日志到数据库也失败: {}", ex.getMessage());
                }
            }
        } catch (Exception ex) {
            logger.error("记录操作日志失败", ex);
        }
    }
    
    /**
     * 获取IP地址
     */
    private String getIpAddress(HttpServletRequest request) {
        String ip = request.getHeader("X-Forwarded-For");
        if (ip == null || ip.length() == 0 || "unknown".equalsIgnoreCase(ip)) {
            ip = request.getHeader("Proxy-Client-IP");
        }
        if (ip == null || ip.length() == 0 || "unknown".equalsIgnoreCase(ip)) {
            ip = request.getHeader("WL-Proxy-Client-IP");
        }
        if (ip == null || ip.length() == 0 || "unknown".equalsIgnoreCase(ip)) {
            ip = request.getHeader("HTTP_CLIENT_IP");
        }
        if (ip == null || ip.length() == 0 || "unknown".equalsIgnoreCase(ip)) {
            ip = request.getHeader("HTTP_X_FORWARDED_FOR");
        }
        if (ip == null || ip.length() == 0 || "unknown".equalsIgnoreCase(ip)) {
            ip = request.getRemoteAddr();
        }
        return ip;
    }
    
    /**
     * 定时任务，每10分钟将Redis中的日志同步到MySQL数据库
     */
    @Scheduled(fixedRate = 10 * 60 * 1000) // 每10分钟执行一次
    public int syncLogsToDatabase() {
        logger.info("开始同步Redis中的日志到MySQL数据库");
        int finalProcessedCount = 0;
        try {
            // 获取日志ID列表
            List<Object> logIds = redisTemplate.opsForList().range(LOG_IDS_KEY, 0, -1);
            
            if (logIds != null && !logIds.isEmpty()) {
                int totalCount = logIds.size();
                int batchSize = 5; // 每批处理的日志数量，改为5条以减轻数据库压力
                int processedCount = 0;
                
                logger.info("共有{}条日志需要同步", totalCount);
                
                // 批量处理日志
                List<SysLog> logBatch = new ArrayList<>(batchSize);
                List<String> processedLogIds = new ArrayList<>(batchSize);
                
                for (Object idObj : logIds) {
                    String logId = idObj.toString();
                    String logKey = LOG_KEY_PREFIX + logId;
                    
                    try {
                        // 从Redis获取日志JSON
                        String logJson = redisService.get(logKey, String.class);
                        
                        if (logJson != null) {
                            // 反序列化为SysLog对象
                            SysLog sysLog = objectMapper.readValue(logJson, SysLog.class);
                            logBatch.add(sysLog);
                            processedLogIds.add(logId);
                        } else {
                            // 日志内容为空，直接从列表中删除
                            redisTemplate.opsForList().remove(LOG_IDS_KEY, 1, logId);
                            logger.warn("日志内容为空，ID: {}", logId);
                        }
                    } catch (Exception e) {
                        logger.error("处理日志ID: {} 失败: {}", logId, e.getMessage());
                    }
                    
                    processedCount++;
                    
                    // 当达到批处理大小或处理完所有日志时，执行批量保存
                    if (logBatch.size() >= batchSize || processedCount == totalCount) {
                        if (!logBatch.isEmpty()) {
                            try {
                                // 批量保存日志到数据库
                                boolean success = sysLogService.batchSaveLog(logBatch);
                                
                                if (success) {
                                    logger.info("成功批量保存{}条日志到数据库", logBatch.size());
                                    finalProcessedCount += logBatch.size();
                                    
                                    // 从Redis中删除已保存的日志
                                    for (String id : processedLogIds) {
                                        String key = LOG_KEY_PREFIX + id;
                                        redisTemplate.delete(key);
                                        redisTemplate.opsForList().remove(LOG_IDS_KEY, 1, id);
                                    }
                                    
                                    // 输出进度
                                    logger.info("已处理: {}/{} 条日志", processedCount, totalCount);
                                    
                                    // 每批处理完成后暂停一段时间，减轻数据库压力
                                    try {
                                        Thread.sleep(50); // 暂停200毫秒
                                        logger.debug("批处理暂停50ms，缓解数据库压力");
                                    } catch (InterruptedException ie) {
                                        Thread.currentThread().interrupt();
                                        logger.warn("同步过程被中断");
                                    }
                                } else {
                                    logger.warn("批量保存日志失败，本批次共{}条", logBatch.size());
                                }
                            } catch (Exception e) {
                                logger.error("批量保存日志异常: {}", e.getMessage());
                            }
                            
                            // 清空批处理列表，准备下一批
                            logBatch.clear();
                            processedLogIds.clear();
                        }
                    }
                }
                
                logger.info("日志同步完成，共处理: {}条", finalProcessedCount);
            } else {
                logger.info("没有需要同步的日志");
            }
        } catch (Exception e) {
            logger.error("同步日志到数据库失败: {}", e.getMessage());
        }
        return finalProcessedCount;
    }
    
    /**
     * 获取方法的文字描述
     * @param className 类名
     * @param methodName 方法名
     * @return 方法描述
     */
    private String getMethodDescription(String className, String methodName) {
        // 根据类名和方法名返回方法描述
        if ("AdminAuthController".equals(className)) {
            if ("login".equals(methodName)) {
                return "管理员登录认证";
            } else if ("logout".equals(methodName)) {
                return "管理员退出登录";
            } else if ("getAdminInfo".equals(methodName)) {
                return "获取管理员信息";
            } else if ("updatePassword".equals(methodName)) {
                return "更新管理员密码";
            } else if ("resetPassword".equals(methodName)) {
                return "重置管理员密码";
            } else if ("getPermissions".equals(methodName)) {
                return "获取管理员权限";
            } else if ("getRoles".equals(methodName)) {
                return "获取管理员角色";
            } else if ("checkPermission".equals(methodName)) {
                return "检查管理员权限";
            }
        } else if ("CaptchaController".equals(className)) {
            if ("getCaptcha".equals(methodName)) {
                return "生成验证码图片";
            } else if ("getCaptchaBase64".equals(methodName)) {
                return "获取Base64编码的验证码图片";
            } else if ("verifyCaptcha".equals(methodName)) {
                return "验证验证码";
            } else if ("generateCaptcha".equals(methodName)) {
                return "生成验证码";
            } else if ("refreshCaptcha".equals(methodName)) {
                return "刷新验证码";
            } else if ("getCaptchaImage".equals(methodName)) {
                return "获取验证码图片";
            }
        } else if ("CategoryController".equals(className)) {
            if ("getAllCategories".equals(methodName) || "getCategoryList".equals(methodName)) {
                return "获取所有商品分类";
            }
        } else if ("ClientCartController".equals(className)) {
            if ("getCartList".equals(methodName) || "list".equals(methodName)) {
                return "获取购物车列表";
            } else if ("addToCart".equals(methodName) || "add".equals(methodName)) {
                return "添加商品到购物车";
            } else if ("updateCartItemQuantity".equals(methodName) || "update".equals(methodName)) {
                return "更新购物车商品数量";
            } else if ("updateCartItemSelected".equals(methodName)) {
                return "更新购物车商品选中状态";
            } else if ("updateAllCartItemsSelected".equals(methodName)) {
                return "全选/取消全选购物车商品";
            } else if ("removeFromCart".equals(methodName) || "delete".equals(methodName)) {
                return "从购物车删除商品";
            } else if ("clear".equals(methodName)) {
                return "清空购物车";
            } else if ("getCartCount".equals(methodName)) {
                return "获取购物车商品数量";
            } else if ("checkout".equals(methodName)) {
                return "购物车结算";
            } else if ("getCartTotal".equals(methodName)) {
                return "获取购物车总价";
            }
        } else if ("ClientOrderController".equals(className)) {
            if ("getClientOrders".equals(methodName) || "list".equals(methodName)) {
                return "获取客户端订单列表";
            } else if ("getOrderByUuid".equals(methodName) || "getById".equals(methodName)) {
                return "获取订单详情";
            } else if ("cancelOrder".equals(methodName) || "cancel".equals(methodName)) {
                return "取消订单";
            } else if ("confirmOrder".equals(methodName) || "confirm".equals(methodName)) {
                return "确认收货";
            } else if ("payOrder".equals(methodName) || "pay".equals(methodName)) {
                return "支付订单";
            } else if ("commentOrder".equals(methodName) || "comment".equals(methodName)) {
                return "评价订单";
            } else if ("getOrdersByStatus".equals(methodName)) {
                return "按状态获取客户订单";
            } else if ("getOrderCount".equals(methodName)) {
                return "获取客户订单数量";
            } else if ("getRecentOrders".equals(methodName)) {
                return "获取最近客户订单";
            } else if ("create".equals(methodName)) {
                return "创建客户订单";
            }
        } else if ("HomeController".equals(className)) {
            if ("index".equals(methodName)) {
                return "访问首页";
            } else if ("dashboard".equals(methodName)) {
                return "访问仪表盘";
            } else if ("welcome".equals(methodName)) {
                return "访问欢迎页";
            } else if ("about".equals(methodName)) {
                return "访问关于页面";
            } else if ("contact".equals(methodName)) {
                return "访问联系页面";
            } else if ("help".equals(methodName)) {
                return "访问帮助页面";
            } else if ("error".equals(methodName)) {
                return "访问错误页面";
            } else if ("notFound".equals(methodName)) {
                return "访问404页面";
            } else if ("accessDenied".equals(methodName)) {
                return "访问403页面";
            }
        } else if ("OnlineUserController".equals(className)) {
            if ("getOnlineUsers".equals(methodName)) {
                return "获取在线用户列表";
            } else if ("forceLogout".equals(methodName)) {
                return "强制用户登出";
            } else if ("getOnlineUserCount".equals(methodName)) {
                return "获取在线用户数量";
            } else if ("getOnlineUsersByRole".equals(methodName)) {
                return "按角色获取在线用户";
            } else if ("getOnlineUsersByDepartment".equals(methodName)) {
                return "按部门获取在线用户";
            }
        } else if ("OrderController".equals(className)) {
            if ("getDashboardData".equals(methodName)) {
                return "获取仪表盘数据";
            } else if ("getAllOrders".equals(methodName) || "list".equals(methodName)) {
                return "获取订单列表";
            } else if ("getOrderById".equals(methodName) || "getById".equals(methodName)) {
                return "根据ID获取订单详情";
            } else if ("getOrderByUuid".equals(methodName)) {
                return "根据UUID获取订单详情";
            } else if ("createOrder".equals(methodName) || "create".equals(methodName)) {
                return "创建订单";
            } else if ("updateOrder".equals(methodName) || "update".equals(methodName)) {
                return "更新订单";
            } else if ("deleteOrder".equals(methodName) || "delete".equals(methodName)) {
                return "删除订单";
            } else if ("batchDeleteOrders".equals(methodName)) {
                return "批量删除订单";
            } else if ("getOrdersByUserId".equals(methodName)) {
                return "获取指定用户的所有订单";
            } else if ("createOrderForUser".equals(methodName)) {
                return "管理员为指定用户创建订单";
            } else if ("cancelOrder".equals(methodName) || "cancel".equals(methodName)) {
                return "取消订单";
            } else if ("payOrder".equals(methodName) || "pay".equals(methodName)) {
                return "支付订单";
            } else if ("confirmOrder".equals(methodName) || "receive".equals(methodName)) {
                return "确认收货";
            } else if ("shipOrder".equals(methodName) || "deliver".equals(methodName)) {
                return "订单发货（管理员）";
            } else if ("getPaymentPage".equals(methodName)) {
                return "跳转到支付页面";
            } else if ("listPage".equals(methodName)) {
                return "访问订单列表页面";
            } else if ("createPage".equals(methodName)) {
                return "访问创建订单页面";
            } else if ("updatePage".equals(methodName)) {
                return "访问更新订单页面";
            } else if ("search".equals(methodName)) {
                return "搜索订单";
            } else if ("export".equals(methodName)) {
                return "导出订单";
            } else if ("statistics".equals(methodName)) {
                return "订单统计";
            } else if ("getOrdersByStatus".equals(methodName)) {
                return "按状态获取订单";
            } else if ("updateStatus".equals(methodName)) {
                return "更新订单状态";
            } else if ("comment".equals(methodName)) {
                return "评价订单";
            }
        } else if ("ProductController".equals(className)) {
            if ("getAllProducts".equals(methodName)) {
                return "获取商品列表";
            } else if ("getProductById".equals(methodName)) {
                return "根据ID获取商品";
            } else if ("getProductByIdInternal".equals(methodName)) {
                return "根据ID获取商品(内部使用)";
            } else if ("createProduct".equals(methodName)) {
                return "添加商品";
            } else if ("updateProduct".equals(methodName)) {
                return "更新商品";
            } else if ("deleteProduct".equals(methodName)) {
                return "删除商品";
            } else if ("uploadProductImage".equals(methodName)) {
                return "上传商品图片";
            }
        } else if ("UserController".equals(className)) {
            if ("getAllUsers".equals(methodName) || "getUsersByPage".equals(methodName)) {
                return "获取用户列表";
            } else if ("getUserById".equals(methodName)) {
                return "根据ID获取用户";
            } else if ("login".equals(methodName)) {
                return "用户登录";
            } else if ("loginPage".equals(methodName)) {
                return "访问登录页面";
            } else if ("register".equals(methodName)) {
                return "用户注册";
            } else if ("registerPage".equals(methodName)) {
                return "访问注册页面";
            } else if ("updateUser".equals(methodName) || "updateUserInfo".equals(methodName)) {
                return "更新用户信息";
            } else if ("deleteUser".equals(methodName)) {
                return "删除用户";
            } else if ("changePassword".equals(methodName)) {
                return "修改密码";
            } else if ("resetPassword".equals(methodName)) {
                return "重置密码";
            } else if ("uploadAvatar".equals(methodName)) {
                return "上传头像";
            } else if ("logout".equals(methodName)) {
                return "用户登出";
            } else if ("getUserInfo".equals(methodName) || "getCurrentUser".equals(methodName)) {
                return "获取用户信息";
            } else if ("getUserAvatarData".equals(methodName)) {
                return "获取用户头像数据";
            } else if ("getUserAvatar".equals(methodName)) {
                return "获取用户头像";
            } else if ("sendVerificationCode".equals(methodName)) {
                return "发送验证码";
            } else if ("updateProfile".equals(methodName)) {
                return "更新个人资料";
            } else if ("verifyCode".equals(methodName)) {
                return "验证验证码";
            } else if ("checkUsername".equals(methodName)) {
                return "检查用户名是否可用";
            } else if ("checkEmail".equals(methodName)) {
                return "检查邮箱是否可用";
            } else if ("checkPhone".equals(methodName)) {
                return "检查手机号是否可用";
            } else if ("updatePassword".equals(methodName)) {
                return "更新密码";
            } else if ("updateEmail".equals(methodName)) {
                return "更新邮箱";
            } else if ("updatePhone".equals(methodName)) {
                return "更新手机号";
            } else if ("updateAddress".equals(methodName)) {
                return "更新地址";
            } else if ("getProfile".equals(methodName)) {
                return "获取个人资料";
            } else if ("profilePage".equals(methodName)) {
                return "访问个人资料页面";
            }
        } else if ("SysLogController".equals(className)) {
            if ("list".equals(methodName)) {
                return "获取日志列表";
            } else if ("consolePage".equals(methodName)) {
                return "访问日志控制台页面";
            } else if ("delete".equals(methodName)) {
                return "删除日志";
            } else if ("batchDelete".equals(methodName)) {
                return "批量删除日志";
            } else if ("batchDeleteByFilter".equals(methodName)) {
                return "按条件批量删除日志";
            } else if ("forceLogout".equals(methodName)) {
                return "强制用户登出";
            } else if ("getLogsByUserId".equals(methodName)) {
                return "获取用户日志";
            } else if ("getLogsByUsername".equals(methodName)) {
                return "按用户名获取日志";
            } else if ("getLogsByOperation".equals(methodName)) {
                return "按操作类型获取日志";
            } else if ("getLogsByIp".equals(methodName)) {
                return "按IP地址获取日志";
            } else if ("getLogsByDate".equals(methodName)) {
                return "按日期获取日志";
            } else if ("getLogsByStatus".equals(methodName)) {
                return "按状态码获取日志";
            } else if ("getLogDetail".equals(methodName)) {
                return "获取日志详情";
            } else if ("exportLogs".equals(methodName)) {
                return "导出日志";
            }
        }
        
        // 通用方法描述
        if ("save".equals(methodName) || "add".equals(methodName)) return "新增数据";
        if ("update".equals(methodName) || "edit".equals(methodName)) return "更新数据";
        if ("delete".equals(methodName) || "remove".equals(methodName)) return "删除数据";
        if ("get".equals(methodName) || "find".equals(methodName) || "query".equals(methodName)) return "查询数据";
        if ("list".equals(methodName) || "page".equals(methodName)) return "列表数据";
        if ("force".equals(methodName) || "forceLogout".equals(methodName)) return "强制登出";
        if (methodName.startsWith("get")) return "获取" + methodName.substring(3);
        if (methodName.startsWith("set")) return "设置" + methodName.substring(3);
        if (methodName.startsWith("find")) return "查找" + methodName.substring(4);
        if (methodName.startsWith("update")) return "更新" + methodName.substring(6);
        if (methodName.startsWith("delete")) return "删除" + methodName.substring(6);
        if (methodName.startsWith("create")) return "创建" + methodName.substring(6);
        if (methodName.startsWith("add")) return "添加" + methodName.substring(3);
        if (methodName.startsWith("remove")) return "移除" + methodName.substring(6);
        if (methodName.startsWith("check")) return "检查" + methodName.substring(5);
        if (methodName.startsWith("is")) return "判断" + methodName.substring(2);
        if (methodName.startsWith("has")) return "是否有" + methodName.substring(3);
        if (methodName.endsWith("Page")) return "访问" + methodName.substring(0, methodName.length() - 4) + "页面";
        
        // 如果没有匹配到具体描述，返回方法名作为描述
        return methodName;
    }



}