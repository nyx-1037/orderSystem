// 首页脚本

// 页面变量
let currentPage = 1;
let pageSize = 8; // 每次加载8个商品
let isLoading = false; // 是否正在加载数据
let hasMoreData = true; // 是否还有更多数据

// 页面加载完成后执行
$(document).ready(function() {
    // 加载热门商品
    loadFeaturedProducts();
    
    // 绑定搜索按钮点击事件
    $('#search-btn').click(function() {
        const keyword = $('#search-input').val().trim();
        if (keyword) {
            window.location.href = `/pages/client/products.html?name=${encodeURIComponent(keyword)}`;
        }
    });
    
    // 绑定搜索框回车事件
    $('#search-input').keypress(function(e) {
        if (e.which === 13) {
            $('#search-btn').click();
        }
    });
    
    // 绑定加载更多按钮点击事件
    $('#load-more-btn').click(function() {
        if (!isLoading && hasMoreData) {
            currentPage++;
            loadFeaturedProducts(true); // 传入true表示追加模式
        }
    });
    
    // 绑定窗口滚动事件，实现懒加载
    $(window).scroll(function() {
        // 如果已经没有更多数据或正在加载中，则不处理
        if (!hasMoreData || isLoading) {
            return;
        }
        
        // 检查是否滚动到页面底部
        if ($(window).scrollTop() + $(window).height() > $(document).height() - 200) {
            // 加载下一页数据
            currentPage++;
            loadFeaturedProducts(true); // 传入true表示追加模式
        }
    });
});

// 加载热门商品
async function loadFeaturedProducts(append = false) {
    // 如果正在加载，则不重复加载
    if (isLoading) {
        return;
    }
    
    // 设置加载状态
    isLoading = true;
    
    // 初始隐藏加载更多按钮，等待数据加载完成后再决定是否显示
    if (!append) {
        $('#load-more-container').hide();
    }
    
    try {
        // 如果不是追加模式，则显示加载中状态
        if (!append) {
            $('#featured-products').html(`
                <div class="col-12 text-center">
                    <div class="spinner-border" role="status">
                        <span class="sr-only">加载中...</span>
                    </div>
                    <p>正在加载商品...</p>
                </div>
            `);
        } else {
            // 追加加载中提示
            $('#featured-products').append(`
                <div class="col-12 text-center loading-indicator">
                    <div class="spinner-border" role="status">
                        <span class="sr-only">加载中...</span>
                    </div>
                    <p>正在加载更多商品...</p>
                </div>
            `);
        }
        
        // 发送API请求获取热门商品
        const response = await fetch(`/api/products?pageNum=${currentPage}&pageSize=${pageSize}`);
        const data = await response.json();
        
        // 更新分页信息
        hasMoreData = data.hasNextPage || false;
        
        // 移除加载中提示
        $('.loading-indicator').remove();
        
        // 渲染热门商品
        if (append) {
            // 追加模式，添加到现有列表后面
            renderFeaturedProducts(data.list || [], true);
        } else {
            // 非追加模式，替换整个列表
            renderFeaturedProducts(data.list || [], false);
        }
        
        // 如果是第一页且没有数据，显示无数据提示
        if (currentPage === 1 && (!data.list || data.list.length === 0)) {
            $('#featured-products').html(`
                <div class="col-12 text-center">
                    <div class="alert alert-info">
                        <i class="fas fa-info-circle"></i> 暂无商品数据
                    </div>
                </div>
            `);
        }
        
        // 如果没有更多数据且不是第一页，显示加载完毕提示
        if (!hasMoreData && currentPage > 1) {
            $('#featured-products').append(`
                <div class="col-12 text-center mt-3 mb-3">
                    <p class="text-muted">已加载全部商品</p>
                </div>
            `);
            // 隐藏加载更多按钮
            $('#load-more-container').hide();
        } else if (hasMoreData) {
            // 显示加载更多按钮
            $('#load-more-container').show();
        }
    } catch (error) {
        console.error('加载热门商品失败:', error);
        if (!append) {
            $('#featured-products').html(`
                <div class="col-12 text-center">
                    <div class="alert alert-danger">
                        <i class="fas fa-exclamation-circle"></i> 加载商品失败，请刷新页面重试
                    </div>
                </div>
            `);
        } else {
            $('.loading-indicator').remove();
            $('#featured-products').append(`
                <div class="col-12 text-center mt-3">
                    <button class="btn btn-outline-primary retry-btn">加载失败，点击重试</button>
                </div>
            `);
            
            // 绑定重试按钮点击事件
            $('.retry-btn').click(function() {
                $(this).parent().remove();
                loadFeaturedProducts(true);
            });
        }
    } finally {
        // 重置加载状态
        isLoading = false;
    }
}

// 渲染热门商品
function renderFeaturedProducts(products, append = false) {
    const container = $('#featured-products');
    
    // 如果不是追加模式，则清空容器
    if (!append) {
        container.empty();
    }

    if (!products || products.length === 0) {
        if (!append) {
            container.html('<div class="col-12 text-center"><p class="lead">暂无热门商品</p></div>');
        }
        return;
    }

    products.forEach(product => {
        // 使用原始图片路径，认证通过全局fetchAPI配置处理
        // 修正API路径，使用后端控制器中定义的路径
        const imageUrl = `/api/products/${product.productId}/image`;
        
        // 获取分类名称
        let categoryName = '其他';
        switch(product.category) {
            case 1: categoryName = '电子产品'; break;
            case 2: categoryName = '服装'; break;
            case 3: categoryName = '食品'; break;
            case 4: categoryName = '图书'; break;
            case 5: categoryName = '家居'; break;
            default: categoryName = '其他';
        }
        
        const productCard = $(`
            <div class="col-md-3 mb-4">
                <div class="card h-100 shadow-sm product-card">
                    <a href="/pages/client/product-detail.html?id=${product.productId}" class="product-link">
                        <img data-src="${imageUrl}" 
                             class="card-img-top product-img" 
                             alt="${product.productName}"
                             onerror="this.onerror=null; this.src='/images/default-product.jpg';">
                        <div class="card-body d-flex flex-column">
                            <h5 class="card-title">${product.productName}</h5>
                            <p class="card-text text-muted">¥${formatCurrency(product.price)}</p>
                            <span class="badge badge-info mb-2">分类: ${categoryName}</span>
                            <a href="/pages/client/product-detail.html?id=${product.productId}" 
                               class="btn btn-primary mt-auto">查看详情</a>
                        </div>
                    </a>
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

// 显示错误消息
function showErrorMessage(message) {
    // 检查是否存在错误消息容器，如果不存在则创建
    let errorContainer = $('#error-message-container');
    if (errorContainer.length === 0) {
        $('body').prepend('<div id="error-message-container" class="alert alert-danger alert-dismissible fade show" style="position: fixed; top: 20px; right: 20px; z-index: 9999;" role="alert"></div>');
        errorContainer = $('#error-message-container');
    }
    
    // 设置错误消息内容
    errorContainer.html(`
        ${message}
        <button type="button" class="close" data-dismiss="alert" aria-label="Close">
            <span aria-hidden="true">&times;</span>
        </button>
    `);
    
    // 5秒后自动关闭
    setTimeout(() => {
        errorContainer.alert('close');
    }, 5000);
}