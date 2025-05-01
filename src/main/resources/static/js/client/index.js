// 客户端首页的JavaScript

// 页面加载完成后执行
$(document).ready(function() {
    // 检查用户是否已登录
    checkLoginStatus().then(function(isLoggedIn) {
        if (isLoggedIn) {
            // 加载热门商品
            loadFeaturedProducts();
            
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

// 加载热门商品
async function loadFeaturedProducts() {
    try {
        // 请求商品列表数据 - 修正API路径，使用后端控制器中定义的路径
        const products = await fetchAPI('/api/products');
        
        // 只显示上架的商品，最多显示6个
        const featuredProducts = products.list
            .filter(product => product.status === 1)
            .slice(0, 6);
        
        // 渲染热门商品
        renderFeaturedProducts(featuredProducts);
    } catch (error) {
        console.error('加载热门商品失败:', error);
        showErrorMessage('加载热门商品失败: ' + error.message);
        $('#featured-products').html('<div class="alert alert-danger">加载热门商品失败</div>');
    }
}

// 渲染热门商品
function renderFeaturedProducts(products) {
    const container = $('#featured-products');
    container.empty();

    if (!products || products.length === 0) {
        container.html('<div class="col-12 text-center"><p class="lead">暂无热门商品</p></div>');
        return;
    }

    products.forEach(product => {
        // 使用原始图片路径，认证通过全局fetchAPI配置处理
        // 修正API路径，使用后端控制器中定义的路径
        const imageUrl = `/api/products/${product.productId}/image`;
        
        const productCard = $(`
            <div class="col-md-3 mb-4">
                <div class="card h-100 shadow-sm">
                    <img data-src="${imageUrl}" 
                         class="card-img-top product-img" 
                         alt="${product.productName}"
                         onerror="this.onerror=null; this.src='/images/default-product.jpg';">
                    <div class="card-body d-flex flex-column">
                        <h5 class="card-title">${product.productName}</h5>
                        <p class="card-text text-muted">¥${formatCurrency(product.price)}</p>
                        <a href="/pages/client/product-detail.html?id=${product.productId}" 
                           class="btn btn-primary mt-auto">查看详情</a>
                    </div>
                </div>
            </div>
        `);

        // 强制触发图片加载（解决延迟加载问题）
        const imgElement = productCard.find('img[data-src]');
        const realSrc = imgElement.data('src');
        imgElement.attr('src', realSrc);
        
        container.append(productCard);
    });
}

// 格式化货币
function formatCurrency(price) {
    return parseFloat(price).toFixed(2);
}