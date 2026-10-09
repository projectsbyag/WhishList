function isValidHttpUrl(value) {
  if (!value) return true;
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function normalizePhone(value) {
  return String(value || '').replace(/\D/g, '');
}

module.exports = { isValidHttpUrl, normalizePhone };