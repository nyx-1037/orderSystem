// 订单详情页面脚本
let orderUuid = null;
let currentUser = null;

// 页面加载完成后执行
$(document).ready(function() {
    // 获取URL中的订单UUID参数
    const urlParams = new URLSearchParams(window.location.search);
    orderUuid = urlParams.get('uuid');
    
    if (!orderUuid) {
        showErrorMessage('订单ID不能为空');
        return;
    }
    
    // 检查用户是否已登录
    checkLoginStatus().then(function(isLoggedIn) {
        if (isLoggedIn) {
            // 获取当前用户信息
            getCurrentUserInfo().then(function(user) {
                currentUser = user;
                // 加载订单详情
                loadOrderDetail(orderUuid);
            });
        }
    });
});

// 获取当前用户信息
async function getCurrentUserInfo() {
    try {
        return await fetchAPI('/api/user/current');
    } catch (error) {
        console.error('获取用户信息失败:', error);
        showErrorMessage('获取用户信息失败: ' + error.message);
        return null;
    }
}

// 加载订单详情
async function loadOrderDetail(uuid) {
    try {
        // 使用RESTful API路径
        const apiPath = `/api/client/orders/${uuid}`;
        console.log('请求订单详情URL:', apiPath);
        const order = await fetchAPI(apiPath);
        
        renderOrderDetail(order);
        renderOrderActions(order);
    } catch (error) {
        console.error('加载订单详情失败:', error);
        showErrorMessage('加载订单详情失败: ' + error.message);
        $('#order-detail-container').html('<div class="alert alert-danger">加载订单详情失败</div>');
    }
}

// 渲染订单详情
function renderOrderDetail(order) {
    const container = $('#order-detail-container');
    container.empty();
    
    // 获取订单状态文本
    const statusText = getOrderStatusText(order.status);
    
    // 构建订单基本信息卡片
    const orderInfoCard = $('<div class="card mb-4"></div>');
    orderInfoCard.html(`
        <div class="card-header bg-primary text-white">
            <h5 class="mb-0">订单基本信息</h5>
        </div>
        <div class="card-body">
            <div class="row">
                <div class="col-md-6">
                    <p><strong>订单编号：</strong>${order.orderNo}</p>
                    <p><strong>下单时间：</strong>${formatDate(order.createTime)}</p>
                    <p><strong>订单状态：</strong><span class="order-status status-${order.status}">${statusText}</span></p>
                </div>
                <div class="col-md-6">
                    <p><strong>订单金额：</strong>${formatCurrency(order.totalAmount)}</p>
                    <p><strong>支付方式：</strong>${order.paymentMethod || '未支付'}</p>
                    <p><strong>支付时间：</strong>${order.payTime ? formatDate(order.payTime) : '未支付'}</p>
                </div>
            </div>
        </div>
    `);
    
    // 构建收货信息卡片
    const addressCard = $('<div class="card mb-4"></div>');
    addressCard.html(`
        <div class="card-header bg-info text-white">
            <h5 class="mb-0">收货信息</h5>
        </div>
        <div class="card-body">
            <p><strong>收货人：</strong>${order.receiver || order.receiverName || '未提供'}</p>
            <p><strong>联系电话：</strong>${order.receiverPhone || order.phone || '未提供'}</p>
            <p><strong>收货地址：</strong>${order.address || order.receiverAddress || '未提供'}</p>
        </div>
    `);
    
    // 构建订单商品列表卡片
    const itemsCard = $('<div class="card"></div>');
    itemsCard.html(`
        <div class="card-header bg-success text-white">
            <h5 class="mb-0">订单商品</h5>
        </div>
        <div class="card-body p-0">
            <div class="table-responsive">
                <table class="table table-striped mb-0">
                    <thead>
                        <tr>
                            <th>商品名称</th>
                            <th>单价</th>
                            <th>数量</th>
                            <th>小计</th>
                        </tr>
                    </thead>
                    <tbody id="order-items"></tbody>
                </table>
            </div>
        </div>
    `);
    
    // 添加订单商品列表
    const itemsBody = itemsCard.find('#order-items');
    if (order.items && order.items.length > 0) {
        order.items.forEach(item => {
            // 确保价格大于0
            const price = (item.price && item.price > 0) ? item.price : (item.product && item.product.price ? item.product.price : 0);
            // 商品图片URL

            const productId = item.productId || (item.product ? item.product.productId : null);
            let imageUrl = productId ? `/api/products/${productId}/image` : '/images/default-product.jpg';
            // 添加Token到图片URL
            if (productId) {
                const token = localStorage.getItem('token');
                if (token) {
                    // 确保token正确编码，避免特殊字符问题
                    const encodedToken = encodeURIComponent(token.trim());
                    imageUrl = `${imageUrl}?token=${encodedToken}`;
                }
            }
            
            const tr = $('<tr></tr>');
            tr.html(`
                <td>
                    <div class="d-flex align-items-center">
                        <img src="${imageUrl}" alt="${item.productName}" class="product-image-tiny mr-2" 
                            onerror="this.onerror=null; this.src='/images/default-product.jpg'; console.log('图片加载失败，使用默认图片');">
                        <span>${item.productName}</span>
                    </div>
                </td>
                <td>${formatCurrency(price)}</td>
                <td>${item.quantity}</td>
                <td>${formatCurrency(price * item.quantity)}</td>
            `);
            itemsBody.append(tr);
        });
    } else if (order.orderItems && order.orderItems.length > 0) {
        // 兼容不同的API返回格式
        order.orderItems.forEach(item => {
            const product = item.product || {};
            const productName = product.name || item.productName || '未知商品';
            // 修复商品单价显示问题，确保优先使用商品的原始价格
            const price = (item.price && item.price > 0) ? item.price : (product.price || 0);
            const quantity = item.quantity || 1;
            
            // 商品图片URL
            const productId = item.productId || (product ? product.productId : null);
            let imageUrl = productId ? `/api/products/${productId}/image` : '/images/default-product.jpg';
            // 添加Token到图片URL
            if (productId) {
                const token = localStorage.getItem('token');
                if (token) {
                    // 确保token正确编码，避免特殊字符问题
                    const encodedToken = encodeURIComponent(token.trim());
                    imageUrl = `${imageUrl}?token=${encodedToken}`;
                }
            }
            
            const tr = $('<tr></tr>');
            tr.html(`
                <td>
                    <div class="d-flex align-items-center">
                        <img src="${imageUrl}" alt="${productName}" class="product-image-tiny mr-2" 
                            onerror="this.onerror=null; this.src='/images/default-product.jpg'; console.log('图片加载失败，使用默认图片');">
                        <span>${productName}</span>
                    </div>
                </td>
                <td>${formatCurrency(price)}</td>
                <td>${quantity}</td>
                <td>${formatCurrency(price * quantity)}</td>
            `);
            itemsBody.append(tr);
        });
    } else {
        itemsBody.html('<tr><td colspan="4" class="text-center">暂无商品信息</td></tr>');
    }
    
    // 添加CSS样式
    if (!$('#product-image-styles').length) {
        $('head').append(`
            <style id="product-image-styles">
                .product-image-tiny {
                    width: 40px;
                    height: 40px;
                    object-fit: cover;
                    border-radius: 4px;
                }
            </style>
        `);
    }
    
    // 将所有卡片添加到容器
    container.append(orderInfoCard);
    container.append(addressCard);
    container.append(itemsCard);
}

// 获取订单状态文本
function getOrderStatusText(status) {
    switch (parseInt(status)) {
        case 0: return '待付款';
        case 1: return '已付款';
        case 2: return '已发货';
        case 3: return '已完成';
        case 4: return '已取消';
        default: return '未知状态';
    }
}

// 渲染订单操作按钮
function renderOrderActions(order) {
    const actionsContainer = $('#order-actions');
    actionsContainer.empty();
    
    // 根据订单状态显示不同的操作按钮
    switch (parseInt(order.status)) {
        case 0: // 待付款
            actionsContainer.append(`
                <button class="btn btn-primary" id="pay-btn">立即付款</button>
                <button class="btn btn-danger ml-2" id="cancel-btn">取消订单</button>
            `);
            break;
        case 2: // 已发货
            actionsContainer.append(`
                <button class="btn btn-success" id="confirm-receipt-btn">确认收货</button>
            `);
            break;
    }
    
    // 绑定按钮事件
    $('#pay-btn').click(function() {
        payOrder(order.orderId || order.id);
    });
    
    $('#cancel-btn').click(function() {
        cancelOrder(order.orderId || order.id);
    });
    
    $('#confirm-receipt-btn').click(function() {
        confirmReceipt(order.orderId || order.id);
    });
}

// 支付订单
async function payOrder(orderId) {
    showConfirmModal('确定要支付此订单吗？', async () => {
        try {
            // 使用订单ID进行支付操作
            await fetchAPI(`/api/client/orders/${orderId}/pay`, { method: 'POST' });
            showSuccessMessage('订单支付成功');
            setTimeout(() => {
                // 使用UUID重新加载订单详情
                loadOrderDetail(orderUuid);
            }, 1000);
        } catch (error) {
            console.error('订单支付失败:', error);
            showErrorMessage('订单支付失败: ' + error.message);
        }
    });
}

// 取消订单
async function cancelOrder(orderId) {
    showConfirmModal('确定要取消此订单吗？', async () => {
        try {
            // 使用订单ID进行取消操作
            await fetchAPI(`/api/client/orders/${orderId}/cancel`, { method: 'POST' });
            showSuccessMessage('订单已取消');
            setTimeout(() => {
                // 使用UUID重新加载订单详情
                loadOrderDetail(orderUuid);
            }, 1000);
        } catch (error) {
            console.error('取消订单失败:', error);
            showErrorMessage('取消订单失败: ' + error.message);
        }
    });
}

// 确认收货
async function confirmReceipt(orderId) {
    showConfirmModal('确认已收到商品吗？', async () => {
        try {
            // 使用订单ID进行确认收货操作
            await fetchAPI(`/api/client/orders/${orderId}/confirm`, { method: 'POST' });
            showSuccessMessage('已确认收货');
            setTimeout(() => {
                // 使用UUID重新加载订单详情
                loadOrderDetail(orderUuid);
            }, 1000);
        } catch (error) {
            console.error('确认收货失败:', error);
            showErrorMessage('确认收货失败: ' + error.message);
        }
    });
}

// 显示确认模态框
function showConfirmModal(message, confirmCallback) {
    // 设置确认消息
    $('#confirmMessage').text(message);
    
    // 绑定确认按钮事件
    $('#confirmActionBtn').off('click').on('click', function() {
        $('#confirmModal').modal('hide');
        if (typeof confirmCallback === 'function') {
            confirmCallback();
        }
    });
    
    // 显示模态框
    $('#confirmModal').modal('show');
}

// 格式化日期
function formatDate(dateString) {
    if (!dateString) return '未知';
    const date = new Date(dateString);
    return date.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    }).replace(/\//g, '/');
}

// 格式化货币
function formatCurrency(amount) {
    if (amount === undefined || amount === null) return '¥0.00';
    return '¥' + parseFloat(amount).toFixed(2);
}