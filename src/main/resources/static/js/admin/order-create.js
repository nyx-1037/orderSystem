/**
 * 管理员订单创建页面脚本
 */

// 全局变量
let currentPage = 1;
const pageSize = 8;
let totalPages = 0;
let isLoading = false;
let hasNextPage = true;
let searchParams = {};
let selectedProducts = [];

// 页面加载完成后执行
$(document).ready(function() {
    // 检查管理员登录状态
    checkAdminLoginStatus().then(function(isLoggedIn) {
        if (isLoggedIn) {
            // 初始化页面
            initPage();
            
            // 绑定事件
            bindEvents();
            
            // 加载商品数据
            loadProducts();
        }
    });
});

/**
 * 检查管理员登录状态
 */
async function checkAdminLoginStatus() {
    try {
        // 获取当前用户信息
        const user = await fetchAPI('/api/users/current');
        
        // 检查是否为管理员
        if (user && user.role === 1) {
            // 更新用户名显示
            $('#current-username').text(user.username || '管理员');
            return true;
        } else {
            // 不是管理员，跳转到登录页
            showErrorMessage('您没有管理员权限');
            setTimeout(() => {
                window.location.href = '/pages/login.html';
            }, 2000);
            return false;
        }
    } catch (error) {
        console.error('检查登录状态失败:', error);
        showErrorMessage('检查登录状态失败: ' + error.message);
        setTimeout(() => {
            window.location.href = '/pages/login.html';
        }, 2000);
        return false;
    }
}

/**
 * 初始化页面
 */
function initPage() {
    // 在商品容器上方添加搜索按钮和重置按钮
    $("#products-container").before(
        `<div class="d-flex justify-content-start align-items-center mb-3">
            <div>
                <button class="btn btn-outline-primary mr-2" data-toggle="modal" data-target="#searchModal">
                    <i class="fas fa-search"></i> 搜索商品
                </button>
                <button id="reset-search-btn" class="btn btn-outline-secondary">
                    <i class="fas fa-undo"></i> 重置
                </button>
            </div>
        </div>`
    );
}

/**
 * 绑定事件处理函数
 */
function bindEvents() {
    // 窗口滚动事件，实现自动加载更多
    $(window).on('scroll', function() {
        // 如果正在加载或没有下一页，则不处理
        if (isLoading || !hasNextPage) return;
        
        // 计算滚动位置
        const scrollTop = $(window).scrollTop();
        const windowHeight = $(window).height();
        const documentHeight = $(document).height();
        
        // 当滚动到距离底部100px时，加载下一页数据
        if (scrollTop + windowHeight > documentHeight - 100) {
            currentPage++;
            loadProducts();
        }
    });
    
    // 搜索按钮点击事件
    $(document).on('click', '#search-btn', function() {
        // 获取搜索参数
        searchParams = {
            name: $('#search-name').val(),
            category: $('#search-category').val() || null
        };
        
        // 重置分页参数
        currentPage = 1;
        hasNextPage = true;
        
        // 清空商品列表
        $('#products-container').empty();
        
        // 加载商品数据
        loadProducts();
        
        // 关闭搜索模态框
        $('#searchModal').modal('hide');
    });
    
    // 重置按钮点击事件
    $(document).on('click', '#reset-search-btn', function() {
        // 清空搜索参数
        searchParams = {};
        
        // 清空搜索表单
        $('#search-name').val('');
        $('#search-category').val('');
        
        // 重置分页参数
        currentPage = 1;
        hasNextPage = true;
        
        // 清空商品列表
        $('#products-container').empty();
        
        // 重新加载商品数据
        loadProducts();
    });
    
    // 增加商品数量按钮点击事件
    $(document).on('click', '.increase-btn', function() {
        const $input = $(this).closest('.input-group').find('.quantity-input');
        const currentValue = parseInt($input.val());
        const maxValue = parseInt($input.attr('max'));
        
        if (currentValue < maxValue) {
            $input.val(currentValue + 1);
            $input.trigger('change');
        }
    });
    
    // 减少商品数量按钮点击事件
    $(document).on('click', '.decrease-btn', function() {
        const $input = $(this).closest('.input-group').find('.quantity-input');
        const currentValue = parseInt($input.val());
        
        if (currentValue > 0) {
            $input.val(currentValue - 1);
            $input.trigger('change');
        }
    });
    
    // 商品数量输入框变化事件
    $(document).on('change', '.quantity-input', function() {
        updateSelectedProducts();
        updateOrderSummary();
    });
    
    // 订单表单提交事件
    $('#order-form').on('submit', function(e) {
        e.preventDefault();
        submitOrder();
    });
}

/**
 * 加载商品数据
 */
function loadProducts() {
    if (isLoading) return;
    
    isLoading = true;
    
    // 如果是第一页，显示加载中提示
    if (currentPage === 1) {
        $('#products-container').html(
            `<div class="text-center">
                <div class="spinner-border" role="status">
                    <span class="sr-only">加载中...</span>
                </div>
                <p>正在加载商品数据...</p>
            </div>`
        );
    } else {
        // 否则在列表底部添加加载提示
        $('#products-container').append(
            `<div id="loading-indicator" class="text-center mt-3">
                <div class="spinner-border spinner-border-sm" role="status">
                    <span class="sr-only">加载中...</span>
                </div>
                <span class="ml-2">加载中...</span>
            </div>`
        );
    }
    
    // 构建请求参数
    const params = {
        pageNum: currentPage,
        pageSize: pageSize
    };
    
    // 添加搜索参数
    if (searchParams.name) params.name = searchParams.name;
    if (searchParams.category) params.category = searchParams.category;
    
    // 发送AJAX请求获取商品数据
    fetchAPI('/api/products', {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json'
        },
        params: params
    })
    .then(response => {
        // 移除加载提示
        if (currentPage === 1) {
            $('#products-container').empty();
        } else {
            $('#loading-indicator').remove();
        }
        
        // 更新分页信息
        totalPages = response.pages;
        hasNextPage = response.hasNextPage;
        
        // 如果没有商品数据
        if (response.list.length === 0) {
            $('#products-container').html(
                `<div class="alert alert-info">没有找到符合条件的商品</div>`
            );
            return;
        }
        
        // 渲染商品列表
        renderProducts(response.list);
    })
    .catch(error => {
        console.error('加载商品数据失败:', error);
        
        // 显示错误提示
        if (currentPage === 1) {
            $('#products-container').html(
                `<div class="alert alert-danger">加载商品数据失败，请刷新页面重试</div>`
            );
        } else {
            $('#loading-indicator').remove();
            $('#products-container').append(
                `<div class="alert alert-danger mt-3">加载更多商品失败，请重试</div>`
            );
        }
    })
    .finally(() => {
        isLoading = false;
    });
}

/**
 * 渲染商品列表
 * @param {Array} products 商品数据数组
 */
function renderProducts(products) {
    // 获取商品项模板
    const template = document.getElementById('product-item-template');
    
    // 创建文档片段，提高性能
    const fragment = document.createDocumentFragment();
    
    // 遍历商品数据
    products.forEach(function(product) {
        // 克隆模板
        const clone = document.importNode(template.content, true);
        
        // 设置商品ID
        const productItem = clone.querySelector('.product-item');
        productItem.setAttribute('data-id', product.productId);
        
        // 设置商品名称
        const nameElement = clone.querySelector('.product-name');
        nameElement.textContent = product.productName || product.name || '未命名商品';
        
        // 设置商品描述
        const descElement = clone.querySelector('.product-desc');
        descElement.textContent = product.description || '暂无描述';
        
        // 设置商品价格
        const priceElement = clone.querySelector('.product-price');
        priceElement.textContent = `¥${product.price.toFixed(2)}`;
        
        // 设置商品库存
        const stockElement = clone.querySelector('.product-stock');
        stockElement.textContent = product.stock;
        
        // 设置数量输入框最大值
        const quantityInput = clone.querySelector('.quantity-input');
        quantityInput.setAttribute('max', product.stock);
        
        // 如果商品已经被选中，设置数量
        const selectedProduct = selectedProducts.find(p => p.productId === product.productId);
        if (selectedProduct) {
            quantityInput.value = selectedProduct.quantity;
        }
        
        // 添加到文档片段
        fragment.appendChild(clone);
    });
    
    // 如果是第一页，替换商品容器内容
    if (currentPage === 1) {
        $('#products-container').empty();
    }
    
    // 将文档片段添加到商品容器
    document.getElementById('products-container').appendChild(fragment);
    
    // 更新订单摘要
    updateOrderSummary();
    
    // 如果有下一页，添加加载更多按钮
    if (hasNextPage) {
        $('#products-container').append(
            `<div class="text-center mt-3">
                <button id="load-more-btn" class="btn btn-outline-primary">
                    加载更多商品
                </button>
            </div>`
        );
    }
}

/**
 * 更新已选商品列表
 */
function updateSelectedProducts() {
    selectedProducts = [];
    
    // 遍历所有商品项
    $('.product-item').each(function() {
        const productId = parseInt($(this).data('id'));
        const quantity = parseInt($(this).find('.quantity-input').val());
        
        // 只添加数量大于0的商品
        if (quantity > 0) {
            const productName = $(this).find('.product-name').text();
            const priceText = $(this).find('.product-price').text();
            const price = parseFloat(priceText.replace('¥', ''));
            
            selectedProducts.push({
                productId: productId,
                productName: productName,
                quantity: quantity,
                productPrice: price
            });
        }
    });
    
    // 更新提交按钮状态
    $('#submit-btn').prop('disabled', selectedProducts.length === 0);
}

/**
 * 更新订单摘要
 */
function updateOrderSummary() {
    // 计算商品总数和总金额
    let totalQuantity = 0;
    let totalAmount = 0;
    
    selectedProducts.forEach(product => {
        totalQuantity += product.quantity;
        totalAmount += product.quantity * product.productPrice;
    });
    
    // 更新显示
    $('#total-quantity').text(totalQuantity);
    $('#total-amount').text(`¥${totalAmount.toFixed(2)}`);
}

/**
 * 提交订单
 */
async function submitOrder() {
    try {
        // 禁用提交按钮，防止重复提交
        $('#submit-btn').prop('disabled', true).html('<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> 提交中...');
        
        // 获取表单数据
        const receiver = $('#receiver').val();
        const receiverPhone = $('#receiverPhone').val();
        const address = $('#address').val();
        const remark = $('#remark').val();
        
        // 计算总价
        let totalAmount = 0;
        selectedProducts.forEach(product => {
            totalAmount += product.productPrice * product.quantity;
        });
        
        // 构建订单数据
        const orderData = {
            items: selectedProducts,
            totalAmount: totalAmount,
            receiver: receiver,
            receiverPhone: receiverPhone,
            address: address,
            remark: remark
        };
        
        console.log('发送POST请求到: /api/orders');
        console.log('请求数据:', orderData);
        
        // 发送创建订单请求
        const response = await fetchAPI('/api/orders', {
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
            window.location.href = `/pages/admin/order-detail.html?uuid=${response.order.orderUuid}`;
        }, 1500);
    } catch (error) {
        console.error('创建订单失败:', error);
        showErrorMessage('创建订单失败: ' + error.message);
        
        // 恢复提交按钮
        $('#submit-btn').prop('disabled', false).text('提交订单');
    }
}