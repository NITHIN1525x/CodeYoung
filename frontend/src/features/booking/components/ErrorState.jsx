export default function ErrorState({ title = 'We couldn’t load that just now.', message, onRetry }) {
  return (
    <div className="state-panel error-panel" role="alert">
      <span className="state-icon error-icon" aria-hidden="true">!</span>
      <strong>{title}</strong><span>{message}</span>
      {onRetry && <button className="text-button" type="button" onClick={onRetry}>Try again</button>}
    </div>
  )
}
