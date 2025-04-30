/**
 * 管理员系统日志页面脚本
 */

// 页面变量
let currentPage = 1;
let totalPages = 1;
let pageSize = 10;

// 页面加载完成后执行
$(document).ready(function() {
    // 检查登录状态
    checkLoginStatus().then(isLoggedIn => {
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
                loadSyslogs();
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
            <td colspan="6" class="text-center py-3">
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
        const module = $('#module').val();
        const dateRange = $('#dateRange').val();
        
        if (logType) params.append('logType', logType);
        if (module) params.append('module', module);
        if (dateRange) params.append('days', dateRange);
        
        // 发送API请求 - 使用RESTful风格
        const apiUrl = `/api/admin/syslog?${params.toString()}`;
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
                <td colspan="6" class="text-center py-3">
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
    
    if (!logs || logs.length === 0) {
        tbody.html(`
            <tr>
                <td colspan="6" class="text-center py-3">
                    <p class="text-muted mb-0">暂无系统日志数据</p>
                </td>
            </tr>
        `);
        return;
    }
    
    logs.forEach(log => {
        // 根据日志类型设置不同的样式
        let typeBadgeClass = 'badge-info';
        if (log.logType === 'WARNING') {
            typeBadgeClass = 'badge-warning';
        } else if (log.logType === 'ERROR') {
            typeBadgeClass = 'badge-danger';
        }
        
        const row = $(`
            <tr>
                <td>${log.logId}</td>
                <td><span class="badge ${typeBadgeClass}">${log.logType}</span></td>
                <td>${log.module}</td>
                <td>${truncateText(log.content, 100)}</td>
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
        return;
    }
    
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
}

// 查看日志详情
async function viewLogDetail(logId) {
    try {
        const log = await fetchAPI(`/api/admin/syslog/${logId}`);
        
        // 填充模态框数据
        $('#detail-id').text(log.logId);
        $('#detail-type').text(log.logType);
        $('#detail-module').text(log.module);
        $('#detail-user').text(log.username || '系统');
        $('#detail-ip').text(log.ipAddress || '-');
        $('#detail-time').text(formatDate(log.createTime));
        $('#detail-content').text(log.content);
        
        // 显示模态框
        $('#logDetailModal').modal('show');
    } catch (error) {
        console.error('加载日志详情失败:', error);
        showErrorMessage('加载日志详情失败: ' + error.message);
    }
}