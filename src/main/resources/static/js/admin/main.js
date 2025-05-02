/**
 * 管理员页面通用脚本
 */

// 页面加载完成后执行
$(document).ready(function() {
    // 检查管理员登录状态
    checkAdminLoginStatus();
    
    // 绑定退出登录按钮事件
    $('#logout-btn').click(function(e) {
        e.preventDefault();
        logout();
    });
});



/**
 * 检查管理员登录状态
 */
async function checkAdminLoginStatus() {
    try {
        // 从localStorage获取token和用户角色
        const token = localStorage.getItem('token');
        const userRole = localStorage.getItem('userRole');
        
        // 如果当前页面是登录页面，不进行重定向
        if (window.location.pathname.includes('/login.html')) {
            return false;
        }
        
        // 如果没有token或者不是管理员角色，跳转到管理员登录页面
        if (!token || userRole !== '1') {
            window.location.href = '/pages/admin/login.html';
            return false;
        }
        
        // 发送请求检查管理员登录状态 - 使用通用用户API路径，而不是管理员特定路径
        try {
            const response = await fetchAPI('/api/users/current');
            
            if (response && response.username) {
                // 更新导航栏用户名
                $('#current-username').text(response.username);
                return true;
            } else {
                // 未登录或登录已过期，清除localStorage并跳转到管理员登录页面
                localStorage.removeItem('token');
                localStorage.removeItem('userRole');
                localStorage.removeItem('userId');
                window.location.href = '/pages/admin/login.html';
                return false;
            }
        } catch (apiError) {
            // 只有在确认是401未授权错误时才重定向到登录页面
            if (apiError.message && apiError.message.includes('401')) {
                localStorage.removeItem('token');
                localStorage.removeItem('userRole');
                localStorage.removeItem('userId');
                window.location.href = '/pages/admin/login.html';
                return false;
            }
            
            // 对于其他API错误，记录但不重定向，避免循环重定向
            console.error('API请求错误，但继续保持登录状态:', apiError);
            return true;
        }
    } catch (error) {
        console.error('检查管理员登录状态失败:', error);
        // 只在严重错误时才清除登录状态并重定向
        return false;
    }
}