# Observability Stack

This project ships with a ready-to-run observability stack:

- Prometheus: metrics + alert rules
- Alertmanager: alert routing (safe default blackhole receiver)
- Grafana: provisioned datasource + dashboards

## Files

- `observability/prometheus/prometheus.yml`
- `observability/prometheus/async-upload-alerts.yml`
- `observability/alertmanager/alertmanager.yml`
- `observability/grafana/provisioning/datasources/prometheus.yml`
- `observability/grafana/provisioning/dashboards/dashboards.yml`
- `observability/grafana/dashboards/async-upload-observability.json`

## Start

From workspace root:

```bash
docker compose up -d prometheus alertmanager grafana backend
```

## Verify

- Prometheus targets: `http://localhost:9090/targets`
- Alert rules: `http://localhost:9090/rules`
- Alertmanager: `http://localhost:9093`
- Grafana: `http://localhost:3000`

## Local Webhook Listener (Windows)

Run a local receiver before starting the stack so `warning/critical` alerts have a live target:

```powershell
pwsh -File .\tools\local-alert-webhook.ps1 -Port 5001 -Path /alerts
```

The script listens on all interfaces (`0.0.0.0`) so Alertmanager inside Docker can reach it via `host.docker.internal`.

Optional log file:

```powershell
pwsh -File .\tools\local-alert-webhook.ps1 -Port 5001 -Path /alerts -LogFile .\observability\alertmanager\local-alerts.log
```

Send a full test lifecycle (`firing` then `resolved`):

```powershell
pwsh -File .\tools\send-test-alerts.ps1 -Url http://localhost:5001/alerts
```

Send inhibit scenario (same alert/service with `warning` then `critical`):

```powershell
pwsh -File .\tools\send-test-alerts.ps1 -Url http://localhost:5001/alerts -Mode inhibit
```

Send burst test (`N` firing alerts):

```powershell
pwsh -File .\tools\send-test-alerts.ps1 -Url http://localhost:5001/alerts -Mode burst -BurstCount 10
```

Send mixed multi-service test (`warning` + `critical` for each service):

```powershell
pwsh -File .\tools\send-test-alerts.ps1 -Url http://localhost:5001/alerts -Mode mixed
```

Custom services (comma-separated):

```powershell
pwsh -File .\tools\send-test-alerts.ps1 -Url http://localhost:5001/alerts -Mode mixed -MixedServices claims-attachments,settlement-batch,notification-dispatch
```

Run endpoint smoke-checks after `docker compose up -d`:

```powershell
pwsh -File .\tools\verify-observability.ps1
```

Run full one-command smoke (start listener + send alerts + PASS/FAIL report):

```powershell
pwsh -File .\tools\run-observability-smoke.ps1
```

Include endpoint verification (use after services are up):

```powershell
pwsh -File .\tools\run-observability-smoke.ps1 -RunEndpointVerify
```

## PromQL Quick Checks

- Async job failures (10m):

```promql
increase(tba_claims_attachments_async_jobs_total{status="failed"}[10m])
```

- Async file failure ratio (5m):

```promql
sum(rate(tba_claims_attachments_async_files_total{status="failed"}[5m]))
/
clamp_min(sum(rate(tba_claims_attachments_async_files_total{status=~"success|failed"}[5m])), 0.001)
```

- Avg async job duration (s, 5m):

```promql
rate(tba_claims_attachments_async_job_duration_seconds_sum[5m])
/
clamp_min(rate(tba_claims_attachments_async_job_duration_seconds_count[5m]), 0.001)
```

## Notes

- Alertmanager now routes `warning` and `critical` alerts to webhook endpoint:
  - `${ALERT_WEBHOOK_URL}` (default: `http://host.docker.internal:5001/alerts`)
- If no webhook listener is running on host port `5001`, alerts remain visible in Alertmanager UI and delivery retries will appear in Alertmanager logs.
- A safe `blackhole` fallback receiver remains configured as default route.
- To use your production channel, set `ALERT_WEBHOOK_URL` in root `.env` (see `.env.example`).
