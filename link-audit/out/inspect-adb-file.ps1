$ErrorActionPreference = 'SilentlyContinue'
$t = 'D:\accelon3\ybh.adb'
$i = Get-Item $t -Force
Write-Output ('Name        : ' + $i.Name)
Write-Output ('Attributes  : ' + $i.Attributes)
Write-Output ('Length      : ' + $i.Length)
Write-Output ('LinkType    : [' + $i.LinkType + ']  Target: [' + ($i.Target -join ',') + ']')
Write-Output ('IsReparse   : ' + ($i.Attributes -band [System.IO.FileAttributes]::ReparsePoint) -ne 0)
Write-Output '--- hardlink list (fsutil) ---'
& fsutil hardlink list $t
Write-Output '--- dir listing with reparse marks ---'
& cmd /c "dir /a D:\accelon3\ybh*.adb"
