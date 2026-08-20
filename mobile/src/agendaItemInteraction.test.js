const assert = require('assert');
const { resolveAgendaItemInteraction } = require('./agendaItemInteraction');

assert.deepStrictEqual(resolveAgendaItemInteraction({ status: 'pending' }), {
  opensDetailOnPress: true,
  expandsInline: false,
  showConfirmDeclineOnList: true,
  showStatusBadgeOnList: false,
});

assert.deepStrictEqual(resolveAgendaItemInteraction({ status: 'confirmed' }), {
  opensDetailOnPress: true,
  expandsInline: false,
  showConfirmDeclineOnList: false,
  showStatusBadgeOnList: true,
});

assert.deepStrictEqual(resolveAgendaItemInteraction({ status: 'declined' }), {
  opensDetailOnPress: true,
  expandsInline: false,
  showConfirmDeclineOnList: false,
  showStatusBadgeOnList: true,
});

assert.deepStrictEqual(resolveAgendaItemInteraction(null), {
  opensDetailOnPress: true,
  expandsInline: false,
  showConfirmDeclineOnList: false,
  showStatusBadgeOnList: false,
});

assert.deepStrictEqual(resolveAgendaItemInteraction({}), {
  opensDetailOnPress: true,
  expandsInline: false,
  showConfirmDeclineOnList: false,
  showStatusBadgeOnList: false,
});

console.log('agendaItemInteraction.test.js passed');
