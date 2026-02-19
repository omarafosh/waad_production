param(
    [string]$Url = "http://localhost:5001/alerts",
    [string]$AlertName = "AsyncUploadFailuresDetected",
    [ValidateSet("warning", "critical")]
    [string]$Severity = "warning",
    [string]$Service = "claims-attachments",
    [int]$WaitSeconds = 3,
    [ValidateSet("lifecycle", "inhibit", "burst", "mixed")]
    [string]$Mode = "lifecycle",
    [int]$BurstCount = 5,
    [string[]]$MixedServices = @("claims-attachments", "settlement-batch", "notification-dispatch"),
    [bool]$IncludeResolved = $true
)

$now = [DateTime]::UtcNow
$startsAt = $now.ToString("o")
$endsAt = $now.AddMinutes(5).ToString("o")

$groupKey = '{}:{alertname="' + $AlertName + '"}'

$annotations = @{
    summary     = "Test alert lifecycle"
    description = "Synthetic alert to verify Alertmanager webhook delivery."
}

function New-AlertPayload {
    param(
        [Parameter(Mandatory = $true)]
        [string]$AlertStatus,
        [Parameter(Mandatory = $true)]
        [string]$AlertSeverity,
        [Parameter(Mandatory = $true)]
        [string]$Name,
        [Parameter(Mandatory = $true)]
        [string]$Svc,
        [Parameter(Mandatory = $true)]
        [string]$Start,
        [Parameter(Mandatory = $true)]
        [string]$End,
        [Parameter(Mandatory = $true)]
        [string]$Key
    )

    $labels = @{
        alertname = $Name
        severity  = $AlertSeverity
        service   = $Svc
    }

    return @{
        receiver          = "ops-webhook"
        status            = $AlertStatus
        version           = "4"
        groupKey          = $Key
        truncatedAlerts   = 0
        commonLabels      = $labels
        commonAnnotations = $annotations
        externalURL       = "http://localhost:9093"
        alerts            = @(
            @{
                status       = $AlertStatus
                labels       = $labels
                annotations  = $annotations
                startsAt     = $Start
                endsAt       = $End
                generatorURL = "http://localhost:9090/graph"
            }
        )
    }
}

function Send-Payload {
    param(
        [Parameter(Mandatory = $true)]
        [hashtable]$Payload,
        [Parameter(Mandatory = $true)]
        [string]$Phase,
        [Parameter(Mandatory = $true)]
        [string]$TargetUrl
    )

    $json = $Payload | ConvertTo-Json -Depth 10
    $response = Invoke-RestMethod -Method Post -Uri $TargetUrl -ContentType "application/json" -Body $json
    Write-Host "[$Phase] sent to $TargetUrl =>" ($response | ConvertTo-Json -Compress)
}

if ($Mode -eq "lifecycle") {
    $firingPayload = New-AlertPayload -AlertStatus "firing" -AlertSeverity $Severity -Name $AlertName -Svc $Service -Start $startsAt -End "0001-01-01T00:00:00Z" -Key $groupKey
    $resolvedPayload = New-AlertPayload -AlertStatus "resolved" -AlertSeverity $Severity -Name $AlertName -Svc $Service -Start $startsAt -End $endsAt -Key $groupKey

    Send-Payload -Payload $firingPayload -Phase "firing" -TargetUrl $Url
    Start-Sleep -Seconds $WaitSeconds
    Send-Payload -Payload $resolvedPayload -Phase "resolved" -TargetUrl $Url
    return
}

if ($Mode -eq "inhibit") {
    $warningPayload = New-AlertPayload -AlertStatus "firing" -AlertSeverity "warning" -Name $AlertName -Svc $Service -Start $startsAt -End "0001-01-01T00:00:00Z" -Key $groupKey
    $criticalPayload = New-AlertPayload -AlertStatus "firing" -AlertSeverity "critical" -Name $AlertName -Svc $Service -Start $startsAt -End "0001-01-01T00:00:00Z" -Key $groupKey
    $resolveCriticalPayload = New-AlertPayload -AlertStatus "resolved" -AlertSeverity "critical" -Name $AlertName -Svc $Service -Start $startsAt -End $endsAt -Key $groupKey
    $resolveWarningPayload = New-AlertPayload -AlertStatus "resolved" -AlertSeverity "warning" -Name $AlertName -Svc $Service -Start $startsAt -End $endsAt -Key $groupKey

    Send-Payload -Payload $warningPayload -Phase "warning-firing" -TargetUrl $Url
    Start-Sleep -Seconds $WaitSeconds
    Send-Payload -Payload $criticalPayload -Phase "critical-firing" -TargetUrl $Url
    Start-Sleep -Seconds $WaitSeconds
    Send-Payload -Payload $resolveCriticalPayload -Phase "critical-resolved" -TargetUrl $Url
    Start-Sleep -Seconds $WaitSeconds
    Send-Payload -Payload $resolveWarningPayload -Phase "warning-resolved" -TargetUrl $Url
    return
}

if ($Mode -eq "burst") {
    if ($BurstCount -lt 1) {
        throw "BurstCount must be >= 1"
    }

    for ($index = 1; $index -le $BurstCount; $index++) {
        $name = "$AlertName-$index"
        $key = '{}:{alertname="' + $name + '"}'
        $payload = New-AlertPayload -AlertStatus "firing" -AlertSeverity $Severity -Name $name -Svc $Service -Start $startsAt -End "0001-01-01T00:00:00Z" -Key $key
        Send-Payload -Payload $payload -Phase "burst-$index" -TargetUrl $Url
    }
    return
}

if ($Mode -eq "mixed") {
    if (-not $MixedServices -or $MixedServices.Count -eq 0) {
        throw "MixedServices must contain at least one service name"
    }

    $phases = @(
        @{ Severity = "warning"; Suffix = "warn" },
        @{ Severity = "critical"; Suffix = "crit" }
    )

    foreach ($svc in $MixedServices) {
        foreach ($phase in $phases) {
            $name = "$AlertName-$($svc)-$($phase.Suffix)"
            $key = '{}:{alertname="' + $name + '"}'

            $firingPayload = New-AlertPayload -AlertStatus "firing" -AlertSeverity $phase.Severity -Name $name -Svc $svc -Start $startsAt -End "0001-01-01T00:00:00Z" -Key $key
            Send-Payload -Payload $firingPayload -Phase "mixed-$svc-$($phase.Severity)-firing" -TargetUrl $Url

            if ($IncludeResolved) {
                Start-Sleep -Seconds $WaitSeconds
                $resolvedPayload = New-AlertPayload -AlertStatus "resolved" -AlertSeverity $phase.Severity -Name $name -Svc $svc -Start $startsAt -End $endsAt -Key $key
                Send-Payload -Payload $resolvedPayload -Phase "mixed-$svc-$($phase.Severity)-resolved" -TargetUrl $Url
            }
        }
    }
    return
}
