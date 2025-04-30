// API请求配置
// 注意：API基础URL前缀已移除，请在调用时使用完整路径

// 通用的API请求函数
async function fetchAPI(endpoint, options = {}) {
    const token = localStorage.getItem('token');
    const defaultOptions = {
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        credentials: 'include' // 包含cookies
    };
    
    const fetchOptions = {
        ...defaultOptions,
        ...options,
    };
    console.log(`发送请求到: ${endpoint}`, fetchOptions);
    
    try {
        const response = await fetch(endpoint, fetchOptions);
        
        // 处理401未授权错误（未登录）
        if (response.status === 401) {
            // 获取响应内容，检查是否是token问题
            const errorData = await response.json().catch(() => ({}));
            console.log('401错误详情:', errorData);
            
            // 如果是创建订单的请求，不要立即重定向，让错误处理逻辑处理
            if (endpoint.includes('/api/order/create')) {
                // 尝试刷新token
                try {
                    const refreshResult = await fetch('/api/user/refresh-token', {
                        method: 'POST',
                        credentials: 'include'
                    });
                    
                    if (refreshResult.ok) {
                        const newTokenData = await refreshResult.json();
                        if (newTokenData.token) {
                            localStorage.setItem('token', newTokenData.token);
                            console.log('Token已刷新，请重试');
                            return await fetchAPI(endpoint, options); // 使用新token重试
                        }
                    }
                } catch (refreshError) {
                    console.error('刷新token失败:', refreshError);
                }
                
                throw new Error('登录已过期，请重新登录');
            }
            
            localStorage.removeItem('token');
            showErrorMessage('登录已过期，请重新登录');
            setTimeout(() => {
                // 根据当前路径判断重定向到管理员登录还是客户端登录
                if (window.location.pathname.includes('/admin/')) {
                    window.location.href = '/pages/admin/login.html';
                } else {
                    window.location.href = '/pages/client/login.html';
                }
            }, 1500);
            return null;
        }
        
        // 处理其他HTTP错误
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || `请求失败: ${response.status}`);
        }
        
        // 检查响应是否为空
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            return await response.json();
        } else {
            return await response.text();
        }
    } catch (error) {
        console.error('API请求错误:', error);
        throw error;
    }
}

// 检查用户登录状态
async function checkLoginStatus() {
    try {
        const user = await fetchAPI('/api/users/current');
        if (!user) {
            // 如果不是登录页面，则重定向到对应的登录页
            if (!window.location.pathname.includes('/login.html')) {
                // 根据当前路径判断重定向到管理员登录还是客户端登录
                if (window.location.pathname.includes('/admin/')) {
                    window.location.href = '/pages/admin/login.html';
                } else {
                    window.location.href = '/pages/client/login.html';
                }
            }
            return false;
        }
        
        // 根据用户角色进行页面重定向
        // 如果是首次登录或从登录页面跳转
        if (window.location.pathname.includes('/login.html') || window.location.pathname === '/' || window.location.pathname === '/index.html') {
            redirectBasedOnRole(user);
        }
        
        // 检查当前页面是否与用户角色匹配
        checkPagePermission(user);
        
        // 显示当前用户名
        getCurrentUser();
        return true;
    } catch (error) {
        console.error('检查登录状态失败:', error);
        // 如果不是登录页面，则重定向到登录页
        if (!window.location.pathname.includes('/login.html')) {
            window.location.href = '/pages/user/login.html';
        }
        return false;
    }
}

// 退出登录
async function logout() {
    // 使用Bootstrap模态框替代原生confirm
    showConfirmModal("确定要退出登录吗？", async () => {
        try {
            await fetchAPI('/api/users/logout', { method: 'POST' });
            showSuccessMessage("退出登录成功");
            
            // 根据当前路径判断重定向到管理员登录还是客户端登录
            setTimeout(() => {
                if (window.location.pathname.includes('/admin/')) {
                    window.location.href = '/pages/admin/login.html';
                } else {
                    window.location.href = '/pages/client/login.html';
                }
            }, 1500);
        } catch (error) {
            console.error('退出登录失败:', error);
            showErrorMessage('退出登录失败: ' + error.message);
        }
    });
}



// 显示成功消息
function showSuccessMessage(message) {
    const successElement = document.getElementById('success-message');
    if (successElement) {
        successElement.textContent = message;
        successElement.style.display = 'block';
        setTimeout(() => {
            successElement.style.display = 'none';
        }, 3000);
    }
}

// 显示错误消息
function showErrorMessage(message) {
    const errorElement = document.getElementById('error-message');
    if (errorElement) {
        errorElement.textContent = message;
        errorElement.style.display = 'block';
        setTimeout(() => {
            errorElement.style.display = 'none';
        }, 3000);
    }
}

// 格式化日期
function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// 格式化金额
function formatCurrency(amount) {
    if (amount === null || amount === undefined) return '¥0.00';
    return '¥' + parseFloat(amount).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

// 获取当前用户信息并显示
async function getCurrentUser() {
    try {
        const user = await fetchAPI('/api/users/current');
        // 更新顶栏用户名显示
        $('#current-username').text(user.username);
        $('.username-display').text("当前登录用户：" + user.username);
        
        // 加载用户头像到导航栏
        loadUserAvatar(user.userId);
    } catch (error) {
        $('#current-username').text("用户");
        $('.username-display').text("当前状态：未登录");
        console.error('获取用户信息失败:', error);
    }
}

// 根据用户角色进行重定向
function redirectBasedOnRole(user) {
    // 根据用户角色决定跳转到哪个页面
    if (user.role === 1) {
        // 商家/管理员角色，跳转到后台管理页面
        window.location.href = '/pages/admin/user-list.html';
    } else {
        // 普通用户角色，跳转到客户端首页
        window.location.href = '/pages/client/index.html';
    }
}

// 检查当前页面是否与用户角色匹配
function checkPagePermission(user) {
    const currentPath = window.location.pathname;
    
    // 如果是普通用户访问后台页面，重定向到客户端
    if (user.role === 0 && currentPath.includes('/admin/')) {
        showErrorMessage('您没有权限访问该页面');
        setTimeout(() => {
            window.location.href = '/pages/client/index.html';
        }, 2000);
    }
    
    // 如果是管理员访问客户端页面，提示但不重定向
    if (user.role === 1 && currentPath.includes('/client/')) {
        showSuccessMessage('您正在以管理员身份访问客户端页面');
    }
}

// 显示确认模态框
function showConfirmModal(message, confirmCallback) {
    // 检查是否已存在确认模态框，如果不存在则创建
    if ($('#confirmModal').length === 0) {
        const modalHtml = `
        <div class="modal fade" id="confirmModal" tabindex="-1" role="dialog" aria-labelledby="confirmModalLabel" aria-hidden="true">
            <div class="modal-dialog" role="document">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title" id="confirmModalLabel">确认操作</h5>
                        <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                            <span aria-hidden="true">&times;</span>
                        </button>
                    </div>
                    <div class="modal-body">
                        <p id="confirmMessage"></p>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-dismiss="modal">取消</button>
                        <button type="button" class="btn btn-primary" id="confirmActionBtn">确认</button>
                    </div>
                </div>
            </div>
        </div>
        `;
        $('body').append(modalHtml);
    }
    
    // 设置确认消息
    $('#confirmMessage').text(message);
    
    // 绑定确认按钮事件
    $('#confirmActionBtn').off('click').on('click', function() {
        $('#confirmModal').modal('hide');
        if (typeof confirmCallback === 'function') {
            confirmCallback();
        }
    });
    
    // 显示模态框
    $('#confirmModal').modal('show');
}

// 页面加载时初始化导航栏
$(document).ready(function() {
    // 检查是否需要初始化用户信息
    if ($('#current-username').length > 0 || $('.username-display').length > 0) {
        getCurrentUser();
    }
    
    // 绑定退出登录按钮事件
    $('#logout-btn').on('click', function(e) {
        e.preventDefault();
        logout();
    });
});


// 获取URL参数
function getUrlParam(name) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(name);
}

// 加载用户头像
function loadUserAvatar(userId) {
    if (!userId) return;
    
    // 默认设置头像路径
    const defaultAvatarPath = '/images/default-avatar.jpg';
    const navAvatarElement = $('#nav-avatar');
    
    if (navAvatarElement.length === 0) return;
    
    // 显示用户头像 - 从 BLOB 端点加载
    const avatarUrl = `/api/user/avatar/${userId}`;
    const token = localStorage.getItem('token'); // 获取Token
    
    fetch(avatarUrl, {
        headers: {
            'Authorization': `Bearer ${token}` // 添加Authorization Header
        }
    })
    .then(response => {
        if (response.ok) {
            return response.blob();
        } else if (response.status === 404) {
            // 如果头像数据不存在，返回默认头像路径
            return Promise.resolve(new Blob([], { type: 'image/jpg' }));
        } else {
            throw new Error('Failed to load avatar');
        }
    })
    .then(blob => {
        if (blob.size === 0) {
            // 如果返回的是空 Blob，说明是默认头像路径，直接使用默认路径
            navAvatarElement.attr('src', defaultAvatarPath);
        } else {
            const objectURL = URL.createObjectURL(blob);
            navAvatarElement.attr('src', objectURL); // 动态更新头像路径
        }
    })
    .catch(error => {
        console.warn('Failed to load avatar, using default:', error);
        // 保持默认头像路径不变
        navAvatarElement.attr('src', defaultAvatarPath);
    });
}