# Automated 3-day push script for the SOCWatch project (author: Nishen Madawa).
# Run unattended by Windows Task Scheduler. Re-scans for secrets before every push
# and aborts without pushing if anything suspicious is found, since new files could
# land in the project folder between scheduled runs.

$ErrorActionPreference = "Stop"
$repo = "F:\CCA Internship Project"
$log  = Join-Path $repo "scheduled-push.log"
$git  = "C:\Program Files\Git\cmd\git.exe"

function Write-Log($msg) {
    $line = "[{0}] {1}" -f (Get-Date -Format "yyyy-MM-dd HH:mm:ss"), $msg
    Add-Content -Path $log -Value $line
}

Set-Location $repo
Write-Log "Scheduled push run started."

# --- Secret scan gate ---
$secretHit = $false
$patterns = @("AKIA[0-9A-Z]{16}", "-----BEGIN[ A-Z]*PRIVATE KEY-----")
$trackedFiles = & $git ls-files
$untrackedNew = & $git ls-files --others --exclude-standard

foreach ($f in ($trackedFiles + $untrackedNew)) {
    if (-not (Test-Path $f -PathType Leaf)) { continue }
    if ($f -match "\.(png|jpg|jpeg|docx|pdf|pptx|zip)$") { continue }
    $content = Get-Content -Raw -Path $f -ErrorAction SilentlyContinue
    if ($null -eq $content) { continue }
    foreach ($p in $patterns) {
        if ($content -match $p) {
            Write-Log "ABORT: possible secret pattern '$p' found in '$f'."
            $secretHit = $true
        }
    }
}
# Named credential files must never be tracked, regardless of .gitignore state
foreach ($name in @("socwatch-admin_credentials.csv", "SOCuser detels.txt")) {
    if ($trackedFiles -contains $name) {
        Write-Log "ABORT: credential file '$name' is tracked by git."
        $secretHit = $true
    }
}

if ($secretHit) {
    Write-Log "Push aborted due to secret scan hit. Manual review required."
    exit 1
}

# --- Stage, commit, push ---
& $git add -A
$staged = & $git diff --cached --name-only
if (-not $staged) {
    Write-Log "No changes to commit. Skipping push."
    exit 0
}

$msg = "Scheduled update ({0}): automated 3-day cadence push" -f (Get-Date -Format "yyyy-MM-dd HH:mm")
& $git commit -m $msg | Out-Null
& $git push 2>> $log

if ($LASTEXITCODE -eq 0) {
    Write-Log "Push succeeded: $msg"
} else {
    Write-Log "Push FAILED (exit code $LASTEXITCODE). Manual review required."
}
