const API_BASE_URL = 'http://localhost:3000/api';

document.addEventListener('DOMContentLoaded', async () => {
  const token = localStorage.getItem('token');
  const userRole = localStorage.getItem('userRole');

  if (!token || userRole !== 'vendor') {
    window.location.href = 'login.html';
    return;
  }

  await loadPricingPlans();
  document.getElementById('logoutBtn').addEventListener('click', logout);
});

async function loadPricingPlans() {
  try {
    const response = await fetch(`${API_BASE_URL}/payment/pricing-plans`);
    if (!response.ok) throw new Error('Failed to load pricing plans');

    const data = await response.json();
    renderPricingCards(data.plans);
  } catch (err) {
    console.error('Error loading pricing plans:', err);
    showToast('Failed to load pricing plans', 'error');
  }
}

function renderPricingCards(plans) {
  const container = document.getElementById('pricingCards');
  container.innerHTML = '';

  plans.forEach((plan, index) => {
    const isFeatured = plan.tier === 'professional';
    const maxDealsText = plan.maxDeals === -1 ? 'Unlimited' : plan.maxDeals;

    const card = document.createElement('div');
    card.className = `plan-card rounded-lg p-8 ${isFeatured ? 'featured bg-blue-50' : 'bg-white'}`;

    card.innerHTML = `
      ${isFeatured ? '<div class="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2"><span class="bg-blue-600 text-white px-4 py-1 rounded-full text-sm font-semibold">Most Popular</span></div>' : ''}
      
      <h3 class="text-2xl font-bold text-gray-900 mb-2">${plan.name}</h3>
      <div class="mb-6">
        <div class="flex items-baseline">
          <span class="text-4xl font-bold text-gray-900">₦${plan.price.toLocaleString()}</span>
          <span class="text-gray-600 ml-2">/month</span>
        </div>
      </div>

      <div class="bg-gray-50 rounded p-4 mb-6">
        <p class="text-gray-700 font-semibold mb-2">Key Features:</p>
        <ul class="space-y-2">
          <li class="flex items-center">
            <span class="text-green-500 mr-2">✓</span>
            <span class="text-gray-700">${maxDealsText} deals allowed</span>
          </li>
          ${plan.features.analytics ? '<li class="flex items-center"><span class="text-green-500 mr-2">✓</span><span class="text-gray-700">Analytics dashboard</span></li>' : ''}
          ${plan.features.customBranding ? '<li class="flex items-center"><span class="text-green-500 mr-2">✓</span><span class="text-gray-700">Custom branding</span></li>' : ''}
          ${plan.features.prioritySupport ? '<li class="flex items-center"><span class="text-green-500 mr-2">✓</span><span class="text-gray-700">Priority support</span></li>' : ''}
          ${plan.features.apiAccess ? '<li class="flex items-center"><span class="text-green-500 mr-2">✓</span><span class="text-gray-700">API access</span></li>' : ''}
        </ul>
      </div>

      <button onclick="subscribeToPlan('${plan.tier}')" class="w-full px-6 py-3 ${isFeatured ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'border-2 border-gray-300 hover:border-gray-400 text-gray-900'} font-semibold rounded-lg transition-colors">
        Choose ${plan.name}
      </button>

      <p class="text-center text-gray-600 text-sm mt-4">
        First month, then ₦${plan.price.toLocaleString()}/month. Cancel anytime.
      </p>
    `;

    container.appendChild(card);
  });
}

async function subscribeToPlan(tier) {
  try {
    const token = localStorage.getItem('token');
    const email = prompt('Enter your email address for payment confirmation:');

    if (!email) {
      showToast('Email is required', 'error');
      return;
    }

    // Initialize payment with Paystack
    const response = await fetch(`${API_BASE_URL}/payment/initialize`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ tier, email }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to initialize payment');
    }

    const data = await response.json();

    if (!data.status) {
      throw new Error(data.message || 'Payment initialization failed');
    }

    // Open Paystack payment modal
    const handler = PaystackPop.setup({
      key: data.data.access_code ? data.data.access_code : 'pk_test_YOUR_PAYSTACK_PUBLIC_KEY_HERE', // Will be set from server
      email: data.data.email,
      amount: data.data.amount,
      ref: data.data.reference,
      currency: 'NGN',
      onClose: function () {
        showToast('Payment window closed', 'info');
      },
      onSuccess: function (transaction) {
        verifyPayment(transaction.reference);
      },
    });
    handler.openIframe();
  } catch (err) {
    console.error('Error subscribing:', err);
    showToast(err.message || 'Failed to subscribe', 'error');
  }
}

async function verifyPayment(reference) {
  try {
    const token = localStorage.getItem('token');

    const response = await fetch(`${API_BASE_URL}/payment/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ reference }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Payment verification failed');
    }

    const data = await response.json();

    if (!data.status) {
      throw new Error(data.message || 'Payment verification failed');
    }

    showToast('Payment successful! Redirecting to dashboard...', 'success');
    setTimeout(() => {
      window.location.href = 'vendor-dashboard.html';
    }, 2000);
  } catch (err) {
    console.error('Error verifying payment:', err);
    showToast(err.message || 'Failed to verify payment', 'error');
  }
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

