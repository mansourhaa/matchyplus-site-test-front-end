// k6 smoke/load test for the staging API.
//
// Deliberately modest load: staging shares a 4-core host with Jenkins and the
// k3s control plane, so hammering it would measure the host's contention
// rather than the API's behaviour. The point here is to catch a deploy that is
// broken or badly slow, not to find the service's breaking point.
//
// Run:  k6 run -e API_BASE=http://api.staging.matchy.local k6-staging-smoke.js

import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Rate } from 'k6/metrics';

const API_BASE = __ENV.API_BASE || 'http://api.staging.matchy.local';

const failureRate = new Rate('failed_requests');

export const options = {
  stages: [
    { duration: '20s', target: 5 }, // ramp up
    { duration: '40s', target: 5 }, // hold
    { duration: '10s', target: 0 }, // ramp down
  ],
  thresholds: {
    // a breach marks the Jenkins stage unstable (see Jenkinsfile), it does
    // not fail the build.
    http_req_duration: ['p(95)<1500'],
    failed_requests: ['rate<0.05'],
    checks: ['rate>0.95'],
  },
};

export default function () {
  group('health', () => {
    const res = http.get(`${API_BASE}/api/v1/health`);
    const ok = check(res, {
      'health returns 200': (r) => r.status === 200,
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
    const ok = check(res, {
      'auth route responds': (r) => r.status > 0,
      'auth route does not 5xx': (r) => r.status < 500,
    });
    failureRate.add(!ok);
  });

  sleep(1);
}
