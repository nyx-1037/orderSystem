/**
 * 管理端聊天页面JavaScript
 */

// 全局变量
let currentAdmin = null; // 当前管理员
let currentUserId = null; // 当前聊天用户ID
let currentChatType = null; // 当前聊天类型：user(用户)、broadcast(广播)
let webSocket = null; // WebSocket连接
let pageNum = 1; // 当前页码
let pageSize = 20; // 每页消息数
let hasMoreMessages = true; // 是否有更多消息
let userList = []; // 用户列表

// 页面加载完成后执行
$(document).ready(function() {
    // 初始化管理员信息
    initAdminInfo();
    
    // 初始化WebSocket连接
    initWebSocket();
    
    // 获取用户列表
    getRecentChatList();
    
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
    
    // 绑定标记已读按钮点击事件
    $('#markReadBtn').click(function() {
        if (currentUserId) {
            markAllRead(currentUserId);
        }
    });
    
    // 绑定刷新用户列表按钮点击事件
    $('#refreshUserListBtn').click(function() {
        getRecentChatList();
    });
    
    // 绑定搜索用户按钮点击事件
    $('#searchUserBtn').click(function() {
        searchUsers();
    });
    
    // 绑定搜索用户输入框回车事件
    $('#searchUserInput').keydown(function(e) {
        if (e.keyCode === 13) {
            e.preventDefault();
            searchUsers();
        }
    });
    
    // 绑定退出登录按钮点击事件
    $('#logoutBtn').click(function() {
        logout();
    });
});

/**
 * 初始化管理员信息
 */
function initAdminInfo() {
    // 从localStorage获取用户信息和token
    const userJson = localStorage.getItem('user');
    const token = localStorage.getItem('token');
    const userRole = localStorage.getItem('userRole');
    
    // 如果没有token或者不是管理员角色，跳转到管理员登录页面
    if (!token || userRole !== '1') {
        window.location.href = '/pages/admin/login.html';
        return;
    }
    
    if (userJson) {
        try {
            currentAdmin = JSON.parse(userJson);
            
            // 检查是否是管理员
            if (currentAdmin.role !== 1) {
                alert('您没有权限访问此页面');
                window.location.href = '/pages/admin/login.html';
                return;
            }
            
        } catch (e) {
            console.error('解析用户信息失败', e);
            // 清除无效的用户信息
            localStorage.removeItem('user');
            window.location.href = '/pages/admin/login.html';
            return;
        }
    } else {
        // 尝试通过API获取当前用户信息
        fetchWithAuth('/api/users/current')
            .then(response => {
                if (response.ok) {
                    return response.json();
                } else {
                    throw new Error('获取用户信息失败: ' + response.status);
                }
            })
            .then(data => {
                if (data && data.username && data.role === 1) {
                    currentAdmin = data;
                    // 保存用户信息到localStorage
                    localStorage.setItem('user', JSON.stringify(data));
                } else {
                    // 未登录或不是管理员，跳转到登录页面
                    window.location.href = '/pages/admin/login.html';
                }
            })
            .catch(error => {
                console.error('获取用户信息失败', error);
                window.location.href = '/pages/admin/login.html';
            });
    }
}

/**
 * 初始化WebSocket连接
 */
function initWebSocket() {
    // 检查浏览器是否支持WebSocket
    if (!window.WebSocket) {
        alert('您的浏览器不支持WebSocket，请更换浏览器');
        return;
    }
    
    // 关闭之前的连接
    if (webSocket != null) {
        webSocket.close();
    }
    
    // 获取JWT令牌
    const token = getToken();
    if (!token) {
        console.error('未找到认证令牌');
        handleUnauthorized();
        return;
    }
    
    // 创建WebSocket连接，添加JWT令牌作为查询参数
    const wsUrl = `ws://${window.location.host}/websocket/chat/${currentAdmin.userId}?token=${token}`;
    webSocket = new WebSocket(wsUrl);
    
    // 连接打开事件
    webSocket.onopen = function() {
        console.log('WebSocket连接已建立');
    };
    
    // 接收消息事件
    webSocket.onmessage = function(event) {
        const message = JSON.parse(event.data);
        console.log('收到消息:', message);
        
        // 处理接收到的消息
        handleReceivedMessage(message);
    };
    
    // 连接关闭事件
    webSocket.onclose = function() {
        console.log('WebSocket连接已关闭');
        // 5秒后尝试重新连接
        setTimeout(function() {
            initWebSocket();
        }, 5000);
    };
    
    // 连接错误事件
    webSocket.onerror = function(error) {
        console.error('WebSocket连接发生错误', error);
    };
}

/**
 * 处理接收到的消息
 * @param {Object} message 消息对象
 */
function handleReceivedMessage(message) {
    // 如果是当前聊天用户发送的消息，直接显示
    if (message.senderId === currentUserId) {
        appendMessage(message);
        // 滚动到底部
        scrollToBottom();
        // 标记为已读
        markMessageRead(message.messageId);
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
    if (!currentUserId && currentChatType !== 'broadcast') {
        alert('请先选择一个用户开始聊天');
        return;
    }
    
    // 构建消息对象
    const message = {
        senderId: currentAdmin.userId,
        receiverId: currentUserId,
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
            '<i class="bi bi-check2-all"></i>已读' : 
            '<i class="bi bi-check2"></i>未读';
        messageHtml += `<div class="message-status">${readStatus}</div>`;
    }
    
    messageHtml += `</div>`;
    
    // 添加到消息容器
    $('#messageContainer').append(messageHtml);
}

/**
 * 在消息容器顶部添加消息
 * @param {Object} message 消息对象
 */
function prependMessage(message) {
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
            '<i class="bi bi-check2-all"></i>已读' : 
            '<i class="bi bi-check2"></i>未读';
        messageHtml += `<div class="message-status">${readStatus}</div>`;
    }
    
    messageHtml += `</div>`;
    
    // 添加到消息容器顶部
    $('#messageContainer').prepend(messageHtml);
}

/**
 * 添加系统消息
 * @param {string} content 消息内容
 */
function appendSystemMessage(content) {
    const messageHtml = `
        <div class="system-message">
            <div class="message-content">${content}</div>
        </div>
    `;
    $('#messageContainer').append(messageHtml);
    scrollToBottom();
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
 * @param {number} userId 用户ID
 */
function switchChat(type, userId) {
    // 更新当前聊天类型和用户ID
    currentChatType = type;
    currentUserId = userId;
    
    // 更新聊天列表选中状态
    $('.list-group-item').removeClass('active');
    if (type === 'broadcast') {
        $('[data-type="broadcast"]').addClass('active');
        $('#chatTitle').text('全站广播');
    } else if (type === 'user') {
        $(`[data-user-id="${userId}"]`).addClass('active');
        const user = userList.find(u => u.userId === userId);
        $('#chatTitle').text(user ? `与 ${user.username} 聊天` : '与用户聊天');
    }
    
    // 清空消息容器
    $('#messageContainer').empty();
    
    // 重置分页参数
    pageNum = 1;
    hasMoreMessages = true;
    
    // 如果是广播，显示提示信息
    if (type === 'broadcast') {
        appendSystemMessage('在这里发送全站广播消息');
        $('#chatInputArea').show(); // 显示输入区域
        $('#markReadBtn').hide(); // 隐藏标记已读按钮
    } else {
        $('#chatInputArea').show(); // 显示输入区域
        $('#markReadBtn').show(); // 显示标记已读按钮
        // 加载聊天记录
        loadChatHistory();
    }
}

/**
 * 加载聊天历史记录
 */
function loadChatHistory() {
    if (!hasMoreMessages || !currentUserId) return;
    
    // 构建请求参数
    const params = {
        pageNum: pageNum,
        pageSize: pageSize,
        otherUserId: currentUserId
    };
    
    // 发送请求获取聊天记录
    $.ajax({
        url: '/api/chat/history',
        type: 'GET',
        data: params,
        headers: {
            'Authorization': `Bearer ${currentAdmin.token}`
        },
        success: function(response) {
            if (response.success) {
                const data = response.data;
                const messages = data.list;
                
                // 检查是否有更多消息
                hasMoreMessages = data.pageNum < data.pages;
                
                // 如果没有更多消息，隐藏加载更多按钮
                if (!hasMoreMessages) {
                    $('#loadMoreBtn').hide();
                } else {
                    $('#loadMoreBtn').show();
                }
                
                // 如果没有消息，显示提示
                if (messages.length === 0 && pageNum === 1) {
                    appendSystemMessage('暂无聊天记录');
                    return;
                }
                
                // 记录当前滚动位置
                const chatBody = document.getElementById('chatContent');
                const scrollPos = chatBody.scrollHeight - chatBody.scrollTop;
                
                // 按时间顺序显示消息
                const sortedMessages = messages.sort((a, b) => a.createTime - b.createTime);
                for (const message of sortedMessages) {
                    // 将新加载的消息添加到顶部，以便实现“加载更多”的效果
                    prependMessage(message);
                }
                
                // 如果是第一页，滚动到底部，否则保持滚动位置
                if (pageNum === 1) {
                    scrollToBottom();
                } else {
                    chatBody.scrollTop = chatBody.scrollHeight - scrollPos;
                }
                
                // 更新页码
                pageNum++;
            } else {
                console.error('获取聊天记录失败', response.message);
                appendSystemMessage('获取聊天记录失败: ' + response.message);
            }
        },
        error: function(xhr, status, error) {
            if (xhr.status === 401) {
                // 未授权，跳转到登录页
                localStorage.removeItem('user');
                window.location.href = '../login.html';
            } else {
                console.error('获取聊天记录请求失败', error);
                appendSystemMessage('获取聊天记录失败，请检查网络连接');
            }
        }
    });
}

/**
 * 加载更多消息
 */
function loadMoreMessages() {
    loadChatHistory();
}

/**
 * 刷新当前聊天
 */
function refreshCurrentChat() {
    // 清空消息容器
    $('#messageContainer').empty();
    
    // 重置分页参数
    pageNum = 1;
    hasMoreMessages = true;
    
    // 重新加载聊天记录
    if (currentChatType !== 'broadcast') {
        loadChatHistory();
    } else {
        appendSystemMessage('在这里发送全站广播消息');
    }
}

/**
 * 获取最近聊天列表
 */
function getRecentChatList() {
    $.ajax({
        url: '/api/chat/recent',
        type: 'GET',
        success: function(response) {
            if (response.success) {
                userList = response.data;
                updateUserList(userList);
            } else {
                console.error('获取最近聊天列表失败', response.message);
            }
        },
        error: function(xhr, status, error) {
            console.error('获取最近聊天列表请求失败', error);
        }
    });
}

/**
 * 更新用户列表
 * @param {Array} users 用户列表
 */
function updateUserList(users) {
    // 保留广播选项
    const broadcastItem = $('#userChatList').children().filter(function() {
        return $(this).data('type') === 'broadcast';
    });
    
    // 清空用户列表
    $('#userChatList').empty();
    
    // 添加回广播选项
    $('#userChatList').append(broadcastItem);
    
    // 添加用户列表
    for (const user of users) {
        // 跳过自己
        if (user.otherUserId === currentAdmin.userId) continue;
        
        const unreadBadge = user.unreadCount > 0 ? 
            `<span class="unread-badge">${user.unreadCount > 99 ? '99+' : user.unreadCount}</span>` : 
            `<small class="text-muted">${formatTime(user.lastMessageTime)}</small>`;
        
        const item = `
            <a href="#" class="list-group-item list-group-item-action ${currentUserId === user.otherUserId ? 'active' : ''}" 
               data-type="user" data-user-id="${user.otherUserId}" onclick="switchChat('user', ${user.otherUserId})">
                <div class="d-flex align-items-center">
                    <div class="chat-avatar">
                        ${user.avatarData ? `<img src="/api/user/avatar/${user.otherUserId}" alt="${user.otherUsername}">` : `<i class="bi bi-person"></i>`}
                    </div>
                    <div class="ms-3">
                        <div class="d-flex justify-content-between align-items-center">
                            <h6 class="mb-0">${user.otherUsername}</h6>
                            ${unreadBadge}
                        </div>
                        <p class="mb-0 text-muted small text-truncate" style="max-width: 150px;">${user.lastMessage || '暂无消息'}</p>
                    </div>
                </div>
            </a>
        `;
        
        $('#userChatList').append(item);
    }
}

/**
 * 搜索用户
 */
function searchUsers() {
    const keyword = $('#searchUserInput').val().trim();
    if (!keyword) {
        getRecentChatList();
        return;
    }
    
    $.ajax({
        url: '/api/user/search',
        type: 'GET',
        data: { username: keyword, role: 0 }, // 只搜索普通用户
        success: function(response) {
                if (response.success) {
                    const users = response.data;
                // 转换为聊天列表格式
                const chatUsers = users.map(user => ({
                    otherUserId: user.userId,
                    otherUsername: user.username,
                    avatarData: user.avatarData,
                    unreadCount: 0,
                    lastMessage: '',
                    lastMessageTime: null
                }));
                updateUserList(chatUsers);
            } else {
                console.error('搜索用户失败', response.message);
            }
        },
        error: function(xhr, status, error) {
            console.error('搜索用户请求失败', error);
        }
    });
}

/**
 * 标记消息为已读
 * @param {number} messageId 消息ID
 */
function markMessageRead(messageId) {
    if (!messageId) return;
    
    $.ajax({
        url: '/api/chat/read',
        type: 'POST',
        contentType: 'application/json',
        data: JSON.stringify({ messageId: messageId }),
        success: function(response) {
                if (response.success) {
                    console.log('标记消息已读成功');
            } else {
                console.error('标记消息已读失败', response.message);
            }
        },
        error: function(xhr, status, error) {
            console.error('标记消息已读请求失败', error);
        }
    });
}

/**
 * 标记所有消息为已读
 * @param {number} otherUserId 对方用户ID
 */
function markAllRead(otherUserId) {
    if (!otherUserId) return;
    
    $.ajax({
        url: '/api/chat/read/all',
        type: 'POST',
        contentType: 'application/json',
        // 不需要发送otherUserId，后端从session获取用户ID
        success: function(response) {
            if (response.code === 200) {
                console.log('标记所有消息已读成功');
                // 更新用户列表
                getRecentChatList();
                // 更新消息状态显示
                $('.message-sent .message-status').html('<i class="bi bi-check2-all"></i>已读');
            } else {
                console.error('标记所有消息已读失败', response.message);
            }
        },
        error: function(xhr, status, error) {
            console.error('标记所有消息已读请求失败', error);
        }
    });
}

/**
 * 退出登录
 */
function logout() {
    // 关闭WebSocket连接
    if (webSocket) {
        webSocket.close();
    }
    
    // 清除本地存储的用户信息
    localStorage.removeItem('user');
    
    // 跳转到登录页
    window.location.href = '../login.html';
}