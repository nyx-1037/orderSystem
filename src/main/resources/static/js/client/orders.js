// 订单管理页面脚本
$(document).ready(function() {
    // 检查登录状态
    checkLoginStatus().then(isLoggedIn => {
        if (isLoggedIn) {
            // 初始化页面
            initOrdersPage();
            
            // 绑定状态过滤按钮点击事件
            $('.status-filter').click(function() {
                $('.status-filter').removeClass('active');
                $(this).addClass('active');
                // 重置到第一页并加载订单
                currentPage = 1;
                loadOrders(1);
                
                // 输出调试信息
                console.log('筛选状态:', $(this).data('status'));
            });
        }
    });
});

// 页面变量
let currentPage = 1;
let totalPages = 1;
let pageSize = 5;

// 初始化订单页面
function initOrdersPage() {
    // 加载第一页订单数据
    loadOrders(1);

    // 绑定搜索按钮事件
    $('#search-btn').click(function() {
        loadOrders(1);
    });

    // 绑定退出登录按钮事件
    $('#logout-btn').click(logout);
}

// 加载订单数据
async function loadOrders(page) {
    currentPage = page;
    const searchQuery = $('#search-input').val();
    const statusFilter = $('.status-filter.active').data('status');
    
    // 显示加载中状态
    $('#orders-container').html(`
        <div class="text-center">
            <div class="spinner-border" role="status">
                <span class="sr-only">加载中...</span>
            </div>
            <p>正在加载订单...</p>
        </div>
    `);
    
    try {
        // 构建API请求参数
        let apiUrl = `/api/order/list?pageNum=${page}&pageSize=${pageSize}`;
        
        // 添加状态过滤 - 直接在API请求中添加状态过滤参数
        if (statusFilter !== undefined && statusFilter !== null && statusFilter !== 'all') {
            apiUrl += `&status=${statusFilter}`;
        }
        
        // 添加搜索查询
        if (searchQuery) {
            apiUrl += `&search=${encodeURIComponent(searchQuery)}`;
        }
        
        console.log('请求订单列表URL:', apiUrl);
        
        // 发送API请求
        const response = await fetchAPI(apiUrl);
        
        // 更新分页信息
        totalPages = response.pages || 1;
        
        // 获取订单列表
        let orders = response.list || [];
        
        // 如果后端API没有正确处理状态过滤，在前端进行过滤
        if (statusFilter !== undefined && statusFilter !== null && statusFilter !== 'all') {
            orders = orders.filter(order => parseInt(order.status) === parseInt(statusFilter));
            console.log(`前端过滤状态 ${statusFilter}，过滤后订单数量: ${orders.length}`);
        }
        
        // 渲染订单列表
        renderOrders(orders);
        
        // 渲染分页控件
        renderPagination();
    } catch (error) {
        console.error('加载订单失败:', error);
        showErrorMessage('加载订单失败: ' + error.message);
        
        // 显示空订单列表
        $('#orders-container').html(`
            <div class="alert alert-warning">
                <i class="fas fa-exclamation-triangle mr-2"></i>
                加载订单失败，请稍后重试
            </div>
        `);
    }
}

// 渲染订单列表
function renderOrders(orders) {
    if (orders.length === 0) {
        $('#orders-container').html(`
            <div class="alert alert-info">
                <i class="fas fa-info-circle mr-2"></i>
                暂无订单数据
            </div>
        `);
        return;
    }
    
    let html = '';
    
    orders.forEach(order => {
        // 获取订单状态文本
        const statusText = getStatusText(order.status);
        
        // 构建订单产品列表HTML
        let productsHtml = '';
        // 添加空值检查，防止orderItems为null时调用forEach方法
        if (order.orderItems && Array.isArray(order.orderItems) && order.orderItems.length > 0) {
            order.orderItems.forEach(item => {
                // 确保item.product存在
                const product = item.product || {};
                const productName = product.name || item.productName || '未知商品';
                const productPrice = item.price || product.price || 0;
                // 处理商品图片URL，确保添加认证Token
                let productImage = product.imageUrl || `/api/product/${product.productId}/image` || '/images/default-product.jpg';
                // 如果是API请求图片，确保添加Token
                if (productImage.startsWith('/api/')) {
                    const token = localStorage.getItem('token');
                    if (token) {
                        // 确保token正确编码，避免特殊字符问题
                        const encodedToken = encodeURIComponent(token.trim());
                        productImage = `${productImage}?token=${encodedToken}`;
                    }
                }
                
                productsHtml += `
                    <div class="order-product d-flex">
                        <img src="${productImage}" alt="${productName}" class="product-image-small" 
                             onerror="this.onerror=null; this.src='/images/default-product.jpg'; console.log('商品图片加载失败，使用默认图片');">
                        <div class="ml-3 flex-grow-1">
                            <div class="d-flex justify-content-between">
                                <h6>${productName}</h6>
                                <span class="product-price">¥${parseFloat(productPrice).toFixed(2)}</span>
                            </div>
                            <p class="text-muted">数量: ${item.quantity || 1}</p>
                        </div>
                    </div>
                `;
            });
        } else {
            // 如果没有订单项，显示简要信息
            productsHtml = `
                <div class="alert alert-info">
                    <p>订单包含 ${order.totalQuantity || 0} 件商品，总金额 ¥${(order.totalAmount || 0).toFixed(2)}</p>
                    <p>点击"查看详情"按钮查看完整订单信息</p>
                </div>
            `;
        }
        
        // 构建订单操作按钮
        const actionButtons = getActionButtons(order);
        
        // 获取订单ID
        const orderUuid = order.orderUuid || order.uuid || '';
        
        // 构建完整的订单卡片HTML
        html += `
            <div class="order-card" data-order-uuid="${orderUuid}">
                <div class="order-header d-flex justify-content-between align-items-center">
                    <div>
                        <span class="font-weight-bold">订单号: ${order.orderNo || order.orderNumber || '未知'}</span>
                        <span class="order-status status-${order.status}">${statusText}</span>
                    </div>
                    <div class="text-muted">${formatDate(order.createTime)}</div>
                </div>
                <div class="order-body">
                    ${productsHtml}
                </div>
                <div class="order-footer d-flex justify-content-between align-items-center">
                    <div>
                        <span>收货人: ${order.receiver || order.receiverName || '未知'}</span>
                        <span class="ml-3">电话: ${order.receiverPhone || '未知'}</span>
                    </div>
                    <div class="d-flex align-items-center">
                        <div class="mr-3">
                            <span>共${order.totalQuantity || 0}件商品</span>
                            <span class="ml-2 total-price">¥${(order.totalAmount || 0).toFixed(2)}</span>
                        </div>
                        <div>
                            ${actionButtons}
                        </div>
                    </div>
                </div>
            </div>
        `;
    });
    
    $('#orders-container').html(html);
    
    // 绑定订单操作按钮事件
    bindOrderActionEvents();
}

// 获取订单状态文本
function getStatusText(status) {
    const statusMap = {
        0: '待付款',
        1: '已付款',
        2: '已发货',
        3: '已完成',
        4: '已取消'
    };
    return statusMap[status] || '未知状态';
}

// 获取订单操作按钮
function getActionButtons(order) {
    let buttons = '';
    // 确保使用orderUuid作为订单ID
    const orderUuid = order.orderUuid || order.uuid || '';
    
    switch (parseInt(order.status)) {
        case 0: // 待付款
            buttons = `
                <button class="btn btn-sm btn-primary pay-order-btn" data-order-uuid="${orderUuid}">立即付款</button>
                <button class="btn btn-sm btn-outline-secondary ml-2 cancel-order-btn" data-order-uuid="${orderUuid}">取消订单</button>
            `;
            break;
        case 1: // 已付款
            buttons = `
                <button class="btn btn-sm btn-outline-secondary view-order-btn" data-order-uuid="${orderUuid}">查看详情</button>
            `;
            break;
        case 2: // 已发货
            buttons = `
                <button class="btn btn-sm btn-success confirm-receipt-btn" data-order-uuid="${orderUuid}">确认收货</button>
                <button class="btn btn-sm btn-outline-secondary ml-2 view-order-btn" data-order-uuid="${orderUuid}">查看详情</button>
            `;
            break;
        case 3: // 已完成
        case 4: // 已取消
            buttons = `
                <button class="btn btn-sm btn-outline-secondary view-order-btn" data-order-uuid="${orderUuid}">查看详情</button>
            `;
            break;
        default:
            buttons = `
                <button class="btn btn-sm btn-outline-secondary view-order-btn" data-order-uuid="${orderUuid}">查看详情</button>
            `;
    }
    
    return buttons;
}

// 绑定订单操作按钮事件
function bindOrderActionEvents() {
    // 支付订单
    $('.pay-order-btn').click(function() {
        const orderUuid = $(this).data('order-uuid');
        payOrder(orderUuid);
    });
    
    // 取消订单
    $('.cancel-order-btn').click(function() {
        const orderUuid = $(this).data('order-uuid');
        cancelOrder(orderUuid);
    });
    
    // 确认收货
    $('.confirm-receipt-btn').click(function() {
        const orderUuid = $(this).data('order-uuid');
        confirmReceipt(orderUuid);
    });
    
    // 查看订单详情
    $('.view-order-btn').click(function() {
        const orderUuid = $(this).data('order-uuid');
        window.location.href = `/pages/client/order-detail.html?uuid=${orderUuid}`;
    });
}


// 支付订单
async function payOrder(orderUuid) {
    showConfirmModal('确定要支付此订单吗？', async () => {
        try {
            await fetchAPI(`/api/order/pay/${orderUuid}`, { method: 'POST' });
            showSuccessMessage('订单支付成功');
            loadOrders(currentPage);
        } catch (error) {
            console.error('订单支付失败:', error);
            showErrorMessage('订单支付失败: ' + error.message);
        }
    });
}

// 取消订单
async function cancelOrder(orderUuid) {
    showConfirmModal('确定要取消此订单吗？', async () => {
        try {
            await fetchAPI(`/api/order/cancel/${orderUuid}`, { method: 'POST' });
            showSuccessMessage('订单已取消');
            loadOrders(currentPage);
        } catch (error) {
            console.error('取消订单失败:', error);
            showErrorMessage('取消订单失败: ' + error.message);
        }
    });
}

// 确认收货
async function confirmReceipt(orderUuid) {
    showConfirmModal('确认已收到商品吗？', async () => {
        try {
            await fetchAPI(`/api/order/confirm/${orderUuid}`, { method: 'POST' });
            showSuccessMessage('已确认收货');
            loadOrders(currentPage);
        } catch (error) {
            console.error('确认收货失败:', error);
            showErrorMessage('确认收货失败: ' + error.message);
        }
    });
}

// 显示确认模态框
function showConfirmModal(message, confirmCallback) {
    // 检查是否已存在确认模态框，如果不存在则创建
    if ($('#confirmModal').length === 0) {
        const modalHtml = `
        <div class="modal fade" id="confirmModal" tabindex="-1" role="dialog" aria-labelledby="confirmModalLabel" aria-hidden="true">
            <div class="modal-dialog" role="document">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title" id="confirmModalLabel">确认操作</h5>
                        <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                            <span aria-hidden="true">&times;</span>
                        </button>
                    </div>
                    <div class="modal-body">
                        <p id="confirmMessage"></p>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-dismiss="modal">取消</button>
                        <button type="button" class="btn btn-primary" id="confirmActionBtn">确认</button>
                    </div>
                </div>
            </div>
        </div>
        `;
        $('body').append(modalHtml);
    }
    
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

// 查看订单详情函数（已通过view-order-btn按钮的点击事件处理）
// 此函数保留但不再使用
function viewOrderDetail(orderUuid) {
    // 跳转到订单详情页面
    window.location.href = `/pages/order/detail.html?uuid=${orderUuid}`;
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
            <a class="page-link" href="javascript:void(0)" data-page="${currentPage - 1}" aria-label="上一页">
                <span aria-hidden="true">&laquo;</span>
            </a>
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
            <a class="page-link" href="javascript:void(0)" data-page="${currentPage + 1}" aria-label="下一页">
                <span aria-hidden="true">&raquo;</span>
            </a>
        </li>
    `;
    
    $('#pagination').html(html);
    
    // 绑定分页按钮点击事件
    $('.page-link').click(function() {
        if (!$(this).parent().hasClass('disabled') && !$(this).parent().hasClass('active')) {
            const page = parseInt($(this).data('page'));
            loadOrders(page);
        }
    });
}

// 格式化日期
function formatDate(dateString) {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    
    return `${year}-${month}-${day} ${hours}:${minutes}`;
}

// 显示成功消息
function showSuccessMessage(message) {
    $('#success-message').text(message).fadeIn();
    setTimeout(() => {
        $('#success-message').fadeOut();
    }, 3000);
}

// 显示错误消息
function showErrorMessage(message) {
    $('#error-message').text(message).fadeIn();
    setTimeout(() => {
        $('#error-message').fadeOut();
    }, 3000);
}