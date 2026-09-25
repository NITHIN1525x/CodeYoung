export default function LoadingState({ label = 'Finding available class times…' }) {
  return (
    <div className="state-panel loading-panel" role="status" aria-live="polite">
      <span className="loading-spinner" aria-hidden="true" />
      <strong>{label}</strong>
      <span>Checking mentor schedules in their local time.</span>
    </div>
  )
}
