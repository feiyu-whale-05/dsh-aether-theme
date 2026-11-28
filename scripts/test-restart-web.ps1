#Requires -Version 5.1
# 重启隔离的测试用 dsh web（改了 client.js 之后必须重启宿主：bundle 在启动时组装并带 rev 哈希）
# 用法：pwsh -File scripts/test-restart-web.ps1 [-Port 57991]
param([int]$Port = 57991)

$Root = 'D:\DSH-plugins\.aether-test-home'
$p = (Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction SilentlyContinue).OwningProcess
if ($p) { Stop-Process -Id $p -Force -ErrorAction SilentlyContinue; Start-Sleep -Seconds 2 }

$env:DSH_HOME = $Root
$log = Join-Path $Root 'web.log'
Remove-Item $log -ErrorAction SilentlyContinue
Start-Process -FilePath 'D:\DSH\resources\runtime\cli\bin\dsh.cmd' `
  -ArgumentList '--profile','aethertest','--port',"$Port",'--no-open' `
  -RedirectStandardOutput $log -RedirectStandardError (Join-Path $Root 'web.err.log') -NoNewWindow

for ($i = 0; $i -lt 40; $i++) {
  Start-Sleep -Milliseconds 800
  $line = (Get-Content $log -Raw -ErrorAction SilentlyContinue)
  if ($line -and $line -match 'dsh web: (\S+)') { $matches[1]; break }
}
