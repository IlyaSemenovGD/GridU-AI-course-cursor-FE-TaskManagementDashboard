/**
 * k6 smoke / light load against the local API (health + public routes).
 * Run with API listening on __ENV.BASE_URL (default http://127.0.0.1:5000).
 */
import http from 'k6/http'
import { check, sleep } from 'k6'

export const options = {
  vus: 3,
  duration: '20s',
  thresholds: {
    http_req_failed: ['rate<0.05'],
    http_req_duration: ['p(95)<800'],
  },
}

const base = __ENV.BASE_URL || 'http://127.0.0.1:5000'

export default function () {
  const health = http.get(`${base}/health`)
  check(health, {
    'health 200': (r) => r.status === 200,
  })
  const root = http.get(`${base}/`)
  check(root, {
    'root redirects or 200': (r) => r.status === 200 || r.status === 302 || r.status === 301,
  })
  sleep(0.3)
}
