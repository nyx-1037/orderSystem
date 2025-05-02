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
            // 未登录，根据当前页面路径决定跳转到哪个登录页面
            redirectToLoginPage();
            return false;
        }
    } catch (error) {
        console.error('检查登录状态失败:', error);
        // 根据当前页面路径决定跳转到哪个登录页面
        redirectToLoginPage();
        return false;
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