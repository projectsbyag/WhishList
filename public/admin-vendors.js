const API_BASE_URL = 'http://localhost:3000/api';
let currentPage = 1;
let currentFilters = {};
let currentEditingVendorId = null;

// Get auth token
function getAuthToken() {
  const token = localStorage.getItem('token');
  if (!token) {
    window.location.href = 'login.html';
    return null;
  }
  return token;
}

// Decode the role from the JWT instead of relying on localStorage
function getJwtRole() {
  const token = localStorage.getItem('token');
  if (!token) return 'guest';
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.role || 'user';
  } catch (err) {
    return 'user';
  }
}

// Initialize page
document.addEventListener('DOMContentLoaded', async () => {
  const token = getAuthToken();
  if (!token) return;

  // Check if user is admin
  const userRole = getJwtRole();
  if (userRole !== 'admin') {
    window.location.href = 'index.html';
    return;
  }

  await loadAdminStats();
  await loadVendors();

  // Event listeners
  document.getElementById('filterBtn').addEventListener('click', applyFilters);
  document.getElementById('searchInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') applyFilters();
  });
  document.getElementById('prevBtn').addEventListener('click', previousPage);
  document.getElementById('nextBtn').addEventListener('click', nextPage);
  document.getElementById('logoutBtn').addEventListener('click', logout);
});

// Load admin stats
async function loadAdminStats() {
  try {
    const token = getAuthToken();
    const response = await fetch(`${API_BASE_URL}/admin/stats`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) throw new Error('Failed to load stats');

    const data = await response.json();
    document.getElementById('totalVendors').textContent = data.vendors.total;
    document.getElementById('activeVendors').textContent = data.vendors.active;
    document.getElementById('inactiveVendors').textContent = data.vendors.inactive;
    document.getElementById('suspendedVendors').textContent = data.vendors.suspended;
    document.getElementById('totalRevenue').textContent = `$${(data.revenue.total || 0).toFixed(2)}`;
  } catch (err) {
    console.error('Error loading stats:', err);
    showToast('Failed to load statistics', 'error');
  }
}

// Load vendors
async function loadVendors(page = 1) {
  try {
    const token = getAuthToken();
    const params = new URLSearchParams({ page, limit: 10, ...currentFilters });

    const response = await fetch(`${API_BASE_URL}/admin/vendors?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) throw new Error('Failed to load vendors');

    const data = await response.json();
    renderVendorsTable(data.vendors);
    updatePagination(data.pagination);
    currentPage = page;
  } catch (err) {
    console.error('Error loading vendors:', err);
    showToast('Failed to load vendors', 'error');
  }
}

// Render vendors table
function renderVendorsTable(vendors) {
  const tbody = document.getElementById('vendorsList');
  tbody.innerHTML = '';

  if (vendors.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" class="px-6 py-8 text-center text-gray-500">
          No vendors found
        </td>
      </tr>
    `;
    return;
  }

  vendors.forEach((vendor) => {
    const statusClass = `status-${vendor.subscriptionStatus}`;
    const tierClass = `tier-${vendor.subscriptionTier}`;

    const row = document.createElement('tr');
    row.className = 'hover:bg-gray-50';
    row.innerHTML = `
      <td class="px-6 py-4 text-sm font-medium text-gray-900">${vendor.storeName}</td>
      <td class="px-6 py-4 text-sm text-gray-600">${vendor.contactEmail}</td>
      <td class="px-6 py-4 text-sm text-gray-600 capitalize">${vendor.category}</td>
      <td class="px-6 py-4 text-sm">
        <span class="${tierClass} px-3 py-1 rounded-full text-xs font-medium capitalize">
          ${vendor.subscriptionTier}
        </span>
      </td>
      <td class="px-6 py-4 text-sm">
        <span class="${statusClass} px-3 py-1 rounded-full text-xs font-medium capitalize">
          ${vendor.subscriptionStatus}
        </span>
      </td>
      <td class="px-6 py-4 text-sm text-gray-600">${vendor.dealsCount}</td>
      <td class="px-6 py-4 text-sm">
        <div class="flex space-x-2">
          <button onclick="viewDetails('${vendor.id}')" class="text-blue-500 hover:text-blue-700 font-medium text-xs">View</button>
          <button onclick="openEditModal('${vendor.id}')" class="text-yellow-500 hover:text-yellow-700 font-medium text-xs">Edit</button>
          ${vendor.subscriptionStatus === 'active' ? `
            <button onclick="deactivateVendor('${vendor.id}')" class="text-red-500 hover:text-red-700 font-medium text-xs">Deactivate</button>
          ` : `
            <button onclick="activateVendor('${vendor.id}')" class="text-green-500 hover:text-green-700 font-medium text-xs">Activate</button>
          `}
          <button onclick="deleteVendor('${vendor.id}')" class="text-gray-500 hover:text-gray-700 font-medium text-xs">Delete</button>
        </div>
      </td>
    `;
    tbody.appendChild(row);
  });
}

// Update pagination
function updatePagination(pagination) {
  document.getElementById('pageInfo').textContent = `Page ${pagination.page} of ${pagination.pages}`;
  document.getElementById('prevBtn').disabled = pagination.page === 1;
  document.getElementById('nextBtn').disabled = pagination.page === pagination.pages;
}

// Pagination functions
function previousPage() {
  if (currentPage > 1) loadVendors(currentPage - 1);
}

function nextPage() {
  loadVendors(currentPage + 1);
}

// Apply filters
async function applyFilters() {
  currentFilters = {
    search: document.getElementById('searchInput').value,
    status: document.getElementById('statusFilter').value,
    tier: document.getElementById('tierFilter').value,
  };
  await loadVendors(1);
}

// View vendor details
async function viewDetails(vendorId) {
  try {
    const token = getAuthToken();
    const response = await fetch(`${API_BASE_URL}/admin/vendors/${vendorId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) throw new Error('Failed to load vendor details');

    const data = await response.json();
    const vendor = data.vendor;

    const detailsHTML = `
      <div class="space-y-4">
        <div class="grid grid-cols-2 gap-4">
          <div>
            <p class="text-sm text-gray-500">Store Name</p>
            <p class="font-medium text-gray-900">${vendor.storeName}</p>
          </div>
          <div>
            <p class="text-sm text-gray-500">Contact Email</p>
            <p class="font-medium text-gray-900">${vendor.contactEmail}</p>
          </div>
          <div>
            <p class="text-sm text-gray-500">Category</p>
            <p class="font-medium text-gray-900 capitalize">${vendor.category}</p>
          </div>
          <div>
            <p class="text-sm text-gray-500">Phone</p>
            <p class="font-medium text-gray-900">${vendor.contactPhone || 'N/A'}</p>
          </div>
          <div class="col-span-2">
            <p class="text-sm text-gray-500">Address</p>
            <p class="font-medium text-gray-900">${vendor.address || 'N/A'}</p>
          </div>
          <div class="col-span-2">
            <p class="text-sm text-gray-500">Website</p>
            <p class="font-medium text-gray-900">${vendor.website || 'N/A'}</p>
          </div>
          <div>
            <p class="text-sm text-gray-500">Subscription Status</p>
            <p class="font-medium text-gray-900 capitalize">${vendor.subscriptionStatus}</p>
          </div>
          <div>
            <p class="text-sm text-gray-500">Tier</p>
            <p class="font-medium text-gray-900 capitalize">${vendor.subscriptionTier}</p>
          </div>
          <div>
            <p class="text-sm text-gray-500">Deals Count</p>
            <p class="font-medium text-gray-900">${vendor.dealsCount}</p>
          </div>
          <div>
            <p class="text-sm text-gray-500">Member Since</p>
            <p class="font-medium text-gray-900">${new Date(vendor.createdAt).toLocaleDateString()}</p>
          </div>
        </div>
        ${data.recentTransactions && data.recentTransactions.length > 0 ? `
          <div class="mt-6 pt-6 border-t border-gray-200">
            <h3 class="font-semibold text-gray-900 mb-3">Recent Transactions</h3>
            <div class="space-y-2">
              ${data.recentTransactions.map(t => `
                <div class="flex justify-between text-sm">
                  <span class="text-gray-600">${t.description}</span>
                  <span class="font-medium text-gray-900">$${(t.amount / 100).toFixed(2)}</span>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}
      </div>
    `;

    document.getElementById('detailsContent').innerHTML = detailsHTML;
    document.getElementById('detailsModal').classList.remove('hidden');
  } catch (err) {
    console.error('Error loading vendor details:', err);
    showToast('Failed to load vendor details', 'error');
  }
}

function closeDetailsModal() {
  document.getElementById('detailsModal').classList.add('hidden');
}

// Open edit modal
async function openEditModal(vendorId) {
  try {
    const token = getAuthToken();
    const response = await fetch(`${API_BASE_URL}/admin/vendors/${vendorId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) throw new Error('Failed to load vendor');

    const data = await response.json();
    const vendor = data.vendor;

    currentEditingVendorId = vendorId;
    document.getElementById('editStoreName').value = vendor.storeName;
    document.getElementById('editEmail').value = vendor.contactEmail;
    document.getElementById('editCategory').value = vendor.category;
    document.getElementById('editPhone').value = vendor.contactPhone || '';
    document.getElementById('editAddress').value = vendor.address || '';
    document.getElementById('editWebsite').value = vendor.website || '';
    document.getElementById('editVerification').value = vendor.verificationStatus;

    document.getElementById('editModal').classList.remove('hidden');
  } catch (err) {
    console.error('Error loading vendor:', err);
    showToast('Failed to load vendor', 'error');
  }
}

function closeEditModal() {
  document.getElementById('editModal').classList.add('hidden');
  currentEditingVendorId = null;
}

// Save vendor edit
async function saveVendorEdit() {
  try {
    const token = getAuthToken();
    const response = await fetch(`${API_BASE_URL}/admin/vendors/${currentEditingVendorId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        storeName: document.getElementById('editStoreName').value,
        contactEmail: document.getElementById('editEmail').value,
        category: document.getElementById('editCategory').value,
        contactPhone: document.getElementById('editPhone').value,
        address: document.getElementById('editAddress').value,
        website: document.getElementById('editWebsite').value,
        verificationStatus: document.getElementById('editVerification').value,
      }),
    });

    if (!response.ok) throw new Error('Failed to update vendor');

    showToast('Vendor updated successfully', 'success');
    closeEditModal();
    await loadVendors(currentPage);
  } catch (err) {
    console.error('Error updating vendor:', err);
    showToast('Failed to update vendor', 'error');
  }
}

// Deactivate vendor
async function deactivateVendor(vendorId) {
  if (!confirm('Are you sure you want to deactivate this vendor?')) return;

  try {
    const token = getAuthToken();
    const response = await fetch(`${API_BASE_URL}/admin/vendors/${vendorId}/deactivate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ reason: 'Deactivated by admin' }),
    });

    if (!response.ok) throw new Error('Failed to deactivate vendor');

    showToast('Vendor deactivated successfully', 'success');
    await loadVendors(currentPage);
    await loadAdminStats();
  } catch (err) {
    console.error('Error deactivating vendor:', err);
    showToast('Failed to deactivate vendor', 'error');
  }
}

// Activate vendor
async function activateVendor(vendorId) {
  if (!confirm('Are you sure you want to activate this vendor?')) return;

  try {
    const token = getAuthToken();
    const response = await fetch(`${API_BASE_URL}/admin/vendors/${vendorId}/activate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) throw new Error('Failed to activate vendor');

    showToast('Vendor activated successfully', 'success');
    await loadVendors(currentPage);
    await loadAdminStats();
  } catch (err) {
    console.error('Error activating vendor:', err);
    showToast('Failed to activate vendor', 'error');
  }
}

// Delete vendor
async function deleteVendor(vendorId) {
  if (!confirm('Are you sure you want to delete this vendor? This action cannot be undone.')) return;

  try {
    const token = getAuthToken();
    const response = await fetch(`${API_BASE_URL}/admin/vendors/${vendorId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ reason: 'Deleted by admin' }),
    });

    if (!response.ok) throw new Error('Failed to delete vendor');

    showToast('Vendor deleted successfully', 'success');
    await loadVendors(currentPage);
    await loadAdminStats();
  } catch (err) {
    console.error('Error deleting vendor:', err);
    showToast('Failed to delete vendor', 'error');
  }
}

// Logout
function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('userEmail');
  localStorage.removeItem('userRole');
  localStorage.removeItem('vendorId');
  window.location.href = 'login.html';
}

// Toast notification
function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  const bgClass = type === 'error' ? 'bg-red-500' : type === 'success' ? 'bg-green-500' : 'bg-blue-500';
  toast.className = `fixed bottom-4 right-4 ${bgClass} text-white px-6 py-3 rounded-lg shadow-lg`;
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}
