param([Parameter(Mandatory)][string]$Config)
$ErrorActionPreference='Stop'
$launch=Get-Content -LiteralPath $Config -Raw | ConvertFrom-Json
$Host.UI.RawUI.WindowTitle=$launch.title
Write-Host $launch.title -ForegroundColor Cyan
Write-Host 'Freegma is running in this terminal. Live output follows; logs are also saved.'
Write-Host ('Logs: '+$launch.stdout+' and '+$launch.stderr)
$service=$null;$readers=@()
try{
 $arguments=@($launch.arguments | ForEach-Object {'"'+([string]$_).Replace('"','\"')+'"'})
 # Child shares this terminal, not Codex's terminal. Keep logs for recovery as well.
 $service=Start-Process -FilePath $launch.file -ArgumentList $arguments -WorkingDirectory $launch.directory -NoNewWindow -PassThru -RedirectStandardOutput $launch.stdout -RedirectStandardError $launch.stderr
 @{pid=$service.Id;terminalPid=$PID}|ConvertTo-Json|Set-Content -LiteralPath $launch.ready -Encoding UTF8
 foreach($file in @($launch.stdout,$launch.stderr)){
  $stream=[IO.File]::Open($file,[IO.FileMode]::Open,[IO.FileAccess]::Read,([IO.FileShare]::ReadWrite -bor [IO.FileShare]::Delete))
  $readers+=New-Object IO.StreamReader($stream,[Text.Encoding]::UTF8)
 }
 do{
  for($i=0;$i -lt $readers.Count;$i++){
   $text=$readers[$i].ReadToEnd()
   if($text){if($i -eq 1){Write-Host -NoNewline $text -ForegroundColor Yellow}else{Write-Host -NoNewline $text}}
  }
  if($service.HasExited){break}
  Start-Sleep -Milliseconds 250
  $service.Refresh()
 }while($true)
 Write-Host ("`nService stopped (exit code "+$service.ExitCode+').') -ForegroundColor Yellow
}finally{
 foreach($reader in $readers){$reader.Dispose()}
 if($service -and !$service.HasExited){Stop-Process -Id $service.Id -Force}
}
