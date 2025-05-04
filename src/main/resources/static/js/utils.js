/**
 * 通用工具函数
 */

/**
 * 格式化日期时间
 */
function formatDate(dateString) {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    
    return `${year}-${month}-${day} ${hours}:${minutes}`;
}

/**
 * 格式化货币
 */
function formatCurrency(amount) {
    if (amount === undefined || amount === null) return '¥0.00';
    return '¥' + parseFloat(amount).toFixed(2);
}

/**
 * 显示成功消息
 */
function showSuccessMessage(message) {
    // 假设页面中存在 #success-message 和 #error-message 元素
    const successElement = $('#success-message');
    const errorElement = $('#error-message');
    
    if (successElement.length) {
        successElement.html(message).fadeIn(); // 使用 .html() 渲染 HTML
        if (errorElement.length) {
            errorElement.hide();
        }
        
        // 3秒后自动隐藏
        setTimeout(() => {
            successElement.fadeOut();
        }, 3000);
    } else {
        console.warn('无法找到 #success-message 元素');
        alert('成功: ' + message); // Fallback
    }
}

/**
 * 显示错误消息
 */
function showErrorMessage(message) {
    // 假设页面中存在 #success-message 和 #error-message 元素
    const successElement = $('#success-message');
    const errorElement = $('#error-message');
    
    if (errorElement.length) {
        errorElement.text(message).fadeIn();
        if (successElement.length) {
            successElement.hide();
        }
        
        // 3秒后自动隐藏
        setTimeout(() => {
            errorElement.fadeOut();
        }, 3000);
    } else {
        console.warn('无法找到 #error-message 元素');
        alert('错误: ' + message); // Fallback
    }
}

/**
 * 通用API请求函数
 */
async function fetchAPI(url, options = {}) {
    // 默认选项
    const defaultOptions = {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        },
        credentials: 'include' // 包含Cookie
    };
    
    // 从localStorage获取token并添加到请求头
    const token = localStorage.getItem('token');
    if (token) {
        defaultOptions.headers['Authorization'] = `Bearer ${token}`;
    }
    
    // 合并选项
    const fetchOptions = { ...defaultOptions, ...options };
    
    try {
        console.log(`发送${fetchOptions.method}请求到:`, url);
        const response = await fetch(url, fetchOptions);
        
        // 检查响应状态
        if (!response.ok) {
            // 尝试解析错误响应
            let errorData;
            try {
                errorData = await response.json();
            } catch (e) {
                errorData = { message: response.statusText };
            }
            
            // 如果是未授权错误 (401)，根据当前页面决定跳转
            if (response.status === 401) {
                const currentPath = window.location.pathname;
                if (currentPath.includes('/admin/')) {
                     // 只有在非管理员登录页面才跳转
                    if (!currentPath.includes('/admin/login.html')) {
                        window.location.href = '/pages/admin/login.html';
                    }
                } else {
                    // 客户端页面跳转到客户端登录
                     if (!currentPath.includes('/client/login.html')) {
                         window.location.href = '/pages/client/login.html';
                     }
                }
            }
            
            // 抛出错误
            throw new Error(errorData.message || `请求失败: ${response.status}`);
        }
        
        // 解析JSON响应
        const data = await response.json();
        
        // 检查业务逻辑状态码 (如果后端API有统一格式)
        // 注意：此检查可能需要根据您的后端API响应结构进行调整
        // if (data.code !== undefined && data.code !== 200 && data.code !== 0) { // 假设 0 或 200 都表示成功
        //     throw new Error(data.message || '请求处理失败');
        // }
        
        // 返回数据 (根据后端API调整，可能需要返回整个data或data.data)
        // 尝试返回 data.data，如果不存在则返回整个 data 对象
        return data.data !== undefined ? data.data : data;
    } catch (error) {
        console.error('API请求失败:', error);
        // 不在此处重定向，让调用者处理特定的错误逻辑
        // 例如，调用者可以根据错误类型决定是否显示错误消息或执行其他操作
        throw error; // 将错误向上抛出，以便调用者可以捕获和处理
    }
}

/**
 * 根据当前页面路径决定跳转到哪个登录页面
 * (这个函数也比较通用，可以考虑放在这里)
 */
function redirectToLoginPage() {
    // 获取当前页面路径
    const currentPath = window.location.pathname;
    
    // 如果是管理员相关页面，跳转到管理员登录页面
    if (currentPath.includes('/admin/')) {
        // 只有在非管理员登录页面才跳转
        if (!currentPath.includes('/admin/login.html')) {
             window.location.href = '/pages/admin/login.html';
        }
    } else {
        // 否则跳转到客户端登录页面
        if (!currentPath.includes('/client/login.html')) {
            window.location.href = '/pages/client/login.html';
        }
    }
}

/**
 * 退出登录
 * (这个函数也比较通用，可以考虑放在这里)
 */
async function logout() {
    try {
        // 发送退出登录请求 - 使用后端控制器中定义的路径
        await fetchAPI('/api/users/logout', { method: 'POST' });
        
        // 清除localStorage中的token和用户角色等信息
        localStorage.removeItem('token');
        localStorage.removeItem('userRole');
        localStorage.removeItem('userId'); // 如果有userId也清除
        
        // 根据当前页面路径决定跳转到哪个登录页面
        redirectToLoginPage();
    } catch (error) {
        console.error('退出登录失败:', error);
        showErrorMessage('退出登录失败: ' + error.message); // 使用通用错误消息函数
        
        // 即使请求失败，也尝试清除本地存储的认证信息并跳转
        localStorage.removeItem('token');
        localStorage.removeItem('userRole');
        localStorage.removeItem('userId');
        redirectToLoginPage();
    }
}