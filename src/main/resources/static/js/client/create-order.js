// 客户端创建订单页面的JavaScript

// 当前商品ID和数量，或者购物车模式
let productId = null;
let quantity = 1;
let product = null;
let isCartCheckout = false;
let selectedCartItems = [];

// 页面加载完成后执行
$(document).ready(function() {
    // 检查用户是否已登录
    checkLoginStatus().then(function(isLoggedIn) {
        if (isLoggedIn) {
            // 检查是否是从购物车结算
            isCartCheckout = getUrlParam('from') === 'cart';
            
            if (isCartCheckout) {
                // 从购物车结算，加载已选中的购物车商品
                loadSelectedCartItems();
            } else {
                // 直接购买单个商品
                productId = getUrlParam('productId');
                quantity = parseInt(getUrlParam('quantity') || '1');
                
                if (!productId) {
                    showErrorMessage('商品ID参数不能为空');
                    setTimeout(() => {
                        window.location.href = '/pages/client/products.html';
                    }, 2000);
                    return;
                }
                
                // 加载商品信息
                loadProductInfo(productId, quantity);
            }
            
            // 绑定退出登录事件
            $('#logout-btn').click(function(e) {
                e.preventDefault();
                logout();
            });
            
            // 绑定表单提交事件
            $('#order-form').submit(function(e) {
                e.preventDefault();
                submitOrder();
            });
            
            // 自动填充用户信息
            fillUserInfo();
        }
    });
});

// 加载已选中的购物车商品
async function loadSelectedCartItems() {
    try {
        // 显示加载中
        $('#product-summary').html('<div class="text-center"><div class="spinner-border" role="status"><span class="sr-only">加载中...</span></div><p>正在加载购物车商品...</p></div>');
        
        // 请求已选中的购物车商品
        const response = await fetchAPI('/api/client/cart/selected');
        
        // 检查响应格式，适配不同的返回结构
        let items = [];
        
        if (response && Array.isArray(response)) {
            // 直接返回数组的情况
            items = response;
        } else if (response && response.data && Array.isArray(response.data)) {
            // 包含在data字段中的情况
            items = response.data;
        } else if (response && response.content && Array.isArray(response.content)) {
            // 包含在content字段中的情况
            items = response.content;
        }
        
        if (items.length === 0) {
            showErrorMessage('购物车中没有选中的商品');
            setTimeout(() => {
                window.location.href = '/pages/client/cart.html';
            }, 2000);
            return;
        }
        
        // 保存选中的购物车商品
        selectedCartItems = items;
        
        // 渲染购物车商品摘要
        renderCartSummary(selectedCartItems);
    } catch (error) {
        console.error('加载购物车商品失败:', error);
        showErrorMessage('加载购物车商品失败: ' + error.message);
        $('#product-summary').html('<div class="alert alert-danger">加载购物车商品失败</div>');
    }
}

// 加载商品信息
async function loadProductInfo(productId, quantity) {
    try {
        // 显示加载中
        $('#product-summary').html('<div class="text-center"><div class="spinner-border" role="status"><span class="sr-only">加载中...</span></div><p>正在加载商品信息...</p></div>');
        
        // 请求商品详情数据
        product = await fetchAPI(`/api/products/${productId}`);
        
        if (!product) {
            showErrorMessage('商品不存在或已被删除');
            setTimeout(() => {
                window.location.href = '/pages/client/products.html';
            }, 2000);
            return;
        }
        
        // 如果商品已下架，显示提示信息
        if (product.status === 0) {
            showErrorMessage('该商品已下架');
            setTimeout(() => {
                window.location.href = '/pages/client/products.html';
            }, 2000);
            return;
        }
        
        // 如果库存不足，显示提示信息
        if (product.stock < quantity) {
            showErrorMessage(`该商品库存不足，当前库存: ${product.stock}`);
            quantity = product.stock > 0 ? product.stock : 1;
        }
        
        // 渲染商品信息
        renderProductSummary(product, quantity);
    } catch (error) {
        console.error('加载商品信息失败:', error);
        showErrorMessage('加载商品信息失败: ' + error.message);
        $('#product-summary').html('<div class="alert alert-danger">加载商品信息失败</div>');
    }
}

// 渲染商品摘要信息
function renderProductSummary(product, quantity) {
    // 清空容器
    $('#product-summary').empty();
    
    // 计算总价
    const totalPrice = product.price * quantity;
    
    // 商品图片URL
    let imageUrl = `/api/products/${product.productId}/image`;
    // 不在URL中添加token参数，而是在img标签中使用headers属性
    // 图片将通过Authorization头部进行认证
    
    // 渲染商品摘要
    $('#product-summary').html(`
        <h4 class="mb-3">订单摘要</h4>
        <div class="d-flex mb-3">
            <img src="${imageUrl}" alt="${product.productName}" class="product-image-small" 
                 onerror="this.onerror=null; this.src='/images/default-product.jpg'; console.log('商品图片加载失败，使用默认图片');">
            <div>
                <h5>${product.productName}</h5>
                <p class="product-price">${formatCurrency(product.price)} × ${quantity}</p>
            </div>
        </div>
        <hr>
        <div class="d-flex justify-content-between">
            <h5>订单总价:</h5>
            <div class="total-price">${formatCurrency(totalPrice)}</div>
        </div>
    `);
}

// 渲染购物车商品摘要
function renderCartSummary(cartItems) {
    // 清空容器
    $('#product-summary').empty();
    
    // 计算总价和总数量
    let totalPrice = 0;
    let totalQuantity = 0;
    
    cartItems.forEach(item => {
        totalPrice += item.productPrice * item.quantity;
        totalQuantity += item.quantity;
    });
    
    // 构建商品列表HTML
    let itemsHtml = '';
    cartItems.forEach(item => {
        const itemTotalPrice = item.productPrice * item.quantity;
        const imageUrl = `/api/products/${item.productId}/image`;
        
        itemsHtml += `
            <div class="d-flex mb-2 border-bottom pb-2">
                <img src="${imageUrl}" alt="${item.productName}" class="product-image-small" 
                     onerror="this.onerror=null; this.src='/images/default-product.jpg';">
                <div class="flex-grow-1">
                    <h6>${item.productName}</h6>
                    <p class="product-price mb-0">${formatCurrency(item.productPrice)} × ${item.quantity}</p>
                    <p class="text-right mb-0">小计: ¥${formatCurrency(itemTotalPrice)}</p>
                </div>
            </div>
        `;
    });
    
    // 渲染购物车摘要
    $('#product-summary').html(`
        <h4 class="mb-3">订单摘要 (${cartItems.length}件商品)</h4>
        <div class="cart-items-container mb-3" style="max-height: 300px; overflow-y: auto;">
            ${itemsHtml}
        </div>
        <hr>
        <div class="d-flex justify-content-between">
            <h5>商品总数:</h5>
            <div>${totalQuantity}件</div>
        </div>
        <div class="d-flex justify-content-between mt-2">
            <h5>订单总价:</h5>
            <div class="total-price">${formatCurrency(totalPrice)}</div>
        </div>
    `);
}

// 自动填充用户信息
async function fillUserInfo() {
    try {
        // 获取当前用户信息
        const userInfo = await fetchAPI('/api/users/current');
        
        if (userInfo) {
            // 填充收货信息
            $('#receiver').val(userInfo.realName || '');
            $('#receiver-phone').val(userInfo.phone || '');
            $('#address').val(userInfo.address || '');
        }
    } catch (error) {
        console.error('获取用户信息失败:', error);
    }
}

// 提交订单
async function submitOrder() {
    try {
        // 禁用提交按钮，防止重复提交
        $('#submit-order-btn').prop('disabled', true).html('<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> 提交中...');
        
        // 获取表单数据
        const receiver = $('#receiver').val();
        const receiverPhone = $('#receiver-phone').val();
        const address = $('#address').val();
        const remark = $('#remark').val();
        
        let orderData;
        
        if (isCartCheckout) {
            // 从购物车结算
            // 计算总价
            let totalAmount = 0;
            let items = [];
            
            selectedCartItems.forEach(item => {
                totalAmount += item.productPrice * item.quantity;
                items.push({
                    productId: item.productId,
                    productName: item.productName,
                    quantity: item.quantity,
                    productPrice: item.productPrice
                });
            });
            
            // 构建订单数据
            orderData = {
                items: items,
                totalAmount: totalAmount,
                receiver: receiver,
                receiverPhone: receiverPhone,
                address: address,
                remark: remark,
                fromCart: true
            };
        } else {
            // 直接购买单个商品
            // 计算总价
            const totalAmount = product.price * quantity;
            
            // 构建订单数据
            orderData = {
                items: [{
                    productId: productId,
                    productName: product.productName,
                    quantity: quantity,
                    productPrice: product.price
                }],
                totalAmount: totalAmount,
                receiver: receiver,
                receiverPhone: receiverPhone,
                address: address,
                remark: remark,
                fromCart: false
            };
        }
        
        console.log('发送POST请求到: /api/orders');
        console.log('请求数据:', orderData);
        
        // 发送创建订单请求 - 使用RESTful风格的API路径
        // 确保添加Authorization头部
        const token = localStorage.getItem('token');
        const headers = {
            'Content-Type': 'application/json'
        };
        
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        
        const response = await fetchAPI('/api/orders', {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(orderData)
        });
        
        // 显示成功消息
        showSuccessMessage('订单创建成功！');
        
        // 如果是从购物车结算，清空已选中的购物车商品
        if (isCartCheckout) {
            try {
                await fetchAPI('/api/client/cart/selected/clear', {
                    method: 'DELETE'
                });
            } catch (err) {
                console.error('清空已选购物车商品失败:', err);
                // 不影响主流程，继续执行
            }
        }
        
        // 跳转到订单详情页
        setTimeout(() => {
            window.location.href = `/pages/client/order-detail.html?uuid=${response.orderUuid || response.order.orderUuid}`;
        }, 2000);
    } catch (error) {
        console.error('创建订单失败:', error);
        showErrorMessage('创建订单失败: ' + error.message);
        
        // 恢复提交按钮
        $('#submit-order-btn').prop('disabled', false).text('提交订单');
    }
}

// 格式化货币
function formatCurrency(price) {
    return '¥' + parseFloat(price).toFixed(2);
}

// 从URL获取参数
function getUrlParam(name) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(name);
}