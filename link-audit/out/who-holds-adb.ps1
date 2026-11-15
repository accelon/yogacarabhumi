$ErrorActionPreference = 'SilentlyContinue'
$p = Get-CimInstance Win32_Process -Filter 'ProcessId=14060'
if (-not $p) { Write-Output 'PID 14060 gone'; exit }
Write-Output ('CommandLine : ' + $p.CommandLine)
Write-Output ('ExecutablePath: ' + $p.ExecutablePath)
Write-Output ('CreationDate  : ' + $p.CreationDate)
$ppId = $p.ParentProcessId
$pp = Get-CimInstance Win32_Process -Filter ('ProcessId=' + $ppId)
if ($pp) {
  Write-Output ('Parent PID ' + $ppId + ' = ' + $pp.Name)
  Write-Output ('Parent Cmd : ' + $pp.CommandLine)
} else {
  Write-Output ('Parent PID ' + $ppId + ' = gone')
}
$target = 'D:\accelon3\ybh.adb'
Write-Output '--- try open-for-write ---'
try {
  $fs = [System.IO.File]::Open($target, 'Open', 'Write', 'None')
  $fs.Close()
  Write-Output 'RESULT: openable for write (nobody holds it)'
} catch {
  Write-Output ('RESULT: blocked -> ' + $_.Exception.GetType().Name + ' : ' + $_.Exception.Message)
}
