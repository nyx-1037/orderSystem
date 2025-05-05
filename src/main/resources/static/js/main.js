// 全局JavaScript函数

// 检查用户是否已登录
async function checkLoginStatus() {
    try {
        // 如果是登录或注册页面，不检查token
        const currentPath = window.location.pathname;
        if (currentPath.includes('/login.html') || currentPath.includes('/register.html')) {
            return false;
        }
        
        // 发送请求检查登录状态 - 修正API路径，使用后端控制器中定义的路径
        const response = await fetchAPI('/api/users/current');
        
        if (response && response.username) {
            // 更新导航栏用户名
            $('#current-username').text(response.username);
            console.log('当前登录用户:', response.username);
            console.log('响应数据:', response);

            // 更新用户头像
            const defaultAvatarPath = '/images/default-avatar.jpg';
            $('#nav-avatar').attr('src', defaultAvatarPath);
            
            if (response.userId) {
                const avatarUrl = `/api/users/avatar/${response.userId}`;
                const token = localStorage.getItem('token');
                
                fetch(avatarUrl, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                })
                .then(response => {
                    if (response.ok) {
                        return response.blob();
                    } else if (response.status === 404) {
                        return Promise.resolve(new Blob([], { type: 'image/jpg' }));
                    } else {
                        throw new Error('Failed to load avatar');
                    }
                })
                .then(blob => {
                    if (blob.size > 0) {
                        const objectURL = URL.createObjectURL(blob);
                        $('#nav-avatar').attr('src', objectURL);
                    }
                })
                .catch(error => {
                    console.warn('加载头像失败，使用默认头像:', error);
                });
            }
            
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
    // 检查并更新登录状态
    checkLoginStatus();
    
    // 绑定退出登录按钮事件
    $('#logout-btn').click(function(e) {
        e.preventDefault();
        logout();
    });
});