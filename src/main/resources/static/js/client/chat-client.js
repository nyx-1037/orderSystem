/**
 * 客户端聊天页面JavaScript
 */

// 全局变量
let currentUser = null; // 当前用户
let currentReceiverId = null; // 当前聊天对象ID
let currentChatType = 'service'; // 当前聊天类型：service(客服)、admin(特定管理员)、broadcast(广播)
let webSocket = null; // WebSocket连接
let pageNum = 1; // 当前页码
let pageSize = 20; // 每页消息数
let hasMoreMessages = true; // 是否有更多消息
let adminUsers = []; // 管理员用户列表

// 页面加载完成后执行
$(document).ready(function() {
    // 初始化用户信息
    initUserInfo();
    
    // 初始化WebSocket连接
    initWebSocket();
    
    // 获取管理员用户列表
    getAdminUsers();
    
    // 获取最近聊天列表
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
    
    // 绑定退出登录按钮点击事件
    $('#logoutBtn').click(function() {
        logout();
    });
});

/**
 * 初始化用户信息
 */
function initUserInfo() {
    try {
        // 从localStorage获取用户信息和token
        const userJson = localStorage.getItem('user');
        const token = localStorage.getItem('token');
        
        if (!token) {
            window.location.href = '/pages/client/login.html';
            return;
        }
        
        if (userJson) {
            currentUser = JSON.parse(userJson);
            
            // 显示用户名
            $('#username').text(currentUser.username);
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
                    if (data && data.username) {
                        currentUser = data;
                        // 保存用户信息到localStorage
                        localStorage.setItem('user', JSON.stringify(data));
                        // 显示用户名
                        $('#username').text(data.username);
                    } else {
                        // 未登录，跳转到登录页面
                        window.location.href = '/pages/client/login.html';
                    }
                })
                .catch(error => {
                    console.error('获取用户信息失败', error);
                    window.location.href = '/pages/client/login.html';
                });
        }
    } catch (e) {
        console.error('解析用户信息失败', e);
        // 清除无效的用户信息
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        window.location.href = '/pages/client/login.html';
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
    const wsUrl = `ws://${window.location.host}/websocket/chat/${currentUser.userId}?token=${token}`;
    webSocket = new WebSocket(wsUrl);
    
    // 连接打开事件
    webSocket.onopen = function() {
        console.log('WebSocket连接已建立');
        // 获取未读消息数
        getUnreadCount();
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
    // 如果是当前聊天对象发送的消息，直接显示
    if (message.senderId === currentReceiverId || 
        (currentChatType === 'service' && message.messageType === 1)) {
        appendMessage(message);
        // 滚动到底部
        scrollToBottom();
        // 标记为已读
        markMessageRead(message.messageId);
    }
    
    // 更新未读消息数
    updateUnreadCount(message.senderId);
    
    // 更新最近聊天列表
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
        alert('请先选择一个客服开始聊天');
        return;
    }
    
    // 构建消息对象
    const message = {
        senderId: currentUser.userId,
        receiverId: currentReceiverId,
        content: content,
        messageType: currentChatType === 'broadcast' ? 2 : 0, // 0:普通消息, 1:系统消息, 2:广播消息
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
    const isSelf = message.senderId === currentUser.userId;
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
 * @param {number} receiverId 接收者ID
 */
function switchChat(type, receiverId) {
    // 更新当前聊天类型和接收者ID
    currentChatType = type;
    currentReceiverId = receiverId;
    
    // 更新聊天列表选中状态
    $('.list-group-item').removeClass('active');
    if (type === 'broadcast') {
        $('[data-type="broadcast"]').addClass('active');
        $('#chatTitle').text('全站广播');
    } else if (type === 'service') {
        $('[data-type="service"]').addClass('active');
        $('#chatTitle').text('联系客服');
    } else if (type === 'admin') {
        $(`[data-receiver-id="${receiverId}"]`).addClass('active');
        const admin = adminUsers.find(user => user.userId === receiverId);
        $('#chatTitle').text(admin ? `与 ${admin.username} 聊天` : '与客服聊天');
    }
    
    // 清空消息容器
    $('#messageContainer').empty();
    
    // 重置分页参数
    pageNum = 1;
    hasMoreMessages = true;
    
    // 如果是广播，显示提示信息
    if (type === 'broadcast') {
        appendSystemMessage('这里显示系统公告和活动信息');
        $('#chatInputArea').hide(); // 隐藏输入区域
    } else {
        $('#chatInputArea').show(); // 显示输入区域
        // 加载聊天记录
        loadChatHistory();
    }
    
    // 如果切换到客服聊天，标记所有客服消息为已读
    if (type === 'service') {
        markAllRead();
    }
    
    // 如果切换到特定管理员聊天，标记该管理员的消息为已读
    if (type === 'admin' && receiverId) {
        markAllRead(receiverId);
    }
}

/**
 * 加载聊天历史记录
 */
function loadChatHistory() {
    if (!hasMoreMessages) return;
    
    // 构建请求参数
    const params = {
        pageNum: pageNum,
        pageSize: pageSize
    };
    
    // 根据聊天类型设置不同的参数
    if (currentChatType === 'service') {
        params.messageType = 1; // 系统消息
    } else if (currentChatType === 'admin') {
        params.otherUserId = currentReceiverId;
    }
    
    const token = getToken();
    
    // 发送请求获取聊天记录
    $.ajax({
        url: '/api/chat/history',
        type: 'GET',
        data: params,
        headers: {
            'Authorization': `Bearer ${token}`
        },
        success: function(response) {
            if (response.code === 200) {
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
                    appendMessage(message);
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
                handleUnauthorized(xhr);
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
        appendSystemMessage('这里显示系统公告和活动信息');
    }
}

/**
 * 获取管理员用户列表
 */
function getAdminUsers() {
    const token = getToken();
    
    $.ajax({
        url: '/api/chat/admins',
        type: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`
        },
        success: function(response) {
            if (response.code === 200) {
                adminUsers = response.data;
                
                // 更新客服选择模态框
                updateServiceList(adminUsers);
            } else {
                console.error('获取管理员列表失败', response.message);
            }
        },
        error: function(xhr, status, error) {
            if (xhr.status === 401) {
                handleUnauthorized(xhr);
            } else {
                console.error('获取管理员列表请求失败', error);
            }
        }
    });
}

/**
 * 更新客服列表
 * @param {Array} admins 管理员用户列表
 */
function updateServiceList(admins) {
    const serviceList = $('#serviceList');
    serviceList.empty();
    
    for (const admin of admins) {
        const item = `
            <a href="#" class="list-group-item list-group-item-action" data-bs-dismiss="modal" onclick="switchChat('admin', ${admin.userId})">
                <div class="d-flex align-items-center">
                    <div class="chat-avatar">
                        ${admin.avatarData ? `<img src="/api/user/avatar/${admin.userId}" alt="${admin.username}">` : `<i class="bi bi-person"></i>`}
                    </div>
                    <div class="ms-3">
                        <h6 class="mb-0">${admin.username}</h6>
                        <p class="mb-0 text-muted small">${admin.realName || '客服'}</p>
                    </div>
                </div>
            </a>
        `;
        serviceList.append(item);
    }
}

/**
 * 获取最近聊天列表
 */
function getRecentChatList() {
    const token = getToken();
    
    $.ajax({
        url: '/api/chat/recent',
        type: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`
        },
        success: function(response) {
            if (response.code === 200) {
                updateChatList(response.data);
            } else {
                console.error('获取最近聊天列表失败', response.message);
            }
        },
        error: function(xhr, status, error) {
            if (xhr.status === 401) {
                handleUnauthorized(xhr);
            } else {
                console.error('获取最近聊天列表请求失败', error);
            }
        }
    });
}

/**
 * 更新聊天列表
 * @param {Array} chatList 聊天列表
 */
function updateChatList(chatList) {
    // 保留广播和客服选项
    const existingItems = $('#chatList').children().filter(function() {
        return $(this).data('type') === 'broadcast' || $(this).data('type') === 'service';
    });
    
    // 清空聊天列表
    $('#chatList').empty();
    
    // 添加回广播和客服选项
    $('#chatList').append(existingItems);
    
    // 添加最近聊天的管理员
    for (const chat of chatList) {
        // 跳过系统消息，因为已经有"联系客服"选项
        if (chat.messageType === 1) continue;
        
        const unreadBadge = chat.unreadCount > 0 ? 
            `<span class="unread-badge">${chat.unreadCount > 99 ? '99+' : chat.unreadCount}</span>` : 
            `<small class="text-muted">${formatTime(chat.lastMessageTime)}</small>`;
        
        const item = `
            <a href="#" class="list-group-item list-group-item-action ${currentReceiverId === chat.otherUserId && currentChatType === 'admin' ? 'active' : ''}" 
               data-type="admin" data-receiver-id="${chat.otherUserId}" onclick="switchChat('admin', ${chat.otherUserId})">
                <div class="d-flex align-items-center">
                    <div class="chat-avatar">
                        ${chat.avatarData ? `<img src="/api/user/avatar/${chat.otherUserId}" alt="${chat.otherUsername}">` : `<i class="bi bi-person"></i>`}
                    </div>
                    <div class="ms-3">
                        <div class="d-flex justify-content-between align-items-center">
                            <h6 class="mb-0">${chat.otherUsername}</h6>
                            ${unreadBadge}
                        </div>
                        <p class="mb-0 text-muted small text-truncate" style="max-width: 150px;">${chat.lastMessage || '暂无消息'}</p>
                    </div>
                </div>
            </a>
        `;
        
        $('#chatList').append(item);
    }
    
    // 更新客服未读消息数
    updateServiceUnreadCount();
}

/**
 * 获取未读消息数
 */
function getUnreadCount() {
    const token = getToken();
    
    $.ajax({
        url: '/api/chat/unread/count',
        type: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`
        },
        success: function(response) {
            if (response.code === 200) {
                updateServiceUnreadCount();
            } else {
                console.error('获取未读消息数失败', response.message);
            }
        },
        error: function(xhr, status, error) {
            if (xhr.status === 401) {
                handleUnauthorized(xhr);
            } else {
                console.error('获取未读消息数请求失败', error);
            }
        }
    });
}

/**
 * 更新客服未读消息数
 */
function updateServiceUnreadCount() {
    const token = getToken();
    
    $.ajax({
        url: '/api/chat/unread/count',
        type: 'GET',
        data: { messageType: 1 }, // 系统消息
        headers: {
            'Authorization': `Bearer ${token}`
        },
        success: function(response) {
            if (response.code === 200) {
                const count = response.data;
                if (count > 0) {
                    $('#serviceUnread').html(`<span class="unread-badge">${count > 99 ? '99+' : count}</span>`);
                } else {
                    $('#serviceUnread').text('');
                }
            }
        },
        error: function(xhr, status, error) {
            if (xhr.status === 401) {
                handleUnauthorized(xhr);
            } else {
                console.error('获取客服未读消息数请求失败', error);
            }
        }
    });
}

/**
 * 更新未读消息数
 * @param {number} senderId 发送者ID
 */
function updateUnreadCount(senderId) {
    // 如果是系统消息
    if (!senderId) {
        updateServiceUnreadCount();
        return;
    }
    
    const token = getToken();
    
    // 获取特定发送者的未读消息数
    $.ajax({
        url: '/api/chat/unread/count',
        type: 'GET',
        data: { otherUserId: senderId },
        headers: {
            'Authorization': `Bearer ${token}`
        },
        success: function(response) {
            if (response.code === 200) {
                const count = response.data;
                const badge = $(`[data-receiver-id="${senderId}"] .unread-badge`);
                
                if (count > 0) {
                    if (badge.length > 0) {
                        badge.text(count > 99 ? '99+' : count);
                    } else {
                        const timeElement = $(`[data-receiver-id="${senderId}"] small.text-muted`);
                        timeElement.replaceWith(`<span class="unread-badge">${count > 99 ? '99+' : count}</span>`);
                    }
                }
            }
        },
        error: function(xhr, status, error) {
            if (xhr.status === 401) {
                handleUnauthorized(xhr);
            } else {
                console.error('获取未读消息数请求失败', error);
            }
        }
    });
}

/**
 * 标记消息为已读
 * @param {number} messageId 消息ID
 */
function markMessageRead(messageId) {
    if (!messageId) return;
    
    const token = getToken();
    
    $.ajax({
        url: '/api/chat/read',
        type: 'POST',
        contentType: 'application/json',
        headers: {
            'Authorization': `Bearer ${token}`
        },
        data: JSON.stringify({ messageId: messageId }),
        success: function(response) {
            if (response.code === 200) {
                console.log('标记消息已读成功');
            } else {
                console.error('标记消息已读失败', response.message);
            }
        },
        error: function(xhr, status, error) {
            if (xhr.status === 401) {
                handleUnauthorized(xhr);
            } else {
                console.error('标记消息已读请求失败', error);
            }
        }
    });
}

/**
 * 标记所有消息为已读
 * @param {number} otherUserId 对方用户ID，不传则标记所有系统消息为已读
 */
function markAllRead(otherUserId) {
    const params = {};
    if (otherUserId) {
        params.otherUserId = otherUserId;
    } else {
        params.messageType = 1; // 系统消息
    }
    
    const token = getToken();
    
    $.ajax({
        url: '/api/chat/read/all',
        type: 'POST',
        contentType: 'application/json',
        headers: {
            'Authorization': `Bearer ${token}`
        },
        data: JSON.stringify(params),
        success: function(response) {
            if (response.code === 200) {
                console.log('标记所有消息已读成功');
                // 更新未读消息数
                getUnreadCount();
                // 更新最近聊天列表
                getRecentChatList();
            } else {
                console.error('标记所有消息已读失败', response.message);
            }
        },
        error: function(xhr, status, error) {
            if (xhr.status === 401) {
                handleUnauthorized(xhr);
            } else {
                console.error('标记所有消息已读请求失败', error);
            }
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
    window.location.href = 'login.html';
}