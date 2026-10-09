/** Temporary debug-mode logger — remove after fix verification. */
export function debugAgentLog(
  hypothesisId: string,
  location: string,
  message: string,
  data: Record<string, unknown> = {},
): void {
  const payload = {
    sessionId: '783e',
    hypothesisId,
    location,
    message,
    data,
    timestamp: Date.now(),
  }
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/783e', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '783e' },
    body: JSON.stringify(payload),
  }).catch(() => {})
  // #endregion
}
