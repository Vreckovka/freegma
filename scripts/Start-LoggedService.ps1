function Start-LoggedService {
 param([string]$Title,[string]$FilePath,[string[]]$Arguments,[string]$WorkingDirectory,[string]$Stdout,[string]$Stderr)
 $folder=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../logs/service-terminals'))
 New-Item -ItemType Directory -Force -Path $folder | Out-Null
 $config=Join-Path $folder ([Guid]::NewGuid().ToString('N')+'.json')
 $ready=$config+'.ready'
 # Secrets stay in the inherited process environment, never in this launch record.
 @{title=$Title;file=$FilePath;arguments=$Arguments;directory=$WorkingDirectory;stdout=$Stdout;stderr=$Stderr;ready=$ready} |
  ConvertTo-Json -Depth 4 | Set-Content -LiteralPath $config -Encoding UTF8
 $shell=Join-Path $env:SystemRoot 'System32/WindowsPowerShell/v1.0/powershell.exe'
 $console=Start-Process -FilePath $shell -ArgumentList @('-NoProfile','-NoExit','-ExecutionPolicy','Bypass','-File',('"'+(Join-Path $PSScriptRoot 'Service-Console.ps1')+'"'),'-Config',('"'+$config+'"')) -WindowStyle Normal -PassThru
 for($i=0;$i -lt 120;$i++){
  if(Test-Path -LiteralPath $ready){
   try{$record=Get-Content -LiteralPath $ready -Raw | ConvertFrom-Json}catch{$record=$null}
   if($record){return Get-Process -Id $record.pid -ErrorAction Stop}
  }
  if($console.HasExited){throw "$Title terminal exited before starting the service."}
  Start-Sleep -Milliseconds 250
 }
 throw "$Title did not start within 30 seconds. Inspect its terminal."
}
