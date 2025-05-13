/**
 * 管理员登录页面脚本
 */

$(document).ready(function() {
    // 绑定表单提交事件
    $('#login-form').submit(function(e) {
        e.preventDefault();
        login();
    });
});

/**
 * 管理员登录函数
 */
async function login() {
    // 获取表单数据
    const username = $('#username').val();
    const password = $('#password').val();
    
    // 验证表单数据
    if (!username || !password) {
        showErrorMessage('用户名和密码不能为空');
        return;
    }
    
    try {
        // 发送登录请求 - 使用RESTful风格的API
        const response = await fetchAPI('/api/admin/auth/login', {
            method: 'POST',
            body: JSON.stringify({
                username: username,
                password: password
            })
        });
        
        // 保存token到localStorage
        localStorage.setItem('token', response.token);
        localStorage.setItem('userRole', response.role);
        
        // 确保保存了用户ID
        if (response.userId) {
            localStorage.setItem('userId', response.userId);
        }
        
        showSuccessMessage('登录成功，正在跳转...');
        
        // 管理员登录成功后跳转到管理员首页
        setTimeout(() => {
            window.location.href = '/pages/admin/index.html';
        }, 1500);
    } catch (error) {
        console.error('登录失败:', error);
        
        // 根据错误信息提供更具体的提示
        let errorMessage = '登录失败';
        
        if (error.message) {
            // 处理特定的错误类型
            if (error.message.includes('用户不存在')) {
                errorMessage = '账户不存在，请检查用户名';
            } else if (error.message.includes('密码错误') || error.message.includes('密码不正确')) {
                errorMessage = '密码错误，请重新输入';
            } else if (error.message.includes('账户已锁定') || error.message.includes('账号已锁定')) {
                errorMessage = '账户已锁定，请联系管理员';
            } else if (error.message.includes('权限不足') || error.message.includes('非管理员')) {
                errorMessage = '您不是管理员，无法登录管理后台';
            } else {
                // 使用服务器返回的错误信息
                errorMessage = '登录失败: ' + error.message;
            }
        }
        
        showErrorMessage(errorMessage);
        
        // 如果是密码错误，清空密码输入框并聚焦
        if (errorMessage.includes('密码错误')) {
            $('#password').val('').focus();
        }
    }
}

/**
 * 显示成功消息
 * @param {string} message - 成功消息内容
 */
function showSuccessMessage(message) {
    $('#success-message').text(message).show();
    $('#error-message').hide();
}

/**
 * 显示错误消息
 * @param {string} message - 错误消息内容
 */
function showErrorMessage(message) {
    $('#error-message').text(message).show();
    $('#success-message').hide();
}