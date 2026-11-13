param([int]$Port = 5180, [string]$RuntimeJar = $env:OW_JAR, [switch]$NoBrowser)
$ErrorActionPreference = 'Stop'
$gameRoot = $PSScriptRoot
if (-not $RuntimeJar) {
    $RuntimeJar = Join-Path $gameRoot '.packaging/ow-lang/target/OwIDE.jar'
}
if (-not (Test-Path -LiteralPath $RuntimeJar)) {
    throw 'Runtime OW compatible absent. Indiquez -RuntimeJar chemin/vers/OwIDE.jar (web_ui requis). Voir ow/README.md.'
}
$RuntimeJar = (Resolve-Path -LiteralPath $RuntimeJar).Path
Push-Location $gameRoot
try {
    & node 'ow/scripts/build-web.mjs'
    if ($LASTEXITCODE -ne 0) { throw 'Échec de préparation du jeu OW.' }
    Set-Location (Join-Path $gameRoot 'ow')
    $javaArgs = @("-Dow.web.port=$Port")
    if ($NoBrowser) { $javaArgs += '-Dow.web.noBrowser=true' }
    $javaArgs += @('-jar', $RuntimeJar, 'run', 'src/main_ui.ow')
    & java @javaArgs
    if ($LASTEXITCODE -ne 0) { throw 'Le jeu OW a quitté avec une erreur. Vérifiez le runtime et le port.' }
} finally { Pop-Location }
