/**
 * Agenda list interaction: open the shared service detail page on press,
 * keep confirm/decline on the list for pending assignments.
 */
function resolveAgendaItemInteraction(assignment) {
  const status = typeof assignment?.status === 'string' ? assignment.status : null;

  return {
    opensDetailOnPress: true,
    expandsInline: false,
    showConfirmDeclineOnList: status === 'pending',
    showStatusBadgeOnList: status === 'confirmed' || status === 'declined',
  };
}

module.exports = {
  resolveAgendaItemInteraction,
};
