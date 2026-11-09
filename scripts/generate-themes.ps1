param(
  [Parameter(Mandatory = $true)]
  [string[]]$ThemeIds
)

$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"

$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$themesRoot = Join-Path $root "assets\themes"
$apiKey = $env:SHUMAI_KEY

if (-not $apiKey) {
  throw "SHUMAI_KEY is not set"
}

$themes = @{
  "moon-ink" = @{
    label = "moon ink, midnight navy, silver blue, moon white, deep charcoal frosted glass"
    wallpaper = "Vertical smartphone wallpaper, midnight ink and moonlit frosted glass aesthetic, deep navy blue layered translucent acrylic panels, silver-blue edge light, pale moon-white mist, subtle starless night gradient, fine grain, elegant and quiet, premium mobile UI background, no text, no logo, no people, no watermark, 9:16 portrait composition"
    avatars = "A precise 3x3 contact sheet of nine distinct diverse adult portrait headshots, cinematic editorial portrait style, midnight navy and moon-white frosted glass color grading, soft silver rim light, elegant mature expressions, each face centered in its own equal square cell with thin pale divider lines, premium mobile app character avatars, no text, no logo, no watermark"
    icons = "A precise 4-column by 3-row grid of twelve separate premium mobile app icons, midnight navy and moon-white frosted glass style, translucent rounded-square tiles with silver-blue edge glow, minimal luminous symbols in this exact left-to-right top-to-bottom order: chat bubble, two people contacts, heart photo moments, telephone handset, photo gallery, open diary book, calendar, wallet, music note, forum bubbles, glowing memory orb, gear settings. Equal gutters, consistent icon weight, clean dark background, no text, no labels, no watermark"
  }
  "celadon-mist" = @{
    label = "celadon mist, porcelain white, moss green, soft oriental frosted glass"
    wallpaper = "Vertical smartphone wallpaper, celadon mist and porcelain frosted glass aesthetic, pale jade green layered translucent acrylic panels, moss-green depth, warm porcelain white mist, delicate bamboo-shadow softness without literal plants, fine ceramic grain, serene oriental premium mobile UI background, no text, no logo, no people, no watermark, 9:16 portrait composition"
    avatars = "A precise 3x3 contact sheet of nine distinct diverse adult portrait headshots, refined cinematic portrait style, celadon green, porcelain white and warm moss color grading, soft diffused daylight, calm elegant expressions, each face centered in its own equal square cell with thin pale divider lines, premium mobile app character avatars, no text, no logo, no watermark"
    icons = "A precise 4-column by 3-row grid of twelve separate premium mobile app icons, celadon green and porcelain frosted glass style, translucent rounded-square tiles with warm jade edge glow, minimal luminous symbols in this exact left-to-right top-to-bottom order: chat bubble, two people contacts, heart photo moments, telephone handset, photo gallery, open diary book, calendar, wallet, music note, forum bubbles, glowing memory orb, gear settings. Equal gutters, consistent icon weight, clean pale background, no text, no labels, no watermark"
  }
  "sea-glass" = @{
    label = "sea glass, salt cyan, pale lagoon blue, sand white, luminous coastal frosted glass"
    wallpaper = "Vertical smartphone wallpaper, sea glass and salt-air frosted glass aesthetic, pale cyan and lagoon blue layered translucent acrylic panels, sunlit sand-white haze, soft aqua edge glow, gentle underwater caustics, fine mineral grain, fresh coastal premium mobile UI background, no text, no logo, no people, no watermark, 9:16 portrait composition"
    avatars = "A precise 3x3 contact sheet of nine distinct diverse adult portrait headshots, sunlit cinematic portrait style, sea-glass cyan, lagoon blue and sand-white color grading, soft coastal daylight, natural relaxed expressions, each face centered in its own equal square cell with thin pale divider lines, premium mobile app character avatars, no text, no logo, no watermark"
    icons = "A precise 4-column by 3-row grid of twelve separate premium mobile app icons, sea-glass cyan and sand-white frosted glass style, translucent rounded-square tiles with soft aqua edge glow, minimal luminous symbols in this exact left-to-right top-to-bottom order: chat bubble, two people contacts, heart photo moments, telephone handset, photo gallery, open diary book, calendar, wallet, music note, forum bubbles, glowing memory orb, gear settings. Equal gutters, consistent icon weight, clean pale background, no text, no labels, no watermark"
  }
  "amber-dusk" = @{
    label = "amber dusk, smoky brown, cream gold, warm sunset frosted glass"
    wallpaper = "Vertical smartphone wallpaper, amber dusk and smoked-glass aesthetic, honey amber and smoky brown layered translucent acrylic panels, cream-gold edge light, warm late-sunset haze, subtle ember glow, fine grain, intimate premium mobile UI background, no text, no logo, no people, no watermark, 9:16 portrait composition"
    avatars = "A precise 3x3 contact sheet of nine distinct diverse adult portrait headshots, warm cinematic portrait style, amber, smoked brown and cream-gold color grading, golden-hour rim light, intimate confident expressions, each face centered in its own equal square cell with thin pale divider lines, premium mobile app character avatars, no text, no logo, no watermark"
    icons = "A precise 4-column by 3-row grid of twelve separate premium mobile app icons, amber and cream-gold smoked frosted glass style, translucent rounded-square tiles with warm honey edge glow, minimal luminous symbols in this exact left-to-right top-to-bottom order: chat bubble, two people contacts, heart photo moments, telephone handset, photo gallery, open diary book, calendar, wallet, music note, forum bubbles, glowing memory orb, gear settings. Equal gutters, consistent icon weight, clean warm background, no text, no labels, no watermark"
  }
  "lilac-dawn" = @{
    label = "lilac dawn, morning pink, iris purple, pearly white frosted glass"
    wallpaper = "Vertical smartphone wallpaper, lilac dawn and morning-mist frosted glass aesthetic, pale iris purple and blush pink layered translucent acrylic panels, pearly white edge glow, soft sunrise haze, delicate dew-like highlights, fine grain, dreamy premium mobile UI background, no text, no logo, no people, no watermark, 9:16 portrait composition"
    avatars = "A precise 3x3 contact sheet of nine distinct diverse adult portrait headshots, dreamy cinematic portrait style, lilac, blush pink and pearly white color grading, soft dawn light, gentle confident expressions, each face centered in its own equal square cell with thin pale divider lines, premium mobile app character avatars, no text, no logo, no watermark"
    icons = "A precise 4-column by 3-row grid of twelve separate premium mobile app icons, lilac and pearly-white frosted glass style, translucent rounded-square tiles with iris-purple edge glow, minimal luminous symbols in this exact left-to-right top-to-bottom order: chat bubble, two people contacts, heart photo moments, telephone handset, photo gallery, open diary book, calendar, wallet, music note, forum bubbles, glowing memory orb, gear settings. Equal gutters, consistent icon weight, clean pale background, no text, no labels, no watermark"
  }
}

$jobs = foreach ($themeId in $ThemeIds) {
  if (-not $themes.ContainsKey($themeId)) {
    throw "Unknown theme: $themeId"
  }

  $theme = $themes[$themeId]
  $destination = Join-Path $themesRoot $themeId
  New-Item -ItemType Directory -Force -Path $destination | Out-Null
  $logPath = Join-Path $destination "generate.log"
  Set-Content -LiteralPath $logPath -Value "theme $themeId / $($theme.label)"

  Start-Job -Name $themeId -ArgumentList $themeId, $theme, $destination, $logPath, $apiKey -ScriptBlock {
    param($themeId, $theme, $destination, $logPath, $apiKey)
    $env:SHUMAI_KEY = $apiKey
    $ProgressPreference = "SilentlyContinue"

    function Invoke-ThemeImage {
      param($Prompt, $Size, $OutputFormat, $OutputPath, $LogPath)

      $body = @{
        model = "gpt-image-2.6-sunburst"
        prompt = $Prompt
        n = 1
        size = $Size
        quality = "high"
        response_format = "url"
        output_format = $OutputFormat
      } | ConvertTo-Json -Depth 5

      if ((Test-Path -LiteralPath $OutputPath) -and (Get-Item -LiteralPath $OutputPath).Length -gt 10000) {
        Add-Content -LiteralPath $LogPath -Value "skip existing $([IO.Path]::GetFileName($OutputPath))"
        return
      }

      Add-Content -LiteralPath $LogPath -Value "request $([IO.Path]::GetFileName($OutputPath)) $Size"
      $response = $null
      for ($attempt = 1; $attempt -le 6; $attempt++) {
        try {
          $response = Invoke-RestMethod -Method Post `
            -Uri "https://shumai.online/v1/images/generations" `
            -Headers @{ Authorization = "Bearer $apiKey"; "Content-Type" = "application/json" } `
            -Body $body `
            -TimeoutSec 300
          break
        }
        catch {
          $message = $_.Exception.Message
          $retryable = $message -match "429|500|502|503|504|timed out|Timeout|remote"
          Add-Content -LiteralPath $LogPath -Value "attempt $attempt failed: $message"
          if (-not $retryable -or $attempt -eq 6) {
            throw
          }
          Start-Sleep -Seconds (15 * $attempt)
        }
      }

      $url = $response.data[0].url
      if (-not $url) {
        throw "No URL returned for $OutputPath"
      }

      Add-Content -LiteralPath $LogPath -Value "download $url"
      $tmp = "$OutputPath.part"
      & curl.exe -sS -L --retry 4 --retry-delay 3 --connect-timeout 20 --max-time 600 -o $tmp $url
      if ($LASTEXITCODE -ne 0) {
        throw "curl failed for $OutputPath"
      }

      $length = (Get-Item -LiteralPath $tmp).Length
      if ($length -lt 10000) {
        throw "Downloaded file too small for $OutputPath ($length bytes)"
      }

      Move-Item -LiteralPath $tmp -Destination $OutputPath -Force
      Add-Content -LiteralPath $LogPath -Value "ok $([IO.Path]::GetFileName($OutputPath)) $length"
    }

    try {
      Invoke-ThemeImage -Prompt $theme.wallpaper -Size "1024x1536" -OutputFormat "png" -OutputPath (Join-Path $destination "wallpaper.png") -LogPath $logPath
      Invoke-ThemeImage -Prompt $theme.avatars -Size "1024x1024" -OutputFormat "webp" -OutputPath (Join-Path $destination "avatars.webp") -LogPath $logPath
      Invoke-ThemeImage -Prompt $theme.icons -Size "1024x1024" -OutputFormat "webp" -OutputPath (Join-Path $destination "icons.webp") -LogPath $logPath
      Add-Content -LiteralPath $logPath -Value "DONE"
    }
    catch {
      Add-Content -LiteralPath $logPath -Value "ERROR $($_.Exception.Message)"
      throw
    }
  }
}

$jobs | Wait-Job | Out-Null
$failed = $jobs | Where-Object State -ne "Completed"
$jobs | Receive-Job
$jobs | Remove-Job

if ($failed) {
  throw "Some theme jobs failed: $($failed.Name -join ', ')"
}

Write-Output "Generated: $($ThemeIds -join ', ')"
