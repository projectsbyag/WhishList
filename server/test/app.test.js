process.env.DB_STORAGE = ':memory:';
process.env.JWT_SECRET = 'jest-test-secret';
process.env.CORS_ORIGIN = 'http://localhost:3000';
process.env.PAYSTACK_PUBLIC_KEY = 'pk_test_example';

jest.mock('../src/config/paystack', () => ({ post: jest.fn(), get: jest.fn() }));

const request = require('supertest');
const app = require('../src/app');
const models = require('../src/models');
const { sequelize } = require('../src/config/db');
const paystack = require('../src/config/paystack');
const { getExpiryStatus } = require('../src/utils/dealStatus');
const { signToken } = require('../src/controllers/authController');

async function register(email = 'shopper@example.com') {
  const response = await request(app).post('/api/auth/register').send({
    name: 'Test Person', email, password: 'password123',
  });
  return { ...response.body, status: response.status };
}

async function registerVendor(email = 'vendor@example.com') {
  const user = await register(email);
  const response = await request(app)
    .post('/api/vendor/register')
    .set('Authorization', `Bearer ${user.token}`)
    .send({
      storeName: 'Test Store', description: 'Store description', category: 'fashion',
      contactEmail: email, phone: '+234 801 234 5678', whatsapp: '+234 801 234 5678',
      website: 'https://store.example.com', address: 'Test address',
    });
  return { ...user, token: response.body.token, vendorResponse: response };
}

async function createSubscription(userId, values = {}) {
  return models.Subscription.create({
    userId, tier: 'basic', status: 'active', currentPeriodStart: new Date(),
    currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    maxDeals: 10, features: {}, ...values,
  });
}

async function createDeal(token, values = {}) {
  return request(app).post('/api/vendor/deals')
    .set('Authorization', `Bearer ${token}`)
    .send({ title: 'Test deal', category: 'fashion', discount: '20% OFF', ...values });
}

beforeEach(async () => {
  await sequelize.sync({ force: true });
  jest.clearAllMocks();
});

afterAll(async () => {
  await sequelize.close();
});

describe('authentication and roles', () => {
  test('registers and logs in with a hashed password', async () => {
    const created = await request(app).post('/api/auth/register').send({
      name: 'Shopper', email: 'shopper@example.com', password: 'password123',
    });
    expect(created.status).toBe(200);
    const user = await models.User.findByPk(created.body.user.id);
    expect(user.password).not.toBe('password123');

    const login = await request(app).post('/api/auth/login').send({
      email: 'shopper@example.com', password: 'password123',
    });
    expect(login.status).toBe(200);
    expect(login.body.token).toBeTruthy();
  });

  test('rejects unauthenticated and non-vendor dashboard access', async () => {
    const shopper = await register();
    const unauthenticated = await request(app).get('/api/vendor/profile');
    expect(unauthenticated.status).toBe(401);
    const forbidden = await request(app).get('/api/vendor/dashboard-stats')
      .set('Authorization', `Bearer ${shopper.token}`);
    expect(forbidden.status).toBe(403);
  });

  test('applies the configured CORS origin and Helmet headers', async () => {
    const response = await request(app).get('/api/health').set('Origin', 'http://localhost:3000');
    expect(response.headers['access-control-allow-origin']).toBe('http://localhost:3000');
    expect(response.headers['x-content-type-options']).toBe('nosniff');
  });
});

test('Become a Vendor persists the profile and returns no password hash', async () => {
  const vendor = await registerVendor();
  expect(vendor.vendorResponse.status).toBe(201);
  const profile = await request(app).get('/api/vendor/profile')
    .set('Authorization', `Bearer ${vendor.token}`);
  expect(profile.status).toBe(200);
  expect(profile.body).toMatchObject({ storeName: 'Test Store', category: 'fashion', whatsapp: '2348012345678' });
  expect(profile.body.password).toBeUndefined();
  expect(await models.Vendor.count({ where: { userId: vendor.user.id } })).toBe(1);
  expect(await models.User.findByPk(vendor.user.id).then((user) => user.role)).toBe('vendor');
});

test('deal publishing requires an active unexpired subscription and respects its limit', async () => {
  const vendor = await registerVendor();
  expect((await createDeal(vendor.token)).status).toBe(403);
  const expired = await createSubscription(vendor.user.id, {
    currentPeriodEnd: new Date(Date.now() - 1000), maxDeals: -1,
  });
  expect((await createDeal(vendor.token)).status).toBe(403);
  await expired.reload();
  expect(expired.status).toBe('expired');

  await createSubscription(vendor.user.id, { maxDeals: 1 });
  expect((await createDeal(vendor.token)).status).toBe(201);
  expect((await createDeal(vendor.token, { title: 'Second deal' })).status).toBe(403);
});

test('Paystack verification checks owner, amount, currency, and single use', async () => {
  const vendor = await registerVendor();
  paystack.post.mockResolvedValue({ data: { status: true, data: {
    reference: 'pay-ref-1', access_code: 'access', authorization_url: 'https://pay.example.com',
  } } });
  const init = await request(app).post('/api/payment/initialize')
    .set('Authorization', `Bearer ${vendor.token}`)
    .send({ tier: 'basic', email: 'vendor@example.com' });
  expect(init.status).toBe(200);

  paystack.get.mockResolvedValue({ data: { status: true, data: {
    status: 'success', amount: 499900, currency: 'NGN',
    metadata: { userId: vendor.user.id, tier: 'basic' },
  } } });
  const verified = await request(app).post('/api/payment/verify')
    .set('Authorization', `Bearer ${vendor.token}`).send({ reference: 'pay-ref-1' });
  expect(verified.status).toBe(200);
  expect(await models.Subscription.count({ where: { userId: vendor.user.id } })).toBe(1);
  const replay = await request(app).post('/api/payment/verify')
    .set('Authorization', `Bearer ${vendor.token}`).send({ reference: 'pay-ref-1' });
  expect(replay.status).toBe(409);

  paystack.post.mockResolvedValue({ data: { status: true, data: { reference: 'pay-ref-2' } } });
  await request(app).post('/api/payment/initialize')
    .set('Authorization', `Bearer ${vendor.token}`).send({ tier: 'basic', email: 'vendor@example.com' });
  paystack.get.mockResolvedValue({ data: { status: true, data: {
    status: 'success', amount: 100, currency: 'NGN',
    metadata: { userId: vendor.user.id, tier: 'basic' },
  } } });
  const wrongAmount = await request(app).post('/api/payment/verify')
    .set('Authorization', `Bearer ${vendor.token}`).send({ reference: 'pay-ref-2' });
  expect(wrongAmount.status).toBe(400);
  const otherVendor = await registerVendor('other@example.com');
  const wrongOwner = await request(app).post('/api/payment/verify')
    .set('Authorization', `Bearer ${otherVendor.token}`).send({ reference: 'pay-ref-2' });
  expect(wrongOwner.status).toBe(404);
});

test('vendor deal CRUD is limited to its owner and persists dates/contact links', async () => {
  const owner = await registerVendor();
  const other = await registerVendor('other@example.com');
  await createSubscription(owner.user.id);
  await createSubscription(other.user.id);
  const created = await createDeal(owner.token, {
    startDate: '2026-10-01', expiryDate: '2026-10-20',
    contactLink: 'https://social.example.com/store',
  });
  expect(created.status).toBe(201);
  expect(created.body.deal.contactLink).toBe('https://social.example.com/store');
  expect(created.body.deal.startDate).toBeTruthy();

  const id = created.body.deal.id;
  const update = await request(app).put(`/api/vendor/deals/${id}`)
    .set('Authorization', `Bearer ${owner.token}`).send({ title: 'Updated deal', expiryDate: '2026-10-25' });
  expect(update.status).toBe(200);
  expect(update.body.deal.title).toBe('Updated deal');
  expect((await request(app).put(`/api/vendor/deals/${id}`)
    .set('Authorization', `Bearer ${other.token}`).send({ title: 'Nope' })).status).toBe(404);
  expect((await request(app).delete(`/api/vendor/deals/${id}`)
    .set('Authorization', `Bearer ${other.token}`)).status).toBe(404);
  expect((await request(app).delete(`/api/vendor/deals/${id}`)
    .set('Authorization', `Bearer ${owner.token}`)).status).toBe(200);
});

test('expiry status uses a three-day Expiring Soon threshold', () => {
  const now = new Date('2026-10-08T12:00:00Z');
  expect(getExpiryStatus(null, now)).toBe('Active');
  expect(getExpiryStatus('2026-10-08T11:00:00Z', now)).toBe('Expired');
  expect(getExpiryStatus('2026-10-10T12:00:00Z', now)).toBe('Expiring Soon');
  expect(getExpiryStatus('2026-10-12T12:00:01Z', now)).toBe('Active');
});

test('wishlist supports saving and removing SQLite deal IDs', async () => {
  const shopper = await register();
  const deal = await models.Deal.create({ title: 'Saved deal', category: 'other', discount: '10%' });
  const added = await request(app).post('/api/wishlist')
    .set('Authorization', `Bearer ${shopper.token}`).send({ dealId: deal.id });
  expect(added.status).toBe(201);
  const list = await request(app).get('/api/wishlist').set('Authorization', `Bearer ${shopper.token}`);
  expect(list.body[0].dealId).toBe(deal.id);
  const removed = await request(app).delete(`/api/wishlist/${added.body.id}`)
    .set('Authorization', `Bearer ${shopper.token}`);
  expect(removed.status).toBe(200);
  expect(await models.WishlistItem.count()).toBe(0);
});

test('authenticated shoppers can report an existing deal', async () => {
  const shopper = await register();
  const deal = await models.Deal.create({ title: 'Reportable', category: 'other', discount: '10%' });
  expect((await request(app).post(`/api/deals/${deal.id}/report`).send({ reason: 'spam' })).status).toBe(401);
  const response = await request(app).post(`/api/deals/${deal.id}/report`)
    .set('Authorization', `Bearer ${shopper.token}`).send({ reason: 'Misleading discount' });
  expect(response.status).toBe(201);
  expect(await models.Report.findOne({ where: { dealId: deal.id, userId: shopper.user.id } })).toMatchObject({
    reason: 'Misleading discount', status: 'pending',
  });
});

test('public deal listing supports search and joins safe vendor details with expiry status', async () => {
  const vendor = await registerVendor();
  await createSubscription(vendor.user.id);
  await createDeal(vendor.token, {
    title: 'Searchable clearance item',
    expiryDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  });
  const response = await request(app).get('/api/deals?q=clearance&sort=expiring');
  expect(response.status).toBe(200);
  expect(response.body).toHaveLength(1);
  expect(response.body[0]).toMatchObject({
    title: 'Searchable clearance item',
    expiryStatus: 'Expiring Soon',
    vendor: { storeName: 'Test Store' },
  });
  expect(response.body[0].vendor.password).toBeUndefined();
});

test('admin can suspend and reactivate a vendor without losing the vendor record', async () => {
  const admin = await models.User.create({
    name: 'Administrator', email: 'admin@example.com', password: 'hashed', role: 'admin',
  });
  const adminToken = signToken(admin);
  const vendor = await registerVendor();
  const deactivate = await request(app).post(`/api/admin/vendors/${vendor.user.id}/deactivate`)
    .set('Authorization', `Bearer ${adminToken}`);
  expect(deactivate.status).toBe(200);
  expect((await request(app).get('/api/vendor/profile')
    .set('Authorization', `Bearer ${vendor.token}`)).status).toBe(403);
  const listing = await request(app).get('/api/admin/vendors')
    .set('Authorization', `Bearer ${adminToken}`);
  expect(listing.body.vendors[0].subscriptionStatus).toBe('suspended');

  const activate = await request(app).post(`/api/admin/vendors/${vendor.user.id}/activate`)
    .set('Authorization', `Bearer ${adminToken}`);
  expect(activate.status).toBe(200);
  expect((await request(app).get('/api/vendor/profile')
    .set('Authorization', `Bearer ${vendor.token}`)).status).toBe(200);
});