// 订单详情页面脚本(管理员)
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
    
    // 检查管理员登录状态 (使用 admin/main.js 中的函数)
    checkAdminLoginStatus().then(function(isLoggedIn) {
        if (isLoggedIn) {
            // 获取当前用户信息
            getCurrentUserInfo().then(function(user) {
                currentUser = user;
                // 检查是否为管理员
                if (currentUser.role !== 1) {
                    showErrorMessage('您没有权限访问此页面');
                    setTimeout(() => {
                        window.location.href = '/pages/client/orders.html';
                    }, 2000);
                    return;
                }
                // 加载订单详情
                loadOrderDetail(orderUuid);
            });
        }
    });
});

// 获取当前用户信息
async function getCurrentUserInfo() {
    try {
        return await fetchAPI('/api/users/current');
    } catch (error) {
        console.error('获取用户信息失败:', error);
        showErrorMessage('获取用户信息失败: ' + error.message);
        return null;
    }
}

// 加载订单详情
async function loadOrderDetail(uuid) {
    try {
        // 先通过UUID查询订单ID，然后使用ID获取详情
        // 使用查询参数方式请求，避免将UUID直接放在路径中
        let apiPath = `/api/orders/by-uuid?uuid=${uuid}`;
        console.log('请求订单详情URL:', apiPath);
        let order;
        
        try {
            order = await fetchAPI(apiPath);
        } catch (error) {
            console.error('API请求失败:', error);
            throw error;
        }
        
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
                    <p><strong>用户ID：</strong>${order.userId}</p>
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
    console.log('订单商品列表1:', order.items);
    console.log('订单商品列表2:', order.orderItems);
    
    // 添加订单商品列表
    const itemsBody = itemsCard.find('#order-items');
    if (order.items && order.items.length > 0) {
        order.items.forEach(item => {
            // 确保价格大于0，优先使用productPrice字段
            const price = (item.productPrice && item.productPrice > 0) ? item.productPrice : 
                         (item.price && item.price > 0) ? item.price : 
                         (item.product && item.product.productPrice) ? item.product.productPrice : 
                         (item.product && item.product.price) ? item.product.price : 0;
            const tr = $('<tr></tr>');
            tr.html(`
                <td>${item.productName}</td>
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
            // 优先使用productPrice字段，其次是price字段
            const price = item.productPrice || item.price || product.productPrice || product.price || 0;
            const quantity = item.quantity || 1;
            
            // 如果有商品ID，添加商品图片
            let productImageHtml = '';
            if (product.productId) {
                // 商品图片URL
                const imageUrl = `/api/product/${product.productId}/image`;
                // 使用data-src属性存储原始URL，让image-loader.js处理认证
                productImageHtml = `<img data-src="${imageUrl}" src="/images/loading.gif" alt="${productName}" class="mr-2" style="width: 50px; height: 50px; object-fit: cover;" onerror="this.onerror=null; this.src='/images/default-product.jpg'; console.log('商品图片加载失败，使用默认图片');">`;;
            }
            
            const tr = $('<tr></tr>');

            tr.html(`
                <td>${productImageHtml} ${productName}</td>
                <td>${formatCurrency(price)}</td>
                <td>${quantity}</td>
                <td>${formatCurrency(price * quantity)}</td>
            `);
            itemsBody.append(tr);
        });
    } else {
        itemsBody.html('<tr><td colspan="4" class="text-center">暂无商品信息</td></tr>');
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
    const orderId = order.orderId || order.id;

    let buttonsHtml = '';

    // 根据订单状态添加不同的操作按钮
    switch (parseInt(order.status)) {
        case 0: // 待付款
            buttonsHtml += `<button class="btn btn-danger cancel-btn mr-2" data-id="${orderId}">取消订单</button>`;
            break;
        case 1: // 已付款
            buttonsHtml += `<button class="btn btn-primary ship-btn mr-2" data-id="${orderId}">去发货</button>`;
            break;
        // 其他状态暂时不添加特定操作按钮，但保留删除按钮
    }

    // 添加删除按钮（对所有状态都可用）
    buttonsHtml += `<button class="btn btn-danger delete-btn" data-id="${orderId}">删除订单</button>`;

    actionsContainer.html(buttonsHtml);

    // 绑定按钮事件
    bindActionButtons(orderId);
}

// 绑定操作按钮事件
function bindActionButtons(orderId) {
    // 取消订单
    $('.cancel-btn').click(function() {
        cancelOrder(orderId);
    });

    // 发货
    $('.ship-btn').click(function() {
        shipOrder(orderId);
    });

    // 删除订单
    $('.delete-btn').click(function() {
        deleteOrder(orderId);
    });
}

// 取消订单
async function cancelOrder(orderId) {
    showConfirmModal('确定要取消该订单吗？', async () => {
        try {
            await fetchAPI(`/api/orders/${orderId}/cancel`, { method: 'POST' });
            showSuccessMessage('订单已取消');
            // 刷新页面或重新加载数据
            loadOrderDetail(orderUuid);
        } catch (error) {
            console.error('取消订单失败:', error);
            showErrorMessage('取消订单失败: ' + error.message);
        }
    });
}

// 发货
async function shipOrder(orderId) {
    showConfirmModal('确定要标记为已发货吗？', async () => {
        try {
            await fetchAPI(`/api/orders/${orderId}/ship`, { method: 'POST' });
            showSuccessMessage('订单已标记为已发货');
            // 刷新页面或重新加载数据
            loadOrderDetail(orderUuid);
        } catch (error) {
            console.error('发货失败:', error);
            showErrorMessage('发货失败: ' + error.message);
        }
    });
}

// 删除订单
async function deleteOrder(orderId) {
    showConfirmModal(`确定要删除此订单吗？此操作不可恢复。`, async () => {
        try {
            const response = await fetchAPI(`/api/orders/${orderId}`, { method: 'DELETE' });
            showSuccessMessage(response || '订单删除成功');
            // 删除成功后跳转回列表页
            window.location.href = '/pages/admin/order-list.html';
        } catch (error) {
            console.error('删除订单失败:', error);
            showErrorMessage('删除订单失败: ' + error.message);
        }
    });
}

// 显示确认操作模态框
function showConfirmModal(message, callback) {
    $('#confirmMessage').text(message);
    $('#confirmModal').modal('show');
    $('#confirmActionBtn').off('click').on('click', function() {
        $('#confirmModal').modal('hide');
        if (typeof callback === 'function') {
            callback();
        }
    });
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
    return '¥' + parseFloat(amount).toLocaleString('zh-CN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}