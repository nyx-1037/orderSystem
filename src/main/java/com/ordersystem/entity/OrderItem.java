package com.ordersystem.entity;

import java.math.BigDecimal;
import java.util.Date;
import javax.validation.constraints.NotBlank;
import javax.validation.constraints.NotNull;
import javax.validation.constraints.Positive;
import javax.validation.constraints.DecimalMin;

/**
 * 订单明细实体类
 */
public class OrderItem {
    private Integer itemId;          // 明细ID
    private Integer orderId;         // 订单ID

    @NotNull(message = "商品ID不能为空")
    private Integer productId;       // 商品ID

    // productName 可以在后端根据 productId 查询，前端不必传，或者设为可选
    // @NotBlank(message = "商品名称不能为空")
    private String productName;      // 商品名称

    @NotNull(message = "商品单价不能为空")
    @DecimalMin(value = "0.01", message = "商品单价必须大于0")
    private BigDecimal productPrice; // 商品单价

    @NotNull(message = "购买数量不能为空")
    @Positive(message = "购买数量必须为正数")
    private Integer quantity;        // 购买数量

    // totalPrice 由后端计算，不需要校验
    private BigDecimal totalPrice;   // 商品总价

    private Date createTime;         // 创建时间
    private Date updateTime;         // 更新时间

    // 移除了不存在的price字段，前端应该使用productPrice字段

    // 关联商品信息（用于多表联查）
    private Product product;

    public Integer getItemId() {
        return itemId;
    }

    public void setItemId(Integer itemId) {
        this.itemId = itemId;
    }

    public Integer getOrderId() {
        return orderId;
    }

    public void setOrderId(Integer orderId) {
        this.orderId = orderId;
    }

    public Integer getProductId() {
        return productId;
    }

    public void setProductId(Integer productId) {
        this.productId = productId;
    }

    public String getProductName() {
        return productName;
    }

    public void setProductName(String productName) {
        this.productName = productName;
    }

    public BigDecimal getProductPrice() {
        return productPrice;
    }

    public void setProductPrice(BigDecimal productPrice) {
        this.productPrice = productPrice;
    }

    public Integer getQuantity() {
        return quantity;
    }

    public void setQuantity(Integer quantity) {
        this.quantity = quantity;
    }

    public BigDecimal getTotalPrice() {
        return totalPrice;
    }

    public void setTotalPrice(BigDecimal totalPrice) {
        this.totalPrice = totalPrice;
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

    public Product getProduct() {
        return product;
    }

    public void setProduct(Product product) {
        this.product = product;
    }

    // 移除了不存在的price字段的getter和setter方法

    @Override
    public String toString() {
        return "OrderItem{" +
                "itemId=" + itemId +
                ", orderId=" + orderId +
                ", productId=" + productId +
                ", productName='" + productName + '\'' +
                ", productPrice=" + productPrice +
                ", quantity=" + quantity +
                ", totalPrice=" + totalPrice +
                // 移除了不存在的price字段
                ", createTime=" + createTime +
                ", updateTime=" + updateTime +
                '}';
    }
}