param(
    [int]$Port = 5001,
    [string]$Path = "/alerts",
    [string]$LogFile = ""
)

$listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Any, $Port)
$utf8 = [System.Text.UTF8Encoding]::new($false)
$normalizedPath = if ($Path.StartsWith('/')) { $Path } else { "/$Path" }

try {
    $listener.Start()
    Write-Host "Local alert webhook is listening on http://0.0.0.0:$Port$normalizedPath"
    Write-Host "Press Ctrl+C to stop."

    while ($true) {
        $client = $listener.AcceptTcpClient()

        try {
            $stream = $client.GetStream()
            $reader = New-Object System.IO.StreamReader($stream, $utf8, $false, 4096, $true)
            $writer = New-Object System.IO.StreamWriter($stream, $utf8, 4096, $true)
            $writer.NewLine = "`r`n"
            $writer.AutoFlush = $true

            $requestLine = $reader.ReadLine()
            if (-not $requestLine) {
                continue
            }

            $parts = $requestLine.Split(' ')
            $method = if ($parts.Length -ge 1) { $parts[0] } else { "UNKNOWN" }
            $requestPath = if ($parts.Length -ge 2) { $parts[1] } else { "/" }

            $headers = @{}
            while ($true) {
                $line = $reader.ReadLine()
                if ([string]::IsNullOrWhiteSpace($line)) {
                    break
                }
                $idx = $line.IndexOf(':')
                if ($idx -gt 0) {
                    $key = $line.Substring(0, $idx).Trim().ToLowerInvariant()
                    $value = $line.Substring($idx + 1).Trim()
                    $headers[$key] = $value
                }
            }

            $contentLength = 0
            if ($headers.ContainsKey('content-length')) {
                [void][int]::TryParse($headers['content-length'], [ref]$contentLength)
            }

            $body = ""
            if ($contentLength -gt 0) {
                $buffer = New-Object char[] $contentLength
                [void]$reader.ReadBlock($buffer, 0, $contentLength)
                $body = -join $buffer
            }

            $timestamp = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
            $summary = "[$timestamp] $method $requestPath"
            Write-Host "`n$summary"
            if ($body) {
                Write-Host $body
            }

            if ($LogFile) {
                Add-Content -Path $LogFile -Value $summary
                if ($body) {
                    Add-Content -Path $LogFile -Value $body
                }
                Add-Content -Path $LogFile -Value ""
            }

            if ($requestPath -ne $normalizedPath) {
                $notFoundBody = '{"status":"not_found"}'
                $notFoundBytes = $utf8.GetBytes($notFoundBody)
                $writer.WriteLine("HTTP/1.1 404 Not Found")
                $writer.WriteLine("Content-Type: application/json")
                $writer.WriteLine("Content-Length: $($notFoundBytes.Length)")
                $writer.WriteLine("Connection: close")
                $writer.WriteLine("")
                try {
                    $stream.Write($notFoundBytes, 0, $notFoundBytes.Length)
                }
                catch {
                }
                continue
            }

            $okBody = '{"status":"ok"}'
            $okBytes = $utf8.GetBytes($okBody)
            $writer.WriteLine("HTTP/1.1 200 OK")
            $writer.WriteLine("Content-Type: application/json")
            $writer.WriteLine("Content-Length: $($okBytes.Length)")
            $writer.WriteLine("Connection: close")
            $writer.WriteLine("")
            try {
                $stream.Write($okBytes, 0, $okBytes.Length)
            }
            catch {
            }
        }
        finally {
            if ($writer) { $writer.Dispose() }
            if ($reader) { $reader.Dispose() }
            if ($stream) { $stream.Dispose() }
            if ($client) { $client.Dispose() }
        }
    }
}
finally {
    if ($listener) {
        $listener.Stop()
    }
}
