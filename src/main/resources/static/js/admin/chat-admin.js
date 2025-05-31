/**
 * 获取用户列表（分页）
 * @param {number} pageNum 页码
 * @param {string} keyword 搜索关键词
 * @returns {Promise} 返回一个Promise，在获取用户列表完成后解析
 */
function getUserListWithPagination(pageNum = 1, keyword = '') {
    return new Promise((resolve, reject) => {
        // 确保管理员信息已初始化
        if (!currentAdmin || !currentAdmin.userId) {
            console.error('管理员信息未初始化，无法获取用户列表');
            showSystemMessage('获取用户列表失败：管理员信息未初始化');
            reject(new Error('管理员信息未初始化'));
            return;
        }
        
        // 获取JWT令牌
        const token = getToken();
        if (!token) {
            console.error('未找到认证令牌');
            showSystemMessage('获取用户列表失败：未找到认证令牌，请刷新页面重试');
            reject(new Error('未找到认证令牌'));
            return;
        }
        
        // 构建请求URL
        let url = `/api/users/page/${pageNum}/${userPageSize}?role=0&status=1`;
        if (keyword) {
            url += `&username=${encodeURIComponent(keyword)}`;
        }
        
        // 使用分页接口获取用户列表
        fetchAPI(url)
        .then(response => {
            if (response && response.list) {
                // 更新分页信息
                userList = response.list;
                userTotalCount = response.total || 0;
                userTotalPages = response.pages || 1;
                userPageNum = pageNum;
                
                // 更新用户列表显示
                updateUserList(userList);
                updatePaginationInfo();
                
                resolve(response);
            } else {
                console.error('获取用户列表失败：未知的响应格式', response);
                showSystemMessage('获取用户列表失败：未知的响应格式');
                reject(new Error('未知的响应格式'));
            }
        })
        .catch(error => {
            console.error('获取用户列表请求失败', error);
            if (error.message !== '未授权访问，请重新登录') {
                showSystemMessage('获取用户列表失败: ' + error.message);
            }
            reject(error);
        });
    });
}

/**
 * 获取最近聊天列表（保持向后兼容）
 * @returns {Promise} 返回一个Promise，在获取聊天列表完成后解析
 */
function getRecentChatList() {
    return getUserListWithPagination(userPageNum, searchKeyword);
}

// 全局变量
let currentAdmin = null; // 当前管理员
let currentReceiverId = null; // 当前聊天对象ID
let currentChatType = 'user'; // 当前聊天类型：user(普通用户)、broadcast(广播)
let webSocket = null; // WebSocket连接
let pageNum = 1; // 当前页码
let pageSize = 20; // 每页消息数
let hasMoreMessages = true; // 是否有更多消息
let userList = []; // 用户列表

// 用户列表分页相关变量
let userPageNum = 1; // 用户列表当前页码
let userPageSize = 10; // 用户列表每页数量
let userTotalPages = 1; // 用户列表总页数
let userTotalCount = 0; // 用户总数
let searchKeyword = ''; // 搜索关键词

// 页面加载完成后执行
$(document).ready(function() {
    // 检查管理员登录状态，使用与其他管理员页面相同的方式
    checkAdminLoginStatus().then(isLoggedIn => {
        if (isLoggedIn) {
            // 初始化管理员信息
            initAdminInfo()
                .then(() => {
                    // 确保管理员信息已完全加载
                    if (currentAdmin && currentAdmin.userId) {
                        // 初始化WebSocket连接
                        return initWebSocket();
                    } else {
                        throw new Error('管理员信息未完全加载');
                    }
                })
                .then(() => {
                    // 获取最近聊天列表
                    return getRecentChatList();
                })
                .catch(error => {
                    console.error('初始化失败:', error);
                });
        }
    });
    
    // 绑定发送按钮点击事件
    $('#sendBtn').click(sendMessage);
    
    // 绑定消息输入框回车事件
    $('#messageInput').keydown(function(e) {
        // 按下Enter键发送消息，Shift+Enter换行
        if (e.keyCode === 13 && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });
    
    // 绑定刷新按钮点击事件
    $('#refreshBtn').click(function() {
        refreshCurrentChat();
    });
    
    // 绑定加载更多按钮点击事件
    $('#loadMoreBtn').click(function() {
        loadMoreMessages();
    });
    
    // 绑定刷新用户列表按钮点击事件
    $('#refreshUserListBtn').click(function() {
        refreshUserList();
    });
    
    // 绑定搜索按钮点击事件
    $('#searchUserBtn').click(function() {
        searchUsers();
    });
    
    // 绑定搜索输入框回车事件
    $('#searchUserInput').keydown(function(e) {
        if (e.keyCode === 13) {
            e.preventDefault();
            searchUsers();
        }
    });
    
    // 绑定分页按钮点击事件
    $('#prevPageBtn').click(function() {
        if (userPageNum > 1) {
            getUserListWithPagination(userPageNum - 1, searchKeyword);
        }
    });
    
    $('#nextPageBtn').click(function() {
        if (userPageNum < userTotalPages) {
            getUserListWithPagination(userPageNum + 1, searchKeyword);
        }
    });
});

/**
 * 初始化管理员信息
 * @returns {Promise} 返回一个Promise，在管理员信息初始化完成后解析
 */
function initAdminInfo() {
    return new Promise((resolve, reject) => {
        try {
            // 从localStorage获取管理员信息
            const adminJson = localStorage.getItem('user');
            
            if (adminJson) {
                currentAdmin = JSON.parse(adminJson);
                resolve(currentAdmin);
            } else {
                // 尝试通过API获取当前管理员信息，使用fetchAPI而不是fetchWithAuth
                fetchAPI('/api/users/current')
                    .then(response => {
                        if (response && response.username) {
                            currentAdmin = response;
                            // 保存管理员信息到localStorage
                            localStorage.setItem('user', JSON.stringify(response));
                            resolve(currentAdmin);
                        } else {
                            reject('未获取到有效的管理员信息');
                        }
                    })
                    .catch(error => {
                        console.error('获取管理员信息失败', error);
                        reject(error);
                    });
            }
        } catch (e) {
            console.error('解析管理员信息失败', e);
            // 清除无效的管理员信息
            localStorage.removeItem('user');
            localStorage.removeItem('token');
            localStorage.removeItem('currentUser');
            window.location.href = '/pages/admin/login.html';
            reject(e);
        }
    });
}

/**
 * 初始化WebSocket连接
 * @returns {Promise} 返回一个Promise，在WebSocket连接建立后解析
 */
function initWebSocket() {
    return new Promise((resolve, reject) => {
        // 检查浏览器是否支持WebSocket
        if (!window.WebSocket) {
            alert('您的浏览器不支持WebSocket，请更换浏览器');
            reject(new Error('浏览器不支持WebSocket'));
            return;
        }
        
        // 关闭之前的连接
        if (webSocket != null) {
            webSocket.close();
        }
        
        // 获取JWT令牌
        const token = getToken();
        if (!token) {
            console.error('未找到认证令牌，请重新登录');
            // 清除本地存储的认证信息
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            localStorage.removeItem('currentUser');
            // 重定向到管理端登录页
            window.location.href = '/pages/admin/login.html';
            reject(new Error('未找到认证令牌'));
            return;
        }
        
        // 确保currentAdmin已经初始化
        if (!currentAdmin || !currentAdmin.userId) {
            console.error('管理员信息未初始化，延迟WebSocket连接');
            // 延迟1秒后重试
            setTimeout(function() {
                initWebSocket()
                    .then(resolve)
                    .catch(reject);
            }, 1000);
            return;
        }
        
        // 创建WebSocket连接，添加JWT令牌作为查询参数
        const wsUrl = `ws://${window.location.host}/websocket/chat/${currentAdmin.userId}?token=${token}`;
        webSocket = new WebSocket(wsUrl);
        
        // 连接打开事件
        webSocket.onopen = function() {
            console.log('WebSocket连接已建立');
            resolve(); // 解析Promise
        };
        
        // 设置连接超时
        const connectionTimeout = setTimeout(() => {
            if (webSocket.readyState === WebSocket.CONNECTING) {
                console.error('WebSocket连接超时');
                webSocket.close();
                reject(new Error('连接超时'));
            }
        }, 10000); // 10秒超时
        
        // 连接成功后清除超时
        const originalOnOpen = webSocket.onopen;
        webSocket.onopen = function() {
            clearTimeout(connectionTimeout);
            originalOnOpen.call(this);
        };
        
        // 接收消息事件
        webSocket.onmessage = function(event) {
            try {
                const message = JSON.parse(event.data);
                console.log('收到消息:', message);
                
                // 处理接收到的消息
                handleReceivedMessage(message);
            } catch (error) {
                console.error('处理消息失败:', error);
                // 如果JSON解析失败，可能是纯文本消息，作为系统消息处理
                if (typeof event.data === 'string') {
                    showSystemMessage(event.data);
                }
            }
        };
        
        // 连接关闭事件
        webSocket.onclose = function(event) {
            console.log('WebSocket连接已关闭', event);
            // 检查关闭原因，如果是认证失败(1008)或其他客户端错误，不重连
            if (event.code === 1008 || event.code === 1002 || event.code === 1003) {
                console.error('WebSocket认证失败，请重新登录');
                // 清除本地存储的认证信息
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                localStorage.removeItem('currentUser');
                // 重定向到管理端登录页
                window.location.href = '/pages/admin/login.html';
                return;
            }
            
            // 只有在非正常关闭时才重连
            if (event.code !== 1000) {
                showSystemMessage('聊天连接已断开，正在尝试重新连接...');
                // 5秒后尝试重新连接
                setTimeout(function() {
                    initWebSocket()
                        .then(() => {
                            showSystemMessage('聊天连接已重新建立');
                        })
                        .catch(error => {
                            console.error('重新连接失败:', error);
                            showSystemMessage('重新连接失败，请刷新页面重试');
                        });
                }, 5000);
            }
        };
        
        // 连接错误事件
        webSocket.onerror = function(error) {
            console.error('WebSocket连接发生错误', error);
            showSystemMessage('聊天连接发生错误，请检查网络连接');
            reject(error); // 拒绝Promise
        };
        
        // 设置连接超时
        setTimeout(function() {
            if (webSocket.readyState !== WebSocket.OPEN) {
                reject(new Error('WebSocket连接超时'));
            }
        }, 10000);
    });
}

/**
 * 处理接收到的消息
 * @param {Object} message 消息对象
 */
function handleReceivedMessage(message) {
    // 处理系统消息
    if (message.type === 'system') {
        showSystemMessage(message.content);
        return;
    }
    
    // 如果是当前聊天对象发送的消息，直接显示
    if (message.senderId === currentReceiverId) {
        appendMessage(message);
        // 滚动到底部
        scrollToBottom();
        // 标记为已读
        if (message.messageId) {
            markMessageRead(message.messageId);
        }
    }
    
    // 更新用户列表
    getRecentChatList();
}

/**
 * 发送消息
 */
function sendMessage() {
    const content = $('#messageInput').val().trim();
    if (!content) {
        return;
    }
    
    // 如果未选择聊天对象，提示用户
    if (!currentReceiverId && currentChatType !== 'broadcast') {
        alert('请先选择一个用户开始聊天');
        return;
    }
    
    // 构建消息对象
    const message = {
        senderId: currentAdmin.userId,
        receiverId: currentReceiverId,
        content: content,
        messageType: currentChatType === 'broadcast' ? 2 : 1, // 0:普通消息, 1:系统消息, 2:广播消息
        createTime: new Date().getTime()
    };
    
    // 发送消息
    if (webSocket && webSocket.readyState === WebSocket.OPEN) {
        webSocket.send(JSON.stringify(message));
        
        // 清空输入框
        $('#messageInput').val('');
        
        // 如果是广播消息，不在本地显示
        if (currentChatType !== 'broadcast') {
            // 在本地显示消息
            appendMessage(message);
            // 滚动到底部
            scrollToBottom();
        } else {
            // 显示发送成功提示
            appendSystemMessage('广播消息已发送');
        }
    } else {
        alert('WebSocket连接已断开，请刷新页面重试');
    }
}

/**
 * 在消息容器中添加消息
 * @param {Object} message 消息对象
 */
function appendMessage(message) {
    const isSelf = message.senderId === currentAdmin.userId;
    const messageClass = isSelf ? 'message-sent' : 'message-received';
    const messageTime = formatTime(message.createTime);
    
    // 构建消息HTML
    let messageHtml = `
        <div class="message ${messageClass}">
    `;
    
    // 如果不是自己发送的消息，显示发送者名称
    if (!isSelf && message.senderName) {
        messageHtml += `<div class="message-sender">${message.senderName}</div>`;
    }
    
    // 消息内容
    messageHtml += `
            <div class="message-content">${message.content}</div>
            <div class="message-time">${messageTime}</div>
    `;
    
    // 如果是自己发送的消息，显示已读状态
    if (isSelf) {
        const readStatus = message.readStatus === 1 ? 
            '<i class="fas fa-check-double"></i>已读' : 
            '<i class="fas fa-check"></i>未读';
        messageHtml += `<div class="message-status">${readStatus}</div>`;
    }
    
    messageHtml += `</div>`;
    
    // 添加到消息容器
    $('#messageContainer').append(messageHtml);
}

/**
 * 添加系统消息
 * @param {string} content 消息内容
 */
function showSystemMessage(content) {
    const messageHtml = `
        <div class="system-message">
            <div class="message-content">${content}</div>
        </div>
    `;
    $('#messageContainer').append(messageHtml);
    scrollToBottom();
}

/**
 * 添加系统消息（别名函数，用于兼容性）
 * @param {string} content 消息内容
 */
function appendSystemMessage(content) {
    showSystemMessage(content);
}

/**
 * 滚动到底部
 */
function scrollToBottom() {
    const chatBody = document.getElementById('chatContent');
    chatBody.scrollTop = chatBody.scrollHeight;
}

/**
 * 格式化时间
 * @param {number} timestamp 时间戳
 * @returns {string} 格式化后的时间字符串
 */
function formatTime(timestamp) {
    if (!timestamp) return '';
    
    const date = new Date(timestamp);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    
    // 如果是今天，只显示时间
    if (isToday) {
        return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    }
    
    // 否则显示日期和时间
    return date.toLocaleString('zh-CN', { 
        month: '2-digit', 
        day: '2-digit',
        hour: '2-digit', 
        minute: '2-digit'
    });
}

/**
 * 切换聊天对象
 * @param {string} type 聊天类型
 * @param {number} receiverId 接收者ID
 * @param {string} receiverName 接收者名称
 */
function switchChat(type, receiverId, receiverName) {
    // 更新当前聊天类型和接收者ID
    currentChatType = type;
    currentReceiverId = receiverId;
    
    // 更新聊天列表选中状态
    $('.list-group-item').removeClass('active');
    if (type === 'broadcast') {
        $('[data-type="broadcast"]').addClass('active');
        $('#chatTitle').text('全站广播');
    } else if (type === 'user') {
        $(`[data-receiver-id="${receiverId}"]`).addClass('active');
        $('#chatTitle').text(receiverName ? `与 ${receiverName} 聊天` : '与用户聊天');
    }
    
    // 清空消息容器
    $('#messageContainer').empty();
    
    // 重置分页
    pageNum = 1;
    hasMoreMessages = true;
    
    // 加载聊天记录
    loadChatHistory();
}

/**
 * 加载聊天记录
 */
function loadChatHistory() {
    // 如果是广播模式，不加载聊天记录
    if (currentChatType === 'broadcast') {
        $('#messageContainer').empty();
        appendSystemMessage('广播模式下，消息将发送给所有在线用户');
        return;
    }
    
    // 如果未选择聊天对象，不加载聊天记录
    if (!currentReceiverId) {
        $('#messageContainer').empty();
        appendSystemMessage('请从左侧选择一个用户开始聊天');
        return;
    }
    
    // 显示加载中
    $('#loadMoreBtn').text('加载中...').prop('disabled', true);
    
    // 获取聊天记录
    fetchAPI(`/api/chat/history?targetUserId=${currentReceiverId}&pageNum=${pageNum}&pageSize=${pageSize}`)
        .then(data => {
            // fetchAPI已经处理了JSON解析和错误处理
            // 恢复加载按钮状态
            $('#loadMoreBtn').text('加载更多').prop('disabled', false);
            
            if (data.success && data.data) {
                const messages = data.data;
                
                // 如果没有更多消息
                if (messages.length < pageSize) {
                    hasMoreMessages = false;
                    $('#loadMoreBtn').hide();
                } else {
                    $('#loadMoreBtn').show();
                }
                
                // 显示消息
                if (messages.length > 0) {
                    // 如果是第一页，清空消息容器
                    if (pageNum === 1) {
                        $('#messageContainer').empty();
                    }
                    
                    // 添加消息
                    for (let i = messages.length - 1; i >= 0; i--) {
                        appendMessage(messages[i]);
                    }
                    
                    // 如果是第一页，滚动到底部
                    if (pageNum === 1) {
                        scrollToBottom();
                    }
                } else if (pageNum === 1) {
                    // 如果是第一页且没有消息，显示提示
                    $('#messageContainer').empty();
                    appendSystemMessage('暂无聊天记录');
                }
            } else {
                console.error('获取聊天记录失败:', data);
                appendSystemMessage('获取聊天记录失败: ' + (data.message || '未知错误'));
            }
        })
        .catch(error => {
            console.error('获取聊天记录请求失败', error);
            $('#loadMoreBtn').text('加载更多').prop('disabled', false);
            appendSystemMessage('获取聊天记录失败: ' + error.message);
        });
}

/**
 * 加载更多消息
 */
function loadMoreMessages() {
    if (!hasMoreMessages) {
        return;
    }
    
    // 增加页码
    pageNum++;
    
    // 加载聊天记录
    loadChatHistory();
}

/**
 * 刷新当前聊天
 */
function refreshCurrentChat() {
    // 重置分页
    pageNum = 1;
    hasMoreMessages = true;
    
    // 加载聊天记录
    loadChatHistory();
}

/**
 * 标记消息为已读
 * @param {number} messageId 消息ID
 */
function markMessageRead(messageId) {
    if (!messageId) {
        return;
    }
    
    fetchAPI(`/api/chat/read/${messageId}`, {
        method: 'POST'
    })
        .then(data => {
            // fetchAPI已经处理了JSON解析和错误处理
            console.log('消息已标记为已读:', messageId);
        })
        .catch(error => {
            console.error('标记消息已读失败:', error);
        })
        .catch(error => {
            console.error('标记消息已读请求失败', error);
        });
}

/**
 * 更新用户列表
 * @param {Array} users 用户列表
 */
function updateUserList(users) {
    // 清空用户列表，保留广播选项
    const broadcastItem = $('[data-type="broadcast"]');
    $('#userChatList').empty().append(broadcastItem);
    
    // 如果没有用户，显示提示
    if (!users || users.length === 0) {
        $('#userChatList').append(`
            <div class="list-group-item text-center text-muted">
                <small>暂无用户</small>
            </div>
        `);
        return;
    }
    
    // 添加用户到列表
    users.forEach(user => {
        const lastMessage = user.lastMessage || '';
        const unreadCount = user.unreadCount || 0;
        const lastTime = user.lastTime ? formatTime(user.lastTime) : '';
        
        const userHtml = `
            <a href="#" class="list-group-item list-group-item-action" 
               data-type="user" 
               data-receiver-id="${user.userId}" 
               onclick="switchChat('user', ${user.userId}, '${user.username}')">
                <div class="d-flex align-items-center">
                    <div class="chat-avatar">
                        ${user.avatar ? `<img src="${user.avatar}" alt="${user.username}">` : 
                                       `<div class="avatar-placeholder">${user.username.charAt(0)}</div>`}
                    </div>
                    <div class="ms-3 flex-grow-1">
                        <div class="d-flex justify-content-between align-items-center">
                            <h6 class="mb-0">${user.username}</h6>
                            <small class="text-muted">${lastTime}</small>
                        </div>
                        <div class="d-flex justify-content-between align-items-center">
                            <p class="mb-0 text-muted small text-truncate">${lastMessage}</p>
                            ${unreadCount > 0 ? `<span class="badge bg-danger rounded-pill">${unreadCount}</span>` : ''}
                        </div>
                    </div>
                </div>
            </a>
        `;
        
        $('#userChatList').append(userHtml);
    });
    
    // 如果有当前聊天对象，高亮显示
    if (currentReceiverId) {
        $(`[data-receiver-id="${currentReceiverId}"]`).addClass('active');
    } else if (currentChatType === 'broadcast') {
        $('[data-type="broadcast"]').addClass('active');
    }
}

/**
 * 更新分页信息显示
 */
function updatePaginationInfo() {
    // 更新用户总数信息
    $('#userListInfo').text(`共 ${userTotalCount} 个用户`);
    
    // 更新页码信息
    $('#pageInfo').text(`${userPageNum} / ${userTotalPages}`);
    
    // 更新分页按钮状态
    $('#prevPageBtn').prop('disabled', userPageNum <= 1);
    $('#nextPageBtn').prop('disabled', userPageNum >= userTotalPages);
    
    // 如果只有一页或没有数据，隐藏分页控件
    if (userTotalPages <= 1) {
        $('#userListPagination').hide();
    } else {
        $('#userListPagination').show();
    }
}

/**
 * 刷新用户列表
 */
function refreshUserList() {
    // 重置到第一页
    userPageNum = 1;
    searchKeyword = '';
    $('#searchUserInput').val('');
    getUserListWithPagination(userPageNum, searchKeyword);
}

/**
 * 搜索用户
 */
function searchUsers() {
    searchKeyword = $('#searchUserInput').val().trim();
    userPageNum = 1; // 搜索时重置到第一页
    getUserListWithPagination(userPageNum, searchKeyword);
}