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
async function loadProductDetail(productId) {
    try {
        // 请求商品详情数据
        const product = await fetchAPI(`/api/product/${productId}`);
        
        if (!product) {
            showErrorMessage('商品不存在或已被删除');
            setTimeout(() => {
                window.location.href = '/pages/client/products.html';
            }, 2000);
            return;
        }
        
        // 如果商品已下架，显示提示信息
        if (product.status === 0) {
            showErrorMessage('该商品已下架');
            setTimeout(() => {
                window.location.href = '/pages/client/products.html';
            }, 2000);
            return;
        }
        
        // 渲染商品详情
        renderProductDetail(product);
        
        // 设置页面标题
        document.title = `${product.productName} - 在线商城`;
    } catch (error) {
        console.error('加载商品详情失败:', error);
        showErrorMessage('加载商品详情失败: ' + error.message);
        $('#product-detail-container').html('<div class="alert alert-danger">加载商品详情失败</div>');
    }
}

// 渲染商品详情
function renderProductDetail(product) {
    // 清空容器
    $('#product-detail-container').empty();
    
    // 商品图片列
    const imageCol = $('<div class="col-md-6"></div>');
    // 商品图片URL
    const imageUrl = `/api/product/${product.productId}/image`;
    // 使用data-src属性存储原始URL，让image-loader.js处理认证
    imageCol.html(`
        <img data-src="${imageUrl}" alt="${product.productName}" class="product-image" 
             src="/images/loading.gif"
             onerror="this.onerror=null; this.src='/images/default-product.jpg'; console.log('商品图片加载失败，使用默认图片');">
    `);
    
    // 商品信息列
    const infoCol = $('<div class="col-md-6"></div>');
    
    // 库存状态显示
    let stockStatusText = '';
    let stockStatusClass = '';
    if (product.stock === 0) {
        stockStatusText = '库存不足';
        stockStatusClass = 'stock-status-0';
    } else if (product.stock < 10) {
        stockStatusText = '库存紧张';
        stockStatusClass = 'stock-status-1';
    } else {
        stockStatusText = '库存充足';
        stockStatusClass = 'stock-status-2';
    }
    
    infoCol.html(`
        <div class="product-info">
            <h3>${product.productName}</h3>
            <div class="product-price">${formatCurrency(product.price)}</div>
            <div class="mb-3">
                <span class="stock-status ${stockStatusClass}">${stockStatusText}</span>
                <span>库存: ${product.stock}</span>
            </div>
            <div class="mb-3">
                <h5>商品描述</h5>
                <p>${product.productDesc || '暂无描述'}</p>
            </div>
            <div class="quantity-control">
                <button class="btn btn-outline-secondary" id="decrease-quantity">-</button>
                <input type="number" id="quantity" value="1" min="1" max="${product.stock}" ${product.stock <= 0 ? 'disabled' : ''}>
                <button class="btn btn-outline-secondary" id="increase-quantity">+</button>
            </div>
            <div class="d-grid gap-2">
                <button class="btn btn-primary btn-lg" id="buy-now-btn" ${product.stock <= 0 ? 'disabled' : ''}>
                    ${product.stock <= 0 ? '暂时缺货' : '立即购买'}
                </button>
            </div>
        </div>
    `);
    
    // 添加到容器
    $('#product-detail-container').append(imageCol).append(infoCol);
    
    // 绑定数量控制事件
    $('#decrease-quantity').click(function() {
        const currentVal = parseInt($('#quantity').val());
        if (currentVal > 1) {
            $('#quantity').val(currentVal - 1);
            quantity = currentVal - 1;
        }
    });
    
    $('#increase-quantity').click(function() {
        const currentVal = parseInt($('#quantity').val());
        if (currentVal < product.stock) {
            $('#quantity').val(currentVal + 1);
            quantity = currentVal + 1;
        }
    });
    
    $('#quantity').change(function() {
        let val = parseInt($(this).val());
        if (isNaN(val) || val < 1) {
            val = 1;
        } else if (val > product.stock) {
            val = product.stock;
        }
        $(this).val(val);
        quantity = val;
    });
    
    // 绑定立即购买按钮事件
    $('#buy-now-btn').click(function() {
        if (product.stock <= 0) {
            showErrorMessage('该商品库存不足，无法购买');
            return;
        }
        
        // 跳转到创建订单页面，带上商品ID和数量参数
        window.location.href = `/pages/client/create-order.html?productId=${product.productId}&quantity=${quantity}`;
    });
}

// 格式化货币
function formatCurrency(price) {
    return '¥' + parseFloat(price).toFixed(2);
}

// 从URL获取参数
function getUrlParam(name) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(name);
}