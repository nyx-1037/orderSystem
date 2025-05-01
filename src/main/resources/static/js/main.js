// 全局JavaScript函数

// 检查用户是否已登录
async function checkLoginStatus() {
    try {
        // 发送请求检查登录状态 - 修正API路径，使用后端控制器中定义的路径
        const response = await fetchAPI('/api/users/current');
        
        if (response && response.username) {
            // 更新导航栏用户名
            $('#current-username').text(response.username);
            return true;
        } else {
            // 未登录，跳转到登录页面
            window.location.href = '/pages/client/login.html';
            return false;
        }
    } catch (error) {
        console.error('检查登录状态失败:', error);
        // 跳转到登录页面
        window.location.href = '/pages/client/login.html';
        return false;
    }
}

// 退出登录
async function logout() {
    try {
        // 发送退出登录请求 - 修正API路径，使用后端控制器中定义的路径
        await fetchAPI('/api/users/logout', { method: 'POST' });
        
        // 跳转到登录页面
        window.location.href = '/pages/client/login.html';
    } catch (error) {
        console.error('退出登录失败:', error);
        alert('退出登录失败: ' + error.message);
    }
}

// 封装的API请求函数
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
            
            // 如果是未授权错误，跳转到登录页面
            if (response.status === 401) {
                window.location.href = '/pages/client/login.html';
            }
            
            // 抛出错误
            throw new Error(errorData.message || `请求失败: ${response.status}`);
        }
        
        // 解析JSON响应
        const data = await response.json();
        
        // 检查业务逻辑状态码
        if (data.code !== undefined && data.code !== 200) {
            throw new Error(data.message || '请求失败');
        }
        
        // 返回数据
        return data.data !== undefined ? data.data : data;
    } catch (error) {
        console.error('API请求失败:', error);
        throw error;
    }
}

// 页面加载完成后执行
$(document).ready(function() {
    // 绑定退出登录按钮事件
    $('#logout-btn').click(function(e) {
        e.preventDefault();
        logout();
    });
});