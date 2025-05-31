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
    // 检查登录状态，使用与orders.js相同的方式
    checkLoginStatus().then(isLoggedIn => {
        if (isLoggedIn) {
            // 初始化用户信息
            initUserInfo()
                .then(() => {
                    // 确保用户信息已完全加载
                    if (currentUser && currentUser.userId) {
                        // 初始化WebSocket连接
                        return initWebSocket();
                    } else {
                        throw new Error('用户信息未完全加载');
                    }
                })
                .then(() => {
                    // 获取管理员用户列表
                    return getAdminUsers();
                })
                .then(() => {
                    // 获取最近聊天列表
                    return getRecentChatList();
                })
                .then(() => {
                    // 自动选择第一个可用的客服开始聊天
                    autoSelectService();
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
    
    // 绑定退出登录按钮点击事件
    $('#logoutBtn').click(function() {
        logout();
    });
});

/**
 * 初始化用户信息
 * @returns {Promise} 返回一个Promise，在用户信息初始化完成后解析
 */
function initUserInfo() {
    return new Promise((resolve, reject) => {
        try {
            // 从localStorage获取用户信息
            const userJson = localStorage.getItem('user');
            
            if (userJson) {
                currentUser = JSON.parse(userJson);
                // 显示用户名
                $('#username').text(currentUser.username);
                resolve(currentUser);
            } else {
                // 尝试通过API获取当前用户信息，使用fetchAPI而不是fetchWithAuth
                fetchAPI('/api/users/current')
                .then(response => {
                    if (response && response.username) {
                        currentUser = response;
                        // 保存用户信息到localStorage
                        localStorage.setItem('user', JSON.stringify(response));
                        // 显示用户名
                        $('#username').text(response.username);
                        resolve(currentUser);
                    } else {
                        reject('未获取到有效的用户信息');
                    }
                })
                .catch(error => {
                    console.error('获取用户信息失败', error);
                    reject(error);
                });
            }
        } catch (e) {
            console.error('解析用户信息失败', e);
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
            // 重定向到登录页
            window.location.href = '/pages/client/login.html';
            reject(new Error('未找到认证令牌'));
            return;
        }
        
        // 确保currentUser已经初始化
        if (!currentUser || !currentUser.userId) {
            console.error('用户信息未初始化，延迟WebSocket连接');
            // 延迟1秒后重试
            setTimeout(function() {
                initWebSocket()
                    .then(resolve)
                    .catch(reject);
            }, 1000);
            return;
        }
        
        // 构建WebSocket URL，直接在URL中包含token
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = window.location.host;
        const wsUrl = `${protocol}//${host}/websocket/chat/${currentUser.userId}?token=${encodeURIComponent(token)}`;
        webSocket = new WebSocket(wsUrl);
        
        // 连接打开事件
        webSocket.onopen = function() {
            console.log('WebSocket连接已建立');
            // 获取未读消息数
            getUnreadCount();
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
            if (originalOnOpen) {
                originalOnOpen.call(this);
            }
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
                    appendSystemMessage(event.data);
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
                // 重定向到登录页
                window.location.href = '/pages/client/login.html';
                return;
            }
            
            // 显示连接断开提示
            appendSystemMessage('聊天连接已断开，正在尝试重新连接...');
            // 5秒后尝试重新连接
            setTimeout(function() {
                initWebSocket()
                    .then(() => {
                        // 连接成功提示
                        appendSystemMessage('聊天连接已重新建立');
                        // 刷新当前聊天
                        refreshCurrentChat();
                    })
                    .catch(error => {
                        console.error('重新连接失败:', error);
                        appendSystemMessage('重新连接失败，请刷新页面重试');
                    });
            }, 5000);
        };
        
        // 连接错误事件
        webSocket.onerror = function(error) {
            console.error('WebSocket连接发生错误', error);
            appendSystemMessage('聊天连接发生错误，请检查网络连接');
            reject(error); // 拒绝Promise
        };
    });
}

/**
 * 处理接收到的消息
 * @param {Object} message 消息对象
 */
function handleReceivedMessage(message) {
    // 处理系统消息
    if (message.type === 'system') {
        appendSystemMessage(message.content);
        return;
    }
    
    // 如果是当前聊天对象发送的消息，直接显示
    if (message.senderId === currentReceiverId || 
        (currentChatType === 'service' && message.messageType === 1)) {
        appendMessage(message);
        // 滚动到底部
        scrollToBottom();
        // 标记为已读
        if (message.messageId) {
            markMessageRead(message.messageId);
        }
    }
    
    // 更新未读消息数
    if (message.senderId) {
        updateUnreadCount(message.senderId);
    }
    
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
            appendMessage({
                ...message,
                senderName: currentUser.username || currentUser.realName || '我'
            });
            // 滚动到底部
            scrollToBottom();
        } else {
            // 显示发送成功提示
            appendSystemMessage('广播消息已发送');
        }
    } else {
        // 尝试重新连接WebSocket
        console.log('WebSocket连接已断开，尝试重新连接...');
        initWebSocket();
        alert('连接已断开，正在重新连接，请稍后再试');
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
        // 如果没有指定receiverId，自动选择第一个可用客服
        if (!receiverId && adminUsers && adminUsers.length > 0) {
            currentReceiverId = adminUsers[0].userId;
        }
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
    
    // 如果是广播，加载广播消息
    if (type === 'broadcast') {
        loadBroadcastMessages();
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
        markAllRead();
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
    if (currentChatType === 'service' || currentChatType === 'admin') {
        // 对于客服聊天，需要指定目标用户ID
        if (!currentReceiverId) {
            appendSystemMessage('请先选择客服');
            return;
        }
        params.targetUserId = currentReceiverId;
    }
    
    // 构建查询字符串
    const queryString = new URLSearchParams(params).toString();
    const url = `/api/chat/history?${queryString}`;
    
    // 发送请求获取聊天记录
    fetchAPI(url, {
        method: 'GET'
    })
    .then(response => {
        // fetchAPI已经处理了JSON解析，直接使用response
        if (response.success) {
            const messages = response.data || response;
            
            // 检查是否有更多消息
            hasMoreMessages = messages.length === pageSize;
            
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
            const sortedMessages = messages.sort((a, b) => new Date(a.createTime) - new Date(b.createTime));
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
            appendSystemMessage('获取聊天记录失败: ' + (response.message || '未知错误'));
        }
    })
    .catch(error => {
        console.error('获取聊天记录请求失败', error);
        appendSystemMessage('获取聊天记录失败，请刷新页面重试');
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
 * @returns {Promise} 返回一个Promise，在获取管理员列表成功后解析
 */
function getAdminUsers() {
    return fetchAPI('/api/chat/customer-service', {
        method: 'GET'
    })
    .then(response => {
        // fetchAPI已经处理了JSON解析和错误处理
        adminUsers = response.data || response;
        
        // 更新客服选择模态框
        updateServiceList(adminUsers);
        return adminUsers;
    })
    .catch(error => {
         console.error('获取管理员列表请求失败', error);
         throw error;
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
 * 自动选择第一个可用的客服
 */
function autoSelectService() {
    if (adminUsers && adminUsers.length > 0) {
        const firstAdmin = adminUsers[0];
        // 自动切换到客服聊天模式，并指定第一个客服
        switchChat('service', firstAdmin.userId);
        console.log('自动选择客服:', firstAdmin.username);
    } else {
        // 如果没有可用客服，切换到客服聊天模式但不指定具体客服
        switchChat('service', null);
        appendSystemMessage('暂无在线客服，请稍后再试');
    }
}

/**
 * 加载广播消息
 */
function loadBroadcastMessages() {
    // 使用fetchAPI发送请求获取广播消息
    fetchAPI('/api/chat/broadcast', {
        method: 'GET'
    })
    .then(response => {
        // fetchAPI已经处理了JSON解析
        if (response.success) {
            const messages = response.data || [];
            
            if (messages.length === 0) {
                appendSystemMessage('暂无系统公告');
                return;
            }
            
            // 显示广播消息
            for (const message of messages) {
                appendMessage({
                    ...message,
                    senderName: '系统管理员'
                });
            }
        } else {
            console.error('获取广播消息失败', response.message);
            appendSystemMessage('获取系统公告失败: ' + (response.message || '未知错误'));
        }
    })
    .catch(error => {
        console.error('获取广播消息请求失败', error);
        appendSystemMessage('获取系统公告失败，请刷新页面重试');
    });
}

/**
 * 获取最近聊天列表
 * @returns {Promise} 返回一个Promise，在获取最近聊天列表成功后解析
 */
function getRecentChatList() {
    return fetchAPI('/api/chat/recent', {
        method: 'GET'
    })
    .then(response => {
        // fetchAPI已经处理了JSON解析和错误处理
        const data = response.data || response;
        updateChatList(data);
        return data;
    })
    .catch(error => {
        console.error('获取最近聊天列表失败:', error);
        appendSystemMessage('获取最近聊天列表失败，请刷新页面重试');
        throw error;
    });
}

/**
 * 更新聊天列表
 * @param {Array} chatList 聊天列表
 */
function updateChatList(chatList) {
    // 单商户系统：客户端只显示全站广播和联系客服两个选项
    // 不显示具体的管理员列表，所有客服消息都通过"联系客服"选项处理
    
    // 统计所有客服消息的未读数量
    let totalUnreadCount = 0;
    if (chatList && Array.isArray(chatList)) {
        for (const chat of chatList) {
            if (chat.unreadCount > 0) {
                totalUnreadCount += chat.unreadCount;
            }
        }
    }
    
    // 更新客服选项的未读消息数显示
    const serviceUnreadElement = $('#serviceUnread');
    if (totalUnreadCount > 0) {
        serviceUnreadElement.text(totalUnreadCount > 99 ? '99+' : totalUnreadCount)
                           .removeClass('d-none')
                           .addClass('badge badge-danger');
    } else {
        serviceUnreadElement.text('').addClass('d-none');
    }
}

/**
 * 获取未读消息数量
 */
function getUnreadCount() {
    // 使用fetchAPI发送请求
    fetchAPI('/api/chat/unread/count', {
        method: 'GET'
    })
    .then(response => {
        // fetchAPI已经处理了JSON解析和错误处理
        const count = response.count !== undefined ? response.count : response;
        updateUnreadCount(count);
    })
    .catch(error => {
        console.error('获取未读消息数量请求失败', error);
    });
}

/**
 * 更新客服未读消息数
 */
function updateServiceUnreadCount() {
    // 使用fetchAPI发送请求，带查询参数
    const params = new URLSearchParams({ messageType: 1 }); // 系统消息
    
    fetchAPI(`/api/chat/unread/count?${params}`, {
        method: 'GET'
    })
    .then(response => {
        // fetchAPI已经处理了JSON解析和错误处理
        const count = response.data || response;
        if (count > 0) {
            $('#serviceUnread').html(`<span class="unread-badge">${count > 99 ? '99+' : count}</span>`);
        } else {
            $('#serviceUnread').text('');
        }
    })
    .catch(error => {
        console.error('获取客服未读消息数失败:', error);
        appendSystemMessage('获取客服未读消息数失败，请刷新页面重试');
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
    
    // 使用fetchAPI发送请求，带查询参数
    const params = new URLSearchParams({ otherUserId: senderId });
    
    fetchAPI(`/api/chat/unread/count?${params}`, {
        method: 'GET'
    })
    .then(response => {
        // fetchAPI已经处理了JSON解析和错误处理
        const count = response.data || response;
        const badge = $(`[data-receiver-id="${senderId}"] .unread-badge`);
        
        if (count > 0) {
            if (badge.length > 0) {
                badge.text(count > 99 ? '99+' : count);
            } else {
                const timeElement = $(`[data-receiver-id="${senderId}"] small.text-muted`);
                timeElement.replaceWith(`<span class="unread-badge">${count > 99 ? '99+' : count}</span>`);
            }
        }
    })
    .catch(error => {
        console.error('获取未读消息数失败:', error);
        appendSystemMessage('获取未读消息数失败，请刷新页面重试');
    });
}

/**
 * 标记消息为已读
 * @param {number} messageId 消息ID
 */
function markMessageRead(messageId) {
    if (!messageId) return;
    
    // 使用fetchAPI发送POST请求，messageId作为路径参数
    fetchAPI(`/api/chat/read/${messageId}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        }
    })
    .then(response => {
        // fetchAPI已经处理了JSON解析和错误处理
        console.log('标记消息已读成功');
    })
    .catch(error => {
        console.error('标记消息已读失败:', error);
        const errorMsg = error.message || error.toString() || '未知错误';
        appendSystemMessage(`标记消息已读失败: ${errorMsg}，请刷新页面重试`);
    });
}

/**
 * 标记所有消息为已读
 * 后端接口会自动标记当前用户的所有未读消息为已读
 */
function markAllRead() {
    // 使用fetchAPI发送POST请求，后端不需要参数
    fetchAPI('/api/chat/read/all', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        }
    })
    .then(response => {
        // fetchAPI已经处理了JSON解析和错误处理
        console.log('标记所有消息已读成功');
        // 更新未读消息数
        getUnreadCount();
        // 更新最近聊天列表
        getRecentChatList();
    })
    .catch(error => {
        console.error('标记所有消息已读失败:', error);
        const errorMsg = error.message || error.toString() || '未知错误';
        appendSystemMessage(`标记所有消息已读失败: ${errorMsg}，请刷新页面重试`);
    });
}

/**
 * 退出登录
 */
function logout() {
    // 关闭WebSocket连接
    if (webSocket) {
        webSocket.close();
        webSocket = null;
    }
    
    // 清除本地存储的用户信息和token
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    localStorage.removeItem('currentUser');
    
    // 跳转到登录页
    window.location.href = '/pages/client/login.html';
}