// 商品列表页面脚本

// 页面变量
let currentPage = 1;
let totalPages = 1;
let pageSize = 8; // 每次加载8个商品
let currentSort = 'default'; // 默认排序
let isLoading = false; // 是否正在加载数据
let hasMoreData = true; // 是否还有更多数据

// 页面加载完成后执行
$(document).ready(function() {
    // 检查URL中是否有搜索参数
    const searchName = getUrlParam('name');
    if (searchName) {
        // 如果有搜索参数，设置搜索框的值
        $('#search-input').val(searchName);
        // 直接调用搜索API
        searchProducts(searchName);
    } else {
        // 没有搜索参数，加载普通商品列表
        loadProducts();
    }
    
    // 绑定排序选项点击事件
    $('.sort-option').click(function(e) {
        e.preventDefault();
        const sortType = $(this).data('sort');
        $('#sortDropdown').text($(this).text());
        currentSort = sortType;
        currentPage = 1; // 重置为第一页
        
        // 清空商品容器
        $('#products-container').empty();
        
        // 重置加载状态
        hasMoreData = true;
        isLoading = false;
        
        // 重新加载商品
        loadProducts();
    });
    
    // 绑定分类筛选点击事件
    $('.category-filter').click(function(e) {
        e.preventDefault();
        
        // 移除其他分类的active类
        $('.category-filter').removeClass('active');
        
        // 添加当前分类的active类
        $(this).addClass('active');
        
        // 重置页码
        currentPage = 1;
        
        // 清空商品容器
        $('#products-container').empty();
        
        // 重置加载状态
        hasMoreData = true;
        isLoading = false;
        
        // 重新加载商品
        loadProducts();
    });
    
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
            loadProducts(true); // 传入true表示追加模式
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
            loadProducts(true); // 传入true表示追加模式
        }
    });
});

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

// 加载商品列表
async function loadProducts(append = false) {
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
            $('#products-container').html(`
                <div class="col-12 text-center">
                    <div class="spinner-border" role="status">
                        <span class="sr-only">加载中...</span>
                    </div>
                    <p>正在加载商品...</p>
                </div>
            `);
        } else {
            // 追加加载中提示
            $('#products-container').append(`
                <div class="col-12 text-center loading-indicator">
                    <div class="spinner-border" role="status">
                        <span class="sr-only">加载中...</span>
                    </div>
                    <p>正在加载更多商品...</p>
                </div>
            `);
        }
        
        // 获取当前选中的分类
        const selectedCategory = $('.category-filter.active').data('category');
        
        // 构建API URL和参数
        let apiUrl = `/api/products?pageNum=${currentPage}&pageSize=${pageSize}`;
        
        // 添加分类筛选
        if (selectedCategory !== undefined && selectedCategory !== null && selectedCategory !== 'all') {
            apiUrl += `&category=${selectedCategory}`;
            console.log('请求URL:', apiUrl, '分类:', selectedCategory);
        } else {
            // 如果是全部分类，确保不传递category参数
            console.log('请求全部分类商品:', apiUrl);
        }
        
        // 重置hasMoreData，确保每次切换分类都能正确加载数据
        if (currentPage === 1) {
            hasMoreData = true;
        }
        
        // 添加排序参数
        if (currentSort && currentSort !== 'default') {
            switch(currentSort) {
                case 'price-asc':
                    apiUrl += '&sort=price&order=asc';
                    break;
                case 'price-desc':
                    apiUrl += '&sort=price&order=desc';
                    break;
                case 'newest':
                    apiUrl += '&sort=createTime&order=desc';
                    break;
            }
        }
        
        // 发送API请求获取商品
        const response = await fetchAPI(apiUrl);
        
        // 获取商品列表
        const products = response.list || [];
        
        // 更新分页信息
        totalPages = response.pages || 1;
        hasMoreData = currentPage < totalPages;
        
        // 调试输出分页信息
        console.log(`当前页: ${currentPage}, 总页数: ${totalPages}, 是否有更多数据: ${hasMoreData}`);
        console.log(`获取到商品数量: ${products.length}`);
        
        // 如果当前是第一页且没有数据，检查是否是分类筛选导致
        if (currentPage === 1 && (!products || products.length === 0)) {
            const selectedCategory = $('.category-filter.active').data('category');
            console.log(`当前选中分类: ${selectedCategory}, 但未获取到数据`);
        }
        
        // 移除加载中提示
        $('.loading-indicator').remove();
        
        // 渲染商品列表
        renderProducts(products, append);
        
        // 如果是第一页且没有数据，显示无数据提示
        if (currentPage === 1 && (!products || products.length === 0)) {
            $('#products-container').html(`
                <div class="col-12 text-center">
                    <div class="alert alert-info">
                        <i class="fas fa-info-circle"></i> 暂无商品数据
                    </div>
                </div>
            `);
        }
        
        // 如果没有更多数据且不是第一页，显示加载完毕提示
        if (!hasMoreData && currentPage > 1) {
            $('#products-container').append(`
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
        console.error('加载商品列表失败:', error);
        showErrorMessage('加载商品列表失败: ' + error.message);
        if (!append) {
            $('#products-container').html('<div class="alert alert-danger">加载商品列表失败</div>');
        }
    } finally {
        // 重置加载状态
        isLoading = false;
    }
}

// 渲染商品列表
function renderProducts(products, append = false) {
    const container = $('#products-container');
    
    // 如果不是追加模式，则清空容器
    if (!append) {
        container.empty();
    } else {
        // 移除加载指示器
        $('.loading-indicator').remove();
    }

    if (!products || products.length === 0) {
        if (!append) {
            container.html('<div class="col-12"><div class="alert alert-info">暂无商品</div></div>');
        }
        return;
    }
    
    // 输出商品数量，用于调试
    console.log(`渲染商品数量: ${products.length}`);

    products.forEach(product => {
        // 添加分类信息
        if (product.category === undefined || product.category === null) {
            product.category = 0; // 默认为其他分类
        }
        product.categoryName = getCategoryName(product.category);
        
        // 使用正确的图片路径 - 修正API路径，使用后端控制器中定义的路径
        let imageUrl = `/api/products/${product.productId}/image`;
        
        // 设置库存状态文本和样式
        let stockStatusText = product.stock > 0 ? `库存: ${product.stock}` : '缺货';
        let stockStatusClass = product.stock > 0 ? 'text-success' : 'text-danger';
        
        const productCard = $(`
            <div class="col-md-3 mb-4"> <!-- 改为3列布局，每行显示4个商品 -->
                <div class="card product-card">
                    <div class="product-img-container">
                        <img src="${imageUrl}" 
                             class="product-img" 
                             alt="${product.productName}"
                             onerror="this.onerror=null; this.src='/images/default-product.jpg';">
                    </div>
                    <div class="card-body">
                        <h5 class="card-title product-name">${product.productName}</h5>
                        <p class="card-text product-price">${formatCurrency(product.price)}</p>
                        <p class="card-text">
                            <span class="badge badge-info mr-2">分类: ${product.categoryName}</span>
                            <span class="${stockStatusClass}">${stockStatusText}</span>
                        </p>
                    </div>
                    <div class="card-footer bg-white border-top-0">
                        <a href="/pages/client/product-detail.html?id=${product.productId}" class="btn btn-primary btn-sm w-100" ${product.stock <= 0 ? 'disabled' : ''}>
                            ${product.stock <= 0 ? '暂时缺货' : '查看详情'}
                        </a>
                    </div>
                </div>
            </div>
        `);
        
        container.append(productCard);
    });
    
    // 初始化图片懒加载
    initLazyLoading();
}

// 初始化图片懒加载
function initLazyLoading() {
    // 简单的图片懒加载实现
    $('.product-img').each(function() {
        const img = $(this);
        if (img.attr('src') && !img.hasClass('loaded')) {
            img.addClass('loading');
            img.on('load', function() {
                img.removeClass('loading').addClass('loaded');
            });
        }
    });
}

// 不再使用分页导航，改为无限滚动加载

// 格式化货币
function formatCurrency(price) {
    return '¥' + parseFloat(price).toFixed(2);
}

// 从URL获取参数
function getUrlParam(name) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(name);
}

// 搜索商品
async function searchProducts(keyword) {
    // 设置加载状态
    isLoading = true;
    
    // 显示加载中状态
    $('#products-container').html(`
        <div class="col-12 text-center">
            <div class="spinner-border" role="status">
                <span class="sr-only">加载中...</span>
            </div>
            <p>正在搜索商品...</p>
        </div>
    `);
    
    try {
        // 调用后端搜索API
        const response = await fetchAPI(`/api/products/search?name=${encodeURIComponent(keyword)}`);
        
        // 获取商品列表
        const products = response.list || [];
        
        // 渲染商品列表
        renderProducts(products, false);
        
        // 如果没有搜索结果，显示提示信息
        if (!products || products.length === 0) {
            $('#products-container').html(`
                <div class="col-12 text-center">
                    <div class="alert alert-info">
                        <i class="fas fa-info-circle"></i> 未找到与"${keyword}"相关的商品
                    </div>
                </div>
            `);
        }
    } catch (error) {
        console.error('搜索商品失败:', error);
        showErrorMessage('搜索商品失败: ' + error.message);
        $('#products-container').html('<div class="alert alert-danger">搜索商品失败</div>');
    } finally {
        // 重置加载状态
        isLoading = false;
        // 隐藏加载更多按钮，因为搜索结果不支持分页
        $('#load-more-container').hide();
    }
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