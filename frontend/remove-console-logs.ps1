# PowerShell Script to Remove All console.log Statements
# Run this in frontend directory

Get-ChildItem -Path "src" -Recurse -Filter "*.jsx" | ForEach-Object {
    $filePath = $_.FullName
    $content = Get-Content $filePath -Raw -Encoding UTF8
    
    # Remove console.log lines (various patterns)
    $newContent = $content -replace '\s*console\.log\([^)]*\);\s*\r?\n?', ''
    $newContent = $newContent -replace '\s*console\.log\([^)]*\)\s*\r?\n?', ''
    
    if ($content -ne $newContent) {
        Set-Content -Path $filePath -Value $newContent -NoNewline -Encoding UTF8
        Write-Host "✅ Cleaned: $($_.Name)"
    }
}

Write-Host "`n✅ All console.log statements removed!"
