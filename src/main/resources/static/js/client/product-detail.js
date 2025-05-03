// 客户端商品详情页面的JavaScript

// 当前商品ID和数量
let productId = null;
let quantity = 1;

// 页面加载完成后执行
$(document).ready(function() {
    // 检查用户是否已登录
    checkLoginStatus().then(function(isLoggedIn) {
        if (isLoggedIn) {
            // 获取URL中的商品ID参数
            productId = getUrlParam('id');
            
            if (!productId) {
                showErrorMessage('商品ID参数不能为空');
                setTimeout(() => {
                    window.location.href = '/pages/client/products.html';
                }, 2000);
                return;
            }
            
            // 加载商品详情
            loadProductDetail(productId);
            
            // 绑定退出登录事件
            $('#logout-btn').click(function(e) {
                e.preventDefault();
                logout();
            });
            
            // 绑定搜索按钮事件
            $('#search-btn').click(function() {
                const keyword = $('#search-input').val().trim();
                if (keyword) {
                    window.location.href = `/pages/client/products.html?keyword=${encodeURIComponent(keyword)}`;
                }
            });
            
            // 绑定搜索框回车事件
            $('#search-input').keypress(function(e) {
                if (e.which === 13) {
                    const keyword = $(this).val().trim();
                    if (keyword) {
                        window.location.href = `/pages/client/products.html?keyword=${encodeURIComponent(keyword)}`;
                    }
                }
            });
        }
    });
});

// 加载商品详情
async function loadProductDetail(id) {
    try {
        // 显示加载中
        $('#product-detail-container').html('<div class="text-center py-5"><div class="spinner-border text-primary" role="status"><span class="sr-only">加载中...</span></div><p class="mt-3">正在加载商品详情...</p></div>');
        
        // 请求商品详情数据 - 修正API路径，使用后端控制器中定义的路径
        const product = await fetchAPI(`/api/products/${id}`);
        
        if (!product) {
            showErrorMessage('商品不存在或已下架');
            setTimeout(() => {
                window.location.href = '/pages/client/products.html';
            }, 2000);
            return;
        }
        
        // 添加分类信息显示
        if (product.category === undefined || product.category === null) {
            product.category = 0; // 默认为其他分类
        }
        product.categoryName = getCategoryName(product.category);
        
        // 渲染商品详情
        renderProductDetail(product);
        
        // 绑定数量调整按钮事件
        bindQuantityButtons();
        
        // 绑定添加到购物车按钮事件
        $('#add-to-cart-btn').click(function() {
            addToCart(product.productId, quantity);
        });
        
        // 绑定立即购买按钮事件
        $('#buy-now-btn').click(function() {
            buyNow(product.productId, quantity);
        });
    } catch (error) {
        console.error('加载商品详情失败:', error);
        showErrorMessage('加载商品详情失败: ' + error.message);
        $('#product-detail-container').html('<div class="alert alert-danger">加载商品详情失败</div>');
    }
}

// 获取分类名称
function getCategoryName(categoryId) {
    const categories = {
        0: '其他',
        1: '电子产品',
        2: '服装',
        3: '食品',
        4: '图书',
        5: '家居'
    };
    return categories[categoryId] || '其他';
}

// 渲染商品详情
function renderProductDetail(product) {
    document.title = `${product.productName} - 在线商城`;
    
    // 设置库存状态文本和样式
    const stockStatusText = product.stock > 0 ? `库存: ${product.stock}` : '缺货';
    const stockStatusClass = product.stock > 0 ? 'badge-success' : 'badge-danger';
    
    // 设置商品状态文本和样式
    const statusText = product.status === 1 ? '在售' : '已下架';
    const statusClass = product.status === 1 ? 'badge-primary' : 'badge-secondary';
    
    // 使用之前定义的函数获取分类名称
    const categoryName = product.categoryName || getCategoryName(product.category);
    
    // 使用正确的图片路径 - 修正API路径，使用后端控制器中定义的路径
    const imageUrl = `/api/products/${product.productId}/image`;
    
    // 构建商品详情HTML
    const html = `
        <div class="row">
            <div class="col-md-6">
                <img src="${imageUrl}" class="product-image" alt="${product.productName}" onerror="this.onerror=null; this.src='/images/default-product.jpg';">
            </div>
            <div class="col-md-6">
                <h2 class="mb-3">${product.productName}</h2>
                <div class="mb-3">
                    <span class="badge ${statusClass} mr-2">${statusText}</span>
                    <span class="badge ${stockStatusClass}">${stockStatusText}</span>
                    <span class="badge badge-info">分类: ${categoryName}</span>
                </div>
                <div class="product-price mb-4">¥${formatCurrency(product.price)}</div>
                <div class="product-info mb-4">
                    <p>${product.productDesc || '暂无商品描述'}</p>
                </div>
                
                <div class="form-group">
                    <label for="quantity">数量:</label>
                    <div class="input-group" style="width: 150px;">
                        <div class="input-group-prepend">
                            <button class="btn btn-outline-secondary" type="button" id="decrease-btn">-</button>
                        </div>
                        <input type="number" class="form-control text-center" id="quantity" value="1" min="1" max="${product.stock}" ${product.stock <= 0 ? 'disabled' : ''}>
                        <div class="input-group-append">
                            <button class="btn btn-outline-secondary" type="button" id="increase-btn">+</button>
                        </div>
                    </div>
                </div>
                
                <div class="mt-4">
                    <button class="btn btn-primary btn-lg mr-2" id="add-to-cart-btn" ${product.stock <= 0 || product.status !== 1 ? 'disabled' : ''}>
                        <i class="fas fa-shopping-cart"></i> 加入购物车
                    </button>
                    <button class="btn btn-danger btn-lg" id="buy-now-btn" ${product.stock <= 0 || product.status !== 1 ? 'disabled' : ''}>
                        <i class="fas fa-bolt"></i> 立即购买
                    </button>
                </div>
            </div>
        </div>
    `;
    
    $('#product-detail-container').html(html);
}

// 绑定数量调整按钮事件
function bindQuantityButtons() {
    const quantityInput = $('#quantity');
    const maxStock = parseInt(quantityInput.attr('max'));
    
    // 减少数量按钮
    $('#decrease-btn').click(function() {
        let currentValue = parseInt(quantityInput.val());
        if (currentValue > 1) {
            quantityInput.val(currentValue - 1);
            quantity = currentValue - 1;
        }
    });
    
    // 增加数量按钮
    $('#increase-btn').click(function() {
        let currentValue = parseInt(quantityInput.val());
        if (currentValue < maxStock) {
            quantityInput.val(currentValue + 1);
            quantity = currentValue + 1;
        }
    });
    
    // 直接输入数量
    quantityInput.change(function() {
        let currentValue = parseInt($(this).val());
        if (isNaN(currentValue) || currentValue < 1) {
            $(this).val(1);
            quantity = 1;
        } else if (currentValue > maxStock) {
            $(this).val(maxStock);
            quantity = maxStock;
        } else {
            quantity = currentValue;
        }
    });
}

// 添加到购物车
async function addToCart(productId, quantity) {
    try {
        // 发送添加到购物车请求 - 修正API路径，使用后端控制器中定义的路径
        const result = await fetchAPI('/api/cart/add', {
            method: 'POST',
            body: JSON.stringify({
                productId: productId,
                quantity: quantity
            })
        });
        
        showSuccessMessage('已成功添加到购物车');
    } catch (error) {
        console.error('添加到购物车失败:', error);
        showErrorMessage('添加到购物车失败: ' + error.message);
    }
}

// 立即购买
function buyNow(productId, quantity) {
    // 跳转到确认订单页面
    window.location.href = `/pages/client/create-order.html?productId=${productId}&quantity=${quantity}`;
}

// 格式化货币
function formatCurrency(price) {
    return parseFloat(price).toFixed(2);
}

// 从URL获取参数
function getUrlParam(name) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(name);
}