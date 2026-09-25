export default function SlotCard({ slot, selected, onSelect }) {
  const startsAt = Date.parse(slot.start_time_utc)
  const isPast = !Number.isFinite(startsAt) || startsAt <= Date.now()
  const unavailable = !slot.available || isPast
  return (
    <button type="button" className={`slot-card ${selected ? 'selected' : ''} ${unavailable ? 'unavailable' : ''}`}
      disabled={unavailable} onClick={() => onSelect(slot)} aria-pressed={selected}
      aria-label={unavailable ? `${slot.parent_local_display}, unavailable`
        : `${slot.parent_local_display}, ${slot.mentor_local_time} mentor local time, ${slot.available_mentor_count} mentors available`}>
      <span className="slot-times">
        <span className="slot-parent-time"><span className="slot-label">YOUR TIME</span><strong>{slot.parent_local_display}</strong></span>
        <span className="slot-mentor-time"><span className="slot-label">MENTOR’S LOCAL TIME</span><strong>{slot.mentor_local_time}</strong></span>
      </span>
      <span className="slot-footer">
        <span className={unavailable ? 'availability-count unavailable-count' : 'availability-count'}>
          <span className="availability-dot" />
          {unavailable ? 'Unavailable' : `${slot.available_mentor_count} ${slot.available_mentor_count === 1 ? 'mentor' : 'mentors'} available`}
        </span>
        <span className="slot-action">{unavailable ? 'Full' : selected ? 'Selected ✓' : 'Select'}</span>
      </span>
    </button>
  )
}
