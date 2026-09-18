const API_BASE_URL = 'http://localhost:3000/api';

document.addEventListener('DOMContentLoaded', () => {
  const userRole = localStorage.getItem('userRole');

  // If user is already a vendor, redirect to dashboard
  if (userRole === 'vendor') {
    window.location.href = 'vendor-dashboard.html';
    return;
  }

  document.getElementById('vendorForm').addEventListener('submit', handleRegistration);
});

async function handleRegistration(e) {
  e.preventDefault();

  try {
    const token = localStorage.getItem('token');
    if (!token) {
      window.location.href = 'login.html?returnTo=vendor-register.html';
      return;
    }

    const formData = {
      storeName: document.getElementById('storeName').value,
      storeDescription: document.getElementById('storeDescription').value,
      category: document.getElementById('category').value,
      contactEmail: document.getElementById('contactEmail').value,
      contactPhone: document.getElementById('contactPhone').value,
      address: document.getElementById('address').value,
      website: document.getElementById('website').value,
    };

    const response = await fetch(`${API_BASE_URL}/vendor/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(formData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Registration failed');
    }

    const data = await response.json();
    showToast('Vendor account created! Redirecting to pricing plans...', 'success');
    
    // Update localStorage
    localStorage.setItem('userRole', 'vendor');
    localStorage.setItem('vendorId', data.vendor.id);

    // Redirect to pricing page
    setTimeout(() => {
      window.location.href = 'vendor-pricing.html';
    }, 1500);
  } catch (err) {
    console.error('Registration error:', err);
    showToast(err.message || 'Failed to register as vendor', 'error');
  }
}

function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  const bgClass = type === 'error' ? 'bg-red-500' : type === 'success' ? 'bg-green-500' : 'bg-blue-500';
  toast.className = `fixed bottom-4 right-4 ${bgClass} text-white px-6 py-3 rounded-lg shadow-lg z-50`;
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}
