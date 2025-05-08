/**
 * 管理员系统日志页面脚本
 */

// 页面变量
let currentPage = 1;
let totalPages = 1;
let pageSize = 10;
let pageSizeOptions = [5, 10, 20, 50]; // 分页大小选项

// 显示错误消息
function showErrorMessage(message) {
    $('#error-message').text(message).fadeIn();
    setTimeout(() => {
        $('#error-message').fadeOut();
    }, 3000);
}

// 绑定复选框事件
function bindCheckboxEvents() {
    // 单个复选框变化时更新批量删除按钮状态
    $('.log-checkbox').change(function() {
        updateBatchDeleteButton();
        
        // 检查是否所有复选框都被选中
        const allChecked = $('.log-checkbox:checked').length === $('.log-checkbox').length;
        $('#select-all-checkbox').prop('checked', allChecked);
    });
}

// 更新批量删除按钮状态
function updateBatchDeleteButton() {
    const hasChecked = $('.log-checkbox:checked').length > 0;
    $('#batch-delete-btn').prop('disabled', !hasChecked);
}

// 批量删除日志
function batchDeleteLogs() {
    // 获取所有选中的日志ID
    const selectedLogIds = [];
    $('.log-checkbox:checked').each(function() {
        selectedLogIds.push(parseInt($(this).data('log-id')));
    });
    
    if (selectedLogIds.length === 0) {
        showErrorMessage('请至少选择一条日志记录');
        return;
    }
    
    // 显示确认对话框
    if (confirm(`确定要删除选中的 ${selectedLogIds.length} 条日志记录吗？此操作不可恢复！`)) {
        // 调用批量删除API
        batchDeleteLogsApi(selectedLogIds);
    }
}

// 调用批量删除API
async function batchDeleteLogsApi(logIds) {
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
        
        const response = await fetchAPI('/api/system-logs/batch', {
            method: 'DELETE',
            headers: headers,
            body: JSON.stringify(logIds)
        });
        
        // 显示成功消息
        $('#success-message').text(response.message).fadeIn();
        setTimeout(() => {
            $('#success-message').fadeOut();
        }, 3000);
        
        // 重新加载日志列表
        loadSyslogs();
    } catch (error) {
        console.error('批量删除日志失败:', error);
        showErrorMessage('批量删除日志失败: ' + error.message);
    }
}

// 页面加载完成后执行
$(document).ready(function() {
    // 检查管理员登录状态 (使用 admin/main.js 中的函数)
    checkAdminLoginStatus().then(isLoggedIn => {
        if (isLoggedIn) {
            // 初始化页面
            initSyslogPage();
            
            // 绑定搜索按钮事件
            $('#search-btn').click(function() {
                currentPage = 1;
                loadSyslogs();
            });
            
            // 绑定重置按钮点击事件
            $('#reset-btn').click(function() {
                $('#search-form')[0].reset();
                currentPage = 1;
                loadSyslogs();
            });
            
            // 绑定刷新按钮事件
            $('#refresh-btn').click(function() {
                // 添加加载动画
                const $refreshBtn = $(this);
                const originalHtml = $refreshBtn.html();
                $refreshBtn.html('<i class="fas fa-sync-alt fa-spin"></i> 刷新中...');
                $refreshBtn.prop('disabled', true);
                
                // 先同步日志，然后刷新页面
                syncLogsToDatabase().then(() => {
                    loadSyslogs();
                    // 恢复按钮原始状态
                    setTimeout(() => {
                        $refreshBtn.html(originalHtml);
                        $refreshBtn.prop('disabled', false);
                    }, 500);
                }).catch(error => {
                    // 发生错误时也恢复按钮状态
                    $refreshBtn.html(originalHtml);
                    $refreshBtn.prop('disabled', false);
                    showErrorMessage('同步日志失败: ' + error.message);
                });
            });
            
            // 绑定分页大小选择器事件
            $('#page-size-selector').change(function() {
                pageSize = parseInt($(this).val());
                currentPage = 1; // 切换每页条数时重置为第一页
                loadSyslogs();
            });
            
            // 绑定页码跳转事件
            $('#goto-page-btn').click(function() {
                const pageNum = parseInt($('#goto-page-input').val());
                if (pageNum && pageNum > 0 && pageNum <= totalPages) {
                    currentPage = pageNum;
                    loadSyslogs();
                } else {
                    showErrorMessage(`请输入有效的页码 (1-${totalPages})`);
                }
            });
            
            // 绑定全选/取消全选复选框事件
            $('#select-all-checkbox').change(function() {
                const isChecked = $(this).prop('checked');
                $('.log-checkbox').prop('checked', isChecked);
                updateBatchDeleteButton();
            });
            
            // 绑定批量删除按钮事件
            $('#batch-delete-btn').click(function() {
                batchDeleteLogs();
            });
        }
    });
});

// 初始化系统日志页面
function initSyslogPage() {
    // 加载第一页日志数据
    loadSyslogs();
}

// 加载系统日志数据
async function loadSyslogs() {
    // 显示加载中状态
    $('#log-list').html(`
        <tr>
            <td colspan="7" class="text-center py-3">
                <div class="spinner-border text-primary" role="status">
                    <span class="sr-only">加载中...</span>
                </div>
                <p class="mt-2">正在加载系统日志...</p>
            </td>
        </tr>
    `);
    
    try {
        // 构建查询参数
        const params = new URLSearchParams();
        params.append('pageNum', currentPage);
        params.append('pageSize', pageSize);
        
        // 添加筛选条件
        const logType = $('#logType').val();
        const operation = $('#module').val();
        const dateRange = $('#dateRange').val();
        const username = $('#username').val();
        const statusCode = $('#statusCode').val();
        
        // 根据日志类型筛选状态码
        if (logType && !statusCode) {
            let code;
            if (logType === 'INFO') code = 200;
            else if (logType === 'WARNING') code = 400;
            else if (logType === 'ERROR') code = 500;
            
            if (code) params.append('statusCode', code);
        }
        
        // 直接使用状态码筛选
        if (statusCode) {
            params.append('statusCode', statusCode);
        }
        
        // 根据操作类型筛选
        if (operation) {
            params.append('operation', operation);
        }
        
        // 添加时间范围
        if (dateRange) {
            const now = new Date();
            const endDate = now.toISOString().split('T')[0];
            
            now.setDate(now.getDate() - parseInt(dateRange));
            const startDate = now.toISOString().split('T')[0];
            
            params.append('startTime', startDate);
            params.append('endTime', endDate);
        }
        
        // 添加用户名筛选
        if (username) {
            params.append('username', username);
        }
        
        // 发送API请求 - 使用RESTful风格
        const apiUrl = `/api/system-logs?${params.toString()}`;
        console.log('请求系统日志URL:', apiUrl);
        
        const response = await fetchAPI(apiUrl, { method: 'GET' });
        
        // 更新分页信息
        totalPages = response.pages || 1;
        const logs = response.list || [];
        
        // 渲染日志列表
        renderLogList(logs);
        
        // 渲染分页
        renderPagination();
    } catch (error) {
        console.error('加载系统日志失败:', error);
        showErrorMessage('加载系统日志失败: ' + error.message);
        $('#log-list').html(`
            <tr>
                <td colspan="7" class="text-center py-3">
                    <div class="alert alert-danger mb-0">
                        加载系统日志失败: ${error.message}
                        <button class="btn btn-sm btn-outline-danger ml-2" onclick="loadSyslogs()">
                            <i class="fas fa-sync-alt"></i> 重试
                        </button>
                    </div>
                </td>
            </tr>
        `);
    }
}

// 渲染日志列表
function renderLogList(logs) {
    const tbody = $('#log-list');
    tbody.empty();
    
    // 重置批量删除按钮状态
    $('#batch-delete-btn').prop('disabled', true);
    $('#select-all-checkbox').prop('checked', false);
    
    if (!logs || logs.length === 0) {
        tbody.html(`
            <tr>
                <td colspan="8" class="text-center py-3">
                    <p class="text-muted mb-0">暂无系统日志数据</p>
                </td>
            </tr>
        `);
        return;
    }
    
    logs.forEach(log => {
        // 根据日志类型设置不同的样式
        let typeBadgeClass = 'badge-info';
        let logTypeText = 'INFO';
        
        // 根据状态码判断日志类型
        if (log.statusCode >= 400 && log.statusCode < 500) {
            typeBadgeClass = 'badge-warning';
            logTypeText = 'WARNING';
        } else if (log.statusCode >= 500) {
            typeBadgeClass = 'badge-danger';
            logTypeText = 'ERROR';
        }
        
        // 根据状态码设置不同的背景颜色
        let statusBadgeClass = 'badge-secondary';
        if (log.statusCode) {
            const statusCode = parseInt(log.statusCode);
            if (statusCode >= 200 && statusCode < 300) {
                statusBadgeClass = 'badge-success'; // 成功状态 - 绿色
            } else if (statusCode >= 400 && statusCode < 500) {
                statusBadgeClass = 'badge-warning'; // 客户端错误 - 黄色
            } else if (statusCode >= 500) {
                statusBadgeClass = 'badge-danger';  // 服务器错误 - 红色
            }
        }
        
        const row = $(`
            <tr>
                <td>
                    <div class="custom-control custom-checkbox">
                        <input type="checkbox" class="custom-control-input log-checkbox" id="log-${log.logId}" data-log-id="${log.logId}">
                        <label class="custom-control-label" for="log-${log.logId}"></label>
                    </div>
                </td>
                <td>${log.logId}</td>
                <td>${log.username || '系统'}</td>
                <td>${log.operation || '系统'}</td>
                <td><span class="badge ${statusBadgeClass}">${log.statusCode || '-'}</span></td>
                <td>${truncateText(log.method || '', 3000)}</td>
                <td>${formatDate(log.createTime)}</td>
                <td>
                    <button class="btn btn-sm btn-info" onclick="viewLogDetail(${log.logId})">
                        <i class="fas fa-eye"></i> 详情
                    </button>
                </td>
            </tr>
        `);

        
        tbody.append(row);
    });
    
    // 绑定复选框事件
    bindCheckboxEvents();
}

// 截断文本
function truncateText(text, maxLength) {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
}

// 渲染分页
function renderPagination() {
    const pagination = $('#pagination');
    pagination.empty();
    
    // 如果只有一页，不显示分页
    if (totalPages <= 1) {
        $('#pagination-controls').hide();
        return;
    } else {
        $('#pagination-controls').show();
    }
    
    // 更新总页数和记录数显示
    $('#total-pages').text(totalPages);
    
    // 上一页按钮
    const prevBtn = $(`
        <li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
            <a class="page-link" href="javascript:void(0)" aria-label="Previous">
                <span aria-hidden="true">&laquo;</span>
            </a>
        </li>
    `);
    prevBtn.click(function() {
        if (currentPage > 1) {
            currentPage--;
            loadSyslogs();
        }
    });
    pagination.append(prevBtn);
    
    // 页码按钮
    const maxPageButtons = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxPageButtons / 2));
    let endPage = Math.min(totalPages, startPage + maxPageButtons - 1);
    
    if (endPage - startPage + 1 < maxPageButtons) {
        startPage = Math.max(1, endPage - maxPageButtons + 1);
    }
    
    for (let i = startPage; i <= endPage; i++) {
        const pageBtn = $(`
            <li class="page-item ${i === currentPage ? 'active' : ''}">
                <a class="page-link" href="javascript:void(0)">${i}</a>
            </li>
        `);
        pageBtn.click(function() {
            currentPage = i;
            loadSyslogs();
        });
        pagination.append(pageBtn);
    }
    
    // 下一页按钮
    const nextBtn = $(`
        <li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
            <a class="page-link" href="javascript:void(0)" aria-label="Next">
                <span aria-hidden="true">&raquo;</span>
            </a>
        </li>
    `);
    nextBtn.click(function() {
        if (currentPage < totalPages) {
            currentPage++;
            loadSyslogs();
        }
    });
    pagination.append(nextBtn);
    
    // 更新分页大小选择器
    const pageSizeSelector = $('#page-size-selector');
    pageSizeSelector.empty();
    
    pageSizeOptions.forEach(size => {
        pageSizeSelector.append($(`<option value="${size}" ${pageSize === size ? 'selected' : ''}>${size}条/页</option>`));
    });
    
    // 更新跳转页码输入框
    $('#goto-page-input').attr('max', totalPages);
    $('#goto-page-input').val(currentPage);
}

// 同步日志到数据库
async function syncLogsToDatabase() {
    try {
        const response = await fetchAPI('/api/system-logs/synchronize', {
            method: 'POST'
        });
        
        if (response && response.success) {
            const message = `${response.message}`;
            $('#success-message').text(message).fadeIn();
            setTimeout(() => {
                $('#success-message').fadeOut();
            }, 3000);
            return true;
        } else {
            throw new Error(response.message || '同步失败');
        }
    } catch (error) {
        console.error('同步日志失败:', error);
        showErrorMessage('同步日志失败: ' + error.message);
        return false;
    }
}

// 查看日志详情
async function viewLogDetail(logId) {
    try {
        // 显示加载中状态
        $('#detail-content').html(`
            <div class="text-center py-3">
                <div class="spinner-border text-primary" role="status">
                    <span class="sr-only">加载中...</span>
                </div>
                <p class="mt-2">正在加载日志详情...</p>
            </div>
        `);
        
        // 显示模态框
        $('#logDetailModal').modal('show');
        
        // 获取日志详情
        const log = await fetchAPI(`/api/system-logs/by-id/${logId}`);
        console.log('日志详情数据:', log);
        
        if (!log) {
            $('#detail-content').html('<div class="alert alert-warning">未找到日志详情</div>');
            return;
        }
        
        // 根据状态码判断日志类型
        let logTypeText = 'INFO';
        let typeBadgeClass = 'badge-info';
        
        if (log.statusCode >= 400 && log.statusCode < 500) {
            logTypeText = 'WARNING';
            typeBadgeClass = 'badge-warning';
        } else if (log.statusCode >= 500) {
            logTypeText = 'ERROR';
            typeBadgeClass = 'badge-danger';
        }
        
        // 填充模态框数据
        $('#detail-id').text(log.logId || '-');
        $('#detail-type').html(`<span class="badge ${typeBadgeClass}">${logTypeText}</span>`);
        $('#detail-module').text(log.operation || '系统');
        $('#detail-user').text(log.username || '系统');
        $('#detail-ip').text(log.ip || '-');
        $('#detail-time').text(formatDate(log.createTime) || '-');
        
        // 设置详细内容
        let detailContent = '';
        
        if (log.statusCode) {
            detailContent += `<p><strong>状态码:</strong> ${log.statusCode}</p>`;
        }
        
        if (log.method) {
            detailContent += `<p><strong>请求方法:</strong> ${log.method}</p>`;
        }
        
        if (log.params) {
            detailContent += `<p><strong>请求参数:</strong> <pre class="bg-light p-2 mt-1">${log.params}</pre></p>`;
        }
        
        if (log.errorMsg) {
            detailContent += `<p><strong>返回信息:</strong> <pre class="bg-light p-2 mt-1">${log.errorMsg}</pre></p>`;
        }
        
        if (!detailContent) {
            detailContent = '<p class="text-muted">无详细内容</p>';
        }
        
        $('#detail-content').html(detailContent);
    } catch (error) {
        console.error('加载日志详情失败:', error);
        showErrorMessage('加载日志详情失败: ' + error.message);
        $('#detail-content').html(`<div class="alert alert-danger">加载日志详情失败: ${error.message}</div>`);
    }
}