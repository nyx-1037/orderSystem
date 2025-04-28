/**
 * 系统日志控制台JavaScript
 */

// 当前页码和每页数量
let currentPage = 1;
let pageSize = 10; // 改为变量，支持动态修改

/* 添加未知状态码的样式 */
document.addEventListener('DOMContentLoaded', function() {
    const style = document.createElement('style');
    style.textContent = `
        .log-status-unknown {
            background-color: #6c757d;
            color: white;
            padding: 2px 6px;
            border-radius: 4px;
            font-size: 0.85em;
        }
    `;
    document.head.appendChild(style);
});

/**
 * 格式化日期时间
 * @param {string|Date} dateTime - 日期时间对象或字符串
 * @returns {string} 格式化后的日期时间字符串
 */
function formatDateTime(dateTime) {
    if (!dateTime) return '-';
    
    const date = new Date(dateTime);
    if (isNaN(date.getTime())) return dateTime; // 如果转换失败，返回原始值
    
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

/**
 * 截断文本
 * @param {string} text - 原始文本
 * @param {number} maxLength - 最大长度
 * @returns {string} 截断后的文本
 */
function truncateText(text, maxLength) {
    if (!text) return '-';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
}

// 页面加载完成后执行
$(document).ready(function() {
    // 检查用户是否已登录
    checkLogin();
    
    // 初始化页面大小选择器
    $('#page-size-select').val(pageSize);
    
    // 加载日志数据
    loadLogs(currentPage, pageSize);
    
    // 绑定页面大小选择事件
    $('#page-size-select').on('change', function() {
        pageSize = parseInt($(this).val());
        currentPage = 1; // 重置为第一页
        loadLogs(currentPage, pageSize);
    });
    
    // 绑定筛选表单提交事件
    $('#log-filter-form').on('submit', function(e) {
        e.preventDefault();
        currentPage = 1; // 重置为第一页
        loadLogs(currentPage, pageSize);
    });
    
    // 绑定重置筛选按钮事件
    $('#reset-filter-btn').on('click', function() {
        $('#log-filter-form')[0].reset();
        currentPage = 1; // 重置为第一页
        loadLogs(currentPage, pageSize);
    });
    
    // 绑定批量删除按钮事件
    $('#batch-delete-btn').on('click', batchDeleteLogs);
    
    // 绑定退出登录按钮事件
    $('#logout-btn').on('click', logout);
    
    // 绑定删除按钮事件委托（因为按钮是动态生成的）
    $('#log-table-body').on('click', '.delete-log-btn', function() {
        const logId = $(this).data('log-id');
        deleteLog(logId);
    });
    
    // 绑定在线用户按钮事件
    $('#online-users-btn').on('click', function() {
        loadOnlineUsers();
    });
    
    // 绑定刷新在线用户按钮事件
    $('#refresh-online-users-btn').on('click', function() {
        loadOnlineUsers();
    });
    
    // 绑定同步日志按钮事件
    $('#sync-logs-btn').on('click', function() {
        syncLogsToDatabase();
    });
    
    // 绑定在线用户表格中的强制登出按钮事件委托
    $('#online-users-table-body').on('click', '.force-logout-btn', function() {
        const userId = $(this).data('user-id');
        const username = $(this).data('username');
        forceUserLogout(userId, username);
    });
    
    // 绑定全选/取消全选事件
    $('#select-all-logs').on('change', function() {
        const isChecked = $(this).prop('checked');
        $('.log-checkbox').prop('checked', isChecked);
    });
    
    // 当任何单个复选框状态改变时，检查是否需要更新全选框状态
    $('#log-table-body').on('change', '.log-checkbox', function() {
        updateSelectAllCheckbox();
    });
});

/**
 * 更新全选复选框状态
 */
function updateSelectAllCheckbox() {
    const totalCheckboxes = $('.log-checkbox').length;
    const checkedCheckboxes = $('.log-checkbox:checked').length;
    $('#select-all-logs').prop('checked', totalCheckboxes === checkedCheckboxes && totalCheckboxes > 0);
}

/**
 * 同步Redis和MySQL中的日志数据
 */
function syncLogsToDatabase() {
    // 显示同步中的按钮状态
    const $syncBtn = $('#sync-logs-btn');
    const originalHtml = $syncBtn.html();
    $syncBtn.html('<i class="fas fa-spinner fa-spin"></i> 同步中...');
    $syncBtn.prop('disabled', true);
    
    // 发送同步请求
    $.ajax({
        url: '/api/syslog/sync-logs',
        type: 'POST',
        headers: {
            'Authorization': 'Bearer ' + localStorage.getItem('token')
        },
        success: function(response) {
            // 恢复按钮状态
            $syncBtn.html(originalHtml);
            $syncBtn.prop('disabled', false);
            
            // 显示成功消息
            if (response && response.count > 0) {
                showSuccessMessage(`日志同步成功，共同步 ${response.count} 条日志记录`);
            } else {
                showSuccessMessage('没有需要同步的日志记录');
            }
            
            // 重新加载日志数据
            loadLogs(currentPage, pageSize);
        },
        error: function(xhr) {
            // 恢复按钮状态
            $syncBtn.html(originalHtml);
            $syncBtn.prop('disabled', false);
            
            // 显示错误消息
            showErrorMessage('同步日志失败: ' + (xhr.responseText || '未知错误'));
        }
    });
}


/**
 * 检查用户是否已登录
 */
function checkLogin() {
    const token = localStorage.getItem('token');
    if (!token) {
        showErrorMessage('请先登录');
        setTimeout(() => {
            window.location.href = '/pages/user/login.html';
        }, 1500);
        return;
    }
    
    // 显示当前用户名
    const username = localStorage.getItem('username');
    if (username) {
        $('#current-username').text(username);
    }
}

/**
 * 加载日志数据
 * @param {number} pageNum - 页码
 * @param {number} pageSize - 每页数量
 */
async function loadLogs(pageNum, pageSize) {
    try {
        // 显示加载中提示
        $('#log-table-body').html('<tr><td colspan="8" class="text-center"><div class="spinner-border text-primary" role="status"><span class="sr-only">加载中...</span></div></td></tr>');
        
        // 构建查询参数
        const params = new URLSearchParams();
        params.append('pageNum', pageNum);
        params.append('pageSize', pageSize);
        
        // 添加筛选条件
        const username = $('#filter-username').val();
        const operation = $('#filter-operation').val();
        const statusCode = $('#filter-status').val();
        const ip = $('#filter-ip').val();
        let startTime = $('#filter-start-time').val();
        let endTime = $('#filter-end-time').val();
        
        // 处理日期时间格式
        if (startTime) {
            startTime = startTime.replace('T', ' ') + ':00';
            params.append('startTime', startTime);
        }
        
        if (endTime) {
            endTime = endTime.replace('T', ' ') + ':00';
            params.append('endTime', endTime);
        }
        
        if (username) params.append('username', username);
        if (operation) params.append('operation', operation);
        if (statusCode) params.append('statusCode', statusCode);
        if (ip) params.append('ip', ip);
        
        console.log('筛选条件:', {
            username,
            operation,
            statusCode,
            ip,
            startTime,
            endTime
        });
        
        // 发送请求获取日志数据
        const url = `/api/syslog/list?${params.toString()}`;
        const response = await fetchAPI(url, { method: 'GET' });
        
        if (response) {
            renderLogTable(response);
            renderPagination(response);
            
            // 显示筛选结果统计
            const totalItems = response.total || 0;
            showSuccessMessage(`筛选完成，共找到 ${totalItems} 条记录`);
        }
    } catch (error) {
        showErrorMessage(`加载日志失败: ${error.message}`);
    }
}

/**
 * 渲染日志表格
 * @param {Object} pageInfo - 分页信息对象
 */
function renderLogTable(pageInfo) {
    const tableBody = $('#log-table-body');
    tableBody.empty();
    
    if (!pageInfo || !pageInfo.list || pageInfo.list.length === 0) {
        tableBody.append('<tr><td colspan="8" class="text-center">暂无日志数据</td></tr>');
        return;
    }
    
    pageInfo.list.forEach(log => {
        // 根据状态码设置不同的样式
        let statusClass = 'log-status-error';
        let displayStatusCode = log.statusCode || '未知';
        const statusCode = log.statusCode || '-';
        
        if (statusCode >= 200 && statusCode < 300) {
            statusClass = `log-status-${statusCode}`;
            // 如果没有特定的状态码样式类，则使用通用的成功样式
            if (!$(`.${statusClass}`).length) {
                statusClass = 'log-status-200';
            }
        } else if (statusCode >= 400) {
            statusClass = `log-status-${statusCode}`;
            // 如果没有特定的状态码样式类，则使用通用的错误样式
            if (!$(`.${statusClass}`).length) {
                statusClass = 'log-status-error';
            }
        } else if (statusCode === '-') {
            displayStatusCode = '未知';
            statusClass = 'log-status-unknown';
        }
        
        // 提取方法描述，如果有的话
        let methodDisplay = truncateText(log.method, 30) || '-';
        const methodMatch = log.method ? log.method.match(/\[(.*?)\]$/) : null;
        if (methodMatch && methodMatch[1]) {
            methodDisplay = `<span title="${log.method}">${methodMatch[1]}</span>`;
        }
        
        const row = `
            <tr>
                <td>
                    <div class="custom-control custom-checkbox">
                        <input type="checkbox" class="custom-control-input log-checkbox" id="log-${log.logId}" data-log-id="${log.logId}">
                        <label class="custom-control-label" for="log-${log.logId}"></label>
                    </div>
                </td>
                <td>${log.logId}</td>
                <td>${log.username || '-'}</td>
                <td>${log.operation || '-'}</td>
                <td>${methodDisplay}</td>
                <td>${log.ip || '-'}</td>
                <td><span class="${statusClass}">${displayStatusCode}</span></td>
                <td>${formatDateTime(log.createTime) || '-'}</td>
                <td>
                    <button class="btn btn-sm btn-info view-log-btn mr-1" data-log-id="${log.logId}">查看详情</button>
                    <button class="btn btn-sm btn-danger delete-log-btn" data-log-id="${log.logId}">删除</button>
                </td>
            </tr>
        `;
        tableBody.append(row);
    });
    
    // 更新全选框状态
    updateSelectAllCheckbox();
    
    // 绑定查看详情按钮事件
    $('.view-log-btn').on('click', function() {
        const logId = $(this).data('log-id');
        const log = pageInfo.list.find(item => item.logId === logId);
        if (log) {
            showLogDetail(log);
        }
    });
}

/**
 * 渲染分页控件
 * @param {Object} pageInfo - 分页信息对象
 */
function renderPagination(pageInfo) {
    const pagination = $('#pagination');
    pagination.empty();
    
    // 更新分页信息显示
    if (pageInfo && pageInfo.list) {
        const startItem = pageInfo.list.length > 0 ? (pageInfo.pageNum - 1) * pageSize + 1 : 0;
        const endItem = Math.min(startItem + pageInfo.list.length - 1, pageInfo.total || 0);
        $('#pagination-info').text(`显示 ${startItem}-${endItem} 条，共 ${pageInfo.total || 0} 条`);
    } else {
        $('#pagination-info').text('显示 0-0 条，共 0 条');
    }
    
    if (!pageInfo || pageInfo.pages <= 1) {
        return;
    }
    
    // 上一页按钮
    const prevDisabled = pageInfo.isFirstPage ? 'disabled' : '';
    pagination.append(`
        <li class="page-item ${prevDisabled}">
            <a class="page-link" href="#" data-page="${pageInfo.prePage}" aria-label="上一页">
                <span aria-hidden="true">&laquo;</span>
            </a>
        </li>
    `);
    
    // 页码按钮
    const startPage = Math.max(1, pageInfo.pageNum - 2);
    const endPage = Math.min(pageInfo.pages, pageInfo.pageNum + 2);
    
    for (let i = startPage; i <= endPage; i++) {
        const active = i === pageInfo.pageNum ? 'active' : '';
        pagination.append(`
            <li class="page-item ${active}">
                <a class="page-link" href="#" data-page="${i}">${i}</a>
            </li>
        `);
    }
    
    // 下一页按钮
    const nextDisabled = pageInfo.isLastPage ? 'disabled' : '';
    pagination.append(`
        <li class="page-item ${nextDisabled}">
            <a class="page-link" href="#" data-page="${pageInfo.nextPage}" aria-label="下一页">
                <span aria-hidden="true">&raquo;</span>
            </a>
        </li>
    `);
    
    // 绑定页码点击事件
    $('.page-link').on('click', function(e) {
        e.preventDefault();
        if (!$(this).parent().hasClass('disabled') && !$(this).parent().hasClass('active')) {
            currentPage = parseInt($(this).data('page'));
            loadLogs(currentPage, pageSize);
        }
    });
}

/**
 * 显示日志详情
 * @param {Object} log - 日志对象
 */
function showLogDetail(log) {
    $('#detail-log-id').text(log.logId || '-');
    $('#detail-username').text(log.username || '-');
    $('#detail-user-id').text(log.userId || '-');
    $('#detail-operation').text(log.operation || '-');
    $('#detail-ip').text(log.ip || '-');
    
    // 设置状态码，根据状态码设置样式
    const statusCode = log.statusCode || '-';
    let statusClass = 'log-status-error';
    let displayStatusCode = log.statusCode || '未知';
    
    // 根据状态码设置不同的样式
    if (statusCode >= 200 && statusCode < 300) {
        statusClass = `log-status-${statusCode}`;
    } else if (statusCode >= 400) {
        statusClass = `log-status-${statusCode}`;
    } else if (statusCode === '-') {
        displayStatusCode = '未知';
        statusClass = 'log-status-unknown';
    }
    
    // 如果没有特定的状态码样式类，则使用通用的错误或成功样式
    if (!$(`.${statusClass}`).length && statusCode >= 200 && statusCode < 300) {
        statusClass = 'log-status-200';
    } else if (!$(`.${statusClass}`).length && statusCode >= 400) {
        statusClass = 'log-status-error';
    }
    
    $('#detail-status-code').html(`<span class="${statusClass}">${displayStatusCode}</span>`);
    $('#detail-status-code-formatted').html(`<span class="${statusClass}">${displayStatusCode}</span>`);
    
    $('#detail-method').text(log.method || '-');
    $('#detail-create-time').text(formatDateTime(log.createTime) || '-');
    
    // 提取HTTP请求方法
    let httpMethod = '-';
    if (log.method) {
        const methodMatch = log.method.match(/\b(GET|POST|PUT|DELETE|PATCH|OPTIONS|HEAD)\b/);
        if (methodMatch) {
            httpMethod = methodMatch[0];
        }
    }
    $('#detail-http-method').text(httpMethod);
    
    // 显示请求参数，格式化JSON
    try {
        const params = log.params || '{}';
        let formattedParams = params;
        try {
            // 尝试格式化JSON
            if (params.trim().startsWith('{') || params.trim().startsWith('[')) {
                const jsonObj = JSON.parse(params);
                formattedParams = JSON.stringify(jsonObj, null, 2);
            }
        } catch (e) {
            // 如果不是有效的JSON，直接显示原始内容
        }
        $('#detail-params').text(formattedParams);
        $('#detail-params-formatted').text(formattedParams);
    } catch (e) {
        $('#detail-params').text(log.params || '-');
        $('#detail-params-formatted').text(log.params || '-');
    }
    
    // 处理错误信息或响应信息显示
    if (log.errorMsg && log.errorMsg.trim() !== '') {
        $('#error-msg-row').show();
        
        // 根据状态码判断是错误信息还是响应信息
        if (statusCode >= 400) {
            $('#response-info-title').text('错误信息:');
        } else {
            $('#response-info-title').text('响应信息:');
        }
        
        $('#detail-error-msg').text(log.errorMsg);
        
        // 尝试格式化响应JSON
        try {
            let formattedResponse = log.errorMsg;
            if (log.errorMsg.trim().startsWith('{') || log.errorMsg.trim().startsWith('[')) {
                const jsonObj = JSON.parse(log.errorMsg);
                formattedResponse = JSON.stringify(jsonObj, null, 2);
            }
            $('#detail-response-formatted').text(formattedResponse);
        } catch (e) {
            // 如果不是有效的JSON，直接显示原始文本
            $('#detail-response-formatted').text(log.errorMsg);
        }
    } else {
        $('#error-msg-row').hide();
        $('#detail-response-formatted').text('无响应数据');
    }
    
    // 显示模态框
    $('#logDetailModal').modal('show');
}

/**
 * 显示成功消息
 * @param {string} message - 消息内容
 */
function showSuccessMessage(message) {
    $('#success-message').text(message).fadeIn().delay(3000).fadeOut();
}

/**
 * 显示错误消息
 * @param {string} message - 消息内容
 */
function showErrorMessage(message) {
    $('#error-message').text(message).fadeIn().delay(3000).fadeOut();
}

// 这些函数已在文件顶部定义，此处删除重复定义

/**
 * 退出登录
 */
function logout() {
    // 使用Bootstrap模态框进行二次确认
    $('#confirmLogoutModalBody').text('确定要退出登录吗？');
    $('#confirmLogoutModal').modal('show');
    
    // 绑定确认退出按钮事件
    $('#confirmLogoutBtn').off('click').on('click', function() {
        $('#confirmLogoutModal').modal('hide');
        localStorage.removeItem('token');
        localStorage.removeItem('username');
        window.location.href = '/pages/user/login.html';
    });
}

/**
 * 加载在线用户列表
 */
async function loadOnlineUsers() {
    try {
        // 显示加载中
        $('#loading-online-users').show();
        $('#no-online-users-message').hide();
        $('#online-users-table-body').empty();
        $('#onlineUsersModal').modal('show');
        
        const token = localStorage.getItem('token');
        const response = await fetchAPI('/api/online-users/list', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        // 隐藏加载中
        $('#loading-online-users').hide();
        
        if (!response || response.length === 0) {
            $('#no-online-users-message').show();
            return;
        }
        
        // 渲染在线用户列表
        const tableBody = $('#online-users-table-body');
        response.forEach(user => {
            const isCurrentUser = user.isCurrentUser;
            const row = `
                <tr${isCurrentUser ? ' class="table-primary"' : ''}>
                    <td>${user.userId}</td>
                    <td>${user.username || '-'}</td>
                    <td>${user.realName || '-'}</td>
                    <td>${formatDateTime(user.lastLoginTime)}</td>
                    <td>
                        ${!isCurrentUser ? `<button class="btn btn-sm btn-warning force-logout-btn" data-user-id="${user.userId}" data-username="${user.username || ''}">强制登出</button>` : '<span class="badge badge-info">当前用户</span>'}
                    </td>
                </tr>
            `;
            tableBody.append(row);
        });
    } catch (error) {
        $('#loading-online-users').hide();
        $('#no-online-users-message').show().html(`<p class="text-danger">加载在线用户失败: ${error.message}</p>`);
    }
}

/**
 * 强制用户退出登录
 * @param {number} userId - 用户ID
 * @param {string} username - 用户名
 */
async function forceUserLogout(userId, username) {
    if (!userId) {
        showErrorMessage('无法获取用户ID');
        return;
    }
    
    // 使用Bootstrap模态框进行二次确认
    $('#confirmForceLogoutModalBody').text(`确定要强制用户 ${username || userId} 退出登录吗？`);
    $('#confirmForceLogoutModal').modal('show');
    
    // 绑定确认强制登出按钮事件
    $('#confirmForceLogoutBtn').off('click').on('click', async function() {
        $('#confirmForceLogoutModal').modal('hide');
        
        try {
            const token = localStorage.getItem('token');
            const response = await fetchAPI(`/api/syslog/force-logout/${userId}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (response) {
                showSuccessMessage(`已强制用户 ${username || userId} 退出登录`);
                // 刷新在线用户列表
                if ($('#onlineUsersModal').hasClass('show')) {
                    setTimeout(() => loadOnlineUsers(), 1000);
                }
            }
        } catch (error) {
            showErrorMessage(`强制登出失败: ${error.message}`);
        }
    });
}

/**
 * 删除单条日志
 * @param {number} logId - 日志ID
 */
async function deleteLog(logId) {
    // 使用Bootstrap模态框进行二次确认，而不是原生confirm
    $('#confirmDeleteModalBody').text('确定要删除此日志记录吗？此操作不可恢复！');
    $('#confirmDeleteModal').modal('show');
    
    // 绑定确认删除按钮事件
    $('#confirmDeleteBtn').off('click').on('click', async function() {
        $('#confirmDeleteModal').modal('hide');
        
        try {
            const token = localStorage.getItem('token');
            const response = await fetchAPI(`/api/syslog/${logId}`, { 
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (response) {
                showSuccessMessage('日志删除成功');
                // 重新加载当前页数据
                loadLogs(currentPage, pageSize);
            }
        } catch (error) {
            showErrorMessage(`删除日志失败: ${error.message}`);
        }
    });
}

/**
 * 批量删除日志
 */
async function batchDeleteLogs() {
    // 获取所有选中的日志ID
    const selectedLogIds = [];
    $('.log-checkbox:checked').each(function() {
        selectedLogIds.push($(this).data('log-id'));
    });
    
    if (selectedLogIds.length === 0) {
        showErrorMessage('请至少选择一条日志记录');
        return;
    }
    
    // 使用Bootstrap模态框进行二次确认，而不是原生confirm
    $('#confirmDeleteModalBody').text(`确定要删除选中的 ${selectedLogIds.length} 条日志记录吗？此操作不可恢复！`);
    $('#confirmDeleteModal').modal('show');
    
    // 绑定确认删除按钮事件
    $('#confirmDeleteBtn').off('click').on('click', async function() {
        $('#confirmDeleteModal').modal('hide');
        
        try {
            // 确保请求头中包含正确的Content-Type和Authorization
            const token = localStorage.getItem('token');
            const response = await fetchAPI('/api/syslog/batch-delete', {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(selectedLogIds)
            });
            
            if (response) {
                showSuccessMessage(`成功删除 ${selectedLogIds.length} 条日志记录`);
                // 重新加载当前页数据
                loadLogs(currentPage, pageSize);
            }
        } catch (error) {
            // 如果是401错误，可能是token失效，但不应该自动登出
            if (error.message && error.message.includes('401')) {
                showErrorMessage('登录已过期，请重新登录');
                setTimeout(() => {
                    window.location.href = '/pages/user/login.html';
                }, 1500);
            } else {
                showErrorMessage(`批量删除日志失败: ${error.message}`);
            }
        }
    });
}