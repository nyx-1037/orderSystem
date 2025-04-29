// 客户端创建订单页面的JavaScript

// 当前商品ID和数量
let productId = null;
let quantity = 1;
let product = null;

// 页面加载完成后执行
$(document).ready(function() {
    // 检查用户是否已登录
    checkLoginStatus().then(function(isLoggedIn) {
        if (isLoggedIn) {
            // 获取URL中的商品ID和数量参数
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

// 加载商品信息
async function loadProductInfo(productId, quantity) {
    try {
        // 请求商品详情数据
        product = await fetchAPI(`/api/product/${productId}`);
        
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
    let imageUrl = `/api/product/${product.productId}/image`;
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

// 自动填充用户信息
async function fillUserInfo() {
    try {
        // 获取当前用户信息
        const userInfo = await fetchAPI('/api/user/current');
        
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
        
        // 计算总价
        const totalAmount = product.price * quantity;
        
        // 构建订单数据
        const orderData = {
            productId: productId,
            quantity: quantity,
            totalAmount: totalAmount,
            receiver: receiver,
            receiverPhone: receiverPhone,
            address: address,
            remark: remark
        };
        
        // 发送创建订单请求
        const response = await fetchAPI('/api/order/create', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(orderData)
        });
        
        // 显示成功消息
        showSuccessMessage('订单创建成功！');
        
        // 跳转到订单详情页
        setTimeout(() => {
            window.location.href = `/pages/client/order-detail.html?uuid=${response.orderUuid}`;
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