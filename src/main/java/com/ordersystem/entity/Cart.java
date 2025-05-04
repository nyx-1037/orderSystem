package com.ordersystem.entity;

import java.util.Date;

/**
 * 购物车实体类
 */
public class Cart {
    private Integer cartId;      // 购物车ID
    private Integer userId;      // 用户ID
    private Integer productId;   // 商品ID
    private Integer quantity;    // 商品数量
    private Integer selected;    // 是否选中：0-未选中，1-已选中
    private Date createTime;     // 创建时间
    private Date updateTime;     // 更新时间
    
    // 非数据库字段 - 用于连接查询时直接映射商品信息
    private String productName;    // 商品名称
    private Double productPrice;   // 商品价格
    private Integer productStock;  // 商品库存
    private Integer productStatus; // 商品状态
    private byte[] productImage;   // 商品图片（二进制数据）

    // 非数据库字段 - 关联的完整商品对象 (可选，如果需要完整对象)
    private Product product;     // 关联的商品信息

    public Integer getCartId() {
        return cartId;
    }

    public void setCartId(Integer cartId) {
        this.cartId = cartId;
    }

    public Integer getUserId() {
        return userId;
    }

    public void setUserId(Integer userId) {
        this.userId = userId;
    }

    public Integer getProductId() {
        return productId;
    }

    public void setProductId(Integer productId) {
        this.productId = productId;
    }

    public Integer getQuantity() {
        return quantity;
    }

    public void setQuantity(Integer quantity) {
        this.quantity = quantity;
    }

    public Integer getSelected() {
        return selected;
    }

    public void setSelected(Integer selected) {
        this.selected = selected;
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

    // 新增字段的 Getter 和 Setter
    public String getProductName() {
        return productName;
    }

    public void setProductName(String productName) {
        this.productName = productName;
    }

    public Double getProductPrice() {
        return productPrice;
    }

    public void setProductPrice(Double productPrice) {
        this.productPrice = productPrice;
    }

    public Integer getProductStock() {
        return productStock;
    }

    public void setProductStock(Integer productStock) {
        this.productStock = productStock;
    }

    public Integer getProductStatus() {
        return productStatus;
    }

    public void setProductStatus(Integer productStatus) {
        this.productStatus = productStatus;
    }

    public byte[] getProductImage() {
        return productImage;
    }

    public void setProductImage(byte[] productImage) {
        this.productImage = productImage;
    }

    @Override
    public String toString() {
        return "Cart{" +
                "cartId=" + cartId +
                ", userId=" + userId +
                ", productId=" + productId +
                ", quantity=" + quantity +
                ", selected=" + selected +
                ", createTime=" + createTime +
                ", updateTime=" + updateTime +
                ", productName='" + productName + '\'' +
                ", productPrice=" + productPrice +
                ", productStock=" + productStock +
                ", productStatus=" + productStatus +
                ", productImage='" + productImage + '\'' +
                '}';
    }
}