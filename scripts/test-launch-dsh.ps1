#Requires -Version 5.1
# 在隐藏桌面上启动一个"隔离的" DSH 桌面版实例，用于插件实测。
#
# 隔离三件套（缺一不可）：
#   DSH_HOME     → 插件/会话/配置（否则会和用户正在跑的实例抢同一份 ~/.dsh）
#   APPDATA      → Electron 的 userData（否则单实例锁会命中，第二个实例直接退出并转交）
#   LOCALAPPDATA → Chromium 缓存
#
# 注意：DeepSeek Harness.exe 是 Node SEA（不是裸 Electron），不接受
# --remote-debugging-port / --user-data-dir 这类 Chromium 参数（会 bad option 直接退出）。
$ErrorActionPreference = 'Continue'

$Root     = 'D:\DSH-plugins\.aether-test-home'
$LogFile  = Join-Path $Root 'launch.log'
$Roaming  = Join-Path $Root 'AppData\Roaming'
$Local    = Join-Path $Root 'AppData\Local'

New-Item -ItemType Directory -Force -Path $Roaming, $Local | Out-Null
$env:DSH_HOME     = $Root
$env:APPDATA      = $Roaming
$env:LOCALAPPDATA = $Local

"=== launch $(Get-Date -Format o) ===" | Out-File -FilePath $LogFile -Encoding utf8
"DSH_HOME=$env:DSH_HOME"    | Out-File -FilePath $LogFile -Append -Encoding utf8
"APPDATA=$env:APPDATA"      | Out-File -FilePath $LogFile -Append -Encoding utf8

$exe = 'D:\DSH\DeepSeek Harness.exe'
$p = Start-Process -FilePath $exe -PassThru `
      -RedirectStandardOutput (Join-Path $Root 'stdout.log') `
      -RedirectStandardError  (Join-Path $Root 'stderr.log')

"pid=$($p.Id)" | Out-File -FilePath $LogFile -Append -Encoding utf8

for ($i = 0; $i -lt 900; $i++) {
  Start-Sleep -Seconds 2
  if ($p.HasExited) {
    "exited code=$($p.ExitCode) at $(Get-Date -Format o)" | Out-File -FilePath $LogFile -Append -Encoding utf8
    break
  }
}
