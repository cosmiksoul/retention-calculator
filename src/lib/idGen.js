// Stable React keys for retention rows. Imported by both the session and
// subscription input layers so retention points share the same shape
// (`{id, t, percent}`) regardless of cadence.

let counter = 0
export const newPointId = () => `rp-${Date.now()}-${++counter}`
