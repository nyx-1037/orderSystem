/**
 * 通用JavaScript函数库
 * 提供JWT认证和其他通用功能
 */

/**
 * 获取JWT令牌
 * @returns {string} JWT令牌
 */
function getToken() {
    return localStorage.getItem('token');
}

/**
 * 检查用户是否已登录
 * @returns {boolean} 是否已登录
 */
function isLoggedIn() {
    const token = getToken();
    return token !== null && token !== '';
}

/**
 * 获取当前用户信息
 * @returns {Object|null} 用户信息对象或null
 */
function getCurrentUser() {
    const userJson = localStorage.getItem('user');
    if (!userJson) {
        return null;
    }
    try {
        return JSON.parse(userJson);
    } catch (e) {
        console.error('解析用户信息失败', e);
        return null;
    }
}

/**
 * 发送带有JWT认证的AJAX请求
 * @param {string} url 请求URL
 * @param {Object} options 请求选项
 * @returns {Promise} Promise对象
 */
function fetchWithAuth(url, options = {}) {
    const token = getToken();
    const headers = options.headers || {};
    
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    
    return fetch(url, {
        ...options,
        headers
    });
}

/**
 * 处理未授权响应（401）
 * @param {Response} response 响应对象（可选）
 */
function handleUnauthorized(response) {
    console.log('处理未授权访问，清除登录状态');
    
    // 无条件清除本地存储的认证信息，不依赖response参数
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('userRole');

    // 根据当前页面路径确定重定向目标
    const pathname = window.location.pathname;
    
    // 防止重定向循环，检查当前是否已经在登录页面
    if (pathname.endsWith('/login.html')) {
        console.log('已在登录页面，不再重定向');
        return;
    }
    
    // 根据路径确定重定向目标
    if (pathname.startsWith('/pages/admin/')) {
        window.location.href = '/pages/admin/login.html';
    } else if (pathname.startsWith('/pages/client/')) {
        window.location.href = '/pages/client/login.html';
    } else {
        // 默认重定向到通用登录页面
        window.location.href = '/pages/login.html'; 
    }
}

/**
 * 退出登录
 */
function logout() {
    // 清除本地存储的认证信息
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    
    // 重定向到登录页面
    const isAdmin = window.location.href.includes('/admin/');
    window.location.href = isAdmin ? '/pages/admin/login.html' : '/pages/login.html';
}

// 绑定退出登录按钮事件
$(document).ready(function() {
    $('#logoutBtn').click(function(e) {
        e.preventDefault();
        logout();
    });
});