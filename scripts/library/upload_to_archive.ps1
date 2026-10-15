# Uploads the Pa-Auk sermon MP3 folders to archive.org in one go (resumable).
# Run it in a normal PowerShell window:   powershell -ExecutionPolicy Bypass -File scripts\library\upload_to_archive.ps1
# You can stop it (Ctrl+C) at any time and run it again: files already uploaded are skipped.
$ia = Join-Path (python -c "import sysconfig;print(sysconfig.get_path('scripts'))") 'ia.exe'
if (-not (Test-Path $ia)) { python -m pip install internetarchive; $ia = Join-Path (python -c "import sysconfig;print(sysconfig.get_path('scripts'))") 'ia.exe' }
$cfgDir = "$env:USERPROFILE\.config\internetarchive"
$cfg = "$cfgDir\ia.ini"
if (-not (Test-Path $cfg) -and -not (Test-Path "$env:USERPROFILE\.config\ia.ini")) {
  Write-Host "First time only. Log in to archive.org, open https://archive.org/account/s3.php and copy the two keys."
  Write-Host "(Works for Google/Gmail sign-in too: no password needed. Nothing you type here leaves this computer except to archive.org.)"
  $acc = Read-Host "Paste the ACCESS key, then press Enter"
  $secSecure = Read-Host "Paste the SECRET key, then press Enter (you will not see it)" -AsSecureString
  $sec = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($secSecure))
  New-Item -ItemType Directory -Force $cfgDir | Out-Null
  Set-Content -Path $cfg -Encoding ascii -Value "[s3]`naccess = $($acc.Trim())`nsecret = $($sec.Trim())`n"
  Write-Host "Saved to $cfg"
}
$sets = @(
  @{ item = 'paauk-dhamma-mp3-1'; dir = "$env:USERPROFILE\Downloads\Paauk_MP3_1"; title = 'Pa-Auk Sayadaw Dhamma talks (MP3 set 1)' },
  @{ item = 'paauk-dhamma-mp3-2'; dir = "$env:USERPROFILE\Downloads\Paauk_MP3_2"; title = 'Pa-Auk Sayadaw Dhamma talks (MP3 set 2)' }
)
foreach ($s in $sets) {
  Write-Host "=== $($s.item) ==="
  $files = @(Get-ChildItem $s.dir -File | Where-Object { $_.Extension -ieq '.mp3' } | Sort-Object Name | ForEach-Object { $_.FullName })
  $first = $true
  for ($i = 0; $i -lt $files.Count; $i += 20) {
    $chunk = $files[$i..([Math]::Min($i + 19, $files.Count - 1))]
    Write-Host "files $($i + 1) - $($i + $chunk.Count) of $($files.Count)"
    $meta = @()
    if ($first) { $meta = @("--metadata=mediatype:audio", "--metadata=collection:opensource_audio", "--metadata=title:$($s.title)", "--metadata=creator:Pa-Auk Sayadaw", "--metadata=subject:Dhamma;Theravada;Burmese") }
    & $ia upload $s.item @chunk --checksum --no-derive --retries 30 --sleep 20 @meta
    $first = $false
  }
}
Write-Host "Done. Audio addresses: https://archive.org/download/paauk-dhamma-mp3-1/  and  https://archive.org/download/paauk-dhamma-mp3-2/"
