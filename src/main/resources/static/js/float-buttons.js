// 悬浮按钮功能脚本

$(document).ready(function() {
    // 添加返回顶部和刷新按钮的HTML结构
    $('body').append(`
        <div class="float-buttons">
            <div class="float-btn" id="refresh-btn" title="刷新页面">
                <i class="fas fa-sync-alt"></i>
            </div>
            <div class="float-btn" id="back-to-top-btn" title="返回顶部">
                <i class="fas fa-arrow-up"></i>
            </div>
        </div>
    `);
    
    // 初始隐藏返回顶部按钮
    $('#back-to-top-btn').hide();
    
    // 监听窗口滚动事件
    $(window).scroll(function() {
        // 当页面滚动超过300px时显示返回顶部按钮，否则隐藏
        if ($(this).scrollTop() > 300) {
            $('#back-to-top-btn').fadeIn();
        } else {
            $('#back-to-top-btn').fadeOut();
        }
    });
    
    // 点击返回顶部按钮事件
    $('#back-to-top-btn').click(function() {
        $('html, body').animate({scrollTop: 0}, 500);
        return false;
    });
    
    // 点击刷新按钮事件
    $('#refresh-btn').click(function() {
        location.reload();
    });
});