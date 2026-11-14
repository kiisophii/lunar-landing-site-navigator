<#
Card 14 - overnight run of the 948 m (ppd 32) whole-Moon sun / Earth / both map.

Resumes data/processed/gmaps_ppd32/ (the done-mask keeps finished rows, e.g. the 10 benchmark
rows 2800:2810), checks the real ephemeris, keeps the laptop awake, logs progress with
timestamps, retries after a crash, and exports to web/data/gmaps_ppd32/ (NOT web/data/gmaps/,
which holds the reviewed 3.8 km map).

Run from the repository root in a normal (visible) PowerShell window, on AC power:

    powershell -ExecutionPolicy Bypass -File pipeline\run_ppd32_overnight.ps1 -Threads 16
    powershell -ExecutionPolicy Bypass -File pipeline\run_ppd32_overnight.ps1 -AllCores   # only when no other lab job runs
    powershell -ExecutionPolicy Bypass -File pipeline\run_ppd32_overnight.ps1 -CheckOnly  # pre-flight checks, no computation

It never uses --restart. Stop any time with Ctrl+C; run the same command again to continue.
#>
param(
    [int]$Threads = 8,
    [switch]$AllCores,
    [switch]$CheckOnly,
    [switch]$AllowBattery,
    [switch]$Force,
    [switch]$NoExport,
    [int]$Retries = 3,
    [double]$MinFreeGB = 5
)
$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root
$Py = Join-Path $Root '.venv\Scripts\python.exe'
$LogDir = Join-Path $Root 'data\processed\logs'
New-Item -ItemType Directory -Force $LogDir | Out-Null
$Stamp = Get-Date -Format 'yyyyMMdd_HHmmss'
$Log = Join-Path $LogDir "ppd32_$Stamp.log"
function Log([string]$m) { $line = "{0} {1}" -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'), $m; Write-Host $line; Add-Content -Path $Log -Value $line -Encoding utf8 }

Log "card 14 ppd 32 overnight run - log $Log"
# ---------------------------------------------------------------- pre-flight
$fail = @()
if (-not (Test-Path $Py)) { $fail += "missing $Py (create .venv with numba, numpy, pillow)" }
$eph = Get-Content (Join-Path $Root 'web\data\ephem.json') -Raw | ConvertFrom-Json
if ($eph.mock -ne $false) { $fail += 'web/data/ephem.json is mock - refusing to compute' } else { Log "ephemeris: $($eph.source), n=$($eph.n), mock=false" }
foreach ($f in 'data\raw\global\ldem_64_float.img', 'data\raw\global\ldem_16_float.img') { if (-not (Test-Path (Join-Path $Root $f))) { $fail += "missing $f (pipeline/fetch_global.py)" } }
$store = Join-Path $Root 'data\processed\gmaps_ppd32\meta.json'
if (Test-Path $store) {
    $sig = (Get-Content $store -Raw | ConvertFrom-Json).signature
    Log ("store: near {0}, far {1}, step {2} h, ephem mock {3}" -f $sig.near.name, $sig.far.name, $sig.ephem.step_h, $sig.ephem.mock)
    if ($sig.ephem.mock -ne $false -or $sig.ephem.step_h -ne 3) { $fail += 'existing ppd32 store was made with other settings' }
}
$drive = (Get-Item $Root).PSDrive
$freeGB = [math]::Round($drive.Free / 1GB, 1)
Log "free disk on $($drive.Name): $freeGB GB (need >= $MinFreeGB GB; store 1.33 GB + export ~0.1 GB)"
if ($freeGB -lt $MinFreeGB) { $fail += "only $freeGB GB free" }
$bat = Get-CimInstance Win32_Battery -ErrorAction SilentlyContinue
if ($bat) {
    Log ("battery {0} %, status {1} (2 = on AC)" -f $bat.EstimatedChargeRemaining, $bat.BatteryStatus)
    if ($bat.BatteryStatus -ne 2 -and -not $AllowBattery) { $fail += 'not on AC power - plug in the charger (or pass -AllowBattery)' }
}
$lid = (powercfg /query SCHEME_CURRENT 4f971e89-eebd-4455-a8de-9e59040e7347 5ca83367-6e45-459f-a27b-476b1d01c936) | Select-String '0x0000000' | Select-Object -Last 2
if ($lid) { Log ("lid close action (AC, DC index; 0x0 = do nothing): " + ($lid -join ' | ').Trim()) }
else { Log 'lid close action is not exposed by this power scheme - keep the lid OPEN overnight' }
$others = Get-CimInstance Win32_Process -Filter "Name='python.exe'" | Where-Object { $_.CommandLine -notmatch 'global_maps' -and $_.CommandLine -match '\S' }
$busy = @()
foreach ($o in $others) { $p = Get-Process -Id $o.ProcessId -ErrorAction SilentlyContinue; if ($p -and $p.CPU -gt 60) { $busy += "$($o.ProcessId): $($o.CommandLine)" } }
if ($busy.Count) { Log "other python processes with CPU time > 60 s:"; $busy | ForEach-Object { Log "  $_" } }
$nCores = [Environment]::ProcessorCount
$t = if ($AllCores) { $nCores } else { [math]::Min($Threads, $nCores) }
if ($AllCores -and $busy.Count -and -not $Force) { $fail += 'other python jobs are running - use -Threads N, or -Force once they are finished' }
Log "threads: $t of $nCores logical CPUs"
# From here on only native python calls (checked via $LASTEXITCODE). In Windows PowerShell 5.1,
# 'Stop' turns every stderr line of a native command under 2>&1 (numba warnings, etc.) into a
# terminating error, which killed the first run attempt; so use 'Continue'.
$ErrorActionPreference = 'Continue'
& $Py pipeline\global_maps.py status --ppd 32 2>&1 | ForEach-Object { Log "status: $_" }
if ($fail.Count) { $fail | ForEach-Object { Log "PRE-FLIGHT FAIL: $_" }; exit 2 }
if ($CheckOnly) { Log 'pre-flight OK (check only, nothing computed)'; exit 0 }

# ---------------------------------------------------------------- keep awake while running
Add-Type -Namespace Win -Name Power -MemberDefinition '[DllImport("kernel32.dll")] public static extern uint SetThreadExecutionState(uint f);'
[void][Win.Power]::SetThreadExecutionState([Convert]::ToUInt32('80000001', 16))   # ES_CONTINUOUS | ES_SYSTEM_REQUIRED; PS 5.1 parses 0x80000001 as a negative int32
try {
    # [string[]]: an 'if' expression unrolls a 1-element array to a plain string, and splatting
    # a string passes it character by character ("- - a l l - c o r e s").
    [string[]]$tArg = if ($AllCores) { @('--all-cores') } else { @('--threads', "$t") }
    $ok = $false
    for ($i = 1; $i -le $Retries -and -not $ok; $i++) {
        Log "run attempt $i/$Retries"
        $t0 = Get-Date
        & $Py -u pipeline\global_maps.py run --ppd 32 --step-h 3 @tArg 2>&1 | ForEach-Object { Log "$_" }
        $code = $LASTEXITCODE
        Log ("attempt {0} exit code {1} after {2:N1} h" -f $i, $code, ((Get-Date) - $t0).TotalHours)
        $st = (& $Py pipeline\global_maps.py status --ppd 32 2>&1) -join ' '
        Log "status: $st"
        if ($code -eq 0 -and $st -match '5760/5760') { $ok = $true } elseif ($i -lt $Retries) { Log 'resuming in 60 s (finished rows are kept)'; Start-Sleep 60 }
    }
    if (-not $ok) { Log 'NOT FINISHED - rerun this script to continue; see the log above for the error'; exit 1 }
    if (-not $NoExport) {
        Log 'export -> web/data/gmaps_ppd32/ (web/data/gmaps/ = 3.8 km map is not touched)'
        & $Py -u pipeline\global_maps.py export --ppd 32 --web web\data\gmaps_ppd32 2>&1 | ForEach-Object { Log "$_" }
        if ($LASTEXITCODE -ne 0) { Log "export failed (exit $LASTEXITCODE)"; exit 3 }
    }
    Log 'DONE'
} finally {
    [void][Win.Power]::SetThreadExecutionState([Convert]::ToUInt32('80000000', 16))   # ES_CONTINUOUS only: back to normal sleep rules
}
