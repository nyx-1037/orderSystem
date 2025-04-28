// 订单创建页面的JavaScript

// 购物车数据
let cartItems = [];

// 页面加载完成后执行
$(document).ready(function() {
    // 检查用户是否已登录
    checkLoginStatus().then(function(isLoggedIn) {
        if (isLoggedIn) {
            // 显示当前用户名
            getCurrentUser();

            // 加载商品列表
            loadProducts();
            
            // 绑定表单提交事件
            $('#order-form').submit(function(e) {
                e.preventDefault();
                submitOrder();
            });
            
            // 绑定退出登录事件
            $('#logout-btn').click(function(e) {
                e.preventDefault();
                logout();
            });
        }
    });
});

// 加载商品列表
async function loadProducts() {
    try {
        const products = await fetchAPI('/api/product/list');
        renderProducts(products);
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
        container.html('<div class="alert alert-info">暂无可购买的商品</div>');
        return;
    }
    
    // 使用模板创建商品项
    const template = document.getElementById('product-item-template');
    
    products.forEach(product => {
        // 只显示上架的商品
        if (product.status !== 1) {
            return;
        }
        
        const clone = document.importNode(template.content, true);
        const productItem = clone.querySelector('.product-item');
        
        // 设置商品数据
        productItem.dataset.id = product.productId;
        productItem.querySelector('.product-name').textContent = product.productName;
        productItem.querySelector('.product-desc').textContent = product.productDesc || '';
        productItem.querySelector('.product-price').textContent = formatCurrency(product.price);
        productItem.querySelector('.product-stock').textContent = product.stock;
        
        // 设置最大可购买数量
        const quantityInput = productItem.querySelector('.quantity-input');
        quantityInput.max = product.stock;
        
        // 获取增减按钮元素
        const decreaseBtn = productItem.querySelector('.decrease-btn');
        const increaseBtn = productItem.querySelector('.increase-btn');
        
        // 如果库存为0，禁用输入框和按钮并显示库存不足提示
        if (product.stock <= 0) {
            quantityInput.disabled = true;
            decreaseBtn.disabled = true;
            increaseBtn.disabled = true;
            
            // 添加库存不足提示
            const outOfStock = document.createElement('p');
            outOfStock.textContent = '库存不足';
            outOfStock.style.color = 'white';
            outOfStock.style.backgroundColor = 'red';
            outOfStock.style.fontWeight = 'bold';
            outOfStock.style.padding = '0 5px';
            outOfStock.style.borderRadius = '3px';
            outOfStock.style.display = 'inline-block';
            productItem.querySelector('.col-md-8').appendChild(outOfStock);
        } else {
            // 初始状态下，数量为0，禁用减号按钮
            decreaseBtn.disabled = true;
            
            // 根据库存数量显示不同提示
            const stockStatus = document.createElement('p');
            if (product.stock < 10) {
                stockStatus.textContent = '库存紧张';
                stockStatus.style.backgroundColor = 'orange';
            } else {
                stockStatus.textContent = '库存充足';
                stockStatus.style.backgroundColor = 'green';
            }
            stockStatus.style.color = 'white';
            stockStatus.style.fontWeight = 'bold';
            stockStatus.style.padding = '0 5px';
            stockStatus.style.borderRadius = '3px';
            stockStatus.style.display = 'inline-block';
            productItem.querySelector('.col-md-8').appendChild(stockStatus);
        }
        
        // 更新按钮状态的函数
        function updateButtonStatus() {
            const currentValue = parseInt(quantityInput.value) || 0;
            const maxValue = parseInt(quantityInput.max) || 0;
            
            // 当数量为0时，禁用减号按钮
            decreaseBtn.disabled = (currentValue <= 0);
            
            // 当数量达到最大值时，禁用加号按钮
            increaseBtn.disabled = (currentValue >= maxValue);
        }
        
        // 绑定数量增减按钮事件
        decreaseBtn.addEventListener('click', function() {
            const currentValue = parseInt(quantityInput.value) || 0;
            if (currentValue > 0) {
                quantityInput.value = currentValue - 1;
                updateCart(product, currentValue - 1);
                updateButtonStatus();
            }
        });
        
        increaseBtn.addEventListener('click', function() {
            const currentValue = parseInt(quantityInput.value) || 0;
            const maxValue = parseInt(quantityInput.max) || 0;
            if (currentValue < maxValue) {
                quantityInput.value = currentValue + 1;
                updateCart(product, currentValue + 1);
                updateButtonStatus();
            }
        });
        
        // 绑定输入框变化事件
        quantityInput.addEventListener('change', function() {
            let value = parseInt(this.value) || 0;
            const maxValue = parseInt(this.max) || 0;
            
            // 确保数量在有效范围内
            if (value < 0) value = 0;
            if (value > maxValue) value = maxValue;
            
            this.value = value;
            updateCart(product, value);
            updateButtonStatus();
        });
        
        // 初始化按钮状态
        updateButtonStatus();
        
        container.append(productItem);
    });
}

// 更新购物车
function updateCart(product, quantity) {
    // 查找商品是否已在购物车中
    const index = cartItems.findIndex(item => item.productId === product.productId);
    
    if (quantity <= 0) {
        // 如果数量为0，从购物车中移除
        if (index !== -1) {
            cartItems.splice(index, 1);
        }
    } else {
        // 更新或添加商品
        if (index !== -1) {
            cartItems[index].quantity = quantity;
        } else {
            cartItems.push({
                productId: product.productId,
                productName: product.productName,
                price: product.price,
                quantity: quantity
            });
            // 调试输出
            console.log('添加商品到购物车:', cartItems);
        }
    }
    
    // 更新购物车显示
    updateCartSummary();
}

// 更新购物车摘要
function updateCartSummary() {
    let totalQuantity = 0;
    let totalAmount = 0;
    
    cartItems.forEach(item => {
        totalQuantity += item.quantity;
        totalAmount += item.price * item.quantity;
    });
    
    $('#total-quantity').text(totalQuantity);
    $('#total-amount').text(formatCurrency(totalAmount));
    
    // 启用或禁用提交按钮
    if (totalQuantity > 0) {
        $('#submit-btn').prop('disabled', false);
    } else {
        $('#submit-btn').prop('disabled', true);
    }
}

function submitOrder() {
    const orderData = {
        receiver: $('#receiver').val(),
        receiverPhone: $('#receiverPhone').val(),
        address: $('#address').val(),
        remark: $('#remark').val(),
        items: []
    };

    // 直接使用购物车中的商品数据，而不是从UI解析
    if (cartItems.length > 0) {
        cartItems.forEach(item => {
            orderData.items.push({
                productId: item.productId,
                quantity: item.quantity,
                productPrice: item.price,  // 使用购物车中存储的原始价格
                productName: item.productName
            });
        });
    }

    if (orderData.items.length === 0) {
        showErrorMessage('请至少选择一件商品');
        return;
    }

    console.log('提交订单数据:', orderData);

    fetchAPI('/api/order/create', {
        method: 'POST',
        body: JSON.stringify(orderData)
    })
    .then(response => {
        // 后端成功返回时会包含orderId或orderUuid，可以用它来判断是否成功
        if (response && (response.orderId || response.success)) {
            console.log('订单创建成功，返回数据:', response);
            showSuccessMessage('订单创建成功');
            setTimeout(() => {
                // 如果有orderUuid，则跳转到详情页，否则跳转到列表页
                if (response.orderUuid) {
                    window.location.href = `/pages/order/detail.html?uuid=${response.orderUuid}`;
                } else {
                    window.location.href = '/pages/order/list.html';
                }
            }, 1500);
        } else if (response && response.message) {
            // 如果有错误消息，则抛出
            throw new Error(response.message);
        } else {
            // 其他情况
            throw new Error('订单创建失败，请稍后再试');
        }
    })
    .catch(error => {
        console.error('创建订单失败:', error);
        showErrorMessage('创建订单失败: ' + error.message);
    });
}
