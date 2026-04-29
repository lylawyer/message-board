/**
 * 在野留言板 - 公共工具函数
 * 包含 HTML 转义、日期格式化、Toast 通知等通用功能
 */

// ==================== HTML 转义（防 XSS）====================
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ==================== 日期时间格式化 ====================
function formatDateTime(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    
    // 相对时间
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60000) return '刚刚';
    if (diff < 3600000) return Math.floor(diff / 60000) + '分钟前';
    if (diff < 86400000) return Math.floor(diff / 3600000) + '小时前';
    if (diff < 604800000) return Math.floor(diff / 86400000) + '天前';
    
    // 绝对时间
    return date.toLocaleDateString('zh-CN', { year: 'numeric', month: 'short', day: 'numeric' });
}

function formatDateTimeFull(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hour = String(date.getHours()).padStart(2, '0');
    const minute = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day} ${hour}:${minute}`;
}

// ==================== Toast 通知系统 ====================
function showToast(message, type = 'success', containerId = 'toast-container') {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    const toast = document.createElement('div');
    
    // 前台样式（index.html）
    const colors = {
        success: 'bg-green-500',
        error: 'bg-red-500',
        warning: 'bg-yellow-500',
        info: 'bg-blue-500'
    };
    
    // 后台样式（admin.html）
    const adminStyles = {
        success: 'bg-green-50 border-green-200 text-green-800',
        error: 'bg-red-50 border-red-200 text-red-800',
        warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
        info: 'bg-blue-50 border-blue-200 text-blue-800'
    };
    
    const isAdminPage = document.getElementById('admin-page') !== null;
    
    if (isAdminPage) {
        // 后台样式
        const icons = {
            success: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>',
            error: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>',
            warning: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>',
            info: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>'
        };
        toast.className = `flex items-center px-4 py-3 rounded-xl border shadow-lg animate-slide-down ${adminStyles[type]}`;
        toast.innerHTML = `
            <svg class="w-5 h-5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">${icons[type]}</svg>
            <span class="font-medium">${escapeHtml(message)}</span>
        `;
    } else {
        // 前台样式
        toast.className = `toast ${colors[type]} text-white px-6 py-3 rounded-lg shadow-lg max-w-xs`;
        toast.textContent = message;
    }
    
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%)';
        toast.style.transition = 'all 0.3s ease-out';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ==================== SHA-256 哈希 ====================
async function sha256(text) {
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// ==================== API 请求封装 ====================
async function fetchWithTimeout(url, options = {}, timeout = 10000) {
    return Promise.race([
        fetch(url, options),
        new Promise((_, reject) => 
            setTimeout(() => reject(new Error('请求超时')), timeout)
        )
    ]);
}

async function callBaaSApi(params) {
    const url = `${CONFIG.BAAS_API_URL}?${new URLSearchParams(params).toString()}`;
    const response = await fetchWithTimeout(url, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
    });
    return response.json();
}

async function callBaaSApiPost(body) {
    const response = await fetchWithTimeout(CONFIG.BAAS_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });
    return response.json();
}

// ==================== 本地缓存 ====================
const Cache = {
    prefix: 'mb_cache_',
    ttl: 5 * 60 * 1000, // 5分钟缓存
    
    get(key) {
        try {
            const data = JSON.parse(localStorage.getItem(this.prefix + key));
            if (!data) return null;
            if (Date.now() - data.time > this.ttl) {
                this.remove(key);
                return null;
            }
            return data.value;
        } catch (e) {
            return null;
        }
    },
    
    set(key, value) {
        try {
            localStorage.setItem(this.prefix + key, JSON.stringify({
                value: value,
                time: Date.now()
            }));
        } catch (e) {
            console.warn('缓存写入失败:', e);
        }
    },
    
    remove(key) {
        try {
            localStorage.removeItem(this.prefix + key);
        } catch (e) {}
    },
    
    clear() {
        try {
            const keys = Object.keys(localStorage);
            keys.forEach(key => {
                if (key.startsWith(this.prefix)) {
                    localStorage.removeItem(key);
                }
            });
        } catch (e) {}
    }
};

// ==================== 暗色模式 ====================
const DarkMode = {
    key: 'mb_dark_mode',
    
    isEnabled() {
        const saved = localStorage.getItem(this.key);
        if (saved !== null) return saved === 'true';
        // 默认跟随系统
        return window.matchMedia('(prefers-color-scheme: dark)').matches;
    },
    
    toggle() {
        const enabled = !this.isEnabled();
        localStorage.setItem(this.key, enabled);
        this.apply(enabled);
        return enabled;
    },
    
    apply(enabled) {
        if (enabled) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    },
    
    init() {
        this.apply(this.isEnabled());
        
        // 监听系统主题变化
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
            if (localStorage.getItem(this.key) === null) {
                this.apply(e.matches);
            }
        });
    }
};
