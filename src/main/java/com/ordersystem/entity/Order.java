package com.ordersystem.entity;

import java.math.BigDecimal;
import java.util.Date;
import java.util.List;
import java.util.UUID;
import javax.validation.constraints.NotBlank;
import javax.validation.constraints.Pattern;
import javax.validation.constraints.NotEmpty;
import javax.validation.Valid;

/**
 * 订单实体类
 */
public class Order {
    private Integer orderId;        // 订单ID
    private String orderNo;         // 订单编号
    private String orderUuid;       // 订单UUID，用于安全访问，对应数据库中的order_uuid字段
    private Integer userId;         // 用户ID
    private BigDecimal totalAmount; // 订单总金额
    private Integer status;         // 订单状态：0-待付款，1-已付款，2-已发货，3-已完成，4-已取消
    private Integer paymentMethod;  // 支付方式：0-其他，1-支付宝，2-微信，3-银行卡
    private Date paymentTime;       // 支付时间
    private Date shippingTime;      // 发货时间
    private Date completeTime;      // 完成时间

    @NotBlank(message = "收货地址不能为空")
    private String address;         // 收货地址

    @NotBlank(message = "收货人不能为空")
    private String receiver;        // 收货人

    @NotBlank(message = "收货人电话不能为空")
    @Pattern(regexp = "^\\d{11}$", message = "请输入有效的11位手机号码")
    private String receiverPhone;   // 收货人电话

    private String remark;          // 订单备注
    private Date createTime;        // 创建时间
    private Date updateTime;        // 更新时间
    
    // 关联用户信息（用于多表联查）
    private User user;
    
    // 关联订单明细（用于多表联查）
    @NotEmpty(message = "订单项不能为空")
    @Valid // 嵌套验证
    private List<OrderItem> orderItems;
    
    // 用于接收前端传递的items字段
    @Valid
    private List<OrderItem> items;

    // 添加items的getter和setter方法
    public List<OrderItem> getItems() {
        return items;
    }

    public void setItems(List<OrderItem> items) {
        this.items = items;
        // 同步设置orderItems，确保两个字段保持一致
        this.orderItems = items;
    }

    public Integer getOrderId() {
        return orderId;
    }

    public void setOrderId(Integer orderId) {
        this.orderId = orderId;
    }

    public String getOrderNo() {
        return orderNo;
    }

    public void setOrderNo(String orderNo) {
        this.orderNo = orderNo;
    }
    
    public String getOrderUuid() {
        return orderUuid;
    }

    public void setOrderUuid(String orderUuid) {
        this.orderUuid = orderUuid;
    }

    public Integer getUserId() {
        return userId;
    }

    public void setUserId(Integer userId) {
        this.userId = userId;
    }

    public BigDecimal getTotalAmount() {
        return totalAmount;
    }

    public void setTotalAmount(BigDecimal totalAmount) {
        this.totalAmount = totalAmount;
    }


    public Integer getStatus() {
        return status;
    }

    public void setStatus(Integer status) {
        this.status = status;
    }
    
    public Integer getPaymentMethod() {
        return paymentMethod;
    }

    public void setPaymentMethod(Integer paymentMethod) {
        this.paymentMethod = paymentMethod;
    }

    public Date getPaymentTime() {
        return paymentTime;
    }

    public void setPaymentTime(Date paymentTime) {
        this.paymentTime = paymentTime;
    }

    public Date getShippingTime() {
        return shippingTime;
    }

    public void setShippingTime(Date shippingTime) {
        this.shippingTime = shippingTime;
    }

    public Date getCompleteTime() {
        return completeTime;
    }

    public void setCompleteTime(Date completeTime) {
        this.completeTime = completeTime;
    }

    public String getAddress() {
        return address;
    }

    public void setAddress(String address) {
        this.address = address;
    }

    public String getReceiver() {
        return receiver;
    }

    public void setReceiver(String receiver) {
        this.receiver = receiver;
    }

    public String getReceiverPhone() {
        return receiverPhone;
    }

    public void setReceiverPhone(String receiverPhone) {
        this.receiverPhone = receiverPhone;
    }

    public String getRemark() {
        return remark;
    }

    public void setRemark(String remark) {
        this.remark = remark;
    }

    public Date getCreateTime() {
        return createTime;
    }

    public void setCreateTime(Date createTime) {
        this.createTime = createTime;
    }

    public Date getUpdateTime() {
        return updateTime;
    }

    public void setUpdateTime(Date updateTime) {
        this.updateTime = updateTime;
    }

    public User getUser() {
        return user;
    }

    public void setUser(User user) {
        this.user = user;
    }

    public List<OrderItem> getOrderItems() {
        return orderItems;
    }

    public void setOrderItems(List<OrderItem> orderItems) {
        this.orderItems = orderItems;
    }

    @Override
    public String toString() {
        return "Order{" +
                "orderId=" + orderId +
                ", orderNo='" + orderNo + '\'' +
                ", userId=" + userId +
                ", totalAmount=" + totalAmount +
                ", status=" + status +
                ", paymentMethod=" + paymentMethod +
                ", paymentTime=" + paymentTime +
                ", shippingTime=" + shippingTime +
                ", completeTime=" + completeTime +
                ", address='" + address + '\'' +
                ", receiver='" + receiver + '\'' +
                ", receiverPhone='" + receiverPhone + '\'' +
                ", remark='" + remark + '\'' +
                ", createTime=" + createTime +
                ", updateTime=" + updateTime +
                '}';
    }
}