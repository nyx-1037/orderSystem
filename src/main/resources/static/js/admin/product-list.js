/**
 * 管理员商品管理页面脚本
 */

// 页面变量
let currentPage = 1;
let totalPages = 1;
let pageSize = 10;
let pageSizeOptions = [5, 10, 20, 50]; // 分页大小选项
let isEditMode = false;
let productImageFile = null;

// 显示错误消息
function showErrorMessage(message) {
    $('#error-message').text(message).fadeIn();
    setTimeout(() => {
        $('#error-message').fadeOut();
    }, 3000);
}

// 页面加载完成后执行
$(document).ready(function() {
    // 检查管理员登录状态 (使用 admin/main.js 中的函数)
    checkAdminLoginStatus().then(isLoggedIn => {
        if (isLoggedIn) {
            // 初始化页面
            initProductListPage();
            
            // 绑定搜索按钮事件
            $('#search-btn').click(function() {
                currentPage = 1;
                loadProducts();
            });
            
            // 绑定重置按钮点击事件
            $('#reset-btn').click(function() {
                $('#search-form')[0].reset();
                currentPage = 1;
                loadProducts();
            });
            
            // 绑定分页大小选择器事件
            $('#page-size-selector').change(function() {
                pageSize = parseInt($(this).val());
                currentPage = 1; // 切换每页条数时重置为第一页
                loadProducts();
            });
            
            // 绑定页码跳转事件
            $('#goto-page-btn').click(function() {
                const pageNum = parseInt($('#goto-page-input').val());
                if (pageNum && pageNum > 0 && pageNum <= totalPages) {
                    currentPage = pageNum;
                    loadProducts();
                } else {
                    showErrorMessage(`请输入有效的页码 (1-${totalPages})`);
                }
            });
            
            // 绑定添加商品按钮事件
            $('#add-product-btn').click(function() {
                showProductModal();
            });
            
            // 绑定保存商品按钮事件
            $('#save-product-btn').click(function() {
                saveProduct();
            });
            
            // 绑定批量删除按钮事件
            $('#batch-delete-btn').click(function() {
                const selectedIds = [];
                $('.product-checkbox:checked').each(function() {
                    selectedIds.push($(this).data('id'));
                });
                
                if (selectedIds.length === 0) {
                    showErrorMessage('请至少选择一个商品');
                    return;
                }
                
                batchDeleteProducts(selectedIds);
            });
            
            // 绑定全选/取消全选事件
            $('#select-all').change(function() {
                const isChecked = $(this).prop('checked');
                $('.product-checkbox').prop('checked', isChecked);
                updateBatchDeleteButton();
            });
            
            // 绑定商品图片上传预览事件
            $('#productImage').change(function(e) {
                const file = e.target.files[0];
                if (file) {
                    productImageFile = file;
                    const reader = new FileReader();
                    reader.onload = function(e) {
                        $('#preview-img').attr('src', e.target.result);
                        $('#image-preview').show();
                    };
                    reader.readAsDataURL(file);
                    $('.custom-file-label').text(file.name);
                } else {
                    productImageFile = null;
                    $('#image-preview').hide();
                    $('.custom-file-label').text('选择图片');
                }
            });
            
            // 加载商品分类
            loadCategories();
        }
    });
});

// 初始化商品列表页面
function initProductListPage() {
    // 加载第一页商品数据
    loadProducts();
    
    // 监听商品复选框变化
    $(document).on('change', '.product-checkbox', function() {
        updateBatchDeleteButton();
    });
    
    // 初始化分页大小选择器
    initPageSizeSelector();
}

// 初始化分页大小选择器
function initPageSizeSelector() {
    const pageSizeSelector = $('#page-size-selector');
    pageSizeSelector.empty();
    
    // 添加选项
    pageSizeOptions.forEach(size => {
        pageSizeSelector.append(`<option value="${size}"${size === pageSize ? ' selected' : ''}>${size}条/页</option>`);
    });
}

// 更新批量删除按钮显示状态
function updateBatchDeleteButton() {
    const hasChecked = $('.product-checkbox:checked').length > 0;
    $('#batch-delete-btn').toggle(hasChecked);
}

// 加载商品分类选项
async function loadCategories() {
    // 定义分类数据
    const categories = [
        { id: 0, name: '其他' },
        { id: 1, name: '电子产品' },
        { id: 2, name: '服装' },
        { id: 3, name: '食品' },
        { id: 4, name: '图书' },
        { id: 5, name: '家居' }
    ];
    
    // 填充筛选表单的分类下拉框
    const categorySelect = $('#category');
    categorySelect.empty().append('<option value="">全部</option>');
    categories.forEach(category => {
        categorySelect.append(`<option value="${category.id}">${category.name}</option>`);
    });
    
    // 填充编辑表单的分类下拉框
    const categoryInput = $('#categoryInput');
    categoryInput.empty();
    categories.forEach(category => {
        categoryInput.append(`<option value="${category.id}">${category.name}</option>`);
    });
    
    // 显示分类相关UI元素
    $('#category').parent().show();
    $('#categoryInput').parent().show();
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

// 加载商品数据
async function loadProducts() {
    // 显示加载中状态
    $('#product-list').html(`
        <tr>
            <td colspan="9" class="text-center py-3">
                <div class="spinner-border text-primary" role="status">
                    <span class="sr-only">加载中...</span>
                </div>
                <p class="mt-2">正在加载商品数据...</p>
            </td>
        </tr>
    `);
    
    try {
        // 构建查询参数
        const params = new URLSearchParams();
        params.append('pageNum', currentPage);
        params.append('pageSize', pageSize);
        
        // 添加筛选条件
        const productName = $('#productName').val();
        const category = $('#category').val();
        const status = $('#status').val();
        
        if (productName) params.append('name', productName);
        if (category) params.append('category', category);
        if (status) params.append('status', status);
        
        // 发送API请求 - 使用RESTful风格，与ProductController中定义的路径一致
        let apiUrl = `/api/products?${params.toString()}`;
        console.log('请求商品列表URL:', apiUrl);
        
        // 获取认证Token
        const token = localStorage.getItem('token');
        const headers = {
            'Content-Type': 'application/json'
        };
        
        // 添加认证头
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        
        let response;
        try {
            response = await fetchAPI(apiUrl, { 
                method: 'GET',
                headers: headers
            });
        } catch (error) {
            console.error('商品API请求失败:', error);
            throw error;
        }
        
        // 更新分页信息
        totalPages = response.pages || 1;
        const products = response.list || [];
        
        // 渲染商品列表
        renderProductList(products);
        
        // 渲染分页
        renderPagination();
    } catch (error) {
        console.error('加载商品列表失败:', error);
        showErrorMessage('加载商品列表失败: ' + error.message);
        $('#product-list').html(`
            <tr>
                <td colspan="9" class="text-center py-3">
                    <div class="alert alert-danger mb-0">
                        加载商品列表失败: ${error.message}
                        <button class="btn btn-sm btn-outline-danger ml-2" onclick="loadProducts()">
                            <i class="fas fa-sync-alt"></i> 重试
                        </button>
                    </div>
                </td>
            </tr>
        `);
    }
}

// 渲染商品列表
function renderProductList(products) {
    const tbody = $('#product-list');
    tbody.empty();
    
    if (!products || products.length === 0) {
        tbody.html(`
            <tr>
                <td colspan="9" class="text-center py-3">
                    <p class="text-muted mb-0">暂无商品数据</p>
                </td>
            </tr>
        `);
        return;
    }
    
    // 为每个商品添加分类名称
    products.forEach(product => {
        if (product.category === undefined || product.category === null) {
            product.category = 0; // 默认为其他分类
        }
        product.categoryName = getCategoryName(product.category);
    });
    
    products.forEach(product => {
        const statusBadge = product.status === 1 
            ? '<span class="badge badge-success">上架</span>' 
            : '<span class="badge badge-secondary">下架</span>';
        
        const row = $(`
            <tr>
                <td>
                    <div class="custom-control custom-checkbox">
                        <input type="checkbox" class="custom-control-input product-checkbox" 
                               id="product-${product.productId}" data-id="${product.productId}">
                        <label class="custom-control-label" for="product-${product.productId}"></label>
                    </div>
                </td>
                <td>${product.productId}</td>
                <td>
                    <img src="/api/products/${product.productId}/image" class="img-thumbnail" 
                         style="width: 50px; height: 50px; object-fit: cover;"
                         onerror="this.onerror=null; this.src='/images/default-product.jpg';">
                </td>
                <td>${product.productName}</td>
                <td>${product.categoryName}</td>
                <td>${formatCurrency(product.price)}</td>
                <td>${product.stock}</td>
                <td>${statusBadge}</td>
                <td>
                    <button class="btn btn-sm btn-info mr-1" onclick="editProduct(${product.productId})">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="deleteProduct(${product.productId})">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `);
        
        tbody.append(row);
    });
}

// 渲染分页
function renderPagination() {
    const pagination = $('#pagination');
    pagination.empty();
    
    // 如果只有一页，不显示分页
    if (totalPages <= 1) {
        return;
    }
    
    // 更新页码输入框的最大值和当前值
    $('#goto-page-input').attr('max', totalPages).val(currentPage);
    
    // 更新页面显示的分页信息
    $('#current-page').text(currentPage);
    $('#total-pages').text(totalPages);
    
    // 更新分页大小选择器
    $('#page-size-selector').val(pageSize);
    
    // 上一页按钮
    const prevBtn = $(`
        <li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
            <a class="page-link" href="javascript:void(0)" aria-label="Previous">
                <span aria-hidden="true">&laquo;</span>
            </a>
        </li>
    `);
    prevBtn.click(function() {
        if (currentPage > 1) {
            currentPage--;
            loadProducts();
        }
    });
    pagination.append(prevBtn);
    
    // 页码按钮
    const maxPageButtons = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxPageButtons / 2));
    let endPage = Math.min(totalPages, startPage + maxPageButtons - 1);
    
    if (endPage - startPage + 1 < maxPageButtons) {
        startPage = Math.max(1, endPage - maxPageButtons + 1);
    }
    
    for (let i = startPage; i <= endPage; i++) {
        const pageBtn = $(`
            <li class="page-item ${i === currentPage ? 'active' : ''}">
                <a class="page-link" href="javascript:void(0)">${i}</a>
            </li>
        `);
        pageBtn.click(function() {
            currentPage = i;
            loadProducts();
        });
        pagination.append(pageBtn);
    }
    
    // 下一页按钮
    const nextBtn = $(`
        <li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
            <a class="page-link" href="javascript:void(0)" aria-label="Next">
                <span aria-hidden="true">&raquo;</span>
            </a>
        </li>
    `);
    nextBtn.click(function() {
        if (currentPage < totalPages) {
            currentPage++;
            loadProducts();
        }
    });
    pagination.append(nextBtn);
}

// 显示商品编辑模态框
function showProductModal(productId = null) {
    // 重置表单
    $('#product-form')[0].reset();
    $('#productId').val('');
    $('#image-preview').hide();
    $('.custom-file-label').text('选择图片');
    productImageFile = null;
    
    if (productId) {
        // 编辑模式
        isEditMode = true;
        $('#productModalTitle').text('编辑商品');
        loadProductDetail(productId);
    } else {
        // 添加模式
        isEditMode = false;
        $('#productModalTitle').text('添加商品');
    }
    
    $('#productModal').modal('show');
}

// 加载商品详情
async function loadProductDetail(productId) {
    try {
        // 获取认证Token
        const token = localStorage.getItem('token');
        const headers = {
            'Content-Type': 'application/json'
        };
        
        // 添加认证头
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        
        const product = await fetchAPI(`/api/products/${productId}`, {
            method: 'GET',
            headers: headers
        });
        
        // 填充表单数据
        $('#productId').val(product.productId);
        $('#productNameInput').val(product.productName);
        $('#categoryInput').val(product.category || 0); // 设置分类，默认为0（其他）
        $('#priceInput').val(product.price);
        $('#stockInput').val(product.stock);
        $('#statusInput').val(product.status);
        $('#descriptionInput').val(product.productDesc); // 使用正确的字段名
        
        // 显示商品图片，修正API路径并添加token
        const imageUrl = `/api/products/${product.productId}/image`;
        // 添加时间戳防止缓存
        const timestamp = new Date().getTime();
        $('#preview-img').attr('src', `${imageUrl}?t=${timestamp}`);
        
        // 设置图片加载错误处理
        $('#preview-img').on('error', function() {
            this.onerror = null;
            this.src = '/images/default-product.jpg';
            console.log('商品图片加载失败，使用默认图片');
        });
        
        $('#image-preview').show();
    } catch (error) {
        console.error('加载商品详情失败:', error);
        showErrorMessage('加载商品详情失败: ' + error.message);
    }
}

// 保存商品
async function saveProduct() {
    // 获取表单数据
    const productId = $('#productId').val();
    const productName = $('#productNameInput').val();
    const category = $('#categoryInput').val();
    const price = $('#priceInput').val();
    const stock = $('#stockInput').val();
    const status = $('#statusInput').val();
    const productDesc = $('#descriptionInput').val(); // 使用正确的字段名
    
    // 验证表单数据
    if (!productName || !price || stock === '') {
        showErrorMessage('请填写必填字段');
        return;
    }
    
    try {
        // 准备商品数据
        const productData = {
            productName,
            category,
            price,
            stock,
            status,
            productDesc // 使用正确的字段名
        };
        
        if (isEditMode && productId) {
            // 更新商品
            productData.productId = productId;
            await fetchAPI(`/api/products/${productId}`, {
                method: 'PUT',
                body: JSON.stringify(productData)
            });
            
            // 如果有新图片，上传图片
            if (productImageFile) {
                await uploadProductImage(productId, productImageFile);
            }
            
            showSuccessMessage('商品更新成功');
        } else {
            // 创建商品 - UUID将由后端自动生成
            const newProduct = await fetchAPI('/api/products', {
                method: 'POST',
                body: JSON.stringify(productData)
            });
            
            // 如果有图片，上传图片
            if (productImageFile && newProduct.productId) {
                await uploadProductImage(newProduct.productId, productImageFile);
            }
            
            showSuccessMessage('商品添加成功');
        }
        
        // 关闭模态框并刷新列表
        $('#productModal').modal('hide');
        loadProducts();
    } catch (error) {
        console.error('保存商品失败:', error);
        showErrorMessage('保存商品失败: ' + error.message);
    }
}

// 上传商品图片
async function uploadProductImage(productId, file) {
    const formData = new FormData();
    formData.append('file', file); // 使用正确的参数名
    
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/products/${productId}/image`, {
            method: 'POST',
            body: formData,
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || `上传失败，状态码: ${response.status}`);
        }
        
        console.log('商品图片上传成功');
    } catch (error) {
        console.error('上传商品图片失败:', error);
        throw new Error('上传商品图片失败: ' + error.message);
    }
}

// 编辑商品
function editProduct(productId) {
    showProductModal(productId);
}

// 删除商品
function deleteProduct(productId) {
    showConfirmModal(`确定要删除ID为 ${productId} 的商品吗？`, async () => {
        try {
            await fetchAPI(`/api/products/${productId}`, {
                method: 'DELETE'
            });
            
            showSuccessMessage('商品删除成功');
            loadProducts();
        } catch (error) {
            console.error('删除商品失败:', error);
            showErrorMessage('删除商品失败: ' + error.message);
        }
    });
}

// 批量删除商品
async function batchDeleteProducts(productIds) {
    showConfirmModal(`确定要删除选中的 ${productIds.length} 个商品吗？`, async () => {
        try {
            // 由于后端可能没有批量删除API，改为逐个删除
            for (const productId of productIds) {
                await fetchAPI(`/api/products/${productId}`, {
                    method: 'DELETE'
                });
            }
            
            showSuccessMessage(`成功删除 ${productIds.length} 个商品`);
            $('#select-all').prop('checked', false);
            updateBatchDeleteButton();
            loadProducts();
        } catch (error) {
            console.error('批量删除商品失败:', error);
            showErrorMessage('批量删除商品失败: ' + error.message);
        }
    });
}

// 格式化货币
function formatCurrency(price) {
    return '¥' + parseFloat(price).toFixed(2);
}