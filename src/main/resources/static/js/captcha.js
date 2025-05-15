/**
 * 验证码相关功能脚本
 */
$(document).ready(function() {
    // 验证码图片点击刷新
    $(document).on('click', '#captchaImage', function() {
        refreshCaptcha();
    });

    // 移除原有的登录表单提交事件，防止冲突
    $('#login-form').off('submit');
    
    // 添加验证码验证到登录表单
    if ($('#login-form').length > 0) {
        $('#login-form').submit(function(e) {
            e.preventDefault();
            
            const username = $('#username').val();
            const password = $('#password').val();
            const captcha = $('#captcha').val();
            
            if (!username || !password || !captcha) {
                showError('请填写所有必填字段');
                return false;
            }
            
            // 验证验证码
            $.ajax({
                url: '/api/captcha/verify',
                type: 'POST',
                data: { captchaCode: captcha },
                success: function(response) {
                    // 验证码验证成功，继续登录流程
                    // 判断是管理员登录还是用户登录
                    const isAdmin = window.location.href.includes('/admin/');
                    const loginUrl = isAdmin ? '/api/admin/auth/login' : '/api/users/login';
                    
                    $.ajax({
                        url: loginUrl,
                        type: 'POST',
                        contentType: 'application/json',
                        data: JSON.stringify({
                            username: username,
                            password: password
                        }),
                        success: function(response) {
                            if (response.success) {
                                // 登录成功，保存token和用户信息
                                localStorage.setItem('token', response.token);
                                localStorage.setItem('userId', response.userId);
                                localStorage.setItem('userRole', response.role);
                                
                                showSuccess('登录成功，正在跳转...');
                                
                                // 根据角色跳转到不同页面
                                setTimeout(function() {
                                    if (isAdmin) {
                                        // 管理员
                                        window.location.href = '/pages/admin/index.html';
                                    } else {
                                        // 普通用户
                                        window.location.href = '/pages/client/index.html';
                                    }
                                }, 1000);
                            } else {
                                showError(response.message || '登录失败');
                                refreshCaptcha();
                            }
                        },
                        error: function(xhr) {
                            let errorMsg = '登录失败';
                            if (xhr.responseJSON && xhr.responseJSON.message) {
                                errorMsg = xhr.responseJSON.message;
                            }
                            showError(errorMsg);
                            refreshCaptcha();
                        }
                    });
                },
                error: function(xhr) {
                    // 验证码验证失败
                    let errorMsg = '验证码错误';
                    if (xhr.responseJSON && xhr.responseJSON.message) {
                        errorMsg = xhr.responseJSON.message;
                    }
                    showError(errorMsg);
                    refreshCaptcha();
                }
            });
            
            return false;
        });
    }
    
    // 移除原有的注册表单提交事件，防止冲突
    $('#register-form').off('submit');
    
    // 添加验证码验证到注册表单
    if ($('#register-form').length > 0) {
        $('#register-form').submit(function(e) {
            e.preventDefault();
            
            const username = $('#username').val();
            const password = $('#password').val();
            const confirmPassword = $('#confirm-password').val();
            const nickname = $('#nickname').val();
            const captcha = $('#captcha').val();
            
            if (!username || !password || !confirmPassword || !captcha) {
                showError('请填写所有必填字段');
                return false;
            }
            
            if (password !== confirmPassword) {
                showError('两次输入的密码不一致');
                return false;
            }
            
            // 验证验证码
            $.ajax({
                url: '/api/captcha/verify',
                type: 'POST',
                data: { captchaCode: captcha },
                success: function(response) {
                    // 验证码验证成功，继续注册流程
                    $.ajax({
                        url: '/api/users/register',
                        type: 'POST',
                        contentType: 'application/json',
                        data: JSON.stringify({
                            username: username,
                            password: password,
                            nickname: nickname || username
                        }),
                        success: function(response) {
                            if (response.success) {
                                showSuccess('注册成功，即将跳转到登录页面...');
                                
                                // 跳转到登录页面
                                setTimeout(function() {
                                    window.location.href = '/pages/client/login.html';
                                }, 2000);
                            } else {
                                showError(response.message || '注册失败');
                                refreshCaptcha();
                            }
                        },
                        error: function(xhr) {
                            let errorMsg = '注册失败';
                            if (xhr.responseJSON && xhr.responseJSON.message) {
                                errorMsg = xhr.responseJSON.message;
                            }
                            showError(errorMsg);
                            refreshCaptcha();
                        }
                    });
                },
                error: function(xhr) {
                    // 验证码验证失败
                    let errorMsg = '验证码错误';
                    if (xhr.responseJSON && xhr.responseJSON.message) {
                        errorMsg = xhr.responseJSON.message;
                    }
                    showError(errorMsg);
                    refreshCaptcha();
                }
            });
            
            return false;
        });
    }
});

/**
 * 刷新验证码
 */
function refreshCaptcha() {
    const captchaImg = $('#captchaImage');
    if (captchaImg.length > 0) {
        captchaImg.attr('src', '/api/captcha/image?' + new Date().getTime());
    }
}

/**
 * 显示错误信息
 * @param {string} message 错误信息
 */
function showError(message) {
    $('#error-message').text(message).show();
    $('#success-message').hide();
    
    // 3秒后自动隐藏错误信息
    setTimeout(function() {
        $('#error-message').fadeOut();
    }, 3000);
}

/**
 * 显示成功信息
 * @param {string} message 成功信息
 */
function showSuccess(message) {
    $('#success-message').text(message).show();
    $('#error-message').hide();
    
    // 3秒后自动隐藏成功信息
    setTimeout(function() {
        $('#success-message').fadeOut();
    }, 3000);
}

// 这里不再需要单独的loginUser和registerUser函数，因为已经整合到表单提交事件中

/**
 * 显示成功消息
 * @param {string} message - 成功消息内容
 */
function showSuccess(message) {
    $('#success-message').text(message).show();
    $('#error-message').hide();
}

/**
 * 显示错误消息
 * @param {string} message - 错误消息内容
 */
function showError(message) {
    $('#error-message').text(message).show();
    $('#success-message').hide();
}