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
let pageSizeOptions = [5, 10, 20, 50]; // 分页大小选项

// 初始化订单页面
function initOrdersPage() {
    // 加载第一页订单数据
    loadOrders(1);

    // 绑定搜索按钮事件
    $('#search-btn').click(function() {
        const keyword = $('#search-input').val().trim();
        if (keyword) {
            window.location.href = `/pages/client/products.html?name=${encodeURIComponent(keyword)}`;
        }
    });
    
    // 绑定搜索框回车事件
    $('#search-input').keypress(function(e) {
        if (e.which === 13) {
            const keyword = $(this).val().trim();
            if (keyword) {
                window.location.href = `/pages/client/products.html?name=${encodeURIComponent(keyword)}`;
            }
        }
    });

    // 绑定退出登录按钮事件
    $('#logout-btn').click(logout);
    
    // 绑定分页大小选择器事件
    $('#page-size-selector').change(function() {
        pageSize = parseInt($(this).val());
        currentPage = 1; // 切换每页条数时重置为第一页
        loadOrders(1);
    });
    
    // 绑定页码跳转事件
    $('#goto-page-btn').click(function() {
        const pageNum = parseInt($('#goto-page-input').val());
        if (pageNum && pageNum > 0 && pageNum <= totalPages) {
            loadOrders(pageNum);
        } else {
            showErrorMessage(`请输入有效的页码 (1-${totalPages})`);
        }
    });
    
    // 初始化分页大小选择器
    initPageSizeSelector();
}

// 初始化分页大小选择器
function initPageSizeSelector() {
    const pageSizeSelector = $('#page-size-selector');
    pageSizeSelector.empty();
    
    // 添加选项
    pageSizeOptions.forEach(size => {
        pageSizeSelector.append(`<option value="${size}"${size === pageSize ? ' selected' : ''}>${size}条/页</option>`);
    });
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
        // 构建API请求参数 - 根据RESTful接口规范调整
        const params = new URLSearchParams();
        params.append('page', page);
        params.append('size', pageSize);
        
        // 添加状态过滤 - 直接在API请求中添加状态过滤参数
        if (statusFilter !== undefined && statusFilter !== null && statusFilter !== 'all') {
            params.append('status', statusFilter);
        }
        
        // 添加搜索查询
        if (searchQuery) {
            params.append('keyword', encodeURIComponent(searchQuery));
        }
        
        const apiUrl = `/api/client/orders?${params.toString()}`;
        console.log('请求订单列表URL:', apiUrl);
        
        // 获取认证Token
        const token = localStorage.getItem('token');
        const headers = {
            'Content-Type': 'application/json'
        };
        
        // 添加认证头
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        
        // 发送API请求
        const response = await fetchAPI(apiUrl, {
            method: 'GET',
            headers: headers
        });
        
        // 更新分页信息
        totalPages = response.totalPages || 1;
        
        // 获取订单列表
        let orders = response.content || [];
        
        // 如果后端API没有正确处理状态过滤，在前端进行过滤
        if (statusFilter !== undefined && statusFilter !== null && statusFilter !== 'all') {
            orders = orders.filter(order => parseInt(order.status) === parseInt(statusFilter));
            console.log(`前端过滤状态 ${statusFilter}，过滤后订单数量: ${orders.length}`);
        }
        
        // 为每个订单获取详细信息（包括订单项）
        const ordersWithDetails = await Promise.all(orders.map(async (order) => {
            // 如果订单已经有订单项数据，则直接返回
            if ((order.orderItems && order.orderItems.length > 0) || (order.items && order.items.length > 0)) {
                return order;
            }
            
            try {
                // 使用订单UUID获取详细信息
                const orderUuid = order.orderUuid;
                if (!orderUuid) {
                    console.warn('订单缺少UUID，无法获取详细信息:', order);
                    return order;
                }
                
                // 构建订单详情API URL
                const detailUrl = `/api/client/orders/${orderUuid}`;
                console.log(`获取订单[${order.orderNo}]详情:`, detailUrl);
                
                // 发送请求获取订单详情
                const detailResponse = await fetchAPI(detailUrl, {
                    method: 'GET',
                    headers: headers
                });
                
                // 检查API响应格式
                if (detailResponse && detailResponse.data) {
                    // 如果API返回包含data字段，使用data中的数据
                    const orderDetail = detailResponse.data;
                    console.log(`成功获取订单[${order.orderNo}]详情:`, orderDetail);
                    
                    // 合并订单详情数据到原订单对象
                    return {
                        ...order,
                        orderItems: orderDetail.orderItems || [],
                        items: orderDetail.items || orderDetail.orderItems || [],
                        totalQuantity: orderDetail.totalQuantity || calculateTotalQuantity(orderDetail.orderItems)
                    };
                } else {
                    // 如果API直接返回订单对象
                    console.log(`成功获取订单[${order.orderNo}]详情:`, detailResponse);
                    return {
                        ...order,
                        orderItems: detailResponse.orderItems || [],
                        items: detailResponse.items || detailResponse.orderItems || [],
                        totalQuantity: detailResponse.totalQuantity || calculateTotalQuantity(detailResponse.orderItems)
                    };
                }
            } catch (error) {
                console.error(`获取订单[${order.orderNo}]详情失败:`, error);
                return order; // 出错时返回原始订单数据
            }
        }));
        
        // 渲染订单列表（使用包含详情的订单数据）
        renderOrders(ordersWithDetails);
        
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

// 计算订单项总数量
function calculateTotalQuantity(orderItems) {
    if (!orderItems || !Array.isArray(orderItems)) {
        return 0;
    }
    return orderItems.reduce((total, item) => total + (parseInt(item.quantity) || 0), 0);
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
    
    // 添加CSS样式
    if (!$('#order-styles').length) {
        $('head').append(`
            <style id="order-styles">
                .product-image-tiny {
                    width: 40px;
                    height: 40px;
                    object-fit: cover;
                    border-radius: 4px;
                    border: 1px solid #eee;
                }
                .order-products .table {
                    margin-bottom: 0;
                }
                .order-products .table td, .order-products .table th {
                    vertical-align: middle;
                    padding: 0.5rem;
                    border-top: 1px solid rgba(0,0,0,.05);
                }
                .order-products .table thead th {
                    background-color: #f8f9fa;
                    border-bottom: 1px solid #dee2e6;
                    font-weight: 500;
                    font-size: 0.9rem;
                }
                .order-products .table tbody tr:first-child td {
                    border-top: none;
                }
                .order-body {
                    padding: 0.5rem 1rem;
                }
                .order-products .table th:nth-child(1),
                .order-products .table td:nth-child(1) {
                    width: 50%;
                    text-align: left;
                }
                .order-products .table th:nth-child(2),
                .order-products .table td:nth-child(2),
                .order-products .table th:nth-child(3),
                .order-products .table td:nth-child(3) {
                    width: 15%;
                    text-align: center;
                }
                .order-products .table th:nth-child(4),
                .order-products .table td:nth-child(4) {
                    width: 20%;
                    text-align: right;
                    font-weight: bold;
                }
            </style>
        `);
    }
    
    // 添加调试函数，输出订单数据结构
    function logOrderData(order) {
        console.log('订单数据:', order);
        console.log('订单号:', order.orderNo || order.orderNumber);
        // 检查订单项数据是否存在
        const orderItems = order.orderItems || order.items || [];
        console.log('订单项数据:', orderItems);
        console.log('订单项数量:', orderItems.length);
        console.log('订单总金额:', order.totalAmount);
        console.log('订单总数量:', order.totalQuantity);
    }
    
    let html = '';
    
    orders.forEach(order => {
        // 调试输出订单数据
        logOrderData(order);
        
        // 渲染订单商品项
        let itemsHtml = '';
        if (order.items && order.items.length > 0) {
            order.items.forEach(item => {
                // 确保价格大于0，优先使用productPrice字段
                const price = (item.productPrice && item.productPrice > 0) ? item.productPrice : 
                             (item.price && item.price > 0) ? item.price : 
                             (item.product && item.product.productPrice) ? item.product.productPrice : 
                             (item.product && item.product.price) ? item.product.price : 0;
                // 商品图片URL - 修复图片加载问题
                const productId = item.productId || (item.product && item.product.productId) || (item.product && item.product.id);
                let imageUrl = '/images/default-product.jpg';
                // 添加Token到图片URL
                if (productId) {
                    // 根据ProductController中的图片获取接口构建URL
                    imageUrl = `/api/products/${productId}/image`;
                    const token = localStorage.getItem('token');
                    if (token) {
                        // 确保token正确编码，避免特殊字符问题
                        const encodedToken = encodeURIComponent(token.trim());
                        imageUrl = `${imageUrl}?token=${encodedToken}`;
                    }
                    console.log('订单项商品图片URL:', imageUrl);
                }
                
                itemsHtml += `
                    <div class="d-flex align-items-center mb-2">
                        <img src="${imageUrl}" alt="${item.productName}" class="product-image-tiny mr-2" 
                            onerror="this.onerror=null; this.src='/images/default-product.jpg'; console.log('商品图片加载失败，使用默认图片');">
                        <div>
                            <div>${item.productName || (item.product ? item.product.productName || item.product.name : '未知商品')}</div>
                            <div class="text-muted small">
                                ${formatCurrency(price)} × ${item.quantity} = ${formatCurrency(price * item.quantity)}
                            </div>
                        </div>
                    </div>
                `;
            });
        } else if (order.orderItems && order.orderItems.length > 0) {
            // 兼容不同的API返回格式
            order.orderItems.forEach(item => {
                const product = item.product || {};
                const productName = product.name || item.productName || '未知商品';
                // 修复商品单价显示问题，确保优先使用productPrice字段
                const price = (item.productPrice && item.productPrice > 0) ? item.productPrice : 
                             (item.price && item.price > 0) ? item.price : 
                             (product.productPrice) ? product.productPrice : 
                             (product.price || 0);
                const quantity = item.quantity || 1;
                
                // 商品图片URL
                const productId = item.productId || (product ? product.productId : null);
                let imageUrl = productId ? `/api/products/${productId}/image` : '/images/default-product.jpg';
                // 添加Token到图片URL
                if (productId) {
                    const token = localStorage.getItem('token');
                    if (token) {
                        const encodedToken = encodeURIComponent(token.trim());
                        imageUrl = `${imageUrl}?token=${encodedToken}`;
                    }
                }
                
                itemsHtml += `
                    <div class="d-flex align-items-center mb-2">
                        <img src="${imageUrl}" alt="${productName}" class="product-image-tiny mr-2" 
                            onerror="this.onerror=null; this.src='/images/default-product.jpg'; console.log('商品图片加载失败，使用默认图片');">
                        <div>
                            <div>${productName}</div>
                            <div class="text-muted small">
                                ${formatCurrency(price)} × ${quantity} = ${formatCurrency(price * quantity)}
                            </div>
                        </div>
                    </div>
                `;
            });
        } else {
            itemsHtml = '<div class="text-muted">暂无商品信息</div>';
        }
        
        // 获取订单状态文本
        const statusText = getStatusText(order.status);
        console.log('订单状态:', order.status, '状态文本:', statusText);
        
        // 构建订单产品列表HTML
        let productsHtml = '';
        let totalQuantity = 0; // 用于计算商品总数量
        
        // 修复：检查orderItems字段，同时兼容items字段（后端可能使用不同字段名）
        // 确保orderItems是一个数组，即使是空数组
        const orderItems = order.orderItems || order.items || [];
        console.log('订单号:', order.orderNo, '订单项数据:', orderItems.length > 0 ? orderItems[0] : '无订单项');
        
        // 创建商品列表容器 - 使用表格形式，参照订单详情页的实现，添加表头提高可读性
        productsHtml = '<div class="order-products"><div class="table-responsive"><table class="table table-sm mb-0">';
        // 添加表头
        productsHtml += `
            <thead class="thead-light">
                <tr>
                    <th>商品</th>
                    <th>单价</th>
                    <th>数量</th>
                    <th>小计</th>
                </tr>
            </thead>
            <tbody>`;
        console.log('订单项数据类型:', typeof orderItems, '长度:', orderItems.length, '内容:', JSON.stringify(orderItems));
        
        // 检查是否有订单项 - 确保即使只有一个订单项也能正确显示
        if (orderItems && Array.isArray(orderItems) && orderItems.length > 0) {
            orderItems.forEach(item => {
                const product = item.product || {};
                // 修复商品名称显示问题，参考订单详情页的实现
                const productName = item.productName;
                // 修复商品单价显示问题，确保优先使用productPrice字段
                const price = item.productPrice;
                // 修复商品数量显示问题，确保正确获取数量
                const quantity = item.quantity || 1;
                
                totalQuantity += quantity;
                
                // 修复商品ID获取逻辑，确保能正确获取商品ID
                const productId = item.productId;
                // 构建图片URL，确保添加token参数
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
                
                // 使用表格行展示商品信息，参照订单详情页的实现
                productsHtml += `
                    <tr>
                        <td>
                            <div class="d-flex align-items-center">
                                <img src="${imageUrl}" alt="${productName}" class="product-image-tiny mr-2" 
                                    onerror="this.onerror=null; this.src='/images/default-product.jpg'; console.log('商品图片加载失败，使用默认图片');">
                                <span>${productName}</span>
                            </div>
                        </td>
                        <td>${formatCurrency(price)}</td>
                        <td>${quantity}</td>
                        <td>${formatCurrency(price * quantity)}</td>
                    </tr>
                `;
            });
        } else if (order.totalAmount) {
            // 如果没有订单项详情，但有订单总金额，创建一个默认的订单项行
            // 这种情况应该很少发生，因为我们已经在loadOrders中获取了详细订单信息
            // 但为了保险起见，仍然保留此逻辑作为后备方案
            
            // 记录警告信息
            console.warn('订单缺少订单项数据，但有总金额:', order.orderNo, order.totalAmount);
            
            // 使用默认商品名称
            let productName = '商品信息';
            
            // 尝试从订单中获取商品ID，用于后续获取商品详情
            const productId = order.productId || 
                             (order.product ? order.product.productId : null) || 
                             (order.productInfo ? order.productInfo.productId : null);
            
            // 如果有商品ID，尝试从API获取商品名称
            if (productId) {
                try {
                    // 使用商品ID构建API URL
                    const apiUrl = `/api/products/${productId}`;
                    // 发送同步请求获取商品信息
                    $.ajax({
                        url: apiUrl,
                        type: 'GET',
                        async: false,
                        headers: {
                            'Authorization': `Bearer ${localStorage.getItem('token')}`
                        },
                        success: function(data) {
                            if (data && data.productName) {
                                productName = data.productName;
                                console.log('成功获取商品名称:', productName);
                            }
                        },
                        error: function(err) {
                            console.error('获取商品信息失败:', err);
                        }
                    });
                } catch (error) {
                    console.error('获取商品信息时发生错误:', error);
                }
            }
            
            // 如果无法从API获取，则尝试从订单对象中获取
            if (!productName) {
                productName = order.productName || 
                           (order.product ? order.product.productName || order.product.name : null) || 
                           (order.productInfo ? order.productInfo.productName || order.productInfo.name : null) || 
                           (order.orderItems && order.orderItems.length > 0 ? order.orderItems[0].productName : null) ||
                           '商品信息'; // 使用默认名称作为最后的选择
            }
            
            const price = order.totalAmount || 0; // 使用订单总金额作为价格
            const quantity = order.totalQuantity || 1; // 使用订单总数量或默认为1
            totalQuantity = quantity;
            
            // 尝试获取商品图片，如果没有则使用默认图片
            // 使用前面已经获取的商品ID
            let imageUrl = '/images/default-product.jpg';
            // 如果有商品ID，构建正确的图片URL
            if (productId) {
                // 根据ProductController中的图片获取接口构建URL
                imageUrl = `/api/products/${productId}/image`;
                // 添加Token到图片URL以通过认证
                const token = localStorage.getItem('token');
                if (token) {
                    // 确保token正确编码，避免特殊字符问题
                    const encodedToken = encodeURIComponent(token.trim());
                    imageUrl = `${imageUrl}?token=${encodedToken}`;
                }
                console.log('商品图片URL:', imageUrl);
            }
            
            // 记录使用默认订单项的情况
            console.warn('使用订单总金额创建默认订单项，总金额:', order.totalAmount, '总数量:', quantity);
            
            // 创建一个商品行 - 按照预期效果格式化（不要表头）
            // 确保商品名称不为空，如果为空则尝试从订单项中获取
            if (!productName || productName === '商品信息') {
                // 再次尝试从订单项中获取商品名称
                if (order.orderItems && order.orderItems.length > 0 && order.orderItems[0].productName) {
                    productName = order.orderItems[0].productName;
                } else if (order.orderItems && order.orderItems.length > 0 && order.orderItems[0].product && order.orderItems[0].product.productName) {
                    productName = order.orderItems[0].product.productName;
                }
            }
            
            productsHtml += `
                <tr>
                    <td>
                        <div class="d-flex align-items-center">
                            <img src="${imageUrl}" alt="${productName}" class="product-image-tiny mr-2" 
                                onerror="this.onerror=null; this.src='/images/default-product.jpg'; console.log('商品图片加载失败，使用默认图片');">
                            <span>${productName}</span>
                        </div>
                    </td>
                    <td>${formatCurrency(price)}</td>
                    <td>${quantity}</td>
                    <td>${formatCurrency(price * quantity)}</td>
                </tr>
            `;
            
            // 调试输出
            console.log('渲染商品行:', {
                productId: productId,
                productName: productName,
                imageUrl: imageUrl,
                price: price,
                quantity: quantity
            });
            
            // 确保不显示默认提示信息
            totalQuantity = quantity;
            console.log('使用订单总金额创建默认订单项，总金额:', price, '总数量:', quantity);
        } else {
            productsHtml += `
                <tr>
                    <td colspan="4">
                        <div class="alert alert-info mb-0">
                            <p>订单包含 ${order.totalQuantity || 0} 件商品，总金额 ¥${(order.totalAmount || 0).toFixed(2)}</p>
                            <p class="mb-0">点击"查看详情"按钮查看完整订单信息</p>
                        </div>
                    </td>
                </tr>
            `;
            totalQuantity = order.totalQuantity || 0;
            console.log('没有订单项，在表格中显示提示信息，总数量:', totalQuantity);
        }
        
        productsHtml += '</tbody></table></div></div>';
        
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
                            <span>共${totalQuantity}件商品</span>
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
    
    // 添加CSS样式
    if (!$('#order-styles').length) {
        $('head').append(`
            <style id="order-styles">
                .product-image-tiny {
                    width: 40px;
                    height: 40px;
                    object-fit: cover;
                    border-radius: 4px;
                }
                .order-products .table {
                    margin-bottom: 0;
                }
                .order-products .table td, .order-products .table th {
                    vertical-align: middle;
                    padding: 0.5rem;
                    border-top: 1px solid rgba(0,0,0,.05);
                }
                .order-products .table thead th {
                    background-color: #f8f9fa;
                    border-bottom: 1px solid #dee2e6;
                    font-weight: 500;
                    font-size: 0.9rem;
                }
                .order-products .table tbody tr:first-child td {
                    border-top: none;
                }
                .order-body {
                    padding: 0.5rem 1rem;
                }
                .order-products .table th:nth-child(1),
                .order-products .table td:nth-child(1) {
                    width: 50%;
                    text-align: left;
                }
                .order-products .table th:nth-child(2),
                .order-products .table td:nth-child(2),
                .order-products .table th:nth-child(3),
                .order-products .table td:nth-child(3) {
                    width: 15%;
                    text-align: center;
                }
                .order-products .table th:nth-child(4),
                .order-products .table td:nth-child(4) {
                    width: 20%;
                    text-align: right;
                    font-weight: bold;
                }
                .order-card {
                    margin-bottom: 1.5rem;
                    border: 1px solid rgba(0,0,0,.125);
                    border-radius: .25rem;
                }
                .order-header, .order-footer {
                    padding: 0.75rem 1.25rem;
                    background-color: rgba(0,0,0,.03);
                }
                .order-header {
                    border-bottom: 1px solid rgba(0,0,0,.125);
                }
                .order-footer {
                    border-top: 1px solid rgba(0,0,0,.125);
                }
            </style>
        `);
    }
    
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
            await fetchAPI(`/api/client/orders/${orderUuid}/pay`, { method: 'POST' });
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
            await fetchAPI(`/api/client/orders/${orderUuid}/cancel`, { method: 'POST' });
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
            await fetchAPI(`/api/client/orders/${orderUuid}/confirm`, { method: 'POST' });
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
    
    // 更新页码输入框的最大值和当前值
    $('#goto-page-input').attr('max', totalPages).val(currentPage);
    
    // 更新页面显示的分页信息
    $('#current-page').text(currentPage);
    $('#total-pages').text(totalPages);
    
    // 更新分页大小选择器
    $('#page-size-selector').val(pageSize);
    
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