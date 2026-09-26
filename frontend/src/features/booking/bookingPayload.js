/** Pair a selected parent-local wall time with the currently confirmed IANA zone. */
export function createBookingPayload(parent, selectedSlot) {
  return {
    ...parent,
    selected_date: selectedSlot.parent_local_time.slice(0, 10),
    selected_time: selectedSlot.parent_local_time.slice(11, 16),
    fold: selectedSlot.fold,
  }
}
