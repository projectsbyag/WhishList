// This file contains the JavaScript code for the frontend application. It handles user interactions and communicates with the backend API.

document.addEventListener('DOMContentLoaded', () => {
    const wishlistContainer = document.getElementById('wishlist-container') || document.getElementById('wishlistContainer') || document.getElementById('wishlist-items');
    const addItemForm = document.getElementById('add-item-form');
    const itemNameInput = document.getElementById('item-name');
    const itemDescriptionInput = document.getElementById('item-description');
    const token = localStorage.getItem('token');

    // Initialize UI
    initializeUserProfile();
    initializeMobileMenu();
    initializeDarkMode();

    const getAuthHeaders = () => {
        const t = localStorage.getItem('token');
        return t ? { 'Authorization': `Bearer ${t}` } : {};
    };

    const dealsContainer = document.getElementById('dealsContainer');
    let _dealTimerInterval = null;

    function getUrlParameter(name) {
        name = name.replace(/[\[]/, '\\[').replace(/[\]]/, '\\]');
        const regex = new RegExp('[\\?&]' + name + '=([^&#]*)');
        const results = regex.exec(location.search);
        return results === null ? '' : decodeURIComponent(results[1].replace(/\+/g, ' '));
    }

    async function fetchDeals() {
        if (!dealsContainer) return;
        showLoading(dealsContainer);
        try {
            const category = getUrlParameter('category');
            const url = category ? `/api/deals?category=${encodeURIComponent(category)}` : '/api/deals';
            const res = await fetch(url);
            if (!res.ok) {
                hideLoading(dealsContainer);
                showEmptyState(dealsContainer, 'Failed to load deals', 'Please try again later.');
                return;
            }
            const data = await res.json();
            hideLoading(dealsContainer);
            if (data.length === 0) {
                showEmptyState(dealsContainer, 'No deals found', 'Check back soon for new deals!');
            } else {
                renderDeals(data);
            }
        } catch (err) {
            console.error('Error fetching deals', err);
            hideLoading(dealsContainer);
            showEmptyState(dealsContainer, 'Error loading deals', 'Please check your connection.');
        }
    }

    function renderDeals(deals) {
        if (!dealsContainer) return;
        dealsContainer.innerHTML = '';
        deals.forEach((d, idx) => {
            const card = document.createElement('div');
            card.className = 'deal-card bg-white rounded-2xl shadow-lg overflow-hidden';
            // Support multiple possible expiry fields from the API / DB
            const rawExpiry = d.expiryDate || d.expiresAt || d.expires || d.expiry || d.expires_at || null;
            const expires = rawExpiry ? new Date(rawExpiry).toISOString() : null;
            card.dataset.dealId = d._id;
            const category = d.category ? `<span class="inline-block text-xs px-3 py-1 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200">${capitalize(d.category)}</span>` : '';
            const discount = formatDiscount(d.discount);
            // Choose image from multiple possible fields and fallback to placeholder
            let imageSrc = d.image || d.imageUrl || d.image_url || d.imagePath || d.image_path || d.img;
            // If no image, use local placeholder generator
            if (!imageSrc) {
              imageSrc = '/api/placeholder/400/300';
            }
            const expiryText = formatDate(expires);
            const isExpired = expires ? (new Date(expires).getTime() < Date.now()) : false;
            const status = isExpired ? `<span class="text-xs px-2 py-1 rounded-full bg-red-100 text-red-700">Expired</span>` : `<span class="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700">Active</span>`;
            card.innerHTML = `
                <div class="bg-yellow-400 p-6 relative h-40 overflow-hidden rounded-t-2xl">
                    ${discount ? `<div class="absolute top-4 left-4 bg-red-500 text-white font-black text-lg px-4 py-2 rounded-lg transform -rotate-12 shadow-lg">${discount}</div>` : ''}
                    ${imageSrc ? `<img src="${imageSrc}" alt="${escapeHtml(d.title || 'deal')}" class="absolute inset-0 w-full h-full object-cover" onerror="this.src='/api/placeholder/400/300'" />` : ''}
                    <div class="absolute inset-0 bg-yellow-400/40"></div>
                </div>
                <div class="p-6">
                    <div class="flex items-center justify-between mb-3">
                        <div class="flex items-center gap-3">
                                <img src="${imageSrc}" alt="${escapeHtml(d.title || 'deal')}" class="w-12 h-12 rounded-md object-cover border border-gray-100 dark:border-gray-700" onerror="this.src='/api/placeholder/50/50'" />
                                <div>
                                    <h3 class="text-xl font-bold text-gray-900 mb-0">${d.title}</h3>
                                    ${category}
                                </div>
                            </div>
                        ${status}
                    </div>
                    <p class="text-sm text-gray-700 mb-3">${d.description || ''}</p>
                    <div class="flex items-center justify-between mb-4">
                        <div class="flex items-center gap-2">
                            ${typeof d.discountedPrice === 'number' ? `<span class="text-2xl font-extrabold text-gray-900">&#8358;${d.discountedPrice.toLocaleString('en-NG', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>${typeof d.originalPrice === 'number' ? `<span class="text-base text-gray-400 line-through">&#8358;${d.originalPrice.toLocaleString('en-NG', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>` : ''}` : typeof d.price === 'number' ? `<span class="text-2xl font-extrabold text-gray-900">&#8358;${d.price.toLocaleString('en-NG', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>` : ''}
                        </div>
                        <div class="text-sm text-gray-700">${renderStars(d.rating || 0)} <span class="ml-2 text-xs">${(d.rating || 0).toFixed(1)}</span></div>
                    </div>
                    <div class="text-sm text-gray-600 dark:text-gray-300 mb-2">Expires: <strong>${expiryText}</strong></div>
                    ${d.dealLink ? `<div class="text-sm text-gray-600 dark:text-gray-300 mb-4">Source: <a href="${escapeHtml(d.dealLink)}" target="_blank" rel="noopener noreferrer" class="text-yellow-600 dark:text-yellow-400 hover:underline inline-flex items-center gap-1 font-semibold">Deal link <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path></svg></a></div>` : ''}
                    <div class="text-4xl font-black text-gray-900 mb-4 countdown-timer" data-end-time="${expires || ''}">--:--:--</div>
                    <div class="flex gap-3">
                        <button class="claim-button flex-1 bg-yellow-400 hover:bg-yellow-500 text-gray-900 font-bold py-3 px-6 rounded-xl transition-colors uppercase tracking-wide" data-deal-id="${d._id}">Claim</button>
                        ${d.dealLink ? `<a href="${escapeHtml(d.dealLink)}" target="_blank" rel="noopener noreferrer" class="buy-button bg-gray-900 text-white font-bold py-3 px-4 rounded-xl hover:bg-gray-800 transition-colors flex items-center justify-center">Buy</a>` : `<button class="buy-button bg-gray-900 text-white font-bold py-3 px-4 rounded-xl hover:bg-gray-800 transition-colors">Buy</button>`}
                        ${checkIfAdmin() ? `<a href="admin.html#edit-${d._id}" class="ml-2 inline-flex items-center px-3 py-2 border border-gray-200 rounded-lg text-sm text-blue-600 hover:bg-blue-50">Edit</a>` : ''}
                    </div>
                </div>
            `;
            dealsContainer.appendChild(card);
        });
        attachDealHandlers();
        startDealCountdowns();
    }

    // Helper: format discount to show '10%' when possible
    function formatDiscount(val) {
        if (val == null) return '';
        if (typeof val === 'number') return `${val}%`;
        if (typeof val === 'string') {
            // Try to extract number from strings like '30% OFF' or '30%'
            const m = val.match(/(\d+(?:\.\d+)?)/);
            if (m) return `${m[1]}%`;
            return val;
        }
        return String(val);
    }

    function formatDate(val) {
        if (!val) return 'N/A';
        const d = new Date(val);
        if (isNaN(d.getTime())) return 'N/A';
        return `${d.getMonth()+1}/${d.getDate()}/${d.getFullYear()}`;
    }

    function capitalize(s) {
        if (!s) return '';
        return s.charAt(0).toUpperCase() + s.slice(1);
    }

    // Simple HTML escape for titles used in attributes
    function escapeHtml(str) {
        if (!str) return '';
        return String(str).replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    }

    // Dark mode initialization and toggle
    function initializeDarkMode() {
        const btn = document.getElementById('darkToggle');
        if (!btn) return;
        const apply = (mode) => {
            if (mode === 'dark') {
                document.documentElement.classList.add('dark');
            } else {
                document.documentElement.classList.remove('dark');
            }
        };
        const stored = localStorage.getItem('theme') || (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
        apply(stored);
        btn.addEventListener('click', () => {
            const now = document.documentElement.classList.toggle('dark') ? 'dark' : 'light';
            localStorage.setItem('theme', now);
        });
    }

    function startDealCountdowns() {
        if (_dealTimerInterval) clearInterval(_dealTimerInterval);
        const timers = Array.from(document.querySelectorAll('.countdown-timer'));
        function tick() {
            const now = Date.now();
            timers.forEach(timer => {
                const endAttr = timer.getAttribute('data-end-time');
                if (!endAttr) return timer.textContent = '--:--:--';
                const end = new Date(endAttr).getTime();
                const diff = end - now;
                if (diff > 0) {
                    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
                    timer.textContent = `${String(hours).padStart(2,'0')}:${String(minutes).padStart(2,'0')}:${String(seconds).padStart(2,'0')}`;
                } else {
                    timer.textContent = 'EXPIRED';
                    const card = timer.closest('.deal-card');
                    if (card) card.style.opacity = '0.5';
                }
            });
        }
        tick();
        _dealTimerInterval = setInterval(tick, 1000);
    }

    function attachDealHandlers() {
        const claimButtons = document.querySelectorAll('.claim-button');
        claimButtons.forEach(btn => {
            btn.removeEventListener('click', onClaimClick);
            btn.addEventListener('click', onClaimClick);
        });

        // Buy buttons - open a simple checkout placeholder
        const buyButtons = document.querySelectorAll('.buy-button');
        buyButtons.forEach(b => {
            b.removeEventListener('click', onBuyClick);
            b.addEventListener('click', onBuyClick);
        });
    }

    async function onClaimClick(e) {
        const btn = e.currentTarget;
        const dealId = btn.dataset.dealId;
        const token = localStorage.getItem('token');
        if (!token) return window.location.href = '/login.html';
        try {
            const res = await fetch('/api/wishlist', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
                body: JSON.stringify({ dealId })
            });
            if (res.status === 401) return window.location.href = '/login.html';
            if (!res.ok) {
                const err = await res.json();
                return showNotification(err.message || 'Failed to claim');
            }
            btn.textContent = 'CLAIMED!';
            btn.classList.add('bg-green-500');
            btn.classList.remove('bg-yellow-400', 'hover:bg-yellow-500');
            btn.disabled = true;
            showToast('Deal claimed — added to wishlist', 'success');
        } catch (err) {
            console.error('Claim error', err);
            showNotification('Error claiming deal');
        }
    }

    function renderStars(rating) {
        const full = Math.floor(rating);
        const half = rating - full >= 0.5;
        let out = '';
        for (let i = 0; i < full; i++) out += '★';
        if (half) out += '☆';
        while (out.length < 5) out += '☆';
        return `<span class="text-yellow-400">${out}</span>`;
    }

    function onBuyClick(e) {
        if (e.currentTarget.tagName.toLowerCase() === 'a') {
            return; // Let the browser handle the hyperlink normally
        }
        showToast('Checkout is a placeholder — integrate payments to complete.', 'info');
    }

    // Professional Toast Notification System
    function showToast(message, type = 'info') {
        const toast = document.createElement('div');
        const icons = {
            success: '<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/></svg>',
            error: '<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/></svg>',
            info: '<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"/></svg>'
        };
        const colors = {
            success: 'bg-green-500',
            error: 'bg-red-500',
            info: 'bg-blue-500'
        };
        toast.className = `fixed top-20 right-4 ${colors[type]} text-white px-6 py-4 rounded-lg shadow-2xl z-[9999] flex items-center space-x-3 transform translate-x-full transition-transform duration-300 max-w-md`;
        toast.innerHTML = `${icons[type]}<span class="font-medium">${message}</span>`;
        document.body.appendChild(toast);
        requestAnimationFrame(() => {
            toast.style.transform = 'translateX(0)';
        });
        setTimeout(() => {
            toast.style.transform = 'translateX(120%)';
            setTimeout(() => toast.remove(), 300);
        }, 4000);
    }

    // Loading Spinner
    function showLoading(container) {
        container.innerHTML = `
            <div class="col-span-full flex items-center justify-center py-20">
                <div class="animate-spin rounded-full h-16 w-16 border-b-4 border-yellow-400"></div>
            </div>
        `;
    }

    function hideLoading(container) {
        // Loading is cleared when content is rendered
    }

    // Empty State
    function showEmptyState(container, title, message) {
        container.innerHTML = `
            <div class="col-span-full text-center py-20">
                <svg class="w-24 h-24 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"></path>
                </svg>
                <h3 class="text-2xl font-bold text-gray-400 mb-2">${title}</h3>
                <p class="text-gray-500">${message}</p>
            </div>
        `;
    }

    // User Profile Dropdown
    function initializeUserProfile() {
        const profileBtn = document.querySelector('.profile-button');
        const token = localStorage.getItem('token');
        const userEmail = localStorage.getItem('userEmail');
        
        if (profileBtn && token) {
            profileBtn.classList.remove('bg-gray-800');
            profileBtn.classList.add('bg-yellow-400', 'hover:bg-yellow-500');
            
            profileBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                toggleProfileDropdown(profileBtn, userEmail);
            });
        }
    }

    // Helper function to get user role
    function getUserRole() {
        const token = localStorage.getItem('token');
        if (!token) return 'guest';
        
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            return payload.role || 'user';
        } catch (err) {
            return 'user';
        }
    }

    function toggleProfileDropdown(btn, email) {
        let dropdown = document.getElementById('profileDropdown');
        if (dropdown) {
            dropdown.remove();
            return;
        }
        
        // Check if user is admin (you can decode JWT token to check role)
        const isAdmin = checkIfAdmin();
        
        dropdown = document.createElement('div');
        dropdown.id = 'profileDropdown';
        dropdown.className = 'absolute top-16 right-4 bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-4 w-64 z-[9999] border border-gray-200 dark:border-gray-700';
        const userRole = getUserRole();
        dropdown.innerHTML = `
            <div class="border-b border-gray-200 dark:border-gray-700 pb-3 mb-3">
                <p class="text-sm text-gray-500 dark:text-gray-400">Signed in as</p>
                <p class="font-semibold text-gray-900 dark:text-white truncate">${email || 'User'}</p>
                <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">Role: ${userRole}</p>
            </div>
            <a href="profile.html" id="profileLink" class="w-full text-left px-4 py-2 text-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900/20 rounded-lg font-medium transition-colors flex items-center space-x-2 mb-2">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5.121 17.804A11.955 11.955 0 0112 15c2.485 0 4.78.748 6.879 2.03M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                <span>Profile</span>
            </a>
            ${userRole === 'vendor' ? `
            <a href="vendor-dashboard.html" id="vendorLink" class="w-full text-left px-4 py-2 text-yellow-600 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 rounded-lg font-medium transition-colors flex items-center space-x-2 mb-2">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                <span>Vendor Dashboard</span>
            </a>` : ''}
            ${userRole === 'admin' ? `
            <a href="admin-vendors.html" id="adminLink" class="w-full text-left px-4 py-2 text-yellow-600 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 rounded-lg font-medium transition-colors flex items-center space-x-2 mb-2">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                <span>Admin Vendors</span>
            </a>` : ''}
            ${userRole !== 'vendor' && userRole !== 'admin' ? `
            <a href="vendor-register.html" id="becomeVendorLink" class="w-full text-left px-4 py-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg font-medium transition-colors flex items-center space-x-2 mb-2">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m0 0h6m-6-6h6m0 0v6"></path></svg>
                <span>Become a Vendor</span>
            </a>` : ''}
            <button id="logoutBtn" class="w-full text-left px-4 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg font-medium transition-colors flex items-center space-x-2">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
                <span>Logout</span>
            </button>
        `;
        document.body.appendChild(dropdown);
        
        document.getElementById('logoutBtn').addEventListener('click', () => {
            localStorage.removeItem('token');
            localStorage.removeItem('userEmail');
            showToast('Logged out successfully', 'success');
            setTimeout(() => window.location.href = '/login.html', 500);
        });
        
        setTimeout(() => {
            document.addEventListener('click', function closeDropdown() {
                dropdown?.remove();
                document.removeEventListener('click', closeDropdown);
            });
        }, 100);
    }

    // Helper function to check if user is admin
    function checkIfAdmin() {
        const token = localStorage.getItem('token');
        if (!token) return false;
        
        try {
            // Decode JWT token to check role
            const payload = JSON.parse(atob(token.split('.')[1]));
            return payload.role === 'admin';
        } catch (err) {
            return false;
        }
    }

    // Mobile Menu
    function initializeMobileMenu() {
        const menuBtn = document.getElementById('menu-button');
        if (menuBtn) {
            menuBtn.addEventListener('click', () => {
                const userRole = getUserRole();
                const menu = document.createElement('div');
                menu.className = 'fixed inset-0 bg-gray-900/95 backdrop-blur-sm z-[9999] flex flex-col items-center justify-center animate-fadeIn';
                menu.innerHTML = `
                    <button class="absolute top-4 right-4 text-white text-4xl hover:text-yellow-400 transition-colors">&times;</button>
                    <nav class="space-y-6 text-center">
                        <a href="index.html" class="block text-white text-2xl font-bold hover:text-yellow-400 transition-colors">Home</a>
                        <a href="deals.html" class="block text-white text-2xl font-bold hover:text-yellow-400 transition-colors">Deals</a>
                        <a href="wishlist.html" class="block text-white text-2xl font-bold hover:text-yellow-400 transition-colors">Wishlist</a>
                        ${userRole === 'vendor' ? `<a href="vendor-dashboard.html" class="block text-yellow-400 text-2xl font-bold hover:text-yellow-300 transition-colors">Vendor Dashboard</a>` : ''}
                        ${userRole === 'admin' ? `<a href="admin-vendors.html" class="block text-yellow-400 text-2xl font-bold hover:text-yellow-300 transition-colors">Admin Vendors</a>` : ''}
                        ${userRole !== 'vendor' && userRole !== 'admin' ? `<a href="vendor-register.html" class="block text-blue-400 text-2xl font-bold hover:text-blue-300 transition-colors">Become Vendor</a>` : ''}
                        ${!localStorage.getItem('token') ? '<a href="login.html" class="block text-white text-2xl font-bold hover:text-yellow-400 transition-colors">Login</a>' : ''}
                    </nav>
                `;
                document.body.appendChild(menu);
                menu.querySelector('button').addEventListener('click', () => menu.remove());
            });
        }
    }

    // Smooth scroll and animations
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, observerOptions);

    // Observe all cards for scroll animations
    setTimeout(() => {
        document.querySelectorAll('.deal-card, .category-card, .wishlist-item').forEach(card => {
            card.style.opacity = '0';
            card.style.transform = 'translateY(20px)';
            card.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
            observer.observe(card);
        });
    }, 100);

    // Fetch wishlist items from the backend
    const fetchWishlistItems = async () => {
        if (!wishlistContainer) return;
        showLoading(wishlistContainer);
        try {
            const response = await fetch('/api/wishlist', { headers: { ...getAuthHeaders() } });
            if (response.status === 401) return window.location.href = '/login.html';
            const data = await response.json();
            hideLoading(wishlistContainer);
            renderWishlistItems(data);
            if (data.length === 0) {
                const empty = document.getElementById('emptyState');
                if (empty) empty.classList.remove('hidden');
            }
        } catch (error) {
            console.error('Error fetching wishlist items:', error);
            hideLoading(wishlistContainer);
            showToast('Failed to load wishlist', 'error');
        }
    };

    // Render wishlist items in the UI
    const renderWishlistItems = (items) => {
        if (!wishlistContainer) return;
        wishlistContainer.innerHTML = '';
        items.forEach(item => {
            const itemElement = document.createElement('div');
            itemElement.className = 'wishlist-item bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden';
            itemElement.dataset.id = item._id || item.id || '';
            const title = item.title || (item.deal && item.deal.title) || item.name || 'Untitled';
            const imageSrc = item.image || (item.deal && (item.deal.image || item.deal.imageUrl || item.deal.image_url || item.deal.imagePath)) || item.imageUrl || null;
            const price = typeof item.price === 'number' ? item.price : (item.deal && typeof item.deal.discountedPrice === 'number' ? item.deal.discountedPrice : (item.deal && typeof item.deal.price === 'number' ? item.deal.price : null));
            const originalPrice = item.deal && typeof item.deal.originalPrice === 'number' ? item.deal.originalPrice : null;
            const dealLink = item.deal && item.deal.dealLink;
            itemElement.innerHTML = `
                <div class="h-44 overflow-hidden relative bg-yellow-400 rounded-t-2xl">
                    ${imageSrc ? `<img src="${imageSrc}" alt="${escapeHtml(title)}" class="w-full h-full object-cover" onerror="this.style.display='none'" />` : ''}
                </div>
                <div class="p-5 flex items-center justify-between gap-3">
                    <div class="flex-1 min-w-0">
                        <h3 class="text-lg font-bold text-gray-900 dark:text-white truncate">${escapeHtml(title)}</h3>
                        ${price !== null ? `
                        <div class="mt-1 flex items-center gap-2">
                            <span class="text-xl font-extrabold text-gray-900 dark:text-white">&#8358;${price.toLocaleString('en-NG', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                            ${originalPrice !== null ? `<span class="text-gray-400 line-through text-sm">&#8358;${originalPrice.toLocaleString('en-NG', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>` : ''}
                        </div>` : ''}
                        ${dealLink ? `
                        <div class="mt-2">
                            <a href="${escapeHtml(dealLink)}" target="_blank" rel="noopener noreferrer" class="text-xs text-yellow-600 dark:text-yellow-400 hover:underline inline-flex items-center gap-1 font-semibold">
                                Deal link <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path></svg>
                            </a>
                        </div>` : ''}
                    </div>
                    <button class="delete-button heart-icon flex-shrink-0" data-id="${item._id || item.id}">
                        <svg class="w-8 h-8 text-red-500 hover:text-red-600 transition-colors" fill="currentColor" viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
                    </button>
                </div>
            `;
            wishlistContainer.appendChild(itemElement);
        });
        attachDeleteEventListeners();
    };

    // Attach event listeners to delete buttons
    const attachDeleteEventListeners = () => {
        const deleteButtons = document.querySelectorAll('.delete-button');
        deleteButtons.forEach(button => {
            button.addEventListener('click', async (e) => {
                const itemId = e.currentTarget.dataset.id;
                await deleteWishlistItem(itemId);
            });
        });
    };

    // Delete a wishlist item
    const deleteWishlistItem = async (id) => {
        try {
            const res = await fetch(`/api/wishlist/${id}`, { method: 'DELETE', headers: { ...getAuthHeaders() } });
            if (res.status === 401) return window.location.href = '/login.html';
            fetchWishlistItems(); // Refresh the list after deletion
        } catch (error) {
            console.error('Error deleting wishlist item:', error);
        }
    };

    // Add a new wishlist item
    if (addItemForm) {
        addItemForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const newItem = {
                name: itemNameInput.value,
                description: itemDescriptionInput.value
            };

            try {
                const res = await fetch('/api/wishlist', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
                    body: JSON.stringify(newItem)
                });
                if (res.status === 401) return window.location.href = '/login.html';
                itemNameInput.value = '';
                itemDescriptionInput.value = '';
                fetchWishlistItems(); // Refresh the list after adding
            } catch (error) {
                console.error('Error adding wishlist item:', error);
            }
        });
    }

    // Initial fetch of wishlist items
    if (wishlistContainer && localStorage.getItem('token')) {
        fetchWishlistItems();
    }
    // If on deals page, fetch deals
    if (dealsContainer) fetchDeals();
});

// Legacy compatibility for inline handlers
function showNotification(msg) {
    const event = new CustomEvent('showToast', { detail: { message: msg, type: 'info' } });
    document.dispatchEvent(event);
}

document.addEventListener('showToast', (e) => {
    const toast = document.createElement('div');
    toast.className = 'fixed top-20 right-4 bg-gray-900 text-white px-6 py-3 rounded-lg shadow-lg z-50 transform transition-all duration-300';
    toast.textContent = e.detail.message;
    document.body.appendChild(toast);
    setTimeout(() => toast.style.transform = 'translateX(0)', 10);
    setTimeout(() => {
        toast.style.transform = 'translateX(400px)';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
});