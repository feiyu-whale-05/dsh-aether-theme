#Requires -Version 5.1
# 把「磨砂 / 透明度 / 遮罩」相关参数恢复为插件默认值。
# 只动 glass.* 与 wallpaper 的 dim/brightness/blur；壁纸选择、分区背景、主题色一律保留。
param(
  [int]$Port = 0
)
$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [Text.Encoding]::UTF8

if ($Port -eq 0) {
  # 从 DSH 主窗口标题找不到端口时，退化为扫描 52000-62000 里插件健康接口响应 200 的端口
  $cands = Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue |
    Where-Object { $_.LocalPort -ge 52000 -and $_.LocalPort -le 62000 } |
    Select-Object -ExpandProperty LocalPort -Unique
  foreach ($c in $cands) {
    try {
      $r = Invoke-WebRequest -Uri "http://127.0.0.1:$c/dsh-aether/api/health" -UseBasicParsing -TimeoutSec 2
      if ($r.StatusCode -eq 200) { $Port = $c; break }
    } catch { }
  }
}
if ($Port -eq 0) { throw '找不到正在运行的 aether Host 端口' }
"port = $Port"

$tok = (Get-Content "$env:USERPROFILE\.dsh\aether-theme\panel-token" -Raw).Trim()
$headers = @{ 'x-dsh-aether-token' = $tok }
$cfg = Invoke-RestMethod -Uri "http://127.0.0.1:$Port/dsh-aether/api/config" -Headers $headers
$app = $cfg.appearance

if (-not $app.glass) { $app.glass = New-Object psobject }
$g = $app.glass
$g | Add-Member -Force -NotePropertyName glassBlur      -NotePropertyValue 0
$g | Add-Member -Force -NotePropertyName backgroundBlur -NotePropertyValue 0
$g | Add-Member -Force -NotePropertyName saturation     -NotePropertyValue 1.15
$g | Add-Member -Force -NotePropertyName border         -NotePropertyValue 0.14
$g | Add-Member -Force -NotePropertyName regions        -NotePropertyValue ([pscustomobject]@{
  base = 0; sidebar = 0.55; layers = 0.55; menu = 0.74; input = 0.55; bubble = 0.5
})
$g | Add-Member -Force -NotePropertyName inputFills       -NotePropertyValue @('frosted')
$g | Add-Member -Force -NotePropertyName inputFillOpacity -NotePropertyValue 0.55
$g | Add-Member -Force -NotePropertyName chromeOpacity    -NotePropertyValue 0
$g | Add-Member -Force -NotePropertyName chromeBlur       -NotePropertyValue 14

if (-not $app.wallpaper) { $app.wallpaper = New-Object psobject }
$app.wallpaper | Add-Member -Force -NotePropertyName dim        -NotePropertyValue 0.32
$app.wallpaper | Add-Member -Force -NotePropertyName brightness -NotePropertyValue 0.85
$app.wallpaper | Add-Member -Force -NotePropertyName blur       -NotePropertyValue 0

# 主题里跟"遮罩/混合"有关的也回到默认
if (-not $app.theme) { $app.theme = New-Object psobject }
$app.theme | Add-Member -Force -NotePropertyName contrastTarget -NotePropertyValue 7
$app.theme | Add-Member -Force -NotePropertyName mixMode        -NotePropertyValue 'multiply'

$body = @{ appearance = $app } | ConvertTo-Json -Depth 30 -Compress
$r = Invoke-RestMethod -Uri "http://127.0.0.1:$Port/dsh-aether/api/config" -Method Put `
  -Headers $headers -ContentType 'application/json; charset=utf-8' `
  -Body ([Text.Encoding]::UTF8.GetBytes($body))
"saved = $($r.ok)"
"glass = " + ($g | ConvertTo-Json -Depth 5 -Compress)
"wallpaper(dim/brightness/blur) = $($app.wallpaper.dim) / $($app.wallpaper.brightness) / $($app.wallpaper.blur)"
"（壁纸 mode / 分区背景 / 主题色 未改动）"
