// 客户端商品列表页面的JavaScript

// 当前页码和每页显示数量
let currentPage = 1;
const pageSize = 12;
let totalProducts = 0;
let currentSort = 'default';
let currentKeyword = '';

// 页面加载完成后执行
$(document).ready(function() {
    // 检查用户是否已登录
    checkLoginStatus().then(function(isLoggedIn) {
        if (isLoggedIn) {
            // 获取URL中的搜索关键词
            currentKeyword = getUrlParam('keyword') || '';
            if (currentKeyword) {
                $('#search-input').val(decodeURIComponent(currentKeyword));
            }
            
            // 加载商品列表
            loadProducts(currentPage, pageSize, currentSort, currentKeyword);
            
            // 绑定退出登录事件
            $('#logout-btn').click(function(e) {
                e.preventDefault();
                logout();
            });
            
            // 绑定搜索按钮事件
            $('#search-btn').click(function() {
                const keyword = $('#search-input').val().trim();
                currentKeyword = keyword;
                currentPage = 1; // 重置为第一页
                loadProducts(currentPage, pageSize, currentSort, currentKeyword);
            });
            
            // 绑定搜索框回车事件
            $('#search-input').keypress(function(e) {
                if (e.which === 13) {
                    const keyword = $(this).val().trim();
                    currentKeyword = keyword;
                    currentPage = 1; // 重置为第一页
                    loadProducts(currentPage, pageSize, currentSort, currentKeyword);
                }
            });
            
            // 绑定排序选项事件
            $('.sort-option').click(function(e) {
                e.preventDefault();
                const sortType = $(this).data('sort');
                currentSort = sortType;
                currentPage = 1; // 重置为第一页
                $('#sortDropdown').text($(this).text());
                loadProducts(currentPage, pageSize, currentSort, currentKeyword);
            });
        }
    });
});

// 加载商品列表
async function loadProducts(page, size, sort, keyword) {
    try {
        // 显示加载中
        $('#products-container').html('<div class="text-center"><div class="spinner-border" role="status"><span class="sr-only">加载中...</span></div></div>');
        
        // 构建API URL - 修正API路径，使用后端控制器中定义的路径
        let apiUrl = '/api/products';
        
        // 请求商品列表数据
        const response = await fetchAPI(apiUrl);
        const products = response.list || [];
        
        // 过滤上架商品
        let filteredProducts = products.filter(product => product.status === 1);
        
        // 如果有关键词，进行过滤
        if (keyword) {
            filteredProducts = filteredProducts.filter(product => 
                product.productName.toLowerCase().includes(keyword.toLowerCase()) ||
                (product.productDesc && product.productDesc.toLowerCase().includes(keyword.toLowerCase()))
            );
        }
        
        // 排序
        switch (sort) {
            case 'price-asc':
                filteredProducts.sort((a, b) => a.price - b.price);
                break;
            case 'price-desc':
                filteredProducts.sort((a, b) => b.price - a.price);
                break;
            case 'newest':
                filteredProducts.sort((a, b) => new Date(b.createTime) - new Date(a.createTime));
                break;
            default:
                // 默认排序，保持原顺序
                break;
        }
        
        // 计算总商品数和总页数
        totalProducts = filteredProducts.length;
        const totalPages = Math.ceil(totalProducts / size);
        
        // 分页
        const startIndex = (page - 1) * size;
        const endIndex = Math.min(startIndex + size, totalProducts);
        const pagedProducts = filteredProducts.slice(startIndex, endIndex);
        
        // 渲染商品列表
        renderProducts(pagedProducts);
        
        // 渲染分页
        renderPagination(page, totalPages);
    } catch (error) {
        console.error('加载商品列表失败:', error);
        showErrorMessage('加载商品列表失败: ' + error.message);
        $('#products-container').html('<div class="alert alert-danger">加载商品列表失败</div>');
    }
}

// 渲染商品列表
function renderProducts(products) {
    const container = $('#products-container');
    container.empty();

    if (!products || products.length === 0) {
        container.html('<div class="col-12"><div class="alert alert-info">暂无商品</div></div>');
        return;
    }

    products.forEach(product => {
        // 使用正确的图片路径 - 修正API路径，使用后端控制器中定义的路径
        let imageUrl = `/api/products/${product.productId}/image`;
        
        // 设置库存状态文本和样式
        let stockStatusText = product.stock > 0 ? `库存: ${product.stock}` : '缺货';
        let stockStatusClass = product.stock > 0 ? 'text-success' : 'text-danger';
        
        const productCard = $(`
            <div class="col-md-4 mb-4">
                <div class="card product-card">
                    <img data-src="${imageUrl}" 
                         class="product-image" 
                         alt="${product.productName}"
                         onerror="this.onerror=null; this.src='/images/default-product.jpg';">
                    <div class="card-body">
                        <h5 class="card-title product-name">${product.productName}</h5>
                        <p class="card-text text-muted">${formatCurrency(product.price)}</p>
                        <p class="card-text"><span class="${stockStatusClass}">${stockStatusText}</span></p>
                    </div>
                    <div class="card-footer">
                        <button class="btn btn-primary btn-sm w-100" onclick="window.location.href='/pages/client/product-detail.html?id=${product.productId}'" ${product.stock <= 0 ? 'disabled' : ''}>
                            ${product.stock <= 0 ? '暂时缺货' : '查看详情'}
                        </button>
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

// 渲染分页
function renderPagination(currentPage, totalPages) {
    const pagination = $('#pagination');
    pagination.empty();
    
    // 如果总页数小于等于1，不显示分页
    if (totalPages <= 1) {
        return;
    }
    
    // 上一页按钮
    const prevLi = $(`<li class="page-item ${currentPage === 1 ? 'disabled' : ''}"></li>`);
    prevLi.append(`<a class="page-link" href="#" data-page="${currentPage - 1}">上一页</a>`);
    pagination.append(prevLi);
    
    // 页码按钮
    const startPage = Math.max(1, currentPage - 2);
    const endPage = Math.min(totalPages, startPage + 4);
    
    for (let i = startPage; i <= endPage; i++) {
        const pageLi = $(`<li class="page-item ${i === currentPage ? 'active' : ''}"></li>`);
        pageLi.append(`<a class="page-link" href="#" data-page="${i}">${i}</a>`);
        pagination.append(pageLi);
    }
    
    // 下一页按钮
    const nextLi = $(`<li class="page-item ${currentPage === totalPages ? 'disabled' : ''}"></li>`);
    nextLi.append(`<a class="page-link" href="#" data-page="${currentPage + 1}">下一页</a>`);
    pagination.append(nextLi);
    
    // 绑定页码点击事件
    $('.page-link').click(function(e) {
        e.preventDefault();
        if (!$(this).parent().hasClass('disabled') && !$(this).parent().hasClass('active')) {
            const page = parseInt($(this).data('page'));
            currentPage = page;
            loadProducts(currentPage, pageSize, currentSort, currentKeyword);
            // 滚动到顶部
            window.scrollTo(0, 0);
        }
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