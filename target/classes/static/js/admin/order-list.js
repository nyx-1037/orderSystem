
// 订单管理页面脚本(管理员)

// 页面变量
let currentPage = 1;
let totalPages = 1;
let pageSize = 10;

// 页面加载完成后执行
$(document).ready(function() {
    // 检查登录状态
    checkLoginStatus().then(isLoggedIn => {
        if (isLoggedIn) {
            // 初始化页面
            initOrderListPage();
            
            // 绑定搜索按钮点击事件
            $('#search-btn').click(function() {
                currentPage = 1;
                loadOrders();
            });
            
            // 绑定重置按钮点击事件
            $('#reset-btn').click(function() {
                $('#search-form')[0].reset();
                currentPage = 1;
                loadOrders();
            });
        }
    });
});

// 初始化订单列表页面
function initOrderListPage() {
    // 加载第一页订单数据
    loadOrders();
}

// 加载订单数据
async function loadOrders() {
    // 显示加载中状态
    $('#order-list').html(`
        <tr>
            <td colspan="6" class="text-center py-3">
                <div class="spinner-border text-primary" role="status">
                    <span class="sr-only">加载中...</span>
                </div>
                <p class="mt-2">正在加载订单数据...</p>
            </td>
        </tr>
    `);
    
    try {
        // 构建查询参数
        const params = new URLSearchParams();
        params.append('pageNum', currentPage);
        params.append('pageSize', pageSize);
        
        // 添加筛选条件
        const orderNo = $('#orderNo').val();
        const status = $('#status').val();
        const startDate = $('#startDate').val();
        const endDate = $('#endDate').val();
        
        if (orderNo) params.append('orderNo', orderNo);
        if (status) params.append('status', status);
        if (startDate) params.append('startDate', startDate);
        if (endDate) params.append('endDate', endDate);
        
        // 发送API请求
        const apiUrl = `/api/order/admin/list?${params.toString()}`;
        console.log('请求订单列表URL:', apiUrl);
        
        const response = await fetchAPI(apiUrl);
        
        // 更新分页信息
        totalPages = response.pages || 1;
        
        // 获取订单列表
        const orders = response.list || [];
        
        // 渲染订单列表
        renderOrderList(orders);
        
        // 渲染分页控件
        renderPagination();
    } catch (error) {
        console.error('加载订单失败:', error);
        showErrorMessage('加载订单失败: ' + error.message);
        
        // 显示空订单列表
        $('#order-list').html(`
            <tr>
                <td colspan="6" class="text-center">
                    <div class="alert alert-warning mb-0">
                        <i class="fas fa-exclamation-triangle mr-2"></i>
                        加载订单失败，请稍后重试
                    </div>
                </td>
            </tr>
        `);
    }
}

// 渲染订单列表
function renderOrderList(orders) {
    if (orders.length === 0) {
        $('#order-list').html(`
            <tr>
                <td colspan="7" class="text-center">
                    <div class="alert alert-info mb-0">
                        <i class="fas fa-info-circle mr-2"></i>
                        暂无订单数据
                    </div>
                </td>
            </tr>
        `);
        // 隐藏批量删除按钮
        $('#batch-delete-btn').hide();
        return;
    }
    
    let html = '';
    
    orders.forEach(order => {
        // 获取订单状态文本和样式
        const statusInfo = getOrderStatusInfo(order.status);
        const orderId = order.orderId || order.id;
        const orderUuid = order.orderUuid || order.uuid;
        
        html += `
            <tr data-id="${orderId}" data-uuid="${orderUuid}">
                <td>
                    <div class="custom-control custom-checkbox">
                        <input type="checkbox" class="custom-control-input order-checkbox" id="order-${orderId}" data-id="${orderId}">
                        <label class="custom-control-label" for="order-${orderId}"></label>
                    </div>
                </td>
                <td>${order.orderNo || '未知'}</td>
                <td>${formatDate(order.createTime)}</td>
                <td>${order.username || order.userId || '未知'}</td>
                <td>${formatCurrency(order.totalAmount)}</td>
                <td><span class="badge ${statusInfo.badgeClass}">${statusInfo.text}</span></td>
                <td>
                    <a href="/pages/admin/order-detail.html?uuid=${orderUuid}" class="btn btn-sm btn-info">查看详情</a>
                    ${getActionButton(order)}
                    <button class="btn btn-sm btn-danger delete-btn" data-id="${orderId}">删除</button>
                </td>
            </tr>
        `;
    });
    
    $('#order-list').html(html);
    
    // 绑定操作按钮事件
    bindActionButtons();
    
    // 绑定复选框事件
    bindCheckboxEvents();
}

// 获取订单状态信息
function getOrderStatusInfo(status) {
    switch (parseInt(status)) {
        case 0:
            return { text: '待付款', badgeClass: 'badge-warning' };
        case 1:
            return { text: '已付款', badgeClass: 'badge-info' };
        case 2:
            return { text: '已发货', badgeClass: 'badge-primary' };
        case 3:
            return { text: '已完成', badgeClass: 'badge-success' };
        case 4:
            return { text: '已取消', badgeClass: 'badge-secondary' };
        default:
            return { text: '未知状态', badgeClass: 'badge-dark' };
    }
}

// 获取操作按钮
function getActionButton(order) {
    const status = parseInt(order.status);
    const orderId = order.orderId || order.id;
    
    if (status === 0) {
        return `<button class="btn btn-sm btn-danger cancel-btn" data-id="${orderId}">取消订单</button>`;
    } else if (status === 1) {
        return `<button class="btn btn-sm btn-primary ship-btn" data-id="${orderId}">去发货</button>`;
    }
    
    return '';
}

// 绑定操作按钮事件
function bindActionButtons() {
    // 取消订单
    $('.cancel-btn').click(function() {
        const orderId = $(this).data('id');
        cancelOrder(orderId);
    });
    
    // 发货
    $('.ship-btn').click(function() {
        const orderId = $(this).data('id');
        shipOrder(orderId);
    });
    
    // 删除订单
    $('.delete-btn').click(function() {
        const orderId = $(this).data('id');
        deleteOrder(orderId);
    });
    
    // 批量删除
    $('#batch-delete-btn').click(function() {
        const selectedIds = getSelectedOrderIds();
        if (selectedIds.length > 0) {
            batchDeleteOrders(selectedIds);
        } else {
            showErrorMessage('请至少选择一个订单进行删除');
        }
    });
}

// 绑定复选框事件
function bindCheckboxEvents() {
    // 全选/取消全选
    $('#select-all').change(function() {
        const isChecked = $(this).prop('checked');
        $('.order-checkbox').prop('checked', isChecked);
        updateBatchDeleteButton();
    });
    
    // 单个复选框变化
    $('.order-checkbox').change(function() {
        updateBatchDeleteButton();
        
        // 检查是否所有复选框都被选中
        const allChecked = $('.order-checkbox').length === $('.order-checkbox:checked').length;
        $('#select-all').prop('checked', allChecked);
    });
    
    // 初始状态更新批量删除按钮
    updateBatchDeleteButton();
}

// 更新批量删除按钮显示状态
function updateBatchDeleteButton() {
    const hasChecked = $('.order-checkbox:checked').length > 0;
    if (hasChecked) {
        $('#batch-delete-btn').show();
    } else {
        $('#batch-delete-btn').hide();
    }
}

// 删除单个订单
async function deleteOrder(orderId) {
    showConfirmModal('确定要删除该订单吗？此操作不可恢复！', async () => {
        try {
            await fetchAPI(`/api/order/admin/delete/${orderId}`, { method: 'DELETE' });
            showSuccessMessage('订单已删除');
            loadOrders(); // 重新加载订单列表
        } catch (error) {
            console.error('删除订单失败:', error);
            showErrorMessage('删除订单失败: ' + error.message);
        }
    });
}

// 批量删除订单
async function batchDeleteOrders(orderIds) {
    showConfirmModal(`确定要删除选中的 ${orderIds.length} 个订单吗？此操作不可恢复！`, async () => {
        try {
            await fetchAPI('/api/order/admin/batch-delete', { 
                method: 'POST',
                body: JSON.stringify({ orderIds: orderIds })
            });
            showSuccessMessage(`已成功删除 ${orderIds.length} 个订单`);
            loadOrders(); // 重新加载订单列表
        } catch (error) {
            console.error('批量删除订单失败:', error);
            showErrorMessage('批量删除订单失败: ' + error.message);
        }
    });
}

// 取消订单
async function cancelOrder(orderId) {
    showConfirmModal('确定要取消该订单吗？', async () => {
        try {
            await fetchAPI(`/api/order/admin/cancel/${orderId}`, { method: 'POST' });
            showSuccessMessage('订单已取消');
            loadOrders();
        } catch (error) {
            console.error('取消订单失败:', error);
            showErrorMessage('取消订单失败: ' + error.message);
        }
    });
}

// 发货
async function shipOrder(orderId) {
    showConfirmModal('确定要发货吗？', async () => {
        try {
            await fetchAPI(`/api/order/admin/ship/${orderId}`, { method: 'POST' });
            showSuccessMessage('发货成功');
            loadOrders();
        } catch (error) {
            console.error('发货失败:', error);
            showErrorMessage('发货失败: ' + error.message);
        }
    });
}

// 渲染分页控件
function renderPagination() {
    if (totalPages <= 1) {
        $('#pagination').empty();
        return;
    }
    
    let html = '';
    
    // 上一页按钮
    html += `
        <li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
            <a class="page-link" href="javascript:void(0)" data-page="${currentPage - 1}">&laquo;</a>
        </li>
    `;
    
    // 页码按钮
    const startPage = Math.max(1, currentPage - 2);
    const endPage = Math.min(totalPages, startPage + 4);
    
    for (let i = startPage; i <= endPage; i++) {
        html += `
            <li class="page-item ${i === currentPage ? 'active' : ''}">
                <a class="page-link" href="javascript:void(0)" data-page="${i}">${i}</a>
            </li>
        `;
    }
    
    // 下一页按钮
    html += `
        <li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
            <a class="page-link" href="javascript:void(0)" data-page="${currentPage + 1}">&raquo;</a>
        </li>
    `;
    
    $('#pagination').html(html);
    
    // 绑定分页按钮点击事件
    $('.page-link').click(function() {
        if (!$(this).parent().hasClass('disabled') && !$(this).parent().hasClass('active')) {
            currentPage = parseInt($(this).data('page'));
            loadOrders();
        }
    });
}

// 获取选中的订单ID
function getSelectedOrderIds() {
    const selectedIds = [];
    $('.order-checkbox:checked').each(function() {
        selectedIds.push($(this).data('id'));
    });
    
    if (selectedIds.length === 0) {
        showErrorMessage('请至少选择一个订单');
        return;
    }
    
    batchDeleteOrders(selectedIds);
}