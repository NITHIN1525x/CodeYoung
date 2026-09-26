export default function SlotCard({ slot, selected, onSelect }) {
  const startsAt = Date.parse(slot.start_time_utc)
  const isPast = !Number.isFinite(startsAt) || startsAt <= Date.now()
  const unavailable = !slot.available || isPast
  const mentorTimes = slot.mentor_local_times?.length ? slot.mentor_local_times : [slot.mentor_local_time]
  return (
    <button type="button" className={`slot-card ${selected ? 'selected' : ''} ${unavailable ? 'unavailable' : ''}`}
      disabled={unavailable} onClick={() => onSelect(slot)} aria-pressed={selected}
      aria-label={unavailable ? `${slot.parent_local_display}, unavailable`
        : `${slot.parent_local_display}, mentor local time varies by assigned mentor, ${slot.available_mentor_count} mentors available`}>
      <span className="slot-times">
        <span className="slot-parent-time"><span className="slot-label">YOUR TIME</span><strong>{slot.parent_local_display}</strong></span>
        <span className="slot-mentor-time"><span className="slot-label">MENTOR’S LOCAL TIME</span>
          <strong>{mentorTimes.length === 1 ? mentorTimes[0] : 'Varies by mentor location'}</strong>
          {mentorTimes.length > 1 && <small className="mentor-time-variants">
            {mentorTimes.slice(0, 3).join(' · ')}{mentorTimes.length > 3 ? ` · +${mentorTimes.length - 3} zones` : ''}
          </small>}
        </span>
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
