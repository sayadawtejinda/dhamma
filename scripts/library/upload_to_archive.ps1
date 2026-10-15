# Uploads the Pa-Auk sermon MP3 folders to archive.org in one go (resumable).
# Run it in a normal PowerShell window:   powershell -ExecutionPolicy Bypass -File scripts\library\upload_to_archive.ps1
# You can stop it (Ctrl+C) at any time and run it again: files already uploaded are skipped.
$ia = Join-Path (python -c "import sysconfig;print(sysconfig.get_path('scripts'))") 'ia.exe'
if (-not (Test-Path $ia)) { python -m pip install internetarchive; $ia = Join-Path (python -c "import sysconfig;print(sysconfig.get_path('scripts'))") 'ia.exe' }
if (-not (Test-Path "$env:USERPROFILE\.config\internetarchive\ia.ini") -and -not (Test-Path "$env:USERPROFILE\.config\ia.ini")) {
  Write-Host "First time: log in to archive.org (your own email + password, typed here only)."
  & $ia configure
}
$sets = @(
  @{ item = 'paauk-dhamma-mp3-1'; dir = "$env:USERPROFILE\Downloads\Paauk_MP3_1"; title = 'Pa-Auk Sayadaw Dhamma talks (MP3 set 1)' },
  @{ item = 'paauk-dhamma-mp3-2'; dir = "$env:USERPROFILE\Downloads\Paauk_MP3_2"; title = 'Pa-Auk Sayadaw Dhamma talks (MP3 set 2)' }
)
foreach ($s in $sets) {
  Write-Host "=== $($s.item) ==="
  $files = Get-ChildItem $s.dir -File | Where-Object { $_.Extension -ieq '.mp3' } | ForEach-Object { $_.FullName }
  & $ia upload $s.item $files --checksum --retries 30 --retries-sleep 20 `
    --metadata="mediatype:audio" --metadata="collection:opensource_audio" `
    --metadata="title:$($s.title)" --metadata="creator:Pa-Auk Sayadaw" --metadata="subject:Dhamma;Theravada;Burmese"
}
Write-Host "Done. Audio addresses: https://archive.org/download/paauk-dhamma-mp3-1/  and  https://archive.org/download/paauk-dhamma-mp3-2/"
