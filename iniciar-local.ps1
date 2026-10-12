$ErrorActionPreference = 'Stop'
$project = Split-Path -Parent $MyInvocation.MyCommand.Path

$node = (Get-Command node -ErrorAction SilentlyContinue).Source
if (-not $node) {
  throw 'No se encontró Node.js. Instálalo y vuelve a ejecutar este archivo.'
}

$python = $null
$pyLauncher = Get-Command py -ErrorAction SilentlyContinue
if ($pyLauncher) {
  $python = $pyLauncher.Source
  $pythonArgs = @('-3', 'api/local_server.py')
} else {
  $pythonCommand = Get-Command python -ErrorAction SilentlyContinue
  if ($pythonCommand -and $pythonCommand.Source -notlike '*WindowsApps*') {
    $python = $pythonCommand.Source
    $pythonArgs = @('api/local_server.py')
  }
}

if (-not $python) {
  $codexPython = Join-Path $env:USERPROFILE '.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe'
  if (Test-Path $codexPython) {
    $python = $codexPython
    $pythonArgs = @('api/local_server.py')
  } else {
    throw 'No se encontró Python instalado. Instala Python 3 y habilita el comando py o python.'
  }
}

Start-Process -FilePath $python -ArgumentList $pythonArgs -WorkingDirectory $project
Start-Sleep -Seconds 2
Start-Process -FilePath $node -ArgumentList @('node_modules/@angular/cli/bin/ng.js', 'serve', '--host', '0.0.0.0', '--proxy-config', 'proxy.conf.json', '--port', '4200', '--prebundle=false') -WorkingDirectory $project

Write-Host 'Iniciando la API en http://localhost:8000 y Angular en http://localhost:4200.' -ForegroundColor Green
Write-Host 'Cuando Angular muestre "Local: http://localhost:4200/", abre esa dirección en el navegador.'
