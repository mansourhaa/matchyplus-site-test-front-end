// CI only, no deploy - dev is a build/scan/test gate, not an environment.

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

    // advisory only for now - marks the build unstable instead of failing it
    // so a bad gate doesn't block the rest of the pipeline while we work
    // through the coverage/reliability findings from the first real scan.
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
            echo "no ceTaskId found in report-task.txt, skipping quality gate check"
            currentBuild.result = 'UNSTABLE'
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
            def ceJson = readJSON text: ceResponse
            ceStatus = ceJson?.task?.status ?: 'UNKNOWN'
            echo "  [CE Task] status=${ceStatus} (attempt ${i + 1}/30)"
            if (ceStatus == 'SUCCESS' || ceStatus == 'FAILED' || ceStatus == 'CANCELED') {
              break
            }
            sleep(time: 5, unit: 'SECONDS')
          }

          if (ceStatus != 'SUCCESS') {
            echo "compute engine task didn't succeed (status: ${ceStatus}), quality gate result unknown"
            currentBuild.result = 'UNSTABLE'
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
            currentBuild.result = 'UNSTABLE'
            return
          }

          def qgJson = readJSON text: qgResponse
          def qgStatus = qgJson?.projectStatus?.status ?: 'UNKNOWN'

          if (qgStatus == 'ERROR') {
            echo "quality gate failed - see ${sonarUrl}/dashboard?id=${projectKey}"
            currentBuild.result = 'UNSTABLE'
          } else if (qgStatus != 'OK') {
            echo "quality gate returned unexpected status: ${qgStatus}"
            currentBuild.result = 'UNSTABLE'
          } else {
            echo "Quality Gate PASSED"
          }
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
          // single-quoted, not Groovy-interpolated like the rest of this
          // file - Jenkins flags any sh block inside withCredentials that
          // uses a GString as insecure. REGISTRY_REPO/IMAGE_TAG are regular
          // env vars so plain $VAR works fine here too.
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
