// 客户端购物车页面的JavaScript

// 页面加载完成后执行
$(document).ready(function() {
    // 检查用户是否已登录
    checkLoginStatus().then(function(isLoggedIn) {
        if (isLoggedIn) {
            // 加载购物车数据
            loadCartData();
            
            // 绑定退出登录事件
            $('#logout-btn').click(function(e) {
                e.preventDefault();
                logout();
            });
            
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
        }
    });
});

// 加载购物车数据
async function loadCartData() {
    try {
        // 显示加载中
        $('#cart-container').html('<div class="col-12 text-center"><div class="spinner-border" role="status"><span class="sr-only">加载中...</span></div><p>正在加载购物车...</p></div>');
        
        // 请求购物车数据
        const response = await fetchAPI('/api/client/cart?pageNum=1&pageSize=50');
        
        // 检查响应格式，适配后端返回的数据结构
        if (!response || !response.success || !response.content || response.content.length === 0) {
            // 购物车为空
            renderEmptyCart();
            return;
        }
        
        // 渲染购物车数据，使用content字段作为购物车项列表
        renderCartData(response.content);
    } catch (error) {
        console.error('加载购物车数据失败:', error);
        showErrorMessage('加载购物车数据失败: ' + error.message);
        $('#cart-container').html('<div class="col-12"><div class="alert alert-danger">加载购物车数据失败，请稍后再试</div></div>');
    }
}

// 渲染空购物车
function renderEmptyCart() {
    const html = `
        <div class="col-12">
            <div class="empty-cart">
                <div class="empty-cart-icon">🛒</div>
                <h3>您的购物车还是空的</h3>
                <p class="text-muted">快去选购您喜欢的商品吧！</p>
                <a href="/pages/client/products.html" class="btn btn-primary mt-3">去购物</a>
            </div>
        </div>
    `;
    
    $('#cart-container').html(html);
}

// 渲染购物车数据
function renderCartData(cartItems) {
    let totalPrice = 0;
    let totalQuantity = 0;
    let selectedCount = 0;
    
    // 计算总价和总数量
    cartItems.forEach(item => {
        if (item.selected === 1) {
            totalPrice += item.productPrice * item.quantity;
            selectedCount++;
        }
        totalQuantity += item.quantity;
    });
    
    const html = `
        <div class="col-md-8">
            <div class="d-flex justify-content-between align-items-center mb-3">
                <div class="form-check">
                    <input class="form-check-input" type="checkbox" id="select-all" ${selectedCount === cartItems.length ? 'checked' : ''}>
                    <label class="form-check-label" for="select-all">全选</label>
                </div>
                <button class="btn btn-sm btn-outline-danger" id="clear-cart-btn">清空购物车</button>
            </div>
            
            <div id="cart-items-container">
                ${cartItems.map(item => renderCartItem(item)).join('')}
            </div>
        </div>
        <div class="col-md-4">
            <div class="cart-summary">
                <div class="cart-summary-title">订单摘要</div>
                <div class="cart-summary-item">
                    <span>商品总数:</span>
                    <span>${totalQuantity}件</span>
                </div>
                <div class="cart-summary-item">
                    <span>已选商品:</span>
                    <span>${selectedCount}件</span>
                </div>
                <div class="cart-summary-total">
                    <span>合计:</span>
                    <span class="cart-summary-total-price">¥${formatCurrency(totalPrice)}</span>
                </div>
                <button class="btn btn-danger btn-block mt-3" id="checkout-btn" ${selectedCount === 0 ? 'disabled' : ''}>去结算</button>
            </div>
        </div>
    `;
    
    $('#cart-container').html(html);
    
    // 绑定全选/取消全选事件
    $('#select-all').change(function() {
        const isChecked = $(this).prop('checked');
        updateAllCartItemsSelected(isChecked ? 1 : 0);
    });
    
    // 绑定清空购物车事件
    $('#clear-cart-btn').click(function() {
        if (confirm('确定要清空购物车吗？')) {
            clearCart();
        }
    });
    
    // 绑定去结算按钮事件
    $('#checkout-btn').click(async function() {
        if (selectedCount > 0) {
            // 先检查是否有选中的商品
            try {
                const response = await fetchAPI('/api/client/cart/selected');
                
                // 检查响应格式，适配不同的返回结构
                let items = [];
                
                if (response && Array.isArray(response)) {
                    items = response;
                } else if (response && response.data && Array.isArray(response.data)) {
                    items = response.data;
                } else if (response && response.content && Array.isArray(response.content)) {
                    items = response.content;
                }
                
                if (items.length === 0) {
                    showErrorMessage('购物车中没有选中的商品');
                    return;
                }
                
                // 有选中的商品，跳转到创建订单页面
                window.location.href = '/pages/client/create-order.html?from=cart';
            } catch (error) {
                console.error('获取选中商品失败:', error);
                showErrorMessage('获取选中商品失败: ' + error.message);
            }
        } else {
            showErrorMessage('请至少选择一件商品');
        }
    });
    
    // 绑定购物车项事件
    bindCartItemEvents();
}

// 渲染单个购物车项
function renderCartItem(item) {
    // 使用直接映射的商品字段
    const productName = item.productName || '商品信息加载失败';
    const productPrice = item.productPrice !== undefined ? item.productPrice.toFixed(2) : 'N/A';
    
    // 使用商品图片API端点获取图片，而不是直接使用二进制数据
    // 这样可以避免二进制数据被错误地解析为字符串导致的乱码问题
    const productImage = `/api/products/${item.productId}/image`;
    
    const itemTotalPrice = (item.productPrice * item.quantity).toFixed(2);

    return `
        <div class="cart-item" data-cart-id="${item.cartId}" data-product-id="${item.productId}">
            <div class="row align-items-center">
                <div class="col-auto">
                    <input class="form-check-input item-select" type="checkbox" ${item.selected === 1 ? 'checked' : ''}>
                </div>
                <div class="col-auto">
                    <img src="${productImage}" alt="${productName}" class="cart-item-image" onerror="this.onerror=null; this.src='/images/default-product.jpg';">
                </div>
                <div class="col">
                    <div class="cart-item-name">${productName}</div>
                    <div class="text-muted">单价: <span class="cart-item-price">¥${productPrice}</span></div>
                </div>
                <div class="col-md-3">
                    <div class="quantity-control">
                        <button class="btn btn-sm btn-outline-secondary decrease-quantity" ${item.quantity <= 1 ? 'disabled' : ''}>-</button>
                        <input type="number" class="form-control quantity-input" value="${item.quantity}" min="1" max="${item.productStock || 99}">
                        <button class="btn btn-sm btn-outline-secondary increase-quantity" ${item.quantity >= (item.productStock || 99) ? 'disabled' : ''}>+</button>
                    </div>
                </div>
                <div class="col-md-2 text-right">
                    <span class="cart-item-total">¥${itemTotalPrice}</span>
                </div>
                <div class="col-auto">
                    <button class="btn btn-sm btn-outline-danger remove-item-btn">删除</button>
                </div>
            </div>
        </div>
    `;
}

// 绑定购物车项事件
function bindCartItemEvents() {
    // 绑定选中/取消选中事件
    $('.item-select').change(function() {
        const cartId = $(this).closest('.cart-item').data('cart-id');
        const selected = $(this).prop('checked') ? 1 : 0;
        updateCartItemSelected(cartId, selected);
    });
    
    // 绑定减少数量按钮事件
    $('.decrease-quantity').click(function() {
        const cartId = $(this).closest('.cart-item').data('cart-id');
        const input = $(this).closest('.quantity-control').find('.quantity-input');
        let currentValue = parseInt(input.val());
        if (currentValue > 1) {
            input.val(currentValue - 1);
            updateCartItemQuantity(cartId, currentValue - 1);
        }
    });
    
    // 绑定增加数量按钮事件
    $('.increase-quantity').click(function() {
        const cartId = $(this).closest('.cart-item').data('cart-id');
        const input = $(this).closest('.quantity-control').find('.quantity-input');
        const maxStock = parseInt(input.attr('max'));
        let currentValue = parseInt(input.val());
        if (currentValue < maxStock) {
            input.val(currentValue + 1);
            updateCartItemQuantity(cartId, currentValue + 1);
        } else {
            showErrorMessage('已达到最大库存数量');
        }
    });
    
    // 绑定直接输入数量事件
    $('.quantity-input').change(function() {
        const cartId = $(this).closest('.cart-item').data('cart-id');
        let currentValue = parseInt($(this).val());
        const maxStock = parseInt($(this).attr('max'));
        
        if (isNaN(currentValue) || currentValue < 1) {
            $(this).val(1);
            currentValue = 1;
        } else if (currentValue > maxStock) {
            $(this).val(maxStock);
            currentValue = maxStock;
            showErrorMessage('已调整为最大库存数量');
        }
        
        updateCartItemQuantity(cartId, currentValue);
    });
    
    // 绑定删除按钮事件
    $('.remove-item-btn').click(function() {
        const cartId = $(this).closest('.cart-item').data('cart-id');
        if (confirm('确定要删除该商品吗？')) {
            deleteCartItem(cartId);
        }
    });
}

// 更新购物车项数量
async function updateCartItemQuantity(cartId, quantity) {
    try {
        const response = await fetchAPI(`/api/client/cart/${cartId}/quantity?quantity=${quantity}`, {
            method: 'PUT'
        });
        
        if (response && response.success) {
            // 重新加载购物车数据
            loadCartData();
        } else {
            showErrorMessage(response.message || '更新购物车数量失败');
        }
    } catch (error) {
        console.error('更新购物车数量失败:', error);
        showErrorMessage('更新购物车数量失败: ' + error.message);
    }
}

// 更新购物车项选中状态
async function updateCartItemSelected(cartId, selected) {
    try {
        // 将selected作为URL参数传递，而不是请求体
        const response = await fetchAPI(`/api/client/cart/${cartId}/selected?selected=${selected}`, {
            method: 'PUT'
        });
        
        if (response && response.success) {
            // 重新加载购物车数据
            loadCartData();
        } else {
            showErrorMessage(response.message || '更新购物车选中状态失败');
        }
    } catch (error) {
        console.error('更新购物车选中状态失败:', error);
        showErrorMessage('更新购物车选中状态失败: ' + error.message);
    }
}

// 更新所有购物车项选中状态
async function updateAllCartItemsSelected(selected) {
    try {
        // 将selected作为URL参数传递，而不是请求体
        const response = await fetchAPI(`/api/client/cart/selected/all?selected=${selected}`, {
            method: 'PUT'
        });
        
        if (response && response.success) {
            // 重新加载购物车数据
            loadCartData();
        } else {
            showErrorMessage(response.message || '更新购物车选中状态失败');
        }
    } catch (error) {
        console.error('更新购物车选中状态失败:', error);
        showErrorMessage('更新购物车选中状态失败: ' + error.message);
    }
}

// 删除购物车项
async function deleteCartItem(cartId) {
    try {
        const response = await fetchAPI(`/api/client/cart/${cartId}`, {
            method: 'DELETE'
        });
        
        if (response && response.success) {
            showSuccessMessage('商品已从购物车中删除');
            // 重新加载购物车数据
            loadCartData();
        } else {
            showErrorMessage(response.message || '删除购物车商品失败');
        }
    } catch (error) {
        console.error('删除购物车商品失败:', error);
        showErrorMessage('删除购物车商品失败: ' + error.message);
    }
}

// 清空购物车
async function clearCart() {
    try {
        const response = await fetchAPI('/api/client/cart/clear', {
            method: 'DELETE'
        });
        
        if (response && response.success) {
            showSuccessMessage('购物车已清空');
            // 重新加载购物车数据
            loadCartData();
        } else {
            showErrorMessage(response.message || '清空购物车失败');
        }
    } catch (error) {
        console.error('清空购物车失败:', error);
        showErrorMessage('清空购物车失败: ' + error.message);
    }
}

// 格式化货币
function formatCurrency(value) {
    return parseFloat(value).toFixed(2);
}