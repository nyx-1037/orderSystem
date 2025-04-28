// 订单详情页面的JavaScript

// 当前订单UUID
let orderUuid = null;

// 页面加载完成后执行
$(document).ready(function() {
    // 检查用户是否已登录
    checkLoginStatus().then(function(isLoggedIn) {
        if (isLoggedIn) {
            // 获取URL中的订单UUID参数
            orderUuid = getUrlParam('uuid');
            
            if (!orderUuid) {
                showErrorMessage('订单参数不能为空');
                setTimeout(() => {
                    window.location.href = '/pages/order/list.html';
                }, 2000);
                return;
            }
            
            // 加载订单详情
            loadOrderDetail(orderUuid);
            
            // 绑定退出登录事件
            $('#logout-btn').click(function(e) {
                e.preventDefault();
                logout();
            });
        }
    });
});

// 加载订单详情
async function loadOrderDetail(orderUuid) {
    try {
        // 添加调试信息，查看请求URL
        console.log(`请求订单详情，URL: /api/order/detail/${orderUuid}`);
        const order = await fetchAPI(`/api/order/detail/${orderUuid}`);
        
        if (!order) {
            showErrorMessage('订单不存在或已被删除');
            setTimeout(() => {
                window.location.href = '/pages/order/list.html';
            }, 2000);
            return;
        }
        
        // 渲染订单详情
        renderOrderDetail(order);
        
        // 根据订单状态显示不同的操作按钮
        renderOrderActions(order);
    } catch (error) {
        console.error('加载订单详情失败:', error);
        showErrorMessage('加载订单详情失败: ' + error.message);
        $('#order-detail-container').html('<div class="alert alert-danger">加载订单详情失败</div>');
    }
}

// 渲染订单详情
function renderOrderDetail(order) {
    // 清空容器
    $('#order-detail-container').empty();
    
    // 订单基本信息
    const orderInfo = $('<div class="order-info"></div>');
    const row1 = $('<div class="row"></div>');
    
    // 左侧信息
    const col1 = $('<div class="col-md-6"></div>');
    col1.html(`
        <p><strong>订单编号：</strong>${order.orderNo}</p>
        <p>
            <strong>订单状态：</strong>
            <span class="order-status status-${order.status}">
                ${getOrderStatusText(order.status)}
            </span>
        </p>
        <p><strong>下单时间：</strong>${formatDate(order.createTime)}</p>
        ${order.paymentTime ? `<p><strong>支付时间：</strong>${formatDate(order.paymentTime)}</p>` : ''}
        ${order.shippingTime ? `<p><strong>发货时间：</strong>${formatDate(order.shippingTime)}</p>` : ''}
        ${order.completeTime ? `<p><strong>完成时间：</strong>${formatDate(order.completeTime)}</p>` : ''}
    `);
    
    // 右侧信息
    const col2 = $('<div class="col-md-6"></div>');
    col2.html(`
        <p><strong>收货人：</strong>${order.receiver}</p>
        <p><strong>联系电话：</strong>${order.receiverPhone}</p>
        <p><strong>收货地址：</strong>${order.address}</p>
        ${order.remark ? `<p><strong>订单备注：</strong>${order.remark}</p>` : ''}
    `);
    
    row1.append(col1);
    row1.append(col2);
    orderInfo.append(row1);
    
    // 订单商品列表
    const orderItems = $('<div class="mt-4"></div>');
    orderItems.html('<h4>订单商品</h4>');
    
    const table = $('<table class="table table-bordered"></table>');
    const thead = $('<thead class="thead-light"></thead>');
    thead.html(`
        <tr>
            <th>商品名称</th>
            <th>单价</th>
            <th>数量</th>
            <th>小计</th>
            <th>操作</th>
        </tr>
    `);
    
    const tbody = $('<tbody></tbody>');
    
    // 添加订单商品
    if (order.orderItems && order.orderItems.length > 0) {
        order.orderItems.forEach(item => {
            const tr = $('<tr></tr>');
            tr.html(`
                <td>${item.productName}</td>
                <td>${formatCurrency(item.productPrice)}</td>
                <td>${item.quantity}</td>
                <td>${formatCurrency(item.productPrice * item.quantity)}</td>
                <td><a href="/pages/product/detail.html?id=${item.productId}" class="btn btn-sm btn-info">查看商品详情</a></td>
            `);
            tbody.append(tr);
        });
    } else {
        tbody.html('<tr><td colspan="5" class="text-center">暂无商品信息</td></tr>');
    }
    
    table.append(thead);
    table.append(tbody);
    
    // 添加订单总金额
    const totalRow = $('<div class="text-right mt-3"></div>');
    totalRow.html(`<h5>订单总金额：<span class="text-danger">${formatCurrency(order.totalAmount)}</span></h5>`);
    
    orderItems.append(table);
    orderItems.append(totalRow);
    
    // 将订单信息和商品列表添加到容器中
    $('#order-detail-container').append(orderInfo);
    $('#order-detail-container').append(orderItems);
}

// 根据订单状态显示不同的操作按钮
function renderOrderActions(order) {
    // 清空操作按钮容器
    $('#order-actions').empty();
    
    // 创建操作按钮容器
    const actionsContainer = $('<div class="order-actions mt-4"></div>');
    
    // 根据订单状态显示不同的按钮
    switch (order.status) {
        case 'UNPAID': // 待支付
            actionsContainer.append(`
                <button class="btn btn-primary mr-2" onclick="payOrder('${order.uuid}')">立即支付</button>
                <button class="btn btn-danger" onclick="cancelOrder('${order.uuid}')">取消订单</button>
            `);
            break;
        case 'PAID': // 已支付
            actionsContainer.append(`
                <button class="btn btn-secondary" disabled>等待发货</button>
            `);
            break;
        case 'SHIPPED': // 已发货
            actionsContainer.append(`
                <button class="btn btn-success" onclick="confirmReceive('${order.uuid}')">确认收货</button>
            `);
            break;
        case 'COMPLETED': // 已完成
            actionsContainer.append(`
                <button class="btn btn-info" onclick="reviewOrder('${order.uuid}')">评价订单</button>
                <button class="btn btn-primary ml-2" onclick="buyAgain('${order.uuid}')">再次购买</button>
            `);
            break;
        case 'CANCELLED': // 已取消
            actionsContainer.append(`
                <button class="btn btn-primary" onclick="buyAgain('${order.uuid}')">再次购买</button>
            `);
            break;
    }
    
    // 将操作按钮添加到容器中
    $('#order-actions').append(actionsContainer);
}

// 支付订单
async function payOrder(orderUuid) {
    try {
        if (confirm('确定要支付此订单吗？')) {
            const result = await fetchAPI(`/api/order/pay/${orderUuid}`, {
                method: 'POST'
            });
            
            if (result && result.success) {
                showSuccessMessage('支付成功');
                // 重新加载订单详情
                loadOrderDetail(orderUuid);
            } else {
                showErrorMessage(result.message || '支付失败');
            }
        }
    } catch (error) {
        console.error('支付订单失败:', error);
        showErrorMessage('支付订单失败: ' + error.message);
    }
}

// 取消订单
async function cancelOrder(orderUuid) {
    try {
        if (confirm('确定要取消此订单吗？')) {
            const result = await fetchAPI(`/api/order/cancel/${orderUuid}`, {
                method: 'POST'
            });
            
            if (result && result.success) {
                showSuccessMessage('订单已取消');
                // 重新加载订单详情
                loadOrderDetail(orderUuid);
            } else {
                showErrorMessage(result.message || '取消订单失败');
            }
        }
    } catch (error) {
        console.error('取消订单失败:', error);
        showErrorMessage('取消订单失败: ' + error.message);
    }
}

// 确认收货
async function confirmReceive(orderUuid) {
    try {
        if (confirm('确认已收到商品吗？')) {
            const result = await fetchAPI(`/api/order/receive/${orderUuid}`, {
                method: 'POST'
            });
            
            if (result && result.success) {
                showSuccessMessage('确认收货成功');
                // 重新加载订单详情
                loadOrderDetail(orderUuid);
            } else {
                showErrorMessage(result.message || '确认收货失败');
            }
        }
    } catch (error) {
        console.error('确认收货失败:', error);
        showErrorMessage('确认收货失败: ' + error.message);
    }
}

// 评价订单
function reviewOrder(orderUuid) {
    // 跳转到评价页面
    window.location.href = `/pages/order/review.html?uuid=${orderUuid}`;
}

// 再次购买
async function buyAgain(orderUuid) {
    try {
        // 获取订单详情
        const order = await fetchAPI(`/api/order/detail/${orderUuid}`);
        
        if (order && order.orderItems && order.orderItems.length > 0) {
            // 获取第一个商品，跳转到商品详情页
            const firstItem = order.orderItems[0];
            window.location.href = `/pages/product/detail.html?id=${firstItem.productId}`;
        } else {
            showErrorMessage('订单中没有商品信息');
        }
    } catch (error) {
        console.error('再次购买失败:', error);
        showErrorMessage('再次购买失败: ' + error.message);
    }
}