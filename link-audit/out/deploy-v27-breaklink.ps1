$ErrorActionPreference = 'Stop'
# Break the hard link before deploying: move the accelon3 NAME aside (the other two link
# names in adb-converter build dirs keep pointing at the SAME old bytes), then place the
# new file as an independent inode. Never truncate in place here -- that would silently
# mutate another workspace's test fixtures through the hard link.
$dst    = 'D:\accelon3\ybh.adb'
$old    = 'D:\accelon3\ybh.adb.v26-oldlink'
$cand   = 'D:\2026\_scratch-ybh\ybh\ybh.adb'
$otherA = 'D:\2026\adb-converter\ts\build\tmp-ybh-probe-adb\ybh.adb'
$otherB = 'D:\2026\adb-converter\build\tmp-fusion-gate-adb\ybh\ybh.adb'

function ShaOf($p) { if (Test-Path $p) { (Get-FileHash -Algorithm SHA256 -Path $p).Hash.Substring(0,12).ToLower() } else { '(missing)' } }

Write-Output ('before: accelon3=' + (ShaOf $dst) + '  probeA=' + (ShaOf $otherA) + '  gateB=' + (ShaOf $otherB))
Write-Output ('candidate=' + (ShaOf $cand))
try {
  Move-Item -LiteralPath $dst -Destination $old -Force
  Write-Output 'renamed accelon3 name aside (link broken for this name only)'
} catch {
  Write-Output ('RENAME FAILED -> ' + $_.Exception.Message)
  exit 1
}
Copy-Item -LiteralPath $cand -Destination $dst -Force
Write-Output ('after : accelon3=' + (ShaOf $dst) + '  probeA=' + (ShaOf $otherA) + '  gateB=' + (ShaOf $otherB))
Write-Output ('oldlink kept=' + (ShaOf $old) + '  size=' + (Get-Item $old).Length)
