// 商品列表页面的JavaScript

// 页面加载完成后执行
$(document).ready(function() {
    // 检查用户是否已登录
    checkLoginStatus().then(function(isLoggedIn) {
        if (isLoggedIn) {
            // 加载商品列表
            loadProductList();
            
            // 绑定退出登录事件
            $('#logout-btn').click(function(e) {
                e.preventDefault();
                logout();
            });
            
            // 绑定搜索按钮事件
            $('#search-btn').click(function() {
                const keyword = $('#search-input').val().trim();
                loadProductList(keyword);
            });
            
            // 绑定搜索框回车事件
            $('#search-input').keypress(function(e) {
                if (e.which === 13) {
                    const keyword = $(this).val().trim();
                    loadProductList(keyword);
                }
            });
        }
    });
});

// 加载商品列表
async function loadProductList(keyword = '') {
    try {
        // 显示加载中
        $('#product-list-container').html('<div class="text-center"><div class="spinner-border" role="status"><span class="sr-only">加载中...</span></div></div>');
        
        // 构建API URL
        let apiUrl = '/api/product/list';
        if (keyword) {
            apiUrl += `?keyword=${encodeURIComponent(keyword)}`;
        }
        
        // 请求商品列表数据
        const products = await fetchAPI(apiUrl);
        
        // 渲染商品列表
        renderProductList(products);
    } catch (error) {
        console.error('加载商品列表失败:', error);
        showErrorMessage('加载商品列表失败: ' + error.message);
        $('#product-list-container').html('<div class="alert alert-danger">加载商品列表失败</div>');
    }
}

// 渲染商品列表
function renderProductList(products) {
    // 清空容器
    $('#product-list-container').empty();
    
    // 如果没有商品，显示提示信息
    if (!products || products.length === 0) {
        $('#product-list-container').html('<div class="alert alert-info">暂无商品</div>');
        return;
    }
    
    // 创建商品列表行
    const row = $('<div class="row"></div>');
    
    // 遍历商品数据，创建商品卡片
    products.forEach(product => {
        const productCard = $('<div class="col-md-4 col-sm-6 mb-4"></div>');
        const card = $('<div class="card h-100 product-card"></div>');
        
        // 商品图片
        let imageHtml = '';
        if (product.imageUrl) {
            imageHtml = `<img src="${product.imageUrl}" class="card-img-top product-img" alt="${product.name}">`;
        } else {
            imageHtml = '<img src="/images/default-product.jpg" class="card-img-top product-img" alt="默认商品图片">';
        }
        
        // 商品信息
        card.html(`
            <a href="/pages/product/detail.html?id=${product.id}" class="product-link">
                <div class="product-img-container">
                    ${imageHtml}
                </div>
                <div class="card-body">
                    <h5 class="card-title product-name">${product.name}</h5>
                    <p class="card-text product-price">${formatCurrency(product.price)}</p>
                </div>
            </a>
            <div class="card-footer">
                <button class="btn btn-primary btn-sm buy-now-btn" onclick="window.location.href='/pages/order/create.html?productId=${product.id}'" ${product.stock <= 0 ? 'disabled' : ''}>
                    ${product.stock <= 0 ? '暂时缺货' : '立即购买'}
                </button>
                <span class="stock-info float-right">${product.stock > 0 ? `库存: ${product.stock}` : '缺货'}</span>
            </div>
        `);
        
        productCard.append(card);
        row.append(productCard);
    });
    
    // 将商品列表添加到容器中
    $('#product-list-container').append(row);
}

// 格式化货币
function formatCurrency(amount) {
    return '¥' + parseFloat(amount).toFixed(2);
}