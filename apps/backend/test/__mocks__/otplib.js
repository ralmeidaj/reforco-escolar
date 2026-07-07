// CJS shim for otplib — used in E2E tests to avoid ESM import of @scure/base
const authenticator = {
  generateSecret: () => 'TESTSECRET234567',
  keyuri: (user, service, secret) => `otpauth://totp/${service}:${user}?secret=${secret}`,
  check: (_token, _secret) => true,
  generate: (_secret) => '123456',
};

module.exports = { authenticator };
