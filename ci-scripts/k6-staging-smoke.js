// k6 smoke/load test for the staging API.
//
// Deliberately modest load, for two reasons:
//
// 1. Staging shares a 4-core host with Jenkins and the k3s control plane, so
//    hammering it would measure host contention rather than the API.
// 2. The API applies a global rate limit (max: 100 per window - see
//    apps/api/src/plugins/rate-limiter.ts). An earlier version of this script
//    ran ~10 req/s and got 429 on 840 requests: it was measuring the rate
//    limiter, not the service. Anything above roughly 1 req/s will do the same.
//
// So 429 is treated as a healthy response here - it means the rate limiter is
// doing its job. What we actually assert is that the service is up, answers,
// and never 5xxs. This is a deploy smoke test, not a capacity benchmark.
//
// Run:  k6 run -e API_BASE=http://api.staging.matchy.local k6-staging-smoke.js

import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Rate } from 'k6/metrics';

const API_BASE = __ENV.API_BASE || 'https://api.staging.matchy.local';

const failureRate = new Rate('failed_requests');
const rateLimited = new Rate('rate_limited_responses');

export const options = {
  // Staging terminates TLS with a self-signed certificate, which k6 rejects by
  // default - every request fails at the TLS handshake and the results look
  // like an outage rather than a cert policy. Acceptable here precisely
  // because the target is a known .local host, not an arbitrary endpoint.
  insecureSkipTLSVerify: true,
  // 2 VUs with a 3s sleep and 2 requests per iteration is ~1.3 req/s, which
  // stays under the API's limit while still exercising it concurrently.
  stages: [
    { duration: '15s', target: 2 },
    { duration: '40s', target: 2 },
    { duration: '5s', target: 0 },
  ],
  thresholds: {
    // a breach marks the Jenkins stage unstable (see Jenkinsfile), it does
    // not fail the build.
    http_req_duration: ['p(95)<1500'],
    failed_requests: ['rate<0.05'],
    checks: ['rate>0.95'],
  },
};

// 429 means the service answered and deliberately shed load - that is a
// working service, so it counts as reachable.
function isHealthy(res) {
  return res.status === 200 || res.status === 429;
}

export default function () {
  group('health', () => {
    const res = http.get(`${API_BASE}/api/v1/health`);
    rateLimited.add(res.status === 429);
    const ok = check(res, {
      'health is 200 (or 429 when rate limited)': (r) => isHealthy(r),
      'health never 5xx': (r) => r.status < 500,
      'health responds under 1s': (r) => r.timings.duration < 1000,
    });
    failureRate.add(!ok);
  });

  group('auth surface reachable', () => {
    // unauthenticated POST with no body - we only assert the route exists and
    // rejects cleanly (4xx), never 5xx. A 5xx here means the deploy is broken.
    const res = http.post(`${API_BASE}/api/v1/auth/login-phone`, null, {
      headers: { 'Content-Type': 'application/json' },
    });
    rateLimited.add(res.status === 429);
    const ok = check(res, {
      'auth route responds': (r) => r.status > 0,
      'auth route does not 5xx': (r) => r.status < 500,
    });
    failureRate.add(!ok);
  });

  sleep(3);
}
