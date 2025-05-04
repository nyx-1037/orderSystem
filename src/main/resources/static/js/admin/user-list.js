// 用户管理页面脚本(管理员)

// 页面变量
let currentPage = 1;
let totalPages = 1;
let pageSize = 10;
let pageSizeOptions = [5, 10, 20, 50]; // 分页大小选项
let isEditMode = false;

// 页面加载完成后执行
$(document).ready(function() {
    // 检查管理员登录状态 (使用 admin/main.js 中的函数)
    checkAdminLoginStatus().then(isLoggedIn => {
        if (isLoggedIn) {
            // 初始化页面
            initUserListPage();
            
            // 绑定搜索按钮事件
            $('#search-btn').click(function() {
                currentPage = 1;
                loadUsers();
            });
            
            // 绑定重置按钮点击事件
            $('#reset-btn').click(function() {
                $('#search-form')[0].reset();
                currentPage = 1;
                loadUsers();
            });
            
            // 绑定分页大小选择器事件
            $('#page-size-selector').change(function() {
                pageSize = parseInt($(this).val());
                currentPage = 1; // 切换每页条数时重置为第一页
                loadUsers();
            });
            
            // 绑定页码跳转事件
            $('#goto-page-btn').click(function() {
                const pageNum = parseInt($('#goto-page-input').val());
                if (pageNum && pageNum > 0 && pageNum <= totalPages) {
                    currentPage = pageNum;
                    loadUsers();
                } else {
                    showErrorMessage(`请输入有效的页码 (1-${totalPages})`);
                }
            });
            
            // 绑定添加用户按钮事件
            $('#add-user-btn').click(function() {
                showUserModal();
            });
            
            // 绑定保存用户按钮事件
            $('#save-user-btn').click(function() {
                saveUser();
            });
            
            // 绑定批量删除按钮事件
            $('#batch-delete-btn').click(function() {
                const selectedIds = [];
                $('.user-checkbox:checked').each(function() {
                    selectedIds.push($(this).data('id'));
                });
                
                if (selectedIds.length === 0) {
                    showErrorMessage('请至少选择一个用户');
                    return;
                }
                
                batchDeleteUsers(selectedIds);
            });
            
            // 绑定在线用户按钮事件
            $('#online-users-btn').click(function() {
                loadOnlineUsers(); // 加载在线用户数据
                $('#onlineUsersModal').modal('show'); // 显示模态框
            });
        }
    });
});

// 初始化用户列表页面
function initUserListPage() {
    // 加载第一页用户数据
    loadUsers();
    
    // 初始化分页大小选择器
    initPageSizeSelector();
}

// 初始化分页大小选择器
function initPageSizeSelector() {
    const pageSizeSelector = $('#page-size-selector');
    pageSizeSelector.empty();
    
    // 添加选项
    pageSizeOptions.forEach(size => {
        pageSizeSelector.append(`<option value="${size}"${size === pageSize ? ' selected' : ''}>${size}条/页</option>`);
    });
}

// 加载用户数据
async function loadUsers() {
    // 显示加载中状态
    $('#user-list').html(`
        <tr>
            <td colspan="8" class="text-center py-3">
                <div class="spinner-border text-primary" role="status">
                    <span class="sr-only">加载中...</span>
                </div>
                <p class="mt-2">正在加载用户数据...</p>
            </td>
        </tr>
    `);
    
    try {
        // 构建查询参数
        const params = new URLSearchParams();
        params.append('pageNum', currentPage);
        params.append('pageSize', pageSize);
        
        // 添加筛选条件
        const username = $('#username').val();
        const role = $('#role').val();
        const status = $('#status').val();
        
        if (username) params.append('username', username);
        if (role) params.append('role', role);
        if (status) params.append('status', status);
        
        // 发送API请求 - 使用RESTful风格
        // 修正API路径，使用后端控制器中定义的路径
        const apiUrl = `/api/users?${params.toString()}`;
        console.log('请求用户列表URL:', apiUrl);
        
        // 获取认证Token
        const token = localStorage.getItem('token');
        const headers = {
            'Content-Type': 'application/json'
        };
        
        // 添加认证头
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        
        const response = await fetchAPI(apiUrl, { 
            method: 'GET',
            headers: headers
        });
        // 更新分页信息
        totalPages = response.pages || 1;
        currentPage = response.pageNum || 1;
        const totalCount = response.total || 0;
        
        // 更新页面显示的分页信息
        $('#total-count').text(totalCount);
        $('#total-pages').text(totalPages);
        
        // 获取用户列表
        const users = response.list || [];
        
        // 渲染用户列表
        renderUserList(users);
        
        // 渲染分页控件
        renderPagination();
    } catch (error) {
        console.error('加载用户失败:', error);
        showErrorMessage('加载用户失败: ' + error.message);
        
        // 显示空用户列表
        $('#user-list').html(`
            <tr>
                <td colspan="8" class="text-center">
                    <div class="alert alert-warning mb-0">
                        <i class="fas fa-exclamation-triangle mr-2"></i>
                        加载用户失败，请稍后重试
                    </div>
                </td>
            </tr>
        `);
    }
}

// 渲染用户列表
function renderUserList(users) {
    if (users.length === 0) {
        $('#user-list').html(`
            <tr>
                <td colspan="8" class="text-center">
                    <div class="alert alert-info mb-0">
                        <i class="fas fa-info-circle mr-2"></i>
                        暂无用户数据
                    </div>
                </td>
            </tr>
        `);
        // 隐藏批量删除按钮
        $('#batch-delete-btn').hide();
        return;
    }
    
    let html = '';
    
    users.forEach(user => {
        // 使用正确的用户ID字段名称
        const userId = user.userId;
        
        // 获取用户角色和状态文本
        const roleText = user.role === 1 ? '管理员' : '普通用户';
        // 修正状态判断逻辑，确保正确显示状态
        const statusText = user.status === 1 ? '正常' : '禁用';
        console.log("状态", statusText);
        const statusBadge = user.status === 1 ? 'badge-success' : 'badge-danger';
        
        html += `
            <tr data-id="${userId}">
                <td>
                    <div class="custom-control custom-checkbox">
                        <input type="checkbox" class="custom-control-input user-checkbox" id="user-${userId}" data-id="${userId}">
                        <label class="custom-control-label" for="user-${userId}"></label>
                    </div>
                </td>
                <td>${userId}</td>
                <td>${user.username}</td>
                <td>${user.nickname || '-'}</td>
                <td><span class="badge ${user.role === 1 ? 'badge-primary' : 'badge-secondary'}">${roleText}</span></td>
                <td><span class="badge ${statusBadge}">${statusText}</span></td>
                <td>${formatDate(user.createTime)}</td>
                <td>
                    <div class="btn-group">
                        <button class="btn btn-sm btn-info view-btn" data-id="${userId}">查看</button>
                        <button class="btn btn-sm btn-primary edit-btn" data-id="${userId}">编辑</button>
                        <button class="btn btn-sm btn-warning reset-pwd-btn" data-id="${userId}">重置密码</button>
                        <button class="btn btn-sm btn-danger delete-btn" data-id="${userId}">删除</button>
                    </div>
                </td>
            </tr>
        `;
    });
    
    $('#user-list').html(html);
    
    // 绑定操作按钮事件
    bindActionButtons();
    
    // 绑定复选框事件
    bindCheckboxEvents();
}

// 渲染分页控件
function renderPagination() {
    const pagination = $('#pagination');
    pagination.empty();
    
    if (totalPages <= 1) {
        return;
    }
    
    // 更新页码输入框的最大值和当前值
    $('#goto-page-input').attr('max', totalPages).val(currentPage);
    
    // 更新页面显示的分页信息
    $('#current-page').text(currentPage);
    $('#total-pages').text(totalPages);
    
    // 更新分页大小选择器
    $('#page-size-selector').val(pageSize);
    
    // 添加上一页按钮
    pagination.append(`
        <li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
            <a class="page-link" href="javascript:void(0)" data-page="${currentPage - 1}" aria-label="上一页">
                <span aria-hidden="true">&laquo;</span>
            </a>
        </li>
    `);
    
    // 计算显示的页码范围
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    
    // 调整起始页码，确保显示足够的页码
    if (endPage - startPage + 1 < maxVisiblePages) {
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }
    
    // 添加页码按钮
    for (let i = startPage; i <= endPage; i++) {
        pagination.append(`
            <li class="page-item ${i === currentPage ? 'active' : ''}">
                <a class="page-link" href="javascript:void(0)" data-page="${i}">${i}</a>
            </li>
        `);
    }
    
    // 添加下一页按钮
    pagination.append(`
        <li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
            <a class="page-link" href="javascript:void(0)" data-page="${currentPage + 1}" aria-label="下一页">
                <span aria-hidden="true">&raquo;</span>
            </a>
        </li>
    `);
    
    // 绑定页码点击事件
    $('.page-link').click(function(e) {
        e.preventDefault();
        const page = $(this).data('page');
        if (page && page !== currentPage && page >= 1 && page <= totalPages) {
            currentPage = page;
            loadUsers();
        }
    });
}


// 绑定操作按钮事件
function bindActionButtons() {
    // 查看用户详情
    $('.view-btn').click(function() {
        const userId = $(this).data('id');
        // 确保userId是有效的数值
        if (!userId) {
            showErrorMessage('无效的用户ID');
            return;
        }
        viewUser(userId);
    });
    
    // 编辑用户
    $('.edit-btn').click(function() {
        const userId = $(this).data('id');-
        console.log("用户ID", userId);
        // 确保userId是有效的数值
        if (!userId) {
            showErrorMessage('无效的用户ID');
            return;
        }
        editUser(userId);
    });
    
    // 重置密码
    $('.reset-pwd-btn').click(function() {
        const userId = $(this).data('id');
        // 确保userId是有效的数值
        if (!userId) {
            showErrorMessage('无效的用户ID');
            return;
        }
        resetPassword(userId);
    });
    
    // 强制登出按钮
    $('.force-logout-btn').click(function() {
        const userId = $(this).data('id');
        // 确保userId是有效的数值
        if (!userId) {
            showErrorMessage('无效的用户ID');
            return;
        }
        // 显示确认对话框
        showConfirmModal('确定要强制该用户下线吗？此操作将使该用户立即退出登录状态。', () => {
            forceLogout(userId);
        });
    });
    
    // 删除用户
    $('.delete-btn').click(function() {
        const userId = $(this).data('id');
        // 确保userId是有效的数值
        if (!userId) {
            showErrorMessage('无效的用户ID');
            return;
        }
        deleteUser(userId);
    });
}

// 绑定复选框事件
function bindCheckboxEvents() {
    // 全选/取消全选
    $('#select-all').change(function() {
        const isChecked = $(this).prop('checked');
        $('.user-checkbox').prop('checked', isChecked);
        updateBatchDeleteButton();
    });
    
    // 单个复选框变化
    $('.user-checkbox').change(function() {
        updateBatchDeleteButton();
        
        // 检查是否所有复选框都被选中
        const allChecked = $('.user-checkbox').length === $('.user-checkbox:checked').length;
        $('#select-all').prop('checked', allChecked);
    });
    
    // 初始状态更新批量删除按钮
    updateBatchDeleteButton();
}

// 更新批量删除按钮显示状态
function updateBatchDeleteButton() {
    const hasChecked = $('.user-checkbox:checked').length > 0;
    if (hasChecked) {
        $('#batch-delete-btn').show();
    } else {
        $('#batch-delete-btn').hide();
    }
}

// 显示用户表单模态框
function showUserModal(user = null) {
    // 重置表单
    $('#user-form')[0].reset();
    $('#user-id').val('');
    
    // 移除之前的事件监听
    $('#save-user-btn').off('click');
    $('.close, .btn-secondary').off('click');
    
    if (user) {
        // 编辑模式
        isEditMode = true;
        console.log("编辑用户", user);
        $('#userModalLabel').text('编辑用户');
        $('#user-id').val(user.userId);
        $('#form-username').val(user.username);
        $('#form-nickname').val( user.realName ||'');
        $('#form-role').val(user.role);
        $('#form-status').val(user.status);
        
        // 编辑模式下用户名不可修改
        $('#form-username').prop('readonly', true);
    } else {
        // 添加模式
        isEditMode = false;
        $('#userModalLabel').text('添加用户');
        $('#form-username').prop('readonly', false);
    }
    
    // 绑定保存按钮事件
    $('#save-user-btn').on('click', function() {
        saveUser();
    });
    
    // 添加关闭按钮事件
    $('.close, .btn-secondary').on('click', function() {
        $('#userModal').modal('hide');
    });
    
    // 模态框隐藏后的事件
    $('#userModal').on('hidden.bs.modal', function() {
        // 移除焦点，避免ARIA警告
        $('#save-user-btn').blur();
        $(document.activeElement).blur();
    });
    
    // 显示模态框
    $('#userModal').modal('show');
}

// 保存用户
async function saveUser() {
    // 获取表单数据
    const userId = $('#user-id').val();
    console.log("用户ID111", userId);
    const username = $('#form-username').val();
    const realName = $('#form-nickname').val();
    const password = $('#form-password').val();
    const role = $('#form-role').val();
    const status = $('#form-status').val();
    
    // 表单验证
    if (!username) {
        showErrorMessage('用户名不能为空');
        return;
    }
    
    // 构建用户数据
    const userData = {
        username,
        realName,
        role: parseInt(role),
        status: parseInt(status)
    };
    
    // 如果有密码，添加到数据中
    if (password) {
        userData.password = password;
    }
    
    try {
        let apiUrl;
        let method;
        console.log("是否为编辑模式：" + isEditMode)
        // 根据是否为编辑模式选择不同的API端点和方法
        if (isEditMode) {
            // 编辑现有用户 - 使用PUT方法
            // userId = parseInt(userId); // 确保使用正确的字段名userId
            console.log("用户ID", userId);
            apiUrl = `/api/users/${userId}`;
            method = 'PUT';
        } else {
            // 添加新用户 - 使用注册接口
            apiUrl = '/api/users/register';
            method = 'POST';
        }

        // 发送API请求
        await fetchAPI(apiUrl, {
            method,
            body: JSON.stringify(userData)
        });
        
        // 关闭模态框
        $('#userModal').modal('hide');
        
        // 显示成功消息
        showSuccessMessage(isEditMode ? '用户更新成功' : '用户添加成功');
        
        // 重新加载用户列表
        loadUsers();
    } catch (error) {
        console.error('保存用户失败:', error);
        showErrorMessage('保存用户失败: ' + error.message);
    }
}

// 查看用户详情
async function viewUser(userId) {
    try {
        // 确保userId是有效的数值
        if (!userId) {
            showErrorMessage('无效的用户ID');
            return;
        }
        
        // 获取用户详情 - 使用RESTful风格
        const user = await fetchAPI(`/api/users/${userId}`, { method: 'GET' });
        
        if (!user) {
            showErrorMessage('获取用户详情失败');
            return;
        }
        
        // 显示用户详情模态框
        showUserDetailModal(user);
    } catch (error) {
        console.error('获取用户详情失败:', error);
        showErrorMessage('获取用户详情失败: ' + error.message);
    }
}

// 编辑用户
async function editUser(userId) {
    try {
        // 确保userId是有效的数值
        if (!userId) {
            showErrorMessage('无效的用户ID');
            return;
        }
        
        // 获取用户详情 - 使用RESTful风格
        const user = await fetchAPI(`/api/users/${userId}`, { method: 'GET' });
        
        if (!user) {
            showErrorMessage('获取用户详情失败');
            return;
        }
        
        // 显示用户表单
        showUserModal(user);
    } catch (error) {
        console.error('获取用户详情失败:', error);
        showErrorMessage('获取用户详情失败: ' + error.message);
    }
}

// 重置密码（使用POST方法）
// 重置密码
async function resetPassword(userId) {
    // 增强数字类型验证（允许数字字符串）
    if (isNaN(userId) || parseInt(userId) != userId) {
        showErrorMessage('无效的用户ID格式');
        return;
    }

    showConfirmModal('确定要重置该用户的密码吗？', async () => {
        try {
            // 获取认证Token
            const token = localStorage.getItem('token');
            const headers = {
                'Content-Type': 'application/json'
            };
            
            // 添加认证头
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }
            // 改为POST方法并明确设置Content-Type
            const result = await fetchAPI(`/api/users/${userId}/resetPassword`, {
                method: 'POST',
                headers: headers
                
            });
            
            // 根据响应结构判断
            if (result && result.success) {
                showSuccessMessage(result.message || '密码重置成功');
            } else {
                showErrorMessage(result?.message || '重置密码失败');
            }
        } catch (error) {
            console.error('重置密码失败:', error);
            showErrorMessage(`请求失败：${error.message}`);
        }
    });
}

// 删除用户
async function deleteUser(userId) {
    // 确保userId是有效的数值
    if (!userId) {
        showErrorMessage('无效的用户ID');
        return;
    }
    
    showConfirmModal('确定要删除该用户吗？此操作不可恢复！', async () => {
        try {
            await fetchAPI(`/api/users/${userId}`, { method: 'DELETE' });
            showSuccessMessage('用户已删除');
            loadUsers(); // 重新加载用户列表
        } catch (error) {
            console.error('删除用户失败:', error);
            showErrorMessage('删除用户失败: ' + error.message);
        }
    });
}

// 批量删除用户
async function batchDeleteUsers(userIds) {
    // 过滤掉无效的用户ID，确保只保留有效的数值ID
    const validUserIds = userIds.filter(id => id);
    
    if (validUserIds.length === 0) {
        showErrorMessage('没有有效的用户ID可删除');
        return;
    }
    
    showConfirmModal(`确定要删除选中的 ${validUserIds.length} 个用户吗？此操作不可恢复！`, async () => {
        try {
            // 发送批量删除请求
            await fetchAPI('/api/users/batch', {
                method: 'DELETE',
                body: JSON.stringify(validUserIds)
            });
            
            showSuccessMessage('选中的用户已删除');
            loadUsers(); // 重新加载用户列表
        } catch (error) {
            console.error('批量删除用户失败:', error);
            showErrorMessage('批量删除用户失败: ' + error.message);
        }
    });
}

// 强制用户登出
async function forceLogout(userId) {
    // 确保userId是有效的数值
    if (!userId) {
        showErrorMessage('无效的用户ID');
        return;
    }
    
    try {
        // 发送强制登出请求 - 使用RESTful风格
        // 尝试使用不同的API路径，以适应后端接口
        await fetchAPI(`/api/users/${userId}/force-logout`, { method: 'POST' })
            .catch(async () => {
                // 如果第一个路径失败，尝试备用路径
                return await fetchAPI(`/api/admin/users/${userId}/force-logout`, { method: 'POST' });
            });
        
        // 显示成功消息
        showSuccessMessage('用户已被强制登出');
        
        // 如果在线用户模态框是打开的，刷新在线用户列表
        if ($('#onlineUsersModal').hasClass('show')) {
            loadOnlineUsers();
        }
    } catch (error) {
        console.error('强制登出失败:', error);
        showErrorMessage('强制登出失败: ' + error.message);
    }
}

// 显示用户详情模态框
function showUserDetailModal(user) {
    console.log("用户详情", user);
    // 创建模态框HTML
    const modalHtml = `
        <div class="modal fade" id="userDetailModal" tabindex="-1" role="dialog" aria-labelledby="userDetailModalLabel" aria-hidden="true">
            <div class="modal-dialog" role="document">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title" id="userDetailModalLabel">用户详情</h5>
                        <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                            <span aria-hidden="true">&times;</span>
                        </button>
                    </div>
                    <div class="modal-body">
                        <div class="table-responsive">
                            <table class="table table-bordered">
                                <tbody>
                                    <tr>
                                        <th>Uuid</th>
                                        <td>${user.userUuid || '未知'}</td>
                                    </tr>
                                    <tr>
                                        <th>用户名</th>
                                        <td>${user.username}</td>
                                    </tr>
                                    <tr>
                                        <th>昵称</th>
                                        <td>${user.realName || '--'}</td>
                                    </tr>
                                    <tr>
                                        <th>角色</th>
                                        <td>${user.role === 1 ? '管理员' : '普通用户'}</td>
                                    </tr>
                                    <tr>
                                        <th>状态</th>
                                        <td>${user.status === 1 ? '正常' : '禁用'}</td>
                                    </tr>
                                    <tr>
                                        <th>注册时间</th>
                                        <td>${formatDate(user.createTime)}</td>
                                    </tr>
                                    <tr>
                                        <th>最后更新</th>
                                        <td>${formatDate(user.updateTime)}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-dismiss="modal">关闭</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // 移除之前的模态框（如果存在）
    $('#userDetailModal').remove();
    
    // 添加模态框到页面
    $('body').append(modalHtml);
    
    // 显示模态框
    $('#userDetailModal').modal('show');
}

// 显示确认操作模态框
function showConfirmModal(message, confirmCallback) {
    // 设置确认消息
    $('#confirmMessage').text(message);
    
    // 移除之前的事件监听
    $('#confirmActionBtn').off('click');
    
    // 绑定确认按钮事件
    $('#confirmActionBtn').on('click', function() {
        $('#confirmModal').modal('hide');
        if (typeof confirmCallback === 'function') {
            confirmCallback();
        }
    });
    
    // 显示模态框
    $('#confirmModal').modal('show');
}

// 显示成功消息
function showSuccessMessage(message) {
    $('#success-message').text(message).fadeIn();
    setTimeout(() => {
        $('#success-message').fadeOut();
    }, 3000);
}

// 显示错误消息
function showErrorMessage(message) {
    $('#error-message').text(message).fadeIn();
    setTimeout(() => {
        $('#error-message').fadeOut();
    }, 3000);
}

// 格式化日期
function formatDate(dateString) {
    if (!dateString) return '-';
    
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    
    return date.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
}

/**
 * 加载在线用户列表
 * 获取当前在线的用户信息并显示在模态框中
 */
function loadOnlineUsers() {
    // 显示加载中状态
    $("#online-users-list").html(`
        <tr>
            <td colspan="4" class="text-center py-3">
                <div class="spinner-border text-primary" role="status">
                    <span class="sr-only">加载中...</span>
                </div>
                <p class="mt-2">正在加载在线用户数据...</p>
            </td>
        </tr>
    `);
    
    // 获取token用于认证
    const token = localStorage.getItem('token');
    
    // 发送AJAX请求获取在线用户数据
    $.ajax({
        url: '/api/online-users',
        type: 'GET',
        dataType: 'json',
        headers: {
            'Authorization': token ? `Bearer ${token}` : ''
        },
        success: function(response) {
            console.log('在线用户API响应:', response);
            // 检查响应格式，处理不同的返回结构
            if (response.code === 200) {
                // 标准响应格式，使用response.data
                renderOnlineUsers(response.data);
            } else if (Array.isArray(response)) {
                // 直接返回数组格式
                renderOnlineUsers(response);
            } else if (response && typeof response === 'object') {
                // 可能是其他格式，尝试找到数据数组
                const possibleData = response.data || response.list || response.users || response;
                if (Array.isArray(possibleData)) {
                    renderOnlineUsers(possibleData);
                } else {
                    showErrorMessage('获取在线用户列表失败：数据格式不正确');
                    $("#online-users-list").html(`
                        <tr>
                            <td colspan="7" class="text-center py-3">
                                <div class="alert alert-danger mb-0">
                                    <i class="fas fa-exclamation-circle"></i> 获取在线用户列表失败：数据格式不正确
                                </div>
                            </td>
                        </tr>
                    `);
                }
            } else {
                showErrorMessage(response.message || '获取在线用户列表失败');
                $("#online-users-list").html(`
                    <tr>
                        <td colspan="7" class="text-center py-3">
                            <div class="alert alert-danger mb-0">
                                <i class="fas fa-exclamation-circle"></i> 获取在线用户列表失败
                            </div>
                        </td>
                    </tr>
                `);
            }
        },
        error: function(xhr, status, error) {
            console.error('获取在线用户列表失败:', error, xhr.status);
            
            let errorMsg = '获取在线用户列表失败，请稍后再试';
            
            // 针对401未授权错误提供更明确的提示
            if (xhr.status === 401) {
                errorMsg = '登录已过期或未授权，请重新登录';
                // 可以选择自动跳转到登录页面
                // setTimeout(() => {
                //     window.location.href = '/pages/admin/login.html';
                // }, 2000);
            }
            
            showErrorMessage(errorMsg);
            $("#online-users-list").html(`
                <tr>
                    <td colspan="7" class="text-center py-3">
                        <div class="alert alert-danger mb-0">
                            <i class="fas fa-exclamation-circle"></i> ${errorMsg}
                        </div>
                    </td>
                </tr>
            `);
        }
    });
}

/**
 * 渲染在线用户列表
 * @param {Array} users - 在线用户数组
 */
// 渲染在线用户列表
function renderOnlineUsers(users) {
    const onlineUsersList = $("#online-users-list");
    onlineUsersList.empty(); // 清空现有列表

    if (!users || users.length === 0) {
        onlineUsersList.html(`
            <tr>
                <td colspan="4" class="text-center py-3">
                    <div class="alert alert-info mb-0">
                        <i class="fas fa-info-circle"></i> 当前没有在线用户
                    </div>
                </td>
            </tr>
        `);
        return;
    }

    // 打印接收到的数据，便于调试
    console.log('在线用户数据:', users);

    let html = '';
    users.forEach(user => {
        // 适配服务器返回的字段名称
        const userId = user.userId || '-';
        const username = user.username || '-';
        // 使用 realName 作为昵称
        const nickname = user.realName || '-';
        // 判断是否为当前用户
        const isCurrentUser = user.isCurrentUser ? ' <span class="badge badge-info">当前用户</span>' : '';

        html += `
            <tr>
                <td>${userId}</td>
                <td>${username}</td>
                <td>${nickname}${isCurrentUser}</td>
                <td>
                    <button class="btn btn-sm btn-danger force-logout-btn" 
                            data-id="${userId}" 
                            data-username="${username}" 
                            ${user.isCurrentUser ? 'disabled title="不能强制下线当前用户"' : ''}>
                        <i class="fas fa-sign-out-alt"></i> 强制下线
                    </button>
                </td>
            </tr>
        `;
    });

    onlineUsersList.html(html);

    // 重新绑定强制下线按钮事件 (因为列表内容被替换了)
    $('.force-logout-btn').off('click').on('click', function() {
        const userId = $(this).data('id');
        const username = $(this).data('username');
        if (!userId) {
            showErrorMessage('无效的用户ID');
            return;
        }

        // 显示确认对话框
        showConfirmModal(`确定要强制用户 "${username}" 下线吗？此操作将使该用户立即退出登录状态。`, () => {
            forceLogout(userId);
        });
    });
}

// 强制下线用户
async function forceLogout(userId) {
    try {
        const token = localStorage.getItem('token');
        const headers = {
            'Content-Type': 'application/json'
        };
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        // 注意：后端强制下线接口路径可能需要调整，这里假设为 /api/admin/users/{userId}/force-logout
        // 请根据实际后端接口修改
        const response = await fetchAPI(`/api/admin/users/${userId}/force-logout`, {
            method: 'POST',
            headers: headers
        });

        showSuccessMessage('强制下线成功');
        loadOnlineUsers(); // 刷新在线用户列表

    } catch (error) {
        console.error('强制下线失败:', error);
        showErrorMessage(error.message || '强制下线失败，请稍后再试');
    }
}

// 显示用户详情模态框
function showUserDetailModal(user) {
    console.log("用户详情", user);
    // 创建模态框HTML
    const modalHtml = `
        <div class="modal fade" id="userDetailModal" tabindex="-1" role="dialog" aria-labelledby="userDetailModalLabel" aria-hidden="true">
            <div class="modal-dialog" role="document">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title" id="userDetailModalLabel">用户详情</h5>
                        <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                            <span aria-hidden="true">&times;</span>
                        </button>
                    </div>
                    <div class="modal-body">
                        <div class="table-responsive">
                            <table class="table table-bordered">
                                <tbody>
                                    <tr>
                                        <th>ID</th>
                                        <td>${user.userId}</td>
                                    </tr>
                                    <tr>
                                        <th>UUID</th>
                                        <td>${user.userUuid}</td>
                                    </tr>
                                    <tr>
                                        <th>用户名</th>
                                        <td>${user.username}</td>
                                    </tr>
                                    <tr>
                                        <th>昵称</th>
                                        <td>${user.realName || '-'}</td>
                                    </tr>
                                    <tr>
                                        <th>角色</th>
                                        <td>${user.role === 1 ? '管理员' : '普通用户'}</td>
                                    </tr>
                                    <tr>
                                        <th>状态</th>
                                        <td>${user.status === 1 ? '正常' : '禁用'}</td>
                                    </tr>
                                    <tr>
                                        <th>注册时间</th>
                                        <td>${formatDate(user.createTime)}</td>
                                    </tr>
                                    <tr>
                                        <th>最后更新</th>
                                        <td>${formatDate(user.updateTime)}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-dismiss="modal">关闭</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // 移除之前的模态框（如果存在）
    $('#userDetailModal').remove();
    
    // 添加模态框到页面
    $('body').append(modalHtml);
    
    // 显示模态框
    $('#userDetailModal').modal('show');
}

// 显示确认操作模态框
function showConfirmModal(message, confirmCallback) {
    // 设置确认消息
    $('#confirmMessage').text(message);
    
    // 移除之前的事件监听
    $('#confirmActionBtn').off('click');
    
    // 绑定确认按钮事件
    $('#confirmActionBtn').on('click', function() {
        $('#confirmModal').modal('hide');
        if (typeof confirmCallback === 'function') {
            confirmCallback();
        }
    });
    
    // 显示模态框
    $('#confirmModal').modal('show');
}

// 显示成功消息
function showSuccessMessage(message) {
    $('#success-message').text(message).fadeIn();
    setTimeout(() => {
        $('#success-message').fadeOut();
    }, 3000);
}

// 显示错误消息
function showErrorMessage(message) {
    $('#error-message').text(message).fadeIn();
    setTimeout(() => {
        $('#error-message').fadeOut();
    }, 3000);
}

// 格式化日期
function formatDate(dateString) {
    if (!dateString) return '-';
    
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    
    return date.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
}
