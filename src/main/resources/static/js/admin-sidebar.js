/**
 * 管理员侧边栏初始化脚本
 * 用于初始化侧边栏功能，包括侧边栏切换、响应式布局等
 */

/**
 * 初始化侧边栏功能
 * 包括侧边栏切换按钮事件绑定、响应式布局处理等
 */
function initSidebar() {
    // 侧边栏切换按钮点击事件
    $('#sidebarToggle').on('click', function() {
        $('#sidebar').toggleClass('show');
        $('.main-content').toggleClass('sidebar-open');
    });

    // 窗口大小变化时处理响应式布局
    $(window).resize(function() {
        if ($(window).width() <= 768) {
            $('#sidebar').removeClass('show');
            $('.main-content').removeClass('sidebar-open');
        } else {
            $('#sidebar').addClass('show');
            $('.main-content').addClass('sidebar-open');
        }
    });

    // 初始化时根据窗口大小设置侧边栏状态
    if ($(window).width() > 768) {
        $('#sidebar').addClass('show');
        $('.main-content').addClass('sidebar-open');
    }

    // 高亮当前页面对应的侧边栏菜单项
    highlightCurrentPage();
}

/**
 * 高亮当前页面对应的侧边栏菜单项
 */
function highlightCurrentPage() {
    // 获取当前页面的URL路径
    const currentPath = window.location.pathname;
    
    // 移除所有菜单项的激活状态
    $('.sidebar-menu .nav-link').removeClass('active');
    
    // 根据当前页面路径找到对应的菜单项并添加激活状态
    $('.sidebar-menu .nav-link').each(function() {
        const href = $(this).attr('href');
        if (href && currentPath.includes(href.split('/').pop())) {
            $(this).addClass('active');
        }
    });
}