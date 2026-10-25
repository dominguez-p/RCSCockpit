param(
  [Parameter(Mandatory = $true)]
  [string]$Root
)

$ErrorActionPreference = "Stop"

$FirstPort = 5500
$LastPort = 5510
$Root = [System.IO.Path]::GetFullPath($Root)
$IndexFile = Join-Path $Root "index.html"

function Get-ContentType {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Path
  )

  switch ([System.IO.Path]::GetExtension($Path).ToLowerInvariant()) {
    ".html" { return "text/html; charset=utf-8" }
    ".htm"  { return "text/html; charset=utf-8" }
    ".css"  { return "text/css; charset=utf-8" }
    ".js"   { return "text/javascript; charset=utf-8" }
    ".json" { return "application/json; charset=utf-8" }
    ".svg"  { return "image/svg+xml" }
    ".png"  { return "image/png" }
    ".jpg"  { return "image/jpeg" }
    ".jpeg" { return "image/jpeg" }
    ".gif"  { return "image/gif" }
    ".webp" { return "image/webp" }
    ".avif" { return "image/avif" }
    ".ico"  { return "image/x-icon" }
    ".woff" { return "font/woff" }
    ".woff2" { return "font/woff2" }
    ".ttf"  { return "font/ttf" }
    ".map"  { return "application/json; charset=utf-8" }
    ".mp4"  { return "video/mp4" }
    ".webm" { return "video/webm" }
    ".pdf"  { return "application/pdf" }
    default  { return "application/octet-stream" }
  }
}

function Send-Response {
  param(
    [Parameter(Mandatory = $true)]
    [System.Net.Sockets.NetworkStream]$Stream,

    [Parameter(Mandatory = $true)]
    [int]$StatusCode,

    [Parameter(Mandatory = $true)]
    [string]$StatusText,

    [Parameter(Mandatory = $true)]
    [byte[]]$Body,

    [Parameter(Mandatory = $true)]
    [string]$ContentType,

    [bool]$HeadOnly = $false
  )

  $Header =
    "HTTP/1.1 $StatusCode $StatusText`r`n" +
    "Content-Type: $ContentType`r`n" +
    "Content-Length: $($Body.Length)`r`n" +
    "Cache-Control: no-store, no-cache, must-revalidate`r`n" +
    "Pragma: no-cache`r`n" +
    "X-Content-Type-Options: nosniff`r`n" +
    "Referrer-Policy: strict-origin-when-cross-origin`r`n" +
    "Connection: close`r`n" +
    "`r`n"

  $HeaderBytes = [System.Text.Encoding]::ASCII.GetBytes($Header)

  $Stream.Write($HeaderBytes, 0, $HeaderBytes.Length)

  if (-not $HeadOnly -and $Body.Length -gt 0) {
    $Stream.Write($Body, 0, $Body.Length)
  }

  $Stream.Flush()
}

function Send-TextResponse {
  param(
    [Parameter(Mandatory = $true)]
    [System.Net.Sockets.NetworkStream]$Stream,

    [Parameter(Mandatory = $true)]
    [int]$StatusCode,

    [Parameter(Mandatory = $true)]
    [string]$StatusText,

    [Parameter(Mandatory = $true)]
    [string]$Text,

    [bool]$HeadOnly = $false
  )

  $Body = [System.Text.Encoding]::UTF8.GetBytes($Text)

  Send-Response `
    -Stream $Stream `
    -StatusCode $StatusCode `
    -StatusText $StatusText `
    -Body $Body `
    -ContentType "text/plain; charset=utf-8" `
    -HeadOnly $HeadOnly
}

function Start-LocalListener {
  param(
    [int]$FromPort,
    [int]$ToPort
  )

  for ($Port = $FromPort; $Port -le $ToPort; $Port += 1) {
    $Candidate = [System.Net.Sockets.TcpListener]::new(
      [System.Net.IPAddress]::Loopback,
      $Port
    )

    try {
      $Candidate.Start()

      return [PSCustomObject]@{
        Listener = $Candidate
        Port = $Port
      }
    }
    catch {
      try {
        $Candidate.Stop()
      }
      catch {
      }
    }
  }

  throw "No hay un puerto disponible entre $FromPort y $ToPort. Cierra otra instancia del Cockpit y vuelve a intentarlo."
}

if (-not (Test-Path -LiteralPath $IndexFile -PathType Leaf)) {
  throw "No se encuentra index.html en la carpeta del Cockpit: $Root"
}

$Server = Start-LocalListener -FromPort $FirstPort -ToPort $LastPort
$Listener = $Server.Listener
$Port = $Server.Port
$Url = "http://127.0.0.1:$Port/index.html"

try {
  Clear-Host

  Write-Host ""
  Write-Host "============================================================" -ForegroundColor Cyan
  Write-Host " RCS Cockpit - versión portable" -ForegroundColor Cyan
  Write-Host "============================================================" -ForegroundColor Cyan
  Write-Host ""
  Write-Host " Carpeta: $Root"
  Write-Host " URL:     $Url" -ForegroundColor Green
  Write-Host ""
  Write-Host " El navegador se abrirá automáticamente."
  Write-Host " Mantén esta ventana abierta mientras uses el Cockpit."
  Write-Host " Pulsa Ctrl+C o cierra esta ventana para detenerlo."
  Write-Host ""

  Start-Process $Url

  $RootPrefix = $Root

  if (-not $RootPrefix.EndsWith([System.IO.Path]::DirectorySeparatorChar.ToString())) {
    $RootPrefix += [System.IO.Path]::DirectorySeparatorChar
  }

  while ($true) {
    $Client = $Listener.AcceptTcpClient()
    $Stream = $null
    $Reader = $null

    try {
      $Stream = $Client.GetStream()

      $Reader = [System.IO.StreamReader]::new(
        $Stream,
        [System.Text.Encoding]::ASCII,
        $false,
        4096,
        $true
      )

      $RequestLine = $Reader.ReadLine()

      if ([string]::IsNullOrWhiteSpace($RequestLine)) {
        continue
      }

      while ($true) {
        $HeaderLine = $Reader.ReadLine()

        if ($null -eq $HeaderLine -or $HeaderLine -eq "") {
          break
        }
      }

      $Parts = $RequestLine.Split(" ")

      if ($Parts.Length -lt 2) {
        Send-TextResponse `
          -Stream $Stream `
          -StatusCode 400 `
          -StatusText "Bad Request" `
          -Text "Petición HTTP no válida."

        continue
      }

      $Method = $Parts[0].ToUpperInvariant()
      $Target = $Parts[1]
      $HeadOnly = $Method -eq "HEAD"

      if ($Method -ne "GET" -and $Method -ne "HEAD") {
        Send-TextResponse `
          -Stream $Stream `
          -StatusCode 405 `
          -StatusText "Method Not Allowed" `
          -Text "Sólo se permiten GET y HEAD." `
          -HeadOnly $HeadOnly

        continue
      }

      $PathPart = ($Target -split "\?", 2)[0]
      $DecodedPath = [System.Uri]::UnescapeDataString($PathPart)

      if ([string]::IsNullOrWhiteSpace($DecodedPath) -or $DecodedPath -eq "/") {
        $DecodedPath = "/index.html"
      }

      $NormalizedRequestPath = $DecodedPath.Replace("\", "/").ToLowerInvariant()

      if (
        $NormalizedRequestPath -eq "/.runtime" -or
        $NormalizedRequestPath.StartsWith("/.runtime/") -or
        $NormalizedRequestPath -eq "/.git" -or
        $NormalizedRequestPath.StartsWith("/.git/")
      ) {
        Send-TextResponse `
          -Stream $Stream `
          -StatusCode 404 `
          -StatusText "Not Found" `
          -Text "Recurso no encontrado." `
          -HeadOnly $HeadOnly

        continue
      }

      $RelativePath =
        $DecodedPath.TrimStart([char]"/").Replace(
          [char]"/",
          [System.IO.Path]::DirectorySeparatorChar
        )

      $FullPath = [System.IO.Path]::GetFullPath((Join-Path $Root $RelativePath))

      if (-not $FullPath.StartsWith($RootPrefix, [System.StringComparison]::OrdinalIgnoreCase)) {
        Send-TextResponse `
          -Stream $Stream `
          -StatusCode 403 `
          -StatusText "Forbidden" `
          -Text "Ruta no permitida." `
          -HeadOnly $HeadOnly

        continue
      }

      if (Test-Path -LiteralPath $FullPath -PathType Container) {
        $FullPath = Join-Path $FullPath "index.html"
      }

      if (-not (Test-Path -LiteralPath $FullPath -PathType Leaf)) {
        Send-TextResponse `
          -Stream $Stream `
          -StatusCode 404 `
          -StatusText "Not Found" `
          -Text "Recurso no encontrado." `
          -HeadOnly $HeadOnly

        continue
      }

      $Body = [System.IO.File]::ReadAllBytes($FullPath)
      $ContentType = Get-ContentType -Path $FullPath

      Send-Response `
        -Stream $Stream `
        -StatusCode 200 `
        -StatusText "OK" `
        -Body $Body `
        -ContentType $ContentType `
        -HeadOnly $HeadOnly
    }
    catch {
      try {
        if ($null -ne $Stream -and $Stream.CanWrite) {
          Send-TextResponse `
            -Stream $Stream `
            -StatusCode 500 `
            -StatusText "Internal Server Error" `
            -Text "Error sirviendo el Cockpit en local."
        }
      }
      catch {
      }

      Write-Warning $_.Exception.Message
    }
    finally {
      if ($null -ne $Reader) {
        $Reader.Dispose()
      }

      if ($null -ne $Stream) {
        $Stream.Dispose()
      }

      $Client.Close()
    }
  }
}
finally {
  $Listener.Stop()
}
