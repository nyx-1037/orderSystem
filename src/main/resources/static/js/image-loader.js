/**
 * 图片加载器 - 处理需要认证的图片请求
 */

// 在页面加载完成后执行
$(document).ready(function() {
    // 初始化图片加载处理
    initImageLoader();
});

/**
 * 初始化图片加载处理
 */
function initImageLoader() {
    // 替换所有API图片的加载方式
    replaceApiImageSources();
    
    // 监听DOM变化，处理动态加载的图片
    observeDomChanges();
}

/**
 * 替换所有API图片的加载方式
 */
function replaceApiImageSources() {
    // 查找所有带有 data-src 属性的商品图片
    $('img[data-src*="/api/product/"][data-src*="/image"]').each(function() {
        const img = $(this);
        const dataSrc = img.data('src'); // 使用 data('src') 获取 data-src 属性值
        
        // 移除URL中的token参数（如果存在）
        const cleanSrc = dataSrc.split('?')[0];
        
        // 设置一个临时的加载中图片
        img.attr('src', '/images/loading.gif');
        
        // 使用fetch API加载图片
        loadImageWithAuth(cleanSrc, img);
    });
}

/**
 * 使用认证方式加载图片
 * @param {string} url - 图片URL
 * @param {jQuery} imgElement - 图片元素
 */
async function loadImageWithAuth(url, imgElement) {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            // 如果没有token，直接设置默认图片
            imgElement.attr('src', '/images/default-product.jpg');
            console.log('No token found, setting default image.');
            return;
        }
        
        // 使用fetch API请求图片，带上Authorization头部
        const fetchOptions = {
            headers: {
                'Authorization': `Bearer ${token}`
            },
            credentials: 'include' // 确保凭证被发送
        };
        const response = await fetch(url, fetchOptions);
        
        if (!response.ok) {
            console.error(`Image load failed with status: ${response.status}`); // 添加日志
            // 如果是401，显示token过期提示并延迟3秒后重定向
            if (response.status === 401) {
                console.error('Image load failed due to unauthorized access (401).');
                // 显示token过期提示
                showErrorMessage('登录已过期，请重新登录');
                
                // 设置默认图片
                imgElement.attr('src', '/images/default-product.jpg');
                
                // 根据当前页面决定跳转
                const currentPath = window.location.pathname;
                setTimeout(() => {
                    if (currentPath.includes('/admin/')) {
                        // 只有在非管理员登录页面才跳转
                        if (!currentPath.includes('/admin/login.html')) {
                            window.location.href = '/pages/admin/login.html';
                        }
                    } else {
                        // 客户端页面跳转到客户端登录
                        if (!currentPath.includes('/client/login.html')) {
                            window.location.href = '/pages/client/login.html';
                        }
                    }
                }, 3000); // 延迟3秒后重定向
                return;
            }
            throw new Error(`图片加载失败: ${response.status}`);
        }
        
        // 将响应转换为Blob
        const blob = await response.blob();
        
        // 创建一个Object URL
        const objectUrl = URL.createObjectURL(blob);
        
        // 设置图片源
        imgElement.attr('src', objectUrl);
        
        // 图片加载完成后释放Object URL
        imgElement.on('load', function() {
            URL.revokeObjectURL(objectUrl);
        });
    } catch (error) {
        console.error('加载图片失败:', error);
        // 加载失败时使用默认图片
        imgElement.attr('src', '/images/default-product.jpg');
    }
}

/**
 * 监听DOM变化，处理动态加载的图片
 */
function observeDomChanges() {
    // 创建一个MutationObserver实例
    const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            // 检查是否有新增的节点
            if (mutation.addedNodes && mutation.addedNodes.length > 0) {
                // 查找新增节点中的商品图片
                $(mutation.addedNodes).find('img[data-src*="/api/product/"][data-src*="/image"]').each(function() {
                    const img = $(this);
                    const dataSrc = img.data('src'); // 使用 data('src') 获取 data-src 属性值
                    const cleanSrc = dataSrc.split('?')[0];
                    
                    // 设置临时的加载中图片
                    img.attr('src', '/images/loading.gif');
                    
                    // 使用fetch API加载图片
                    loadImageWithAuth(cleanSrc, img);
                });
            }
        });
    });
    
    // 配置观察选项
    const config = { childList: true, subtree: true };
    
    // 开始观察document.body的变化
    observer.observe(document.body, config);
}