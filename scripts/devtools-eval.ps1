#Requires -Version 5.1
<#
  在「DSH 桌面版的 DevTools 控制台」里执行一段 JS，并把结果从剪贴板读回来。

  为什么要这么绕：DSH 桌面版是 Node SEA + 内部 Electron，拿不到 CDP 端口，
  唯一的真实渲染进程通道就是已经开着的 DevTools 控制台。

  做法：
    1. 把 JS 写进剪贴板（单行）
    2. 找到标题以 "Developer Tools" 开头的窗口并置前
    3. 校验前台窗口确实是它（不是就立刻中止，避免误输入到底座窗口）
    4. Ctrl+V 粘贴 → Enter 执行
    5. JS 末尾自带 copy(JSON.stringify(...))，结果回到剪贴板，这里读出来

  用法：
    pwsh -File devtools-eval.ps1 -File <js文件> [-WaitMs 1200]
    pwsh -File devtools-eval.ps1 -Js "1+1; copy(String(2))"
    pwsh -File devtools-eval.ps1 -Shot <out.png>      # 只截图 DevTools 窗口
#>
param(
  [string]$File,
  [string]$Js,
  [int]$WaitMs = 1500,
  [string]$Shot,
  [string]$Type,
  [switch]$NoRun
)

$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [Text.Encoding]::UTF8

Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

if (-not ('DevTools' -as [type])) {
Add-Type @"
using System;
using System.Text;
using System.Runtime.InteropServices;
using System.Collections.Generic;
public class DevTools {
  [DllImport("user32.dll")] public static extern bool EnumWindows(EnumProc cb, IntPtr l);
  public delegate bool EnumProc(IntPtr h, IntPtr l);
  [DllImport("user32.dll", CharSet=CharSet.Unicode)] public static extern int GetWindowTextW(IntPtr h, StringBuilder s, int n);
  [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr h);
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr h, out RECT r);
  [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr h);
  [DllImport("user32.dll")] public static extern bool BringWindowToTop(IntPtr h);
  [DllImport("user32.dll")] public static extern bool AttachThreadInput(uint a, uint b, bool attach);
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr h, out uint pid);
  [DllImport("user32.dll")] public static extern IntPtr SetFocus(IntPtr h);
  [DllImport("user32.dll")] public static extern bool PrintWindow(IntPtr h, IntPtr hdc, uint flags);
  [DllImport("user32.dll")] public static extern bool SetProcessDPIAware();
  [StructLayout(LayoutKind.Sequential)] public struct RECT { public int L, T, R, B; }

  public static IntPtr Find(string prefix) {
    IntPtr found = IntPtr.Zero;
    EnumWindows((h, l) => {
      if (!IsWindowVisible(h)) return true;
      var sb = new StringBuilder(512); GetWindowTextW(h, sb, 512);
      var t = sb.ToString();
      if (t.StartsWith(prefix, StringComparison.Ordinal)) { found = h; return false; }
      return true;
    }, IntPtr.Zero);
    return found;
  }

  // 注意：绝不调用 ShowWindow(SW_RESTORE) —— 那会把用户已经摆好的 DevTools 窗口
  // "还原"成之前的尺寸并可能挪到屏幕外（本轮实测踩到过）。只做置前。
  public static bool Activate(IntPtr h) {
    uint pidA = 0, pidB = 0;
    uint fgThread = GetWindowThreadProcessId(GetForegroundWindow(), out pidA);
    uint myThread = GetWindowThreadProcessId(h, out pidB);
    bool attached = false;
    if (fgThread != myThread) attached = AttachThreadInput(fgThread, myThread, true);
    bool ok = SetForegroundWindow(h);
    BringWindowToTop(h);
    if (attached) AttachThreadInput(fgThread, myThread, false);
    System.Threading.Thread.Sleep(260);
    return GetForegroundWindow() == h;
  }

  public static bool Rect(IntPtr h, out int x, out int y, out int w, out int hh) {
    RECT r; bool ok = GetWindowRect(h, out r);
    x = r.L; y = r.T; w = r.R - r.L; hh = r.B - r.T;
    return ok && w > 0 && hh > 0;
  }
}
"@
}

[DevTools]::SetProcessDPIAware() | Out-Null

$hwnd = [DevTools]::Find('Developer Tools')
if ($hwnd -eq [IntPtr]::Zero) {
  $hwnd = [DevTools]::Find('DevTools')
}
if ($hwnd -eq [IntPtr]::Zero) { Write-Output 'ERR: 没找到 DevTools 窗口'; exit 3 }

if ($Shot) {
  $x = 0; $y = 0; $w = 0; $hh = 0
  if (-not [DevTools]::Rect($hwnd, [ref]$x, [ref]$y, [ref]$w, [ref]$hh)) { Write-Output 'ERR: 拿不到窗口矩形'; exit 4 }
  $bmp = New-Object System.Drawing.Bitmap $w, $hh
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.CopyFromScreen($x, $y, 0, 0, (New-Object System.Drawing.Size $w, $hh))
  $bmp.Save($Shot, [System.Drawing.Imaging.ImageFormat]::Png)
  $g.Dispose(); $bmp.Dispose()
  Write-Output "shot: $Shot ($($w)x$($hh) at $x,$y)"
  exit 0
}
if ($NoRun) { Write-Output "devtools hwnd = $($hwnd.ToInt64())"; exit 0 }

if ($Type) {
  # 直接敲字（不进剪贴板）：用来过一次 DevTools 的 "allow pasting" 保护
  if (-not [DevTools]::Activate($hwnd)) { Write-Output 'ERR: 无法置前，已中止'; exit 5 }
  Start-Sleep -Milliseconds 200
  [System.Windows.Forms.SendKeys]::SendWait($Type)
  Start-Sleep -Milliseconds 150
  [System.Windows.Forms.SendKeys]::SendWait('{ENTER}')
  Start-Sleep -Milliseconds $WaitMs
  Write-Output "typed: $Type"
  exit 0
}

$code = if ($Js) { $Js } else { (Get-Content -Raw -Encoding UTF8 $File).Trim() }
$code = ($code -replace '\r?\n', ' ').Trim()

Set-Clipboard -Value $code
Start-Sleep -Milliseconds 120

# 置前并校验：前台不是 DevTools 就直接放弃，绝不盲打
if (-not [DevTools]::Activate($hwnd)) {
  $fg = [DevTools]::GetForegroundWindow()
  Write-Output "ERR: 无法把 DevTools 置前（front=$($fg.ToInt64()), target=$($hwnd.ToInt64())），已中止，未发送任何输入"
  exit 5
}

# 清空剪贴板标记，避免读回旧结果
Set-Clipboard -Value '__PENDING__'
Start-Sleep -Milliseconds 60
Set-Clipboard -Value $code
Start-Sleep -Milliseconds 80

[System.Windows.Forms.SendKeys]::SendWait('^v')
Start-Sleep -Milliseconds 250
[System.Windows.Forms.SendKeys]::SendWait('{ENTER}')

Start-Sleep -Milliseconds $WaitMs

$result = Get-Clipboard -Raw
if ($null -eq $result) { $result = '' }
Write-Output $result.TrimEnd()
