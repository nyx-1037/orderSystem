package com.ordersystem.aspect;

import com.ordersystem.entity.SysLog;
import com.ordersystem.service.SysLogService;
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
import org.springframework.stereotype.Component;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import javax.servlet.http.HttpServletRequest;
import java.lang.reflect.Method;
import java.util.Date;
import java.util.Map;

/**
 * 日志切面，用于记录系统操作日志
 */
@Aspect
@Component
public class LogAspect {

    private static final Logger logger = LoggerFactory.getLogger(LogAspect.class);

    @Autowired
    private SysLogService sysLogService;

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
                        if (argStr.length() > 3000) {
                            argStr = argStr.substring(0, 3000) + "... [内容过长已截断]";
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
            if (requestURI.contains("/user/login")) {
                operation = "登录";
            } else if (requestURI.contains("/user/register")) {
                operation = "注册";
            } else if (requestURI.contains("/user/logout")) {
                operation = "退出登录";
            } else if (requestURI.contains("/user/profile")) {
                operation = "个人资料";
            } else if (requestURI.contains("/user/password")) {
                operation = "密码管理";
            } else if (requestURI.contains("/user/avatar")) {
                operation = "头像管理";
            } else if (requestURI.contains("/order")) {
                if (requestMethod.equals("GET")) {
                    operation = "查询订单";
                } else if (requestMethod.equals("POST")) {
                    operation = "新增订单";
                } else if (requestMethod.equals("PUT")) {
                    operation = "修改订单";
                } else if (requestMethod.equals("DELETE")) {
                    operation = "删除订单";
                }
            } else if (requestURI.contains("/product")) {
                if (requestMethod.equals("GET")) {
                    operation = "查询商品";
                } else if (requestMethod.equals("POST")) {
                    operation = "新增商品";
                } else if (requestMethod.equals("PUT")) {
                    operation = "修改商品";
                } else if (requestMethod.equals("DELETE")) {
                    operation = "删除商品";
                }
            } else if (requestURI.contains("/syslog")) {
                if (requestMethod.equals("GET")) {
                    operation = "查询日志";
                } else if (requestMethod.equals("DELETE")) {
                    operation = "删除日志";
                }
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
                            if (bodyStr.length() > 200) {
                                bodyStr = bodyStr.substring(0, 200) + "... [内容过长已截断]";
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
                        if (resultStr.length() > 200) {
                            resultStr = resultStr.substring(0, 200) + "... [内容过长已截断]";
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
            
            // 保存日志
            sysLogService.saveLog(sysLog);
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
     * 获取方法的文字描述
     * @param className 类名
     * @param methodName 方法名
     * @return 方法描述
     */
    private String getMethodDescription(String className, String methodName) {
        // 用户控制器
        if ("UserController".equals(className)) {
            if ("login".equals(methodName)) return "用户登录";
            if ("loginPage".equals(methodName)) return "访问登录页面";
            if ("register".equals(methodName)) return "用户注册";
            if ("registerPage".equals(methodName)) return "访问注册页面";
            if ("getUserInfo".equals(methodName)) return "获取用户信息";
            if ("updateUserInfo".equals(methodName)) return "更新用户信息";
            if ("changePassword".equals(methodName)) return "修改密码";
            if ("logout".equals(methodName)) return "用户退出登录";
            if ("getCurrentUser".equals(methodName)) return "获取当前用户信息";
            if ("uploadAvatar".equals(methodName)) return "上传用户头像";
            if ("getUserAvatarData".equals(methodName)) return "获取用户头像数据";
            if ("getUserAvatar".equals(methodName)) return "获取用户头像";
            if ("sendVerificationCode".equals(methodName)) return "发送验证码";
            if ("resetPassword".equals(methodName)) return "重置密码";
            if ("updateProfile".equals(methodName)) return "更新个人资料";
            if ("verifyCode".equals(methodName)) return "验证验证码";
            if ("checkUsername".equals(methodName)) return "检查用户名是否可用";
            if ("checkEmail".equals(methodName)) return "检查邮箱是否可用";
            if ("checkPhone".equals(methodName)) return "检查手机号是否可用";
            if ("updatePassword".equals(methodName)) return "更新密码";
            if ("updateEmail".equals(methodName)) return "更新邮箱";
            if ("updatePhone".equals(methodName)) return "更新手机号";
            if ("updateAddress".equals(methodName)) return "更新地址";
            if ("getProfile".equals(methodName)) return "获取个人资料";
            if ("profilePage".equals(methodName)) return "访问个人资料页面";
        }
        // 订单控制器
        else if ("OrderController".equals(className)) {
            if ("list".equals(methodName)) return "获取订单列表";
            if ("listPage".equals(methodName)) return "访问订单列表页面";
            if ("getById".equals(methodName)) return "获取订单详情";
            if ("create".equals(methodName)) return "创建订单";
            if ("createPage".equals(methodName)) return "访问创建订单页面";
            if ("update".equals(methodName)) return "更新订单";
            if ("updatePage".equals(methodName)) return "访问更新订单页面";
            if ("delete".equals(methodName)) return "删除订单";
            if ("search".equals(methodName)) return "搜索订单";
            if ("export".equals(methodName)) return "导出订单";
            if ("statistics".equals(methodName)) return "订单统计";
            if ("getOrdersByUserId".equals(methodName)) return "获取用户订单";
            if ("getOrdersByStatus".equals(methodName)) return "按状态获取订单";
            if ("updateStatus".equals(methodName)) return "更新订单状态";
            if ("cancel".equals(methodName)) return "取消订单";
            if ("pay".equals(methodName)) return "支付订单";
            if ("deliver".equals(methodName)) return "发货";
            if ("receive".equals(methodName)) return "确认收货";
            if ("comment".equals(methodName)) return "评价订单";
        }
        // 商品控制器
        else if ("ProductController".equals(className)) {
            if ("list".equals(methodName)) return "获取商品列表";
            if ("listPage".equals(methodName)) return "访问商品列表页面";
            if ("getById".equals(methodName)) return "获取商品详情";
            if ("detailPage".equals(methodName)) return "访问商品详情页面";
            if ("create".equals(methodName)) return "创建商品";
            if ("createPage".equals(methodName)) return "访问创建商品页面";
            if ("update".equals(methodName)) return "更新商品";
            if ("updatePage".equals(methodName)) return "访问更新商品页面";
            if ("delete".equals(methodName)) return "删除商品";
            if ("search".equals(methodName)) return "搜索商品";
            if ("updateStock".equals(methodName)) return "更新商品库存";
            if ("updatePrice".equals(methodName)) return "更新商品价格";
            if ("uploadImage".equals(methodName)) return "上传商品图片";
            if ("getProductImage".equals(methodName)) return "获取商品图片";
            if ("getProductsByCategory".equals(methodName)) return "按分类获取商品";
            if ("getHotProducts".equals(methodName)) return "获取热门商品";
            if ("getNewProducts".equals(methodName)) return "获取新品";
            if ("getRecommendProducts".equals(methodName)) return "获取推荐商品";
        }
        // 日志控制器
        else if ("SysLogController".equals(className)) {
            if ("list".equals(methodName)) return "获取日志列表";
            if ("consolePage".equals(methodName)) return "访问日志控制台页面";
            if ("delete".equals(methodName)) return "删除日志";
            if ("batchDelete".equals(methodName)) return "批量删除日志";
            if ("batchDeleteByFilter".equals(methodName)) return "按条件批量删除日志";
            if ("forceLogout".equals(methodName)) return "强制用户登出";
            if ("getLogsByUserId".equals(methodName)) return "获取用户日志";
            if ("getLogsByUsername".equals(methodName)) return "按用户名获取日志";
            if ("getLogsByOperation".equals(methodName)) return "按操作类型获取日志";
            if ("getLogsByIp".equals(methodName)) return "按IP地址获取日志";
            if ("getLogsByDate".equals(methodName)) return "按日期获取日志";
            if ("getLogsByStatus".equals(methodName)) return "按状态码获取日志";
            if ("getLogDetail".equals(methodName)) return "获取日志详情";
            if ("exportLogs".equals(methodName)) return "导出日志";
        }
        // 在线用户控制器
        else if ("OnlineUserController".equals(className)) {
            if ("getOnlineUsers".equals(methodName)) return "获取在线用户列表";
            if ("forceLogout".equals(methodName)) return "强制用户下线";
            if ("getOnlineUserCount".equals(methodName)) return "获取在线用户数量";
            if ("getOnlineUsersByRole".equals(methodName)) return "按角色获取在线用户";
            if ("getOnlineUsersByDepartment".equals(methodName)) return "按部门获取在线用户";
        }
        // 首页控制器
        else if ("HomeController".equals(className)) {
            if ("index".equals(methodName)) return "访问首页";
            if ("dashboard".equals(methodName)) return "访问仪表盘";
            if ("welcome".equals(methodName)) return "访问欢迎页";
            if ("about".equals(methodName)) return "访问关于页面";
            if ("contact".equals(methodName)) return "访问联系页面";
            if ("help".equals(methodName)) return "访问帮助页面";
            if ("error".equals(methodName)) return "访问错误页面";
            if ("notFound".equals(methodName)) return "访问404页面";
            if ("accessDenied".equals(methodName)) return "访问403页面";
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