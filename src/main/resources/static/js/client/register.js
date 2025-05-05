/**
 * 客户端用户注册页面脚本
 */

$(document).ready(function() {
    // 绑定表单提交事件
    $('#register-form').submit(function(e) {
        e.preventDefault();
        register();
    });
});

/**
 * 用户注册函数
 */
async function register() {
    // 获取表单数据
    const username = $('#username').val();
    const password = $('#password').val();
    const confirmPassword = $('#confirm-password').val();
    const nickname = $('#nickname').val();
    
    // 表单验证
    if (!username || !password || !confirmPassword) {
        showErrorMessage('用户名和密码不能为空');
        return;
    }
    
    // 验证用户名格式
    const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
    if (!usernameRegex.test(username)) {
        showErrorMessage('用户名格式不正确，只能包含字母、数字和下划线，长度为3-20个字符');
        return;
    }
    
    // 验证密码长度
    if (password.length < 6) {
        showErrorMessage('密码长度不能少于6个字符');
        return;
    }
    
    // 验证两次密码是否一致
    if (password !== confirmPassword) {
        showErrorMessage('两次输入的密码不一致');
        return;
    }
    
    try {
        // 构建注册数据
        const registerData = {
            username: username,
            password: password,
            realName: nickname || username // 如果没有填写昵称，则使用用户名作为昵称
        };
        
        // 发送注册请求 - 使用RESTful风格的API
        await fetchAPI('/api/users/register', {
            method: 'POST',
            body: JSON.stringify(registerData)
        });
        
        // 显示成功消息
        showSuccessMessage('注册成功，即将跳转到登录页面...');
        
        // 3秒后跳转到登录页面
        setTimeout(() => {
            window.location.href = '/pages/client/login.html';
        }, 3000);
    } catch (error) {
        console.error('注册失败:', error);
        
        // 根据错误信息提供更具体的提示
        let errorMessage = '注册失败';
        
        if (error.message) {
            // 处理特定的错误类型
            if (error.message.includes('用户名已存在')) {
                errorMessage = '该用户名已被注册，请更换其他用户名';
            } else {
                // 使用服务器返回的错误信息
                errorMessage = '注册失败: ' + error.message;
            }
        }
        
        showErrorMessage(errorMessage);
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