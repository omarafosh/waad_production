param(
    [string]$WebhookUrl = "http://localhost:5001/alerts",
    [int]$ListenerPort = 5001,
    [string]$ListenerPath = "/alerts",
    [ValidateSet("lifecycle", "inhibit", "burst", "mixed")]
    [string]$AlertMode = "mixed",
    [int]$WaitSeconds = 1,
    [switch]$RunEndpointVerify,
    [switch]$UseExistingListener
)

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$listenerScript = Join-Path $PSScriptRoot "local-alert-webhook.ps1"
$sendScript = Join-Path $PSScriptRoot "send-test-alerts.ps1"
$verifyScript = Join-Path $PSScriptRoot "verify-observability.ps1"
$listenerProcess = $null
$listenerLog = Join-Path $repoRoot "observability\alertmanager\local-alerts.log"

function Invoke-Checked {
    param(
        [Parameter(Mandatory = $true)]
        [scriptblock]$Action,
        [Parameter(Mandatory = $true)]
        [string]$Step
    )

    try {
        & $Action
        Write-Host "[PASS] $Step"
    }
    catch {
        Write-Host "[FAIL] $Step => $($_.Exception.Message)"
        throw
    }
}

try {
    if (-not $UseExistingListener) {
        Invoke-Checked -Step "start local webhook listener" -Action {
            $listenerProcess = Start-Process -FilePath "pwsh" -ArgumentList @(
                "-NoProfile",
                "-File", $listenerScript,
                "-Port", $ListenerPort,
                "-Path", $ListenerPath,
                "-LogFile", $listenerLog
            ) -PassThru -WindowStyle Hidden
            Start-Sleep -Seconds 2
            if ($listenerProcess.HasExited) {
                throw "listener exited immediately (code: $($listenerProcess.ExitCode))"
            }
        }
    }
    else {
        Write-Host "[INFO] using existing listener at $WebhookUrl"
    }

    Invoke-Checked -Step "send synthetic alerts ($AlertMode)" -Action {
        $args = @(
            "-NoProfile",
            "-File", $sendScript,
            "-Url", $WebhookUrl,
            "-Mode", $AlertMode,
            "-WaitSeconds", $WaitSeconds
        )

        if ($AlertMode -eq "burst") {
            $args += @("-BurstCount", 10)
        }

        & pwsh @args
        if ($LASTEXITCODE -ne 0) {
            throw "send-test-alerts exited with code $LASTEXITCODE"
        }
    }

    if ($RunEndpointVerify) {
        Invoke-Checked -Step "verify observability endpoints" -Action {
            & pwsh -NoProfile -File $verifyScript
            if ($LASTEXITCODE -ne 0) {
                throw "verify-observability exited with code $LASTEXITCODE"
            }
        }
    }

    Write-Host "`n[RESULT] OBSERVABILITY_SMOKE=PASS"
    Write-Host "Listener log: $listenerLog"
}
catch {
    Write-Host "`n[RESULT] OBSERVABILITY_SMOKE=FAIL"
    throw
}
finally {
    if ($listenerProcess -and -not $listenerProcess.HasExited) {
        Stop-Process -Id $listenerProcess.Id -Force
        Write-Host "[INFO] stopped local listener process ($($listenerProcess.Id))"
    }
}
