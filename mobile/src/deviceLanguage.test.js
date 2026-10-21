const assert = require('assert');
const { resolveStartupLanguage } = require('./deviceLanguage');

assert.strictEqual(
  resolveStartupLanguage({ deviceLocaleTag: 'ro_RO' }),
  'ro'
);

assert.strictEqual(
  resolveStartupLanguage({ deviceLocaleTag: 'ro-RO' }),
  'ro'
);

assert.strictEqual(
  resolveStartupLanguage({ deviceLocaleTag: 'en_US' }),
  'en'
);

assert.strictEqual(
  resolveStartupLanguage({ deviceLocaleTag: 'es_ES' }),
  'es'
);

assert.strictEqual(
  resolveStartupLanguage({ deviceLocaleTag: 'fr_FR' }),
  'es'
);

assert.strictEqual(
  resolveStartupLanguage({ deviceLocaleTag: '' }),
  'es'
);

assert.strictEqual(
  resolveStartupLanguage({
    storedLanguage: 'es',
    languageSource: null,
    deviceLocaleTag: 'ro_RO',
  }),
  'ro'
);

assert.strictEqual(
  resolveStartupLanguage({
    storedLanguage: 'en',
    languageSource: 'user',
    deviceLocaleTag: 'ro_RO',
  }),
  'en'
);

assert.strictEqual(
  resolveStartupLanguage({
    storedLanguage: 'ro',
    languageSource: 'user',
    deviceLocaleTag: 'es_ES',
  }),
  'ro'
);

assert.strictEqual(
  resolveStartupLanguage({
    storedLanguage: 'xx',
    languageSource: 'user',
    deviceLocaleTag: 'ro_RO',
  }),
  'ro'
);

console.log('deviceLanguage.test.js passed');
