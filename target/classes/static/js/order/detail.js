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

            `);
            tbody.append(tr);
        });
    } else {
        tbody.html('<tr><td colspan="4" class="text-center">暂无商品信息</td></tr>');
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