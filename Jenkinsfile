// CI only, no deploy - dev is a build/scan/test gate, not an environment.
// Job's SCM should be scoped to the dev branch (Branch Specifier: */dev).
// A push to any branch pings the githubPush() trigger, but this job always
// checks out and builds dev's own HEAD regardless of which branch fired it -
// harmless (just an occasional redundant no-op rebuild if dev hasn't
// actually changed), not incorrect.
// webhook-trigger-test: no functional change, just to confirm the GitHub
// webhook actually fires an automatic build on push.

pipeline {
  agent any

  triggers {
    githubPush()
  }

  options {
    timestamps()
    disableConcurrentBuilds()
  }

  environment {
    // matchy-<branch>-<build>, e.g. matchy-feature-jenkins-ci-dev-17. Slashes
    // in branch names aren't valid in Docker tags, so they become dashes.
    // BRANCH_NAME is what Multibranch jobs set; GIT_BRANCH (as
    // "origin/<branch>") is what a plain SCM-configured Pipeline job sets
    // instead - falls back to whichever is actually present.
    IMAGE_TAG = "matchy-${(env.BRANCH_NAME ?: (env.GIT_BRANCH ?: 'unknown').replaceFirst('^origin/', '')).replaceAll('/', '-')}-${env.BUILD_NUMBER}"
    REGISTRY_REPO = "mohamedazizaguir/dotit"
    SONAR_PROJECT = "matchyplus"
    SONAR_URL = "http://sonarqube:9000"
  }

  stages {
    stage('Prepare report dirs') {
      steps {
        sh 'mkdir -p reports/semgrep reports/trivy'
      }
    }

    stage('SAST - Semgrep') {
      // -u root: these images assume root-owned home/system dirs (semgrep
      // writes its cache to $HOME/.semgrep). Jenkins' Docker Pipeline plugin
      // runs the container as the host jenkins UID by default, which isn't
      // in the image's /etc/passwd and can't write there.
      // --config=auto pulls community rules for every language auto with
      // ~500+ rules including plenty of general code-quality/style checks -
      // that's SonarQube's job now (see the next two stages), so Semgrep is
      // scoped down to security-specific packs.
      //
      // Real root cause of the slow/inconsistent runs (measured directly):
      // registry fetch for the 3 packs below is only ~12s (timed standalone
      // against an empty dir) - not the bottleneck. The "60,104 files
      // tracked by git" Semgrep reported scanning was actually
      // .pnpm-store/ (pnpm's local package store, ~60,030 files) - an
      // untracked, un-gitignored directory at the repo root that a bare
      // `.` scan target with only node_modules/.next/dist/.turbo excluded
      // never caught. SonarQube's scoped apps/**,packages/** inclusion list
      // was never affected by this - same fix applied here: scan explicit
      // source dirs instead of "everything except a blacklist".
      // -v .../semgrep-cache:/root/.semgrep: harmless, but measured to give
      // no actual speedup (Semgrep OSS doesn't appear to persist fetched
      // rule content there) - kept since it doesn't hurt, not because it's
      // load-bearing.
      agent { docker { image 'returntocorp/semgrep:latest'; args '-u root -v /var/lib/jenkins/semgrep-cache:/root/.semgrep'; reuseNode true } }
      steps {
        sh '''
          mkdir -p reports/semgrep
          semgrep --config=p/security-audit --config=p/secrets --config=p/owasp-top-ten \
            --exclude node_modules --exclude .next --exclude dist --exclude .turbo \
            --json --output=reports/semgrep/semgrep-report.json \
            apps packages ci-scripts || true
          if [ ! -f reports/semgrep/semgrep-report.json ]; then
            echo "WARNING: semgrep produced no report - it likely failed outright (registry/network issue), not that it found 0 problems. Falling back to an empty report so the pipeline can continue." >&2
            echo '{"results":[],"errors":[]}' > reports/semgrep/semgrep-report.json
          fi
        '''
      }
      // Restore host-writable ownership before the container exits - any
      // file this stage created as root would otherwise poison the next
      // build's checkout ("Permission denied" trying to unlink it).
      post {
        always {
          sh 'chown -R "$(stat -c "%u:%g" .)" . 2>/dev/null || true'
        }
      }
    }

    stage('Lint & Test') {
      // -u root: corepack tries to symlink pnpm into /usr/local/bin,
      // root-owned - same UID-mismatch reason as the semgrep fix above.
      // node:22, not 18 (.nvmrc's stale pin): packages/database's postinstall
      // runs prisma generate, which requires() zeptomatch, an ESM-only module -
      // Node 18 can't require() ESM synchronously, Node 22 can. Matches the
      // NODE_VERSION the repo's own disabled .github/workflows/ci.yml used.
      // HUSKY=0 skips husky's git-dependent prepare hook outright, and the
      // rest of these env vars are the same dummy CI values that file used,
      // since apps/api/src/config.ts validates them at import time.
      agent { docker { image 'node:22-alpine'; args '-u root'; reuseNode true } }
      environment {
        HUSKY = '0'
        NODE_ENV = 'production'
        DATABASE_URL = 'postgresql://postgres:postgres@localhost:5432/ci?schema=public'
        NEXT_PUBLIC_API_URL = 'http://localhost:8000/api/v1'
        ACCESS_TOKEN_SECRET = 'ci-access-token-secret'
        ACCESS_TOKEN_TTL = '1d'
        COOKIE_SECRET = 'ci-cookie-secret'
        SERVER_PORT = '8000'
        SERVER_HOST = 'localhost'
      }
      steps {
        sh '''
          corepack enable
          corepack prepare pnpm@10.12.4 --activate
          pnpm install --frozen-lockfile
          pnpm lint
          pnpm test -- --coverage
        '''
      }
      post {
        always {
          sh 'chown -R "$(stat -c "%u:%g" .)" . 2>/dev/null || true'
        }
      }
    }

    // apps/ai's own pnpm test/lint wrap a python venv and skip silently if
    // it's not there - running pytest directly so this is a real check.
    // Runs before SonarQube Analysis, not after: it needs to produce
    // apps/ai/coverage.xml (pytest-cov, configured via apps/ai/pytest.ini's
    // addopts) before the scanner picks it up - same ordering bug as the
    // JS/TS coverage fix applied to this stage too.
    stage('AI service tests') {
      // -u root: pip install (no --user/venv) writes to root-owned
      // site-packages - same UID-mismatch reason as the two stages above.
      agent { docker { image 'python:3.12-slim'; args '-u root'; reuseNode true } }
      steps {
        sh '''
          pip install --no-cache-dir -r apps/ai/requirements.txt -r apps/ai/requirements-dev.txt
          cd apps/ai && python -m pytest -q
        '''
      }
      post {
        always {
          sh 'chown -R "$(stat -c "%u:%g" .)" . 2>/dev/null || true'
        }
      }
    }

    // Mirrors the old Matchy platform's SonarQube integration
    // (Deployment/jenkins/Jenkinsfile) - same Jenkins SonarQube server
    // config ('sonarqube-local'), same sonarqube-token credential, same
    // docker_devsecops network the sonarqube container is already on.
    // Runs after Lint & Test and AI service tests, not before: it needs
    // apps/api and apps/app's coverage/lcov.info files, plus
    // apps/ai/coverage.xml, which those stages produce (a stage-ordering
    // bug in the first version of this had SonarQube running before those
    // files existed at all - "No LCOV files were found").
    stage('SonarQube Analysis') {
      options { timeout(time: 20, unit: 'MINUTES') }
      steps {
        withSonarQubeEnv('sonarqube-local') {
          script {
            env.SONAR_TOKEN_CAPTURED = env.SONAR_AUTH_TOKEN
          }
          sh '''
            set -eu
            rm -rf "$WORKSPACE/.scannerwork" "$WORKSPACE/reports/sonarqube"
            mkdir -p "$WORKSPACE/.scannerwork" "$WORKSPACE/reports/sonarqube"
            chmod 777 "$WORKSPACE/.scannerwork" "$WORKSPACE/reports/sonarqube"

            CONTAINER_NAME="sonar-scanner-$BUILD_NUMBER"

            docker run \
              --name "$CONTAINER_NAME" \
              --network docker_devsecops \
              --user "$(id -u):$(id -g)" \
              -v "$WORKSPACE:/usr/src" \
              -e "SONAR_USER_HOME=/usr/src/.sonar_cache" \
              -e "SONAR_PROJECT=$SONAR_PROJECT" \
              -e "BUILD_NUMBER=$BUILD_NUMBER" \
              -e "SONAR_URL=$SONAR_URL" \
              -e "SONAR_AUTH_TOKEN=$SONAR_AUTH_TOKEN" \
              sonarsource/sonar-scanner-cli:latest \
              -Dsonar.projectKey="$SONAR_PROJECT" \
              -Dsonar.projectName=MatchyPlus \
              -Dsonar.projectVersion="$BUILD_NUMBER" \
              -Dsonar.projectBaseDir=/usr/src \
              -Dsonar.sources=. \
              -Dsonar.inclusions=apps/**,packages/** \
              -Dsonar.scm.disabled=true \
              -Dsonar.sourceEncoding=UTF-8 \
              -Dsonar.javascript.file.suffixes=.js,.jsx \
              -Dsonar.typescript.file.suffixes=.ts,.tsx \
              -Dsonar.python.file.suffixes=.py \
              -Dsonar.javascript.lcov.reportPaths=apps/api/coverage/lcov.info,apps/app/coverage/lcov.info \
              -Dsonar.typescript.lcov.reportPaths=apps/api/coverage/lcov.info,apps/app/coverage/lcov.info \
              -Dsonar.python.coverage.reportPaths=apps/ai/coverage.xml \
              -Dsonar.host.url="$SONAR_URL" \
              -Dsonar.login="$SONAR_AUTH_TOKEN" \
              -Dsonar.working.directory=/usr/src/.scannerwork \
              -Dsonar.exclusions=**/*.json,**/node_modules/**,**/.scannerwork/**,**/reports/**,**/dist/**,**/.next/**,**/generated/**,**/coverage/** \
              2>&1 | tee "$WORKSPACE/reports/sonarqube/sonar-scanner.log" || SCANNER_EXIT=$?

            SCANNER_EXIT=${SCANNER_EXIT:-0}

            CE_TASK_ID=$(grep 'api/ce/task?id=' "$WORKSPACE/reports/sonarqube/sonar-scanner.log" | sed 's|.*api/ce/task?id=||;s|[^A-Za-z0-9_-].*||' | head -1)

            if [ -n "$CE_TASK_ID" ]; then
              echo "ceTaskId=$CE_TASK_ID" > "$WORKSPACE/reports/sonarqube/report-task.txt"
              echo "serverUrl=$SONAR_URL" >> "$WORKSPACE/reports/sonarqube/report-task.txt"
              echo "dashboardUrl=$SONAR_URL/dashboard?id=$SONAR_PROJECT" >> "$WORKSPACE/reports/sonarqube/report-task.txt"
              echo "projectKey=$SONAR_PROJECT" >> "$WORKSPACE/reports/sonarqube/report-task.txt"
            fi

            docker rm -f "$CONTAINER_NAME" >/dev/null 2>&1 || true

            if [ "$SCANNER_EXIT" -ne 0 ]; then
              exit $SCANNER_EXIT
            fi
          '''
        }
      }
      post {
        always {
          archiveArtifacts artifacts: 'reports/sonarqube/**', allowEmptyArchive: true
        }
      }
    }

    stage('Quality Gate') {
      steps {
        script {
          def token = env.SONAR_TOKEN_CAPTURED
          def sonarUrl = env.SONAR_URL
          def projectKey = env.SONAR_PROJECT

          def ceTaskId = sh(
            returnStdout: true,
            script: 'grep "^ceTaskId=" "$WORKSPACE/reports/sonarqube/report-task.txt" | cut -d= -f2'
          ).trim()

          if (!ceTaskId) {
            error "Could not find ceTaskId in report-task.txt - was the scanner run copied correctly?"
          }

          def ceStatus = ''
          for (int i = 0; i < 30; i++) {
            def ceResponse = sh(
              returnStdout: true,
              script: """
                docker run --rm --network docker_devsecops curlimages/curl:latest \
                  curl -s --max-time 30 -u "${token}:" "${sonarUrl}/api/ce/task?id=${ceTaskId}"
              """
            ).trim()
            def ceJson = readJSON text: ceResponse
            ceStatus = ceJson?.task?.status ?: 'UNKNOWN'
            echo "  [CE Task] status=${ceStatus} (attempt ${i + 1}/30)"
            if (ceStatus == 'SUCCESS' || ceStatus == 'FAILED' || ceStatus == 'CANCELED') {
              break
            }
            sleep(time: 5, unit: 'SECONDS')
          }

          if (ceStatus != 'SUCCESS') {
            error "SonarQube Compute Engine task did not succeed (status: ${ceStatus})"
          }

          def qgResponse = sh(
            returnStdout: true,
            script: """
              docker run --rm --network docker_devsecops curlimages/curl:latest \
                curl -s --max-time 30 -u "${token}:" "${sonarUrl}/api/qualitygates/project_status?projectKey=${projectKey}"
            """
          ).trim()

          if (!qgResponse) {
            error "Quality Gate returned empty response"
          }

          def qgJson = readJSON text: qgResponse
          def qgStatus = qgJson?.projectStatus?.status ?: 'UNKNOWN'

          if (qgStatus == 'ERROR') {
            error "Quality Gate FAILED - see ${sonarUrl}/dashboard?id=${projectKey}"
          } else if (qgStatus != 'OK') {
            error "Quality Gate returned unexpected status: ${qgStatus}"
          }

          echo "Quality Gate PASSED"
        }
      }
    }

    stage('Build images') {
      steps {
        sh """
          docker build --pull -t ${REGISTRY_REPO}:api-${IMAGE_TAG} -f apps/api/Dockerfile .
          docker build --pull -t ${REGISTRY_REPO}:app-${IMAGE_TAG} -f apps/app/Dockerfile .
          docker build --pull -t ${REGISTRY_REPO}:ai-${IMAGE_TAG} -f apps/ai/Dockerfile apps/ai
        """
      }
    }

    stage('Trivy scan') {
      steps {
        sh """
          mkdir -p reports/trivy
          docker run --rm -v /var/run/docker.sock:/var/run/docker.sock aquasec/trivy:latest image --exit-code 0 --severity CRITICAL --ignore-unfixed --format json ${REGISTRY_REPO}:api-${IMAGE_TAG} > reports/trivy/trivy-api-report.json
          docker run --rm -v /var/run/docker.sock:/var/run/docker.sock aquasec/trivy:latest image --exit-code 0 --severity CRITICAL --ignore-unfixed --format json ${REGISTRY_REPO}:app-${IMAGE_TAG} > reports/trivy/trivy-app-report.json
          docker run --rm -v /var/run/docker.sock:/var/run/docker.sock aquasec/trivy:latest image --exit-code 0 --severity CRITICAL --ignore-unfixed --format json ${REGISTRY_REPO}:ai-${IMAGE_TAG} > reports/trivy/trivy-ai-report.json
        """
      }
    }

    stage('Push images') {
      steps {
        withCredentials([usernamePassword(credentialsId: 'registry-creds', usernameVariable: 'REG_USER', passwordVariable: 'REG_PASS')]) {
          sh """
            echo "\$REG_PASS" | docker login -u "\$REG_USER" --password-stdin
            docker push ${REGISTRY_REPO}:api-${IMAGE_TAG}
            docker push ${REGISTRY_REPO}:app-${IMAGE_TAG}
            docker push ${REGISTRY_REPO}:ai-${IMAGE_TAG}
          """
        }
      }
    }

    stage('Cosign sign') {
      steps {
        withCredentials([
          file(credentialsId: 'cosign-private-key', variable: 'COSIGN_KEY_FILE'),
          string(credentialsId: 'cosign-key-password', variable: 'COSIGN_PASSWORD')
        ]) {
          // Single-quoted, not Groovy-interpolated ("""...""") like the rest
          // of this file's sh blocks - Jenkins flags any sh step inside
          // withCredentials that uses a GString as insecure, since it can't
          // statically verify every reference in it is properly deferred to
          // the shell. REGISTRY_REPO/IMAGE_TAG are already real env vars
          // (declared in environment {}), so plain $VAR here works the same
          // as ${...} did, without the warning.
          sh '''
            command -v cosign >/dev/null 2>&1 || { curl -sL -o /tmp/cosign https://github.com/sigstore/cosign/releases/latest/download/cosign-linux-amd64 && chmod +x /tmp/cosign; }
            COSIGN_BIN=$(command -v cosign || echo /tmp/cosign)
            "$COSIGN_BIN" sign --key "$COSIGN_KEY_FILE" --yes $REGISTRY_REPO:api-$IMAGE_TAG
            "$COSIGN_BIN" sign --key "$COSIGN_KEY_FILE" --yes $REGISTRY_REPO:app-$IMAGE_TAG
            "$COSIGN_BIN" sign --key "$COSIGN_KEY_FILE" --yes $REGISTRY_REPO:ai-$IMAGE_TAG
          '''
        }
      }
    }

    stage('Publish report') {
      steps {
        sh 'python3 ci-scripts/generate_report.py --type dev --dest reports/final'
        publishHTML(target: [
          reportDir: 'reports/final',
          reportFiles: 'report.html',
          reportName: 'Matchy+ Dev Build Report',
          keepAll: true,
          alwaysLinkToLastBuild: true
        ])
        archiveArtifacts artifacts: 'reports/final/**', allowEmptyArchive: true
      }
    }
  }

  post {
    always {
      sh "docker rmi ${REGISTRY_REPO}:api-${IMAGE_TAG} ${REGISTRY_REPO}:app-${IMAGE_TAG} ${REGISTRY_REPO}:ai-${IMAGE_TAG} || true"
    }
  }
}
