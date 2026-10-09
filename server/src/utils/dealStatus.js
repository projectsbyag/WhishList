const THREE_DAYS = 3 * 24 * 60 * 60 * 1000;

function getExpiryStatus(expiryDate, now = new Date()) {
  if (!expiryDate) return 'Active';
  const expiry = new Date(expiryDate).getTime();
  if (!Number.isFinite(expiry)) return 'Active';
  if (expiry <= now.getTime()) return 'Expired';
  if (expiry <= now.getTime() + THREE_DAYS) return 'Expiring Soon';
  return 'Active';
}

module.exports = { getExpiryStatus };