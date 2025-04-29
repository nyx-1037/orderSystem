// 商品详情页面的JavaScript

// 当前商品ID
let productId = null;

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
                    window.location.href = '/pages/product/list.html';
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
            
            // 绑定立即购买按钮事件
            $('#buy-now-btn').click(function() {
                window.location.href = `/pages/order/create.html?productId=${productId}`;
            });
        }
    });
});

// 加载商品详情
async function loadProductDetail(productId) {
    try {
        // 添加调试信息，查看请求URL
        console.log(`请求商品详情，URL: /api/product/${productId}`);
        const product = await fetchAPI(`/api/product/${productId}`);
        
        if (!product) {
            showErrorMessage('商品不存在或已被删除');
            setTimeout(() => {
                window.location.href = '/pages/product/list.html';
            }, 2000);
            return;
        }
        
        // 渲染商品详情
        renderProductDetail(product);
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
    // 商品图片URL，添加认证Token
    let imageUrl = `/api/product/${product.productId}/image`;
    // 添加Token到图片URL
    const token = localStorage.getItem('token');
    if (token) {
        // 确保token正确编码，避免特殊字符问题
        const encodedToken = encodeURIComponent(token.trim());
        imageUrl = `${imageUrl}?token=${encodedToken}`;
    }
    imageCol.html(`
        <img src="${imageUrl}" alt="${product.productName}" class="product-image" 
             onerror="this.onerror=null; this.src='/images/default-product.jpg'; console.log('商品图片加载失败，使用默认图片');">
    `);

    
    // 商品信息列
    const infoCol = $('<div class="col-md-6"></div>');
    
    // 状态显示
    const statusText = product.status === 1 ? '上架' : '下架';
    const statusClass = product.status === 1 ? 'status-1' : 'status-0';
    
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
                <span class="product-status ${statusClass}">${statusText}</span>
                <span class="stock-status ${stockStatusClass}">${stockStatusText}</span>
            </div>
            <p><strong>库存:</strong> ${product.stock}</p>
            <p><strong>商品描述:</strong></p>
            <p class="text-muted">${product.productDesc || '暂无描述'}</p>
            <p><strong>创建时间:</strong> ${formatDate(product.createTime)}</p>
            <p><strong>更新时间:</strong> ${formatDate(product.updateTime)}</p>
        </div>
    `);
    
    // 添加到容器
    $('#product-detail-container').append(imageCol).append(infoCol);
    
    // 更新购买按钮状态
    updateBuyButton(product);
    
    // 更新购买按钮状态
function updateBuyButton(product) {
    const buyButton = $('#buy-now-btn');
    
    if (product.status !== 1 || product.stock <= 0) {
        buyButton.addClass('disabled').attr('disabled', true);
        if (product.status !== 1) {
            buyButton.text('商品已下架');
        } else {
            buyButton.text('库存不足');
        }
    }
}

// 获取URL参数
function getUrlParam(name) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(name);
}

// 格式化货币
function formatCurrency(value) {
    return '¥' + parseFloat(value).toFixed(2);
}

// 格式化日期
function formatDate(dateString) {
    if (!dateString) return '无';
    const date = new Date(dateString);
    return date.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
}
    
    // 购买按钮
    const buyBtnContainer = $('<div class="mt-4"></div>');
    buyBtnContainer.html(`
        <button id="buy-now-btn" class="btn btn-primary btn-lg" ${product.stock <= 0 ? 'disabled' : ''}>
            ${product.stock <= 0 ? '暂时缺货' : '立即购买'}
        </button>
    `);
    
    // 将购买按钮添加到商品信息列
    infoCol.append(buyBtnContainer);
    
    // 将行添加到容器中
    $('#product-detail-container').append(row);
    
    // 添加商品详细信息部分
    const detailSection = $('<div class="product-detail-section mt-5"></div>');
    detailSection.html(`
        <ul class="nav nav-tabs" id="productDetailTabs" role="tablist">
            <li class="nav-item">
                <a class="nav-link active" id="detail-tab" data-toggle="tab" href="#detail" role="tab">详细信息</a>
            </li>
            <li class="nav-item">
                <a class="nav-link" id="parameter-tab" data-toggle="tab" href="#parameter" role="tab">规格参数</a>
            </li>
        </ul>
        <div class="tab-content" id="productDetailTabContent">
            <div class="tab-pane fade show active" id="detail" role="tabpanel">
                <div class="p-3">
                    ${product.detail || '<p>暂无详细信息</p>'}
                </div>
            </div>
            <div class="tab-pane fade" id="parameter" role="tabpanel">
                <div class="p-3">
                    ${product.parameter || '<p>暂无规格参数</p>'}
                </div>
            </div>
        </div>
    `);
    
    $('#product-detail-container').append(detailSection);
    
    // 设置页面标题
    document.title = `${product.name} - 商品详情`;
}

// 格式化货币
function formatCurrency(amount) {
    return '¥' + parseFloat(amount).toFixed(2);
}