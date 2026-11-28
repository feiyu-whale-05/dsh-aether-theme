#Requires -Version 5.1
# 点一次「收起侧栏」，截图；再点一次恢复，截图。
# 用 Windows PowerShell 5.1 跑（System.Drawing 在 pwsh 7 里要额外引用）。
param(
  [int]$CssX = 26,
  [int]$CssY = 20,
  [double]$Dpr = 1.389,
  [string]$OutDir = 'D:\DSH-plugins\dsh-aether-theme\.evidence2'
)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing, System.Windows.Forms
if (-not ('SBC' -as [type])) {
Add-Type @"
using System;
using System.Text;
using System.Runtime.InteropServices;
public class SBC {
  [DllImport("user32.dll")] public static extern bool EnumWindows(EnumProc cb, IntPtr l);
  public delegate bool EnumProc(IntPtr h, IntPtr l);
  [DllImport("user32.dll", CharSet=CharSet.Unicode)] public static extern int GetWindowTextW(IntPtr h, StringBuilder s, int n);
  [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr h);
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr h, out RECT r);
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr h);
  [DllImport("user32.dll")] public static extern bool SetCursorPos(int x, int y);
  [DllImport("user32.dll")] public static extern void mouse_event(uint f, uint x, uint y, uint d, IntPtr e);
  [DllImport("user32.dll")] public static extern bool SetProcessDPIAware();
  [StructLayout(LayoutKind.Sequential)] public struct RECT { public int L, T, R, B; }
  public static IntPtr Find(string sub) {
    IntPtr f = IntPtr.Zero;
    EnumWindows((h, l) => {
      if (!IsWindowVisible(h)) return true;
      var sb = new StringBuilder(512); GetWindowTextW(h, sb, 512);
      if (sb.ToString().IndexOf(sub, StringComparison.Ordinal) >= 0) { f = h; return false; }
      return true;
    }, IntPtr.Zero);
    return f;
  }
  public static int[] Rect(IntPtr h) { RECT r; GetWindowRect(h, out r); return new int[]{ r.L, r.T, r.R-r.L, r.B-r.T }; }
  public static void Click(int x, int y) {
    SetCursorPos(x, y);
    System.Threading.Thread.Sleep(140);
    mouse_event(0x0002, 0, 0, 0, IntPtr.Zero);
    System.Threading.Thread.Sleep(70);
    mouse_event(0x0004, 0, 0, 0, IntPtr.Zero);
  }
}
"@
}
[SBC]::SetProcessDPIAware() | Out-Null

$h = [SBC]::Find('DeepSeek Harness')
if ($h -eq [IntPtr]::Zero) { 'ERR: 找不到 DSH 主窗口'; exit 3 }
$r = [SBC]::Rect($h)
"window rect: $($r -join ',')"

function Grab([string]$path) {
  $bmp = New-Object System.Drawing.Bitmap $r[2], $r[3]
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.CopyFromScreen($r[0], $r[1], 0, 0, (New-Object System.Drawing.Size $r[2], $r[3]))
  $bmp.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
  $g.Dispose(); $bmp.Dispose()
  "  saved $path"
}

[SBC]::SetForegroundWindow($h) | Out-Null
Start-Sleep -Milliseconds 600

$px = $r[0] + [int]($CssX * $Dpr)
$py = $r[1] + [int]($CssY * $Dpr)
"click at physical ($px,$py)"

[SBC]::Click($px, $py)
Start-Sleep -Milliseconds 1500
Grab (Join-Path $OutDir 'state-collapsed.png')

Start-Sleep -Milliseconds 400
[SBC]::Click($px, $py)
Start-Sleep -Milliseconds 1400
Grab (Join-Path $OutDir 'state-restored.png')
'done'
