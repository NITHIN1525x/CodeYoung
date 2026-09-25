import SlotCard from './SlotCard.jsx'

export default function SlotList({ slots, selectedSlot, onSelect }) {
  return (
    <div className="slots-grid">
      {slots.map((slot) => <SlotCard key={slot.start_time_utc} slot={slot}
        selected={selectedSlot?.start_time_utc === slot.start_time_utc} onSelect={onSelect} />)}
    </div>
  )
}
