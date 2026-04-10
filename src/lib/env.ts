/** Base URL for the Flask API (no trailing slash). */
export const API_BASE_URL = (
  import.meta.env.VITE_API_URL as string | undefined
)?.replace(/\/$/, '') ?? 'http://127.0.0.1:5000'
