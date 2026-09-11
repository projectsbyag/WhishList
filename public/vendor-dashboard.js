const API_BASE_URL = 'http://localhost:3000/api';
let currentEditingDealId = null;

document.addEventListener('DOMContentLoaded', async () => {
  const token = localStorage.getItem('token');
  const userRole = localStorage.getItem('userRole');

  if (!token || userRole !== 'vendor') {
    window.location.href = 'login.html';
    return;
  }

  // Tab switching
  document.querySelectorAll('.tab-btn').forEach((btn) => {
    btn.addEventListener('click', switchTab);
  });

  // Event listeners
  document.getElementById('logoutBtn').addEventListener('click', logout);
  document.getElementById('settingsForm').addEventListener('submit', saveSettings);

  // Load dashboard data
  await loadDashboardStats();
  await loadVendorDeals();
  await loadSubscriptionDetails();
  await loadVendorSettings();
});

// Switch tabs
function switchTab(e) {
  const tabName = e.target.dataset.tab;

  // Hide all tabs
  document.querySelectorAll('.tab-content').forEach((tab) => {
    tab.classList.add('hidden');
  });

  // Remove active class from all buttons
  document.querySelectorAll('.tab-btn').forEach((btn) => {
    btn.classList.remove('tab-active', 'border-yellow-400', 'text-yellow-600', 'font-semibold');
    btn.classList.add('border-transparent', 'text-gray-500');
  });

  // Show selected tab
  document.getElementById(`${tabName}-tab`).classList.remove('hidden');

  // Mark button as active
  e.target.classList.remove('border-transparent', 'text-gray-500');
  e.target.classList.add('tab-active', 'border-yellow-400', 'text-yellow-600', 'font-semibold');
}

// Load dashboard stats
async function loadDashboardStats() {
  try {
    const token = getAuthToken();
    const response = await fetch(`${API_BASE_URL}/vendor/dashboard-stats`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) throw new Error('Failed to load stats');

    const data = await response.json();
    document.getElementById('storeName').textContent = data.storeName;
    document.getElementById('totalDeals').textContent = data.stats.totalDeals;
    document.getElementById('activeDeals').textContent = data.stats.activeDeals;
    document.getElementById('subStatus').textContent = data.subscriptionStatus;

    if (data.subscription && data.subscription.currentPeriodEnd) {
      const endDate = new Date(data.subscription.currentPeriodEnd).toLocaleDateString();
      document.getElementById('planEnds').textContent = endDate;
    }

    // Show subscription alert if no active subscription
    if (data.subscriptionStatus !== 'active') {
      document.getElementById('subscriptionAlert').classList.remove('hidden');
      document.getElementById('managePlanBtn').classList.remove('hidden');
    }
  } catch (err) {
    console.error('Error loading stats:', err);
    showToast('Failed to load dashboard stats', 'error');
  }
}

// Load vendor deals
async function loadVendorDeals() {
  try {
    const token = getAuthToken();
    const response = await fetch(`${API_BASE_URL}/vendor/deals`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) throw new Error('Failed to load deals');

    const data = await response.json();
    renderDealsTable(data.deals);
  } catch (err) {
    console.error('Error loading deals:', err);
    showToast('Failed to load deals', 'error');
  }
}

// Render deals table
function renderDealsTable(deals) {
  const tbody = document.getElementById('dealsList');
  tbody.innerHTML = '';

  if (deals.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" class="px-4 py-8 text-center text-gray-500">No deals yet. Create your first deal!</td></tr>';
    return;
  }

  deals.forEach((deal) => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td class="px-4 py-3">${deal.title}</td>
      <td class="px-4 py-3">${deal.discount}</td>
      <td class="px-4 py-3">
        <span class="px-2 py-1 rounded text-xs font-medium ${deal.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}">
          ${deal.isActive ? 'Active' : 'Inactive'}
        </span>
      </td>
      <td class="px-4 py-3 text-sm">${new Date(deal.createdAt).toLocaleDateString()}</td>
      <td class="px-4 py-3 text-sm">
        <button onclick="editDeal('${deal._id}')" class="text-blue-600 hover:text-blue-800 mr-3">Edit</button>
        <button onclick="deleteDeal('${deal._id}')" class="text-red-600 hover:text-red-800">Delete</button>
      </td>
    `;
    tbody.appendChild(row);
  });
}

// Load subscription details
async function loadSubscriptionDetails() {
  try {
    const token = getAuthToken();
    const response = await fetch(`${API_BASE_URL}/payment/subscription-status`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) throw new Error('Failed to load subscription');

    const data = await response.json();

    if (data.hasSubscription) {
      const sub = data.subscription;
      const endDate = new Date(sub.currentPeriodEnd).toLocaleDateString();
      document.getElementById('subscriptionDetails').innerHTML = `
        <div class="grid grid-cols-2 gap-4">
          <div>
            <p class="text-sm text-gray-500">Plan Tier</p>
            <p class="text-lg font-semibold text-gray-900 capitalize">${sub.tier}</p>
          </div>
          <div>
            <p class="text-sm text-gray-500">Status</p>
            <p class="text-lg font-semibold text-gray-900 capitalize">${sub.status}</p>
          </div>
          <div>
            <p class="text-sm text-gray-500">Current Period End</p>
            <p class="text-lg font-semibold text-gray-900">${endDate}</p>
          </div>
          <div>
            <p class="text-sm text-gray-500">Max Deals</p>
            <p class="text-lg font-semibold text-gray-900">${sub.maxDeals === -1 ? 'Unlimited' : sub.maxDeals}</p>
          </div>
        </div>
        <div class="mt-6 pt-6 border-t border-gray-200">
          <h3 class="font-semibold text-gray-900 mb-3">Features</h3>
          <div class="grid grid-cols-2 gap-4">
            <div class="flex items-center">
              <span class="${sub.features.analytics ? 'text-green-500' : 'text-gray-400'}">✓</span>
              <span class="ml-2">Analytics</span>
            </div>
            <div class="flex items-center">
              <span class="${sub.features.customBranding ? 'text-green-500' : 'text-gray-400'}">✓</span>
              <span class="ml-2">Custom Branding</span>
            </div>
            <div class="flex items-center">
              <span class="${sub.features.prioritySupport ? 'text-green-500' : 'text-gray-400'}">✓</span>
              <span class="ml-2">Priority Support</span>
            </div>
            <div class="flex items-center">
              <span class="${sub.features.apiAccess ? 'text-green-500' : 'text-gray-400'}">✓</span>
              <span class="ml-2">API Access</span>
            </div>
          </div>
        </div>
        <button onclick="cancelSubscription()" class="mt-6 px-4 py-2 border border-red-300 text-red-600 hover:bg-red-50 rounded-lg">
          Cancel Subscription
        </button>
      `;
    } else {
      document.getElementById('subscriptionDetails').innerHTML = `
        <div class="bg-yellow-50 border border-yellow-200 rounded p-4">
          <p class="text-yellow-800">No active subscription. <a href="vendor-pricing.html" class="font-semibold hover:underline">Choose a plan</a></p>
        </div>
      `;
    }
  } catch (err) {
    console.error('Error loading subscription:', err);
  }
}

// Load vendor settings
async function loadVendorSettings() {
  try {
    const token = getAuthToken();
    const response = await fetch(`${API_BASE_URL}/vendor/profile`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) throw new Error('Failed to load profile');

    const vendor = await response.json();
    document.getElementById('settingsStoreName').value = vendor.storeName || '';
    document.getElementById('settingsDescription').value = vendor.storeDescription || '';
    document.getElementById('settingsPhone').value = vendor.contactPhone || '';
    document.getElementById('settingsWebsite').value = vendor.website || '';
  } catch (err) {
    console.error('Error loading settings:', err);
  }
}

// Open create deal modal
function openCreateDealModal() {
  currentEditingDealId = null;
  document.getElementById('dealModalTitle').textContent = 'Add New Deal';
  document.getElementById('dealTitle').value = '';
  document.getElementById('dealDescription').value = '';
  document.getElementById('dealCategory').value = '';
  document.getElementById('dealDiscount').value = '';
  document.getElementById('dealOriginalPrice').value = '';
  document.getElementById('dealDiscountedPrice').value = '';
  document.getElementById('dealProductLink').value = '';
  document.getElementById('dealImageUrl').value = '';
  document.getElementById('dealLocation').value = '';
  document.getElementById('dealModal').classList.remove('hidden');
}

function closeDealModal() {
  document.getElementById('dealModal').classList.add('hidden');
  currentEditingDealId = null;
}

// Save deal
async function saveDeal() {
  try {
    const token = getAuthToken();
    const dealData = {
      title: document.getElementById('dealTitle').value,
      description: document.getElementById('dealDescription').value,
      category: document.getElementById('dealCategory').value,
      discount: document.getElementById('dealDiscount').value,
      originalPrice: parseFloat(document.getElementById('dealOriginalPrice').value) || 0,
      discountedPrice: parseFloat(document.getElementById('dealDiscountedPrice').value) || 0,
      productLink: document.getElementById('dealProductLink').value,
      imageUrl: document.getElementById('dealImageUrl').value,
      location: document.getElementById('dealLocation').value,
    };

    if (!dealData.title || !dealData.category || !dealData.discount) {
      showToast('Please fill in all required fields (Title, Category, Discount)', 'error');
      return;
    }

    let response;
    if (currentEditingDealId) {
      response = await fetch(`${API_BASE_URL}/vendor/deals/${currentEditingDealId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(dealData),
      });
    } else {
      response = await fetch(`${API_BASE_URL}/vendor/deals`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(dealData),
      });
    }

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to save deal');
    }

    showToast(currentEditingDealId ? 'Deal updated successfully' : 'Deal created successfully', 'success');
    closeDealModal();
    await loadVendorDeals();
    await loadDashboardStats();
  } catch (err) {
    console.error('Error saving deal:', err);
    showToast(err.message || 'Failed to save deal', 'error');
  }
}

// Edit deal
async function editDeal(dealId) {
  try {
    const token = getAuthToken();
    const response = await fetch(`${API_BASE_URL}/vendor/deals`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) throw new Error('Failed to load deals');

    const data = await response.json();
    const deal = data.deals.find((d) => d._id === dealId);

    if (!deal) throw new Error('Deal not found');

    currentEditingDealId = dealId;
    document.getElementById('dealModalTitle').textContent = 'Edit Deal';
    document.getElementById('dealTitle').value = deal.title;
    document.getElementById('dealDescription').value = deal.description || '';
    document.getElementById('dealCategory').value = deal.category;
    document.getElementById('dealDiscount').value = deal.discount;
    document.getElementById('dealOriginalPrice').value = deal.originalPrice || '';
    document.getElementById('dealDiscountedPrice').value = deal.discountedPrice || '';
    document.getElementById('dealProductLink').value = deal.productLink || '';
    document.getElementById('dealImageUrl').value = deal.imageUrl || '';
    document.getElementById('dealLocation').value = deal.location || '';
    document.getElementById('dealModal').classList.remove('hidden');
  } catch (err) {
    console.error('Error loading deal:', err);
    showToast('Failed to load deal for editing', 'error');
  }
}

// Delete deal
async function deleteDeal(dealId) {
  if (!confirm('Are you sure you want to delete this deal?')) return;

  try {
    const token = getAuthToken();
    const response = await fetch(`${API_BASE_URL}/vendor/deals/${dealId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) throw new Error('Failed to delete deal');

    showToast('Deal deleted successfully', 'success');
    await loadVendorDeals();
    await loadDashboardStats();
  } catch (err) {
    console.error('Error deleting deal:', err);
    showToast('Failed to delete deal', 'error');
  }
}

// Save settings
async function saveSettings(e) {
  e.preventDefault();

  try {
    const token = getAuthToken();
    const response = await fetch(`${API_BASE_URL}/vendor/profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        storeName: document.getElementById('settingsStoreName').value,
        storeDescription: document.getElementById('settingsDescription').value,
        contactPhone: document.getElementById('settingsPhone').value,
        website: document.getElementById('settingsWebsite').value,
      }),
    });

    if (!response.ok) throw new Error('Failed to update settings');

    showToast('Settings saved successfully', 'success');
    await loadDashboardStats();
  } catch (err) {
    console.error('Error saving settings:', err);
    showToast('Failed to save settings', 'error');
  }
}

// Cancel subscription
async function cancelSubscription() {
  if (!confirm('Are you sure you want to cancel your subscription? You will no longer be able to create new deals.')) return;

  try {
    const token = getAuthToken();
    const response = await fetch(`${API_BASE_URL}/payment/cancel-subscription`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ reason: 'User requested cancellation' }),
    });

    if (!response.ok) throw new Error('Failed to cancel subscription');

    showToast('Subscription cancelled successfully', 'success');
    await loadSubscriptionDetails();
    await loadDashboardStats();
  } catch (err) {
    console.error('Error cancelling subscription:', err);
    showToast('Failed to cancel subscription', 'error');
  }
}

// Helper functions
function getAuthToken() {
  const token = localStorage.getItem('token');
  if (!token) {
    window.location.href = 'login.html';
    return null;
  }
  return token;
}

function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('userRole');
  localStorage.removeItem('vendorId');
  window.location.href = 'login.html';
}

function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  const bgClass = type === 'error' ? 'bg-red-500' : type === 'success' ? 'bg-green-500' : 'bg-blue-500';
  toast.className = `fixed bottom-4 right-4 ${bgClass} text-white px-6 py-3 rounded-lg shadow-lg z-50`;
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}
