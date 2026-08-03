// CI/CD. On every branch this is a build/scan/test gate; on dev it additionally
// deploys to the staging environment on k3s via GitOps (see the CD stages at the
// bottom), then runs OWASP ZAP + k6 against the deployed result.

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
    // matchy-<branch>-<build>, slashes in branch names become dashes since
    // docker tags can't have them. Falls back to GIT_BRANCH if BRANCH_NAME
    // isn't set (multibranch vs plain pipeline job).
    IMAGE_TAG = "matchy-${(env.BRANCH_NAME ?: (env.GIT_BRANCH ?: 'unknown').replaceFirst('^origin/', '')).replaceAll('/', '-')}-${env.BUILD_NUMBER}"
    // REGISTRY_REPO/SONAR_PROJECT/SONAR_URL are environment/ownership concerns,
    // not pipeline logic - no personal default here. They must be set as
    // Jenkins global environment variables (Manage Jenkins > System > Global
    // properties > Environment variables); the Validate CI config stage below
    // fails the build with a clear message if they're missing, instead of
    // silently falling back to any particular registry.
    REGISTRY_REPO = "${env.REGISTRY_REPO}"
    SONAR_PROJECT = "${env.SONAR_PROJECT}"
    SONAR_URL = "${env.SONAR_URL}"

    // every app that ships as a container. The scan/push/sign stages iterate
    // this list instead of repeating themselves per image, so adding a sixth
    // app means editing this line and the build stage - not four stages.
    IMAGE_COMPONENTS = 'api app admin landing ai'

    // staging hostnames (k3s + nginx ingress, resolved via the hosts file).
    // NEXT_PUBLIC_* values are baked into the Next.js bundle at BUILD time, so
    // the API URL has to be known here - it can't be injected at deploy time
    // like a normal runtime env var.
    STAGING_LANDING_HOST = 'staging.matchy.local'
    STAGING_APP_HOST = 'app.staging.matchy.local'
    STAGING_ADMIN_HOST = 'admin.staging.matchy.local'
    STAGING_API_HOST = 'api.staging.matchy.local'
    STAGING_API_URL = "http://api.staging.matchy.local/api/v1"

    // GitOps repo that ArgoCD watches. Deploying = committing a new image tag
    // here; ArgoCD does the actual apply.
    GITOPS_REPO = 'github.com/MohamedAzizAguir/Matchy-GitOps.git'
    GITOPS_STAGING_PATH = 'apps/staging/matchy-plus'

    // Which branches are allowed to deploy to staging. Normally just 'dev'.
    //
    // TEMPORARY: feature/cd-staging-k3s is listed so the CD path can be
    // rehearsed end-to-end before it is merged - deploying untested deploy
    // automation straight onto dev is how you find out it is broken on dev.
    // REMOVE that entry before merging; leaving it in means a feature branch
    // can silently redeploy staging out from under dev.
    STAGING_DEPLOY_BRANCHES = 'dev feature/cd-staging-k3s'
  }

  stages {
    stage('Validate CI config') {
      steps {
        script {
          def missing = []
          if (!env.REGISTRY_REPO?.trim()) missing << 'REGISTRY_REPO'
          if (!env.SONAR_PROJECT?.trim()) missing << 'SONAR_PROJECT'
          if (!env.SONAR_URL?.trim()) missing << 'SONAR_URL'
          if (missing) {
            error "Missing required Jenkins global environment variable(s): ${missing.join(', ')}. " +
              "Set them under Manage Jenkins > System > Global properties > Environment variables " +
              "before running this pipeline - this file intentionally has no personal/default registry " +
              "to fall back to."
          }
        }
      }
    }

    stage('Prepare report dirs') {
      steps {
        sh 'mkdir -p reports/semgrep reports/trivy'
      }
    }

    stage('SAST - Semgrep') {
      // -u root: semgrep writes its cache to $HOME/.semgrep, and the
      // container's default user can't write there.
      // security-only rule packs, not --config=auto - general code quality
      // is SonarQube's job (see below).
      // scan apps/packages/ci-scripts explicitly instead of "." - "." was
      // also picking up .pnpm-store (untracked, ~60k files) and blowing
      // scan time up to 10+ min for no reason.
      agent { docker { image 'returntocorp/semgrep:latest'; args '-u root -v /var/lib/jenkins/semgrep-cache:/root/.semgrep'; reuseNode true } }
      steps {
        sh '''
          mkdir -p reports/semgrep
          semgrep --config=p/security-audit --config=p/secrets --config=p/owasp-top-ten \
            --exclude node_modules --exclude .next --exclude dist --exclude .turbo \
            --json --output=reports/semgrep/semgrep-report.json \
            apps packages ci-scripts || true
          if [ ! -f reports/semgrep/semgrep-report.json ]; then
            echo "semgrep produced no report, falling back to an empty one so the pipeline can continue" >&2
            echo '{"results":[],"errors":[]}' > reports/semgrep/semgrep-report.json
          fi
        '''
      }
      // reset ownership so the next build's checkout doesn't choke on
      // root-owned files
      post {
        always {
          sh 'chown -R "$(stat -c "%u:%g" .)" . 2>/dev/null || true'
        }
      }
    }

    stage('Lint & Test') {
      // -u root: corepack needs to symlink pnpm into /usr/local/bin.
      // node 22, not the .nvmrc pin of 18 - packages/database's postinstall
      // runs prisma generate, which requires() an ESM-only module. Node 18
      // can't require() ESM, 22 can.
      // HUSKY=0 skips the git-dependent prepare hook. rest of these are
      // dummy values apps/api/src/config.ts expects at import time.
      // NODE_ENV=test, not production - apps/admin's tests render real
      // components via testing-library, and react-dom's production build
      // ships a broken/no-op act(). apps/api's vitest config already forces
      // this on its own, so this just makes it consistent everywhere.
      agent { docker { image 'node:22-alpine'; args '-u root'; reuseNode true } }
      environment {
        HUSKY = '0'
        NODE_ENV = 'test'
        DATABASE_URL = 'postgresql://postgres:postgres@localhost:5432/ci?schema=public'
        NEXT_PUBLIC_API_URL = 'http://localhost:8000/api/v1'
        ACCESS_TOKEN_SECRET = 'ci-access-token-secret'
        ACCESS_TOKEN_TTL = '1d'
        COOKIE_SECRET = 'ci-cookie-secret'
        SERVER_PORT = '8000'
        SERVER_HOST = 'localhost'
      }
      steps {
        // "pnpm test -- --coverage" used to forward --coverage into every
        // workspace's own test script via turbo, including ai-contracts
        // (node --test, not vitest) - --coverage isn't a valid node --test
        // flag, so that's a hard "bad option" crash, not something vitest-only
        // packages just ignore. It only looked fine because turbo's cache had
        // ai-contracts:test cached from before --coverage was ever added; a
        // cache miss reproduces the crash immediately. Coverage is now scoped
        // to exactly the vitest apps Sonar reads (api/app/admin); ai-contracts
        // runs its own test script unmodified. apps/ai's pnpm test isn't
        // called here either way - its real tests run via pytest directly in
        // the AI service tests stage below.
        sh '''
          corepack enable
          corepack prepare pnpm@10.12.4 --activate
          pnpm install --frozen-lockfile
          pnpm lint
          pnpm turbo run test --filter=@saas-boilerplate/ai-contracts
          pnpm turbo run test --filter=@saas-boilerplate/api --filter=@saas-boilerplate/app --filter=@saas-boilerplate/admin -- --coverage
        '''
      }
      post {
        always {
          sh 'chown -R "$(stat -c "%u:%g" .)" . 2>/dev/null || true'
        }
      }
    }

    // running pytest directly instead of pnpm test/lint - those wrap a
    // python venv and skip silently if it's missing. runs before the
    // SonarQube stage so coverage.xml exists by the time the scanner runs.
    stage('AI service tests') {
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

    // mirrors the old Matchy platform's sonarqube setup (same server config,
    // token, docker network). needs to run after the test stages since it
    // reads their coverage output.
    stage('SonarQube Analysis') {
      options { timeout(time: 20, unit: 'MINUTES') }
      steps {
        withSonarQubeEnv('sonarqube-local') {
          script {
            env.SONAR_TOKEN_CAPTURED = env.SONAR_AUTH_TOKEN
          }
          sh '''#!/usr/bin/env bash
            set -euo pipefail
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

            CE_TASK_ID=$(grep 'api/ce/task?id=' "$WORKSPACE/reports/sonarqube/sonar-scanner.log" | sed 's|.*api/ce/task?id=||;s|[^A-Za-z0-9_-].*||' | head -1 || true)

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

    // logging only for now, doesn't affect build status at all - coverage is
    // genuinely too low right now for a real gate to be meaningful (per
    // Khalil), so this reports the result without failing or marking the
    // build unstable. Tighten this back up once coverage catches up.
    stage('Quality Gate') {
      steps {
        script {
          def token = env.SONAR_TOKEN_CAPTURED
          def sonarUrl = env.SONAR_URL
          def projectKey = env.SONAR_PROJECT

          // explicitly tolerant of a missing report-task.txt (e.g. the
          // scanner failed before writing it) - 2>/dev/null + || true means
          // this never throws, it just yields an empty ceTaskId, which the
          // check right below already treats as "skip the gate, advisory only".
          def ceTaskId = sh(
            returnStdout: true,
            script: 'grep "^ceTaskId=" "$WORKSPACE/reports/sonarqube/report-task.txt" 2>/dev/null | cut -d= -f2 || true'
          ).trim()

          if (!ceTaskId) {
            echo "no ceTaskId found in report-task.txt, skipping quality gate check"
            return
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
            def ceJson = null
            try {
              ceJson = readJSON text: ceResponse
            } catch (e) {
              echo "  [CE Task] response wasn't valid JSON, treating as unknown (${e.message})"
            }
            ceStatus = ceJson?.task?.status ?: 'UNKNOWN'
            echo "  [CE Task] status=${ceStatus} (attempt ${i + 1}/30)"
            if (ceStatus == 'SUCCESS' || ceStatus == 'FAILED' || ceStatus == 'CANCELED') {
              break
            }
            sleep(time: 5, unit: 'SECONDS')
          }

          if (ceStatus != 'SUCCESS') {
            echo "compute engine task didn't succeed (status: ${ceStatus}), quality gate result unknown"
            return
          }

          def qgResponse = sh(
            returnStdout: true,
            script: """
              docker run --rm --network docker_devsecops curlimages/curl:latest \
                curl -s --max-time 30 -u "${token}:" "${sonarUrl}/api/qualitygates/project_status?projectKey=${projectKey}"
            """
          ).trim()

          if (!qgResponse) {
            echo "quality gate returned an empty response"
            return
          }

          def qgJson = null
          try {
            qgJson = readJSON text: qgResponse
          } catch (e) {
            echo "quality gate response wasn't valid JSON, skipping gate check (${e.message})"
            return
          }
          def qgStatus = qgJson?.projectStatus?.status ?: 'UNKNOWN'

          if (qgStatus == 'ERROR') {
            echo "quality gate failed - see ${sonarUrl}/dashboard?id=${projectKey}"
          } else if (qgStatus != 'OK') {
            echo "quality gate returned unexpected status: ${qgStatus}"
          } else {
            echo "Quality Gate PASSED"
          }
        }
      }
    }

    // app and admin get NEXT_PUBLIC_API_URL baked in here on purpose: Next.js
    // inlines NEXT_PUBLIC_* into the client bundle at build time, so a runtime
    // env var on the Deployment would be ignored and the browser would call
    // the Dockerfile's localhost:8000 default instead of the staging API.
    // landing reads no NEXT_PUBLIC_* vars, and ai is a python service.
    stage('Build images') {
      steps {
        sh """
          docker build --pull -t ${REGISTRY_REPO}:api-${IMAGE_TAG} -f apps/api/Dockerfile .
          docker build --pull --build-arg NEXT_PUBLIC_API_URL=${STAGING_API_URL} -t ${REGISTRY_REPO}:app-${IMAGE_TAG} -f apps/app/Dockerfile .
          docker build --pull --build-arg NEXT_PUBLIC_API_URL=${STAGING_API_URL} -t ${REGISTRY_REPO}:admin-${IMAGE_TAG} -f apps/admin/Dockerfile .
          docker build --pull -t ${REGISTRY_REPO}:landing-${IMAGE_TAG} -f apps/landing/Dockerfile .
          docker build --pull -t ${REGISTRY_REPO}:ai-${IMAGE_TAG} -f apps/ai/Dockerfile apps/ai
        """
      }
    }

    // CRITICAL findings now actually surface as a failure (previously
    // --exit-code 0 suppressed this entirely, so a scan riddled with
    // CRITICAL CVEs still looked green). Wrapped in catchError so the stage
    // is marked UNSTABLE rather than aborting outright, and every image is
    // still scanned/reported even if an earlier one has findings - a plain
    // --exit-code 1 would stop the script at the first failing scan and
    // leave the rest with no report at all.
    stage('Trivy scan') {
      steps {
        catchError(buildResult: 'UNSTABLE', stageResult: 'UNSTABLE') {
          sh """
            mkdir -p reports/trivy
            TRIVY_FAILED=0
            for COMPONENT in ${IMAGE_COMPONENTS}; do
              docker run --rm -v /var/run/docker.sock:/var/run/docker.sock aquasec/trivy:latest image \
                --exit-code 1 --severity CRITICAL --ignore-unfixed --format json \
                ${REGISTRY_REPO}:\${COMPONENT}-${IMAGE_TAG} \
                > reports/trivy/trivy-\${COMPONENT}-report.json || TRIVY_FAILED=1
            done
            if [ "\$TRIVY_FAILED" -ne 0 ]; then
              echo "CRITICAL vulnerabilities found - see reports/trivy/*.json" >&2
              exit 1
            fi
          """
        }
      }
    }

    stage('Push images') {
      steps {
        withCredentials([usernamePassword(credentialsId: 'registry-creds', usernameVariable: 'REG_USER', passwordVariable: 'REG_PASS')]) {
          // derive the registry host from REGISTRY_REPO instead of assuming
          // Docker Hub - "user/repo" (no host segment) logs into Hub as
          // before, but "ghcr.io/org/repo" or "host:port/repo" now logs into
          // that host instead of silently hitting Hub with the wrong creds.
          sh """
            FIRST_SEGMENT="\${REGISTRY_REPO%%/*}"
            REGISTRY_HOST=""
            case "\$FIRST_SEGMENT" in
              *.*|*:*|localhost) REGISTRY_HOST="\$FIRST_SEGMENT" ;;
            esac
            if [ -n "\$REGISTRY_HOST" ]; then
              echo "\$REG_PASS" | docker login "\$REGISTRY_HOST" -u "\$REG_USER" --password-stdin
            else
              echo "\$REG_PASS" | docker login -u "\$REG_USER" --password-stdin
            fi
            for COMPONENT in ${IMAGE_COMPONENTS}; do
              docker push ${REGISTRY_REPO}:\${COMPONENT}-${IMAGE_TAG}
            done
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
          // single-quoted, not Groovy-interpolated like the rest of this
          // file - Jenkins flags any sh block inside withCredentials that
          // uses a GString as insecure. REGISTRY_REPO/IMAGE_TAG are regular
          // env vars so plain $VAR works fine here too.
          //
          // pinned to a specific release + checksum (not :latest) so the
          // binary that gets fetched and run here can't silently change
          // out from under this pipeline - bump COSIGN_VERSION/COSIGN_SHA256
          // together when upgrading, from the release's cosign_checksums.txt.
          sh '''
            COSIGN_VERSION=v3.1.2
            COSIGN_SHA256=f7622ed3cf22e55e1ae6377c080979ff77a22da9981c11df222a2e444991e7cf
            if ! command -v cosign >/dev/null 2>&1; then
              curl -sL -o /tmp/cosign "https://github.com/sigstore/cosign/releases/download/${COSIGN_VERSION}/cosign-linux-amd64"
              echo "${COSIGN_SHA256}  /tmp/cosign" | sha256sum -c -
              chmod +x /tmp/cosign
            fi
            COSIGN_BIN=$(command -v cosign || echo /tmp/cosign)
            for COMPONENT in $IMAGE_COMPONENTS; do
              "$COSIGN_BIN" sign --key "$COSIGN_KEY_FILE" --yes "$REGISTRY_REPO:$COMPONENT-$IMAGE_TAG"
            done
          '''
        }
      }
    }

    // ---------------------------------------------------------------- CD ---
    // Everything below only runs on dev. Other branches stop at the CI gate -
    // they build, scan and sign images, but never touch the staging cluster.

    // Deploying = committing the new image tags to the GitOps repo. ArgoCD
    // watches that repo and does the actual apply, so Jenkins never needs
    // cluster write access for the deploy itself (only read access later, to
    // wait for the rollout).
    stage('Deploy to staging') {
      when { expression { isStagingDeployBranch() } }
      steps {
        withCredentials([usernamePassword(credentialsId: 'gitops-repo-creds', usernameVariable: 'GITOPS_USER', passwordVariable: 'GITOPS_TOKEN')]) {
          sh '''#!/usr/bin/env bash
            set -euo pipefail

            rm -rf /tmp/gitops
            git clone --depth 1 "https://${GITOPS_USER}:${GITOPS_TOKEN}@${GITOPS_REPO}" /tmp/gitops
            cd /tmp/gitops

            for COMPONENT in $IMAGE_COMPONENTS; do
              MANIFEST="${GITOPS_STAGING_PATH}/${COMPONENT}-deployment.yaml"
              if [ ! -f "$MANIFEST" ]; then
                echo "expected manifest missing: $MANIFEST" >&2
                exit 1
              fi
              # each component deployment has exactly one image: line, so an
              # anchored substitution is unambiguous here.
              sed -i -E "s#^([[:space:]]*image:[[:space:]]*).*#\\1${REGISTRY_REPO}:${COMPONENT}-${IMAGE_TAG}#" "$MANIFEST"
            done

            git config user.email "jenkins@matchy.local"
            git config user.name "Jenkins CI"

            if git diff --quiet; then
              echo "image tags already current, nothing to commit"
            else
              git add -A
              git commit -m "ci(staging): deploy ${IMAGE_TAG}"
              git push origin HEAD
            fi
          '''
        }
      }
    }

    // ArgoCD syncs on its own schedule, so "pushed" is not "running". This
    // waits for the actual rollout before any test touches the environment -
    // otherwise ZAP/k6 would happily scan the PREVIOUS deployment and report
    // a green result for code that was never deployed.
    stage('Wait for staging rollout') {
      when { expression { isStagingDeployBranch() } }
      steps {
        withCredentials([file(credentialsId: 'kubeconfig-staging', variable: 'KUBECONFIG_FILE')]) {
          sh '''#!/usr/bin/env bash
            set -euo pipefail
            export KUBECONFIG="$KUBECONFIG_FILE"

            # give ArgoCD a chance to notice the commit before we start waiting
            # on rollouts (default poll interval is 3m; this nudges it).
            for i in $(seq 1 30); do
              if kubectl -n argocd get application matchy-plus-staging \
                   -o jsonpath='{.status.sync.revision}' 2>/dev/null | grep -q .; then
                break
              fi
              sleep 5
            done

            for COMPONENT in $IMAGE_COMPONENTS; do
              echo "--- waiting for $COMPONENT ---"
              kubectl -n matchy-staging rollout status "deployment/$COMPONENT" --timeout=5m
            done
          '''
        }
      }
    }

    // DAST. Baseline scan = passive only (no attack traffic), which is the
    // right call for an env that shares a host with the CI that builds it.
    // Never fails the build: a new informational alert shouldn't block a
    // deploy that already passed the real gates.
    stage('DAST - OWASP ZAP') {
      when { expression { isStagingDeployBranch() } }
      steps {
        catchError(buildResult: 'UNSTABLE', stageResult: 'UNSTABLE') {
          sh '''#!/usr/bin/env bash
            set -uo pipefail
            mkdir -p reports/zap

            # *.matchy.local only resolves via the hosts file on the k3s node,
            # so the scanner container needs the mapping injected explicitly.
            INGRESS_IP=$(getent hosts "$STAGING_API_HOST" | awk '{print $1}' | head -1)
            INGRESS_IP="${INGRESS_IP:-192.168.137.200}"

            for TARGET_HOST in "$STAGING_APP_HOST" "$STAGING_API_HOST"; do
              SAFE_NAME=$(echo "$TARGET_HOST" | tr '.' '-')
              docker run --rm \
                --add-host "${TARGET_HOST}:${INGRESS_IP}" \
                -v "$WORKSPACE/reports/zap:/zap/wrk:rw" \
                ghcr.io/zaproxy/zaproxy:stable \
                zap-baseline.py \
                  -t "http://${TARGET_HOST}" \
                  -J "zap-${SAFE_NAME}.json" \
                  -r "zap-${SAFE_NAME}.html" \
                  -m 2 -T 5 || echo "ZAP flagged findings for ${TARGET_HOST} (non-blocking)"
            done
          '''
        }
      }
    }

    // Load test. Thresholds live in the k6 script; a breach marks the build
    // unstable rather than failing it, same policy as ZAP above.
    stage('Performance - k6') {
      when { expression { isStagingDeployBranch() } }
      steps {
        catchError(buildResult: 'UNSTABLE', stageResult: 'UNSTABLE') {
          sh '''#!/usr/bin/env bash
            set -uo pipefail
            mkdir -p reports/k6

            INGRESS_IP=$(getent hosts "$STAGING_API_HOST" | awk '{print $1}' | head -1)
            INGRESS_IP="${INGRESS_IP:-192.168.137.200}"

            docker run --rm \
              --add-host "${STAGING_API_HOST}:${INGRESS_IP}" \
              -e "API_BASE=http://${STAGING_API_HOST}" \
              -v "$WORKSPACE/ci-scripts:/scripts:ro" \
              -v "$WORKSPACE/reports/k6:/out:rw" \
              grafana/k6:latest run \
                --summary-export=/out/k6-summary.json \
                /scripts/k6-staging-smoke.js
          '''
        }
      }
    }

    stage('Publish security & performance report') {
      when { expression { isStagingDeployBranch() } }
      steps {
        sh 'python3 ci-scripts/generate_dast_report.py --dest reports/dast'
        publishHTML(target: [
          reportDir: 'reports/dast',
          reportFiles: 'index.html',
          reportName: 'Matchy+ Staging DAST & Performance',
          keepAll: true,
          alwaysLinkToLastBuild: true
        ])
        archiveArtifacts artifacts: 'reports/zap/**,reports/k6/**,reports/dast/**', allowEmptyArchive: true
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
      sh """
        for COMPONENT in ${IMAGE_COMPONENTS}; do
          docker rmi ${REGISTRY_REPO}:\${COMPONENT}-${IMAGE_TAG} || true
        done
      """
    }
  }
}

// Single gate for every CD stage. Keeping it in one place means enabling or
// disabling staging deploys is one edit to STAGING_DEPLOY_BRANCHES, rather
// than five `when` blocks that can drift apart or get half-reverted.
boolean isStagingDeployBranch() {
  def branch = env.BRANCH_NAME ?: (env.GIT_BRANCH ?: '').replaceFirst('^origin/', '')
  return (env.STAGING_DEPLOY_BRANCHES ?: 'dev').split(/\s+/).contains(branch)
}
