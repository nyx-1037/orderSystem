// 用户管理页面脚本(管理员)

// 页面变量
let currentPage = 1;
let totalPages = 1;
let pageSize = 10;
let isEditMode = false;

// 页面加载完成后执行
$(document).ready(function() {
    // 检查登录状态
    checkLoginStatus().then(isLoggedIn => {
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
        }
    });
});

// 初始化用户列表页面
function initUserListPage() {
    // 加载第一页用户数据
    loadUsers();
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
        
        // 发送API请求
        const apiUrl = `/api/user/admin/list?${params.toString()}`;
        console.log('请求用户列表URL:', apiUrl);
        
        const response = await fetchAPI(apiUrl);
        
        // 更新分页信息
        totalPages = response.pages || 1;
        
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
        // 获取用户角色和状态文本
        const roleText = user.role === 1 ? '管理员' : '普通用户';
        const statusText = user.status === 1 ? '正常' : '禁用';
        const statusBadge = user.status === 1 ? 'badge-success' : 'badge-danger';
        
        html += `
            <tr data-id="${user.id}">
                <td>
                    <div class="custom-control custom-checkbox">
                        <input type="checkbox" class="custom-control-input user-checkbox" id="user-${user.id}" data-id="${user.id}">
                        <label class="custom-control-label" for="user-${user.id}"></label>
                    </div>
                </td>
                <td>${user.id}</td>
                <td>${user.username}</td>
                <td>${user.nickname || '-'}</td>
                <td><span class="badge ${user.role === 1 ? 'badge-primary' : 'badge-secondary'}">${roleText}</span></td>
                <td><span class="badge ${statusBadge}">${statusText}</span></td>
                <td>${formatDate(user.createTime)}</td>
                <td>
                    <button class="btn btn-sm btn-info edit-btn" data-id="${user.id}">编辑</button>
                    <button class="btn btn-sm btn-warning reset-pwd-btn" data-id="${user.id}">重置密码</button>
                    <button class="btn btn-sm btn-danger delete-btn" data-id="${user.id}">删除</button>
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
    if (totalPages <= 1) {
        $('#pagination').empty();
        return;
    }
    
    let html = '';
    
    // 上一页按钮
    html += `
        <li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
            <a class="page-link" href="#" data-page="${currentPage - 1}" aria-label="上一页">
                <span aria-hidden="true">&laquo;</span>
            </a>
        </li>
    `;
    
    // 页码按钮
    const startPage = Math.max(1, currentPage - 2);
    const endPage = Math.min(totalPages, startPage + 4);
    
    for (let i = startPage; i <= endPage; i++) {
        html += `
            <li class="page-item ${i === currentPage ? 'active' : ''}">
                <a class="page-link" href="#" data-page="${i}">${i}</a>
            </li>
        `;
    }
    
    // 下一页按钮
    html += `
        <li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
            <a class="page-link" href="#" data-page="${currentPage + 1}" aria-label="下一页">
                <span aria-hidden="true">&raquo;</span>
            </a>
        </li>
    `;
    
    $('#pagination').html(html);
    
    // 绑定页码点击事件
    $('.page-link').click(function(e) {
        e.preventDefault();
        const page = parseInt($(this).data('page'));
        if (page >= 1 && page <= totalPages && page !== currentPage) {
            currentPage = page;
            loadUsers();
        }
    });
}

// 绑定操作按钮事件
function bindActionButtons() {
    // 编辑用户
    $('.edit-btn').click(function() {
        const userId = $(this).data('id');
        editUser(userId);
    });
    
    // 重置密码
    $('.reset-pwd-btn').click(function() {
        const userId = $(this).data('id');
        resetPassword(userId);
    });
    
    // 删除用户
    $('.delete-btn').click(function() {
        const userId = $(this).data('id');
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
    
    if (user) {
        // 编辑模式
        isEditMode = true;
        $('#userModalLabel').text('编辑用户');
        $('#user-id').val(user.id);
        $('#form-username').val(user.username);
        $('#form-nickname').val(user.nickname || '');
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
    
    // 显示模态框
    $('#userModal').modal('show');
}

// 保存用户
async function saveUser() {
    // 获取表单数据
    const userId = $('#user-id').val();
    const username = $('#form-username').val();
    const nickname = $('#form-nickname').val();
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
        nickname,
        role: parseInt(role),
        status: parseInt(status)
    };
    
    // 如果有密码，添加到数据中
    if (password) {
        userData.password = password;
    }
    
    // 如果是编辑模式，添加用户ID
    if (isEditMode) {
        userData.id = parseInt(userId);
    }
    
    try {
        let apiUrl = '/api/user/admin/';
        let method = 'POST';
        
        if (isEditMode) {
            apiUrl += 'update';
            method = 'PUT';
        } else {
            apiUrl += 'add';
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

// 编辑用户
async function editUser(userId) {
    try {
        // 获取用户详情
        const user = await fetchAPI(`/api/user/admin/detail/${userId}`);
        
        // 显示用户表单
        showUserModal(user);
    } catch (error) {
        console.error('获取用户详情失败:', error);
        showErrorMessage('获取用户详情失败: ' + error.message);
    }
}

// 重置密码
async function resetPassword(userId) {
    showConfirmModal('确定要重置该用户的密码吗？', async () => {
        try {
            // 发送重置密码请求
            const result = await fetchAPI(`/api/user/admin/reset-password/${userId}`, { method: 'POST' });
            
            // 显示成功消息
            showSuccessMessage(`密码重置成功，新密码: ${result.newPassword}`);
        } catch (error) {
            console.error('重置密码失败:', error);
            showErrorMessage('重置密码失败: ' + error.message);
        }
    });
}

// 删除用户
async function deleteUser(userId) {
    showConfirmModal('确定要删除该用户吗？此操作不可恢复！', async () => {
        try {
            await fetchAPI(`/api/user/admin/delete/${userId}`, { method: 'DELETE' });
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
    showConfirmModal(`确定要删除选中的 ${userIds.length} 个用户吗？此操作不可恢复！`, async () => {
        try {
            await fetchAPI('/api/user/admin/batch-delete', { 
                method: 'POST',
                body: JSON.stringify({ userIds: userIds })
            });
            showSuccessMessage(`已成功删除 ${userIds.length} 个用户`);
            loadUsers(); // 重新加载用户列表
        } catch (error) {
            console.error('批量删除用户失败:', error);
            showErrorMessage('批量删除用户失败: ' + error.message);
        }
    });
}

// 格式化日期
function formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleString('zh-CN', { 
        year: 'numeric', 
        month: '2-digit', 
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// 显示确认对话框
function showConfirmModal(message, callback) {
    $('#confirmMessage').text(message);
    $('#confirmActionBtn').off('click').on('click', function() {
        $('#confirmModal').modal('hide');
        if (typeof callback === 'function') {
            callback();
        }
    });
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