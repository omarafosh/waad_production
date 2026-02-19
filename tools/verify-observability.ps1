param(
    [string]$PrometheusUrl = "http://localhost:9090",
    [string]$AlertmanagerUrl = "http://localhost:9093",
    [string]$GrafanaUrl = "http://localhost:3000",
    [string]$BackendHealthUrl = "http://localhost:8080/actuator/health"
)

$checks = @(
    @{ Name = "Prometheus Targets"; Url = "$PrometheusUrl/targets" },
    @{ Name = "Prometheus Rules"; Url = "$PrometheusUrl/rules" },
    @{ Name = "Alertmanager UI"; Url = $AlertmanagerUrl },
    @{ Name = "Grafana UI"; Url = $GrafanaUrl },
    @{ Name = "Backend Health"; Url = $BackendHealthUrl }
)

$failed = $false

foreach ($check in $checks) {
    try {
        $response = Invoke-WebRequest -Uri $check.Url -Method Get -TimeoutSec 8
        if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 400) {
            Write-Host "[PASS] $($check.Name): $($check.Url) => $($response.StatusCode)"
        }
        else {
            $failed = $true
            Write-Host "[FAIL] $($check.Name): $($check.Url) => $($response.StatusCode)"
        }
    }
    catch {
        $failed = $true
        Write-Host "[FAIL] $($check.Name): $($check.Url) => $($_.Exception.Message)"
    }
}

if ($failed) {
    exit 1
}

Write-Host "Observability smoke check passed."
