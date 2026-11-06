// CI only - runs on every branch, deploys nothing.
//
// This pipeline builds, scans, signs and pushes images, then stops. Promoting
// any of those images to an environment is a separate, manually triggered job
// driven by Jenkinsfile.staging.cd and Jenkinsfile.prod.cd, so a push can never deploy by itself and a deploy
// never rebuilds. The image tag is the contract between the two.

pipeline {
  agent any

  triggers {
    githubPush()
  }

  options {
    timestamps()

    // Two different guards against two different problems.
    //
    // disableConcurrentBuilds stops the SAME branch running twice - two builds
    // of dev racing each other over one workspace.
    //
    // lock() stops DIFFERENT branches running heavy work at the same time,
    // which disableConcurrentBuilds does nothing about and which is what
    // actually bit us: on 27 Aug staging #11 ran its vitest suite from
    // 15:42-15:47 while dev #38 was inside `pnpm turbo build` in a Docker
    // build. The location-step suite, normally 18-20s, took 36.8s and one
    // test blew its 15s timeout. The build was recorded as a genuine test
    // failure. Builds #12 and #13 passed the identical test minutes later on
    // an idle box, which is the proof it was contention and not a regression.
    //
    // Two executors on a 4-core host that also runs production, postgres,
    // SonarQube and ArgoCD cannot honestly run two of these pipelines at once.
    // The executors stay at 2 so light work (branch indexing, a CD promotion)
    // still overlaps; this lock serialises only the pipelines that fight over
    // CPU. Needs the lockable-resources plugin.
    lock(resource: 'matchy-ci-heavy')

    // Nothing was rotating build history. Jenkins keeps every build's log and
    // artifacts forever, on the host whose disk filling to 95% took production
    // down for 7h16m on 10 Aug 2026. artifactNumToKeep is deliberately lower
    // than numToKeep: the console log of an old build is small and worth
    // keeping for history, the archived reports and scan JSONs next to it are
    // not.
    buildDiscarder(logRotator(numToKeepStr: '30', artifactNumToKeepStr: '10'))

    // A backstop, not the real guard. The real guards are the per-stage
    // timeouts below, which are sized to the stage they wrap so a hang is
    // caught in minutes rather than hours. This one only exists so that a
    // hang somewhere without its own timeout cannot hold an executor - and
    // with only two executors, one stuck build is half the CI capacity gone.
    timeout(time: 3, unit: 'HOURS')
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

    // Build with BuildKit, not the legacy builder.
    //
    // This is a disk decision, not a speed one. api/app/admin/landing are
    // 4-stage builds whose installer stage runs pnpm install and turbo build
    // over the whole monorepo - a couple of GB each. The legacy builder writes
    // every intermediate stage into the image store as a real image, and the
    // post block below only untags the five finals, so about 8GB per build was
    // left behind as dangling images. Twelve builds took the disk to 95%,
    // kubelet raised DiskPressure, tainted the node and evicted every pod;
    // production was down roughly seven hours on 10 Aug 2026.
    //
    // BuildKit keeps intermediates in a cache the daemon size-limits instead
    // (builder.gc in /etc/docker/daemon.json). This needs the buildx plugin in
    // the Jenkins image - it is installed there now, and note that without it
    // the CLI falls back to the legacy builder silently rather than failing.
    DOCKER_BUILDKIT = '1'

    // Baked into the app/admin bundles at BUILD time. Next.js inlines
    // NEXT_PUBLIC_* into the client bundle during the build, so this cannot be
    // injected later as a runtime env var on the Deployment - the browser
    // would call the Dockerfile's localhost default instead. It therefore has
    // to live in CI even though it names a deploy-time environment.
    // https, matching the staging ingress. This is baked into the client
    // bundle, so it cannot be corrected at deploy time - an http value here
    // makes the browser issue http requests from an https page, which it
    // blocks as mixed content. Changing the staging scheme therefore requires
    // rebuilding app and admin, not just editing the ConfigMap.
    STAGING_API_URL = "https://api.staging.matchyplus.com/api/v1"
    PROD_API_URL = "https://api.matchyplus.com/api/v1"

    // Which of the two gets compiled into app and admin, decided by branch.
    //
    // This has to be a build-time decision and it has to be per-branch. Until
    // now every build used the staging URL unconditionally, so a build on main
    // produced production frontends hardcoded to api.staging.matchy.local - a
    // hostname that does not resolve on the public internet. They would have
    // deployed, reported healthy, and failed in every browser.
    //
    // The consequence to keep in mind: app and admin images are NOT portable
    // between environments, so a staging-tested app image cannot be promoted to
    // prod - only api, ai and landing can. Making the frontend read its API URL
    // at runtime would restore build-once-deploy-many for all five; until then
    // prod frontends must be built from main.
    FRONTEND_API_URL = "${(env.BRANCH_NAME ?: env.GIT_BRANCH ?: '').replaceFirst('^origin/', '') == 'main' ? 'https://api.matchyplus.com/api/v1' : 'https://api.staging.matchyplus.com/api/v1'}"

    // The other two cross-site URLs, inlined at build time for the same reason.
    //
    // FRONTEND_APP_URL  - landing's Connexion/Inscription buttons.
    // FRONTEND_LANDING_URL - where apps/app/src/proxy.ts sends /privacy-policy
    //                        and /terms-of-service.
    //
    // Both shipped to production with their localhost fallbacks compiled in,
    // because nothing passed them: landing's Dockerfile carried a comment saying
    // it read no NEXT_PUBLIC_* vars, which stopped being true when the marketing
    // site was migrated from Vite to Next. The result was a Connexion button
    // that sent visitors to their own machine and two dead legal links.
    //
    // Nothing at deploy time can correct these - Next.js compiles them into the
    // bundle - so a wrong value here means rebuilding, not editing a ConfigMap.
    FRONTEND_APP_URL = "${(env.BRANCH_NAME ?: env.GIT_BRANCH ?: '').replaceFirst('^origin/', '') == 'main' ? 'https://app.matchyplus.com' : 'https://app.staging.matchyplus.com'}"
    FRONTEND_LANDING_URL = "${(env.BRANCH_NAME ?: env.GIT_BRANCH ?: '').replaceFirst('^origin/', '') == 'main' ? 'https://matchyplus.com' : 'https://staging.matchyplus.com'}"

    // Analytics identifiers for the landing bundle, also inlined at build time.
    //
    // Empty on every branch but main, and that is not a placeholder: the
    // Analytics component returns nothing unless the browser is on
    // matchyplus.com, and the CookieYes account is registered for that domain
    // only, so a staging build carrying these would load a banner that errors
    // and would mix staging traffic into the production statistics.
    //
    // They are public identifiers, not credentials. They sit here rather than
    // in Jenkins credentials because they are already committed in
    // .env.example, and because a value that must match the live site is
    // easier to review in the pipeline than in a hidden setting.
    //
    // Read them below as `env.X ?: ''`, never as a bare `${X}`. Jenkins does
    // not inject an environment entry whose value is the empty string, so on
    // every branch but main these three do not exist at all and a bare
    // reference throws MissingPropertyException. That broke staging #16 while
    // main built fine, which is the confusing shape this note exists to
    // prevent repeating.
    ANALYTICS_COOKIEYES_SRC = "${(env.BRANCH_NAME ?: env.GIT_BRANCH ?: '').replaceFirst('^origin/', '') == 'main' ? 'https://cdn-cookieyes.com/client_data/c39d81b860a22c01a72f23f6/script.js' : ''}"
    ANALYTICS_GA_MEASUREMENT_ID = "${(env.BRANCH_NAME ?: env.GIT_BRANCH ?: '').replaceFirst('^origin/', '') == 'main' ? 'G-R7FNSWEW2C' : ''}"
    ANALYTICS_CLARITY_PROJECT_ID = "${(env.BRANCH_NAME ?: env.GIT_BRANCH ?: '').replaceFirst('^origin/', '') == 'main' ? 'yz4yxwayvv' : ''}"
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
        // rm before mkdir: the workspace is reused between builds, so a
        // junit.xml or a trivy report left by the previous run would other-
        // wise be picked up and published as if this build had produced it.
        // That matters most on the failure path, where the stage that should
        // have written the file never ran.
        sh '''
          rm -rf reports apps/*/test-results
          mkdir -p reports/semgrep reports/trivy reports/final
        '''
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
      options { timeout(time: 20, unit: 'MINUTES') }
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
        // Until now the SAST stage could not change the build result at all:
        // `|| true` swallows semgrep's exit code, and nothing downstream read
        // the JSON. A scan finding a hardcoded secret looked exactly like a
        // clean one - the findings existed only in an HTML report nobody opens
        // unless they already suspect something.
        //
        // ERROR is semgrep's highest severity and is what p/secrets uses for a
        // real credential. Those now mark the build UNSTABLE, matching how
        // Trivy already treats a CRITICAL CVE. WARNING and INFO stay advisory:
        // they are numerous, frequently stylistic, and gating on them would
        // train everyone to ignore the colour of the build, which is the one
        // failure mode worse than not gating at all.
        script {
          def sg = readJSON file: 'reports/semgrep/semgrep-report.json'
          def errs = sg.results.findAll { it.extra?.severity == 'ERROR' }
          if (errs) {
            echo "Semgrep found ${errs.size()} ERROR-severity finding(s):"
            errs.take(10).each { echo "  ${it.path}:${it.start?.line} ${it.check_id}" }
            if (errs.size() > 10) {
              echo "  ... and ${errs.size() - 10} more, all listed in the build report"
            }
            unstable("Semgrep: ${errs.size()} ERROR-severity finding(s)")
          } else {
            echo "Semgrep: ${sg.results.size()} finding(s), none at ERROR severity."
          }
        }
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
      options { timeout(time: 45, unit: 'MINUTES') }
      environment {
        HUSKY = '0'
        NODE_ENV = 'test'
        // Switches the vitest configs from the plain console reporter to
        // console + junit. Set here rather than relying on Jenkins exporting
        // CI itself, so the trigger for writing junit.xml is visible in this
        // file instead of being an implicit property of the agent.
        CI = 'true'
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
          pnpm typecheck
        '''
      }
      post {
        always {
          sh 'chown -R "$(stat -c "%u:%g" .)" . 2>/dev/null || true'
          // Test results existed only as console text before this. That is why
          // the 27 Aug staging failure took a person reading a 1266-line log to
          // explain: a single test timing out at 15s looks identical in the log
          // to a test that is genuinely broken. Jenkins keeps per-test history
          // across builds, so with the XML it labels that case a flake by
          // itself and shows how long each test took over time.
          //
          // allowEmptyResults, because this runs on the failure path too: if
          // the build died in `pnpm install` or `pnpm lint`, no suite ever ran
          // and there is legitimately nothing to publish. Without it the junit
          // step would fail the build a second time for the wrong reason and
          // bury the real error.
          junit testResults: 'apps/api/test-results/junit.xml,apps/app/test-results/junit.xml,apps/admin/test-results/junit.xml', allowEmptyResults: true, skipPublishingChecks: true
          archiveArtifacts artifacts: 'apps/*/test-results/junit.xml', allowEmptyArchive: true
        }
      }
    }

    // running pytest directly instead of pnpm test/lint - those wrap a
    // python venv and skip silently if it's missing. runs before the
    // SonarQube stage so coverage.xml exists by the time the scanner runs.
    stage('AI service tests') {
      agent { docker { image 'python:3.12-slim'; args '-u root'; reuseNode true } }
      options { timeout(time: 25, unit: 'MINUTES') }
      steps {
        sh '''
          pip install --no-cache-dir -r apps/ai/requirements.txt -r apps/ai/requirements-dev.txt
          mkdir -p apps/ai/test-results
          cd apps/ai && python -m pytest -q --junitxml=test-results/junit.xml
        '''
      }
      post {
        always {
          sh 'chown -R "$(stat -c "%u:%g" .)" . 2>/dev/null || true'
          junit testResults: 'apps/ai/test-results/junit.xml', allowEmptyResults: true, skipPublishingChecks: true
          archiveArtifacts artifacts: 'apps/ai/test-results/junit.xml', allowEmptyArchive: true
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

    // Split gate, not an all-or-nothing one.
    //
    // This used to be pure echo: a failing SonarQube quality gate changed
    // nothing about the build, because coverage is genuinely too low for a
    // full gate to mean anything and failing on it would have made every
    // build red on day one.
    //
    // The problem with that is it also silenced the SECURITY conditions, which
    // have nothing to do with coverage and are exactly what this platform is
    // for. So the gate is now read condition by condition:
    //
    //   security conditions  (vulnerabilities, security rating, hotspots)
    //     -> UNSTABLE, same treatment as a Trivy CRITICAL or a Semgrep ERROR
    //   everything else      (coverage, duplication, maintainability)
    //     -> reported in the log, build unaffected
    //
    // When coverage catches up, promoting the rest is deleting the SECURITY
    // filter on one line - the plumbing is already here.
    stage('Quality Gate') {
      options { timeout(time: 10, unit: 'MINUTES') }
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
          def conditions = qgJson?.projectStatus?.conditions ?: []

          // Metric keys Sonar uses for the security side of the gate. Prefixed
          // new_* variants are the "on new code" conditions, which are the ones
          // a project with legacy debt actually wants to enforce.
          def SECURITY_METRICS = [
            'vulnerabilities', 'new_vulnerabilities',
            'security_rating', 'new_security_rating',
            'security_hotspots_reviewed', 'new_security_hotspots_reviewed',
            'security_review_rating', 'new_security_review_rating',
          ]

          def failed = conditions.findAll { it.status == 'ERROR' }
          def failedSecurity = failed.findAll { SECURITY_METRICS.contains(it.metricKey) }
          def failedOther = failed - failedSecurity

          if (qgStatus == 'OK') {
            echo "Quality Gate PASSED"
          } else if (qgStatus != 'ERROR') {
            echo "quality gate returned unexpected status: ${qgStatus}"
          }

          failedOther.each {
            echo "  [advisory] ${it.metricKey}: ${it.actualValue} (threshold ${it.comparator} ${it.errorThreshold})"
          }
          failedSecurity.each {
            echo "  [SECURITY] ${it.metricKey}: ${it.actualValue} (threshold ${it.comparator} ${it.errorThreshold})"
          }

          if (failedSecurity) {
            echo "Security conditions failed the quality gate - see ${sonarUrl}/dashboard?id=${projectKey}"
            unstable("SonarQube: ${failedSecurity.size()} security condition(s) failed")
          } else if (failedOther) {
            echo "Quality gate failed only on non-security conditions (advisory while coverage " +
                 "is being brought up) - see ${sonarUrl}/dashboard?id=${projectKey}"
          }
        }
      }
    }

    // app and admin get NEXT_PUBLIC_API_URL baked in here on purpose: Next.js
    // inlines NEXT_PUBLIC_* into the client bundle at build time, so a runtime
    // env var on the Deployment would be ignored and the browser would call
    // the Dockerfile's localhost:8000 default instead of the staging API.
    //
    // landing takes NEXT_PUBLIC_APP_URL and the three analytics identifiers.
    // This comment previously said landing read none, which is how it shipped
    // with a Connexion button pointing at localhost; do not shorten it back.
    // ai is a python service and takes no build arguments.
    stage('Build images') {
      options { timeout(time: 40, unit: 'MINUTES') }
      steps {
        sh """
          docker build --pull -t ${REGISTRY_REPO}:api-${IMAGE_TAG} -f apps/api/Dockerfile .
          docker build --pull --build-arg NEXT_PUBLIC_API_URL=${FRONTEND_API_URL} --build-arg NEXT_PUBLIC_LANDING_URL=${FRONTEND_LANDING_URL} -t ${REGISTRY_REPO}:app-${IMAGE_TAG} -f apps/app/Dockerfile .
          docker build --pull --build-arg NEXT_PUBLIC_API_URL=${FRONTEND_API_URL} -t ${REGISTRY_REPO}:admin-${IMAGE_TAG} -f apps/admin/Dockerfile .
          docker build --pull --build-arg NEXT_PUBLIC_APP_URL=${FRONTEND_APP_URL} --build-arg NEXT_PUBLIC_COOKIEYES_SRC=${env.ANALYTICS_COOKIEYES_SRC ?: ''} --build-arg NEXT_PUBLIC_GA_MEASUREMENT_ID=${env.ANALYTICS_GA_MEASUREMENT_ID ?: ''} --build-arg NEXT_PUBLIC_CLARITY_PROJECT_ID=${env.ANALYTICS_CLARITY_PROJECT_ID ?: ''} -t ${REGISTRY_REPO}:landing-${IMAGE_TAG} -f apps/landing/Dockerfile .
          docker build --pull -t ${REGISTRY_REPO}:ai-${IMAGE_TAG} -f apps/ai/Dockerfile apps/ai
        """
        sh 'mkdir -p reports/stages && touch reports/stages/build'
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
      options { timeout(time: 20, unit: 'MINUTES') }
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
      options { timeout(time: 30, unit: 'MINUTES') }
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
        sh 'mkdir -p reports/stages && touch reports/stages/push'
        }
      }
    }

    stage('Cosign sign') {
      options { timeout(time: 15, unit: 'MINUTES') }
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
        sh 'mkdir -p reports/stages && touch reports/stages/sign'
        }
      }
    }
  }

  post {
    always {
      // The report is generated here, not as a final stage, and that is the
      // whole point of moving it.
      //
      // As a stage it was the last one, so any earlier failure skipped it.
      // Staging #11 failed in Lint & Test on 27 Aug and produced no report at
      // all - the one build where someone actually wanted to see the findings
      // was the one build with nothing to look at. A report is most useful on
      // the builds that go wrong, so it now runs on every outcome.
      //
      // BUILD_RESULT is passed in because currentBuild.currentResult is only
      // knowable here, at the end. The script renders whatever scan output
      // exists and says plainly which stages never ran, instead of the old
      // behaviour of asserting everything passed because it could only ever
      // run after everything had.
      script {
        withEnv(["BUILD_RESULT=${currentBuild.currentResult}"]) {
          sh 'python3 ci-scripts/generate_report.py --type dev --dest reports/final || true'
        }
      }
      publishHTML(target: [
        reportDir: 'reports/final',
        reportFiles: 'report.html',
        reportName: 'Matchy+ Dev Build Report',
        keepAll: true,
        alwaysLinkToLastBuild: true,
        allowMissing: true
      ])
      archiveArtifacts artifacts: 'reports/final/**', allowEmptyArchive: true

      // Untagging the five finals is not cleanup on its own - it only frees the
      // ~540MB we ship. The multi-stage builds leave several GB of intermediate
      // layers behind per run, which is what actually filled the disk and took
      // production down on 10 Aug 2026. BuildKit (DOCKER_BUILDKIT above) stops
      // that leaking as dangling images, and the prune below clears whatever
      // still slips through so the pipeline cleans up after itself rather than
      // relying on the host's nightly cron to notice.
      //
      // This runs after the report on purpose: the report reads the Trivy JSON,
      // not the images, but keeping the order explicit means a future change
      // that does inspect an image still finds it there.
      sh """
        for COMPONENT in ${IMAGE_COMPONENTS}; do
          docker rmi ${REGISTRY_REPO}:\${COMPONENT}-${IMAGE_TAG} || true
        done
        docker image prune -f || true
      """
    }
  }
}
