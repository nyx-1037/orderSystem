package com.ordersystem.entity;

import java.math.BigDecimal;
import java.util.Date;

/**
 * 商品实体类
 */
public class Product {
    private Integer productId;      // 商品ID
    // 移除了不存在的productUuid字段
    private String productName;     // 商品名称
    private String productDesc;     // 商品描述
    private BigDecimal price;       // 商品价格
    private Integer stock;          // 库存数量
    private Integer status;         // 状态：0-下架，1-上架
    private byte[] productImage;    // 商品图片（二进制数据）
    private Date createTime;        // 创建时间
    private Date updateTime;        // 更新时间

    public Integer getProductId() {
        return productId;
    }

    public void setProductId(Integer productId) {
        this.productId = productId;
    }
    
    // 移除了不存在的productUuid字段的getter和setter方法

    public String getProductName() {
        return productName;
    }

    public void setProductName(String productName) {
        this.productName = productName;
    }

    public String getProductDesc() {
        return productDesc;
    }

    public void setProductDesc(String productDesc) {
        this.productDesc = productDesc;
    }

    public BigDecimal getPrice() {
        return price;
    }

    public void setPrice(BigDecimal price) {
        this.price = price;
    }

    public Integer getStock() {
        return stock;
    }

    public void setStock(Integer stock) {
        this.stock = stock;
    }

    public Integer getStatus() {
        return status;
    }

    public void setStatus(Integer status) {
        this.status = status;
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
    
    public byte[] getProductImage() {
        return productImage;
    }

    public void setProductImage(byte[] productImage) {
        this.productImage = productImage;
    }

    @Override
    public String toString() {
        return "Product{" +
                "productId=" + productId +
                ", productName='" + productName + '\'' +
                ", productDesc='" + productDesc + '\'' +
                ", price=" + price +
                ", stock=" + stock +
                ", status=" + status +
                ", productImage=" + (productImage != null ? "[二进制数据]" : "null") +
                ", createTime=" + createTime +
                ", updateTime=" + updateTime +
                '}';
    }
}