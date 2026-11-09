param(
  [Parameter(Mandatory = $true)]
  [string[]]$ThemeIds
)

$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"

$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$themesRoot = Join-Path $root "assets\themes-v2"
$apiKey = $env:SHUMAI_KEY

if (-not $apiKey) {
  throw "SHUMAI_KEY is not set"
}

$themes = @{
  "rose-frost" = @{
    label = "法式玫瑰 · 珍珠蕾丝 · 晨光毛边玻璃"
    wallpaper = "Vertical 9:16 smartphone wallpaper for a feminine AI companion phone. A French vanity still life: blush garden roses pressed beneath rippled frosted glass, ivory lace, a loose champagne silk ribbon, scattered pearls, a vintage perfume bottle silhouette, soft morning window light, mauve shadows. High-end editorial still-life photography, translucent layered acrylic, soft diffusion, pearl sheen, fine film grain, shallow depth of field, dreamy but refined, not childish, not kitsch. Calm negative space in the upper third for a clock. Palette: blush rose, ivory, champagne, muted mauve. No text, no letters, no logo, no watermark, no people, no hands."
    avatars = "A precise 3x3 contact sheet of nine distinct adult character portraits for a premium otome romance visual novel. Delicate semi-realistic digital illustration, soft airbrush and fine pencil texture, luminous skin, expressive eyes, editorial beauty lighting. Beautiful adult women and handsome adult men, diverse features, elegant modern hair and clothing. Unified French rose palette: blush, ivory, champagne, mauve, with pressed rose and pearl details in the background. Each bust centered in its own equal square cell with thin clean divider lines, consistent art direction, dreamy and refined, no text, no logo, no watermark."
  }
  "moon-ink" = @{
    label = "月光芭蕾 · 黑天鹅 · 午夜玻璃"
    wallpaper = "Vertical 9:16 smartphone wallpaper for a feminine AI companion phone. A moonlit ballet dressing room still life: sheer midnight tulle, a single silver pointe shoe, a black swan feather, a pearl hairpin, smoky frosted glass, cool moonlight and silver edge glow, deep navy shadows. High-end editorial still-life photography, translucent layered acrylic, soft diffusion, pearl sheen, fine film grain, shallow depth of field, elegant dark feminine mood, not gothic, not childish. Calm negative space in the upper third for a clock. Palette: midnight navy, silver blue, moon white, smoked charcoal. No text, no letters, no logo, no watermark, no people, no hands."
    avatars = "A precise 3x3 contact sheet of nine distinct adult character portraits for a premium otome romance visual novel. Delicate semi-realistic digital illustration, soft airbrush and fine pencil texture, luminous skin, expressive eyes, cool editorial beauty lighting. Beautiful adult women and handsome adult men, diverse features, elegant modern hair and clothing. Unified moonlit ballet palette: midnight navy, silver blue, moon white, smoked charcoal, with tulle and pearl details in the background. Each bust centered in its own equal square cell with thin clean divider lines, consistent art direction, elegant and restrained, no text, no logo, no watermark."
  }
  "celadon-mist" = @{
    label = "青瓷花园 · 白茶花 · 东方雾玻璃"
    wallpaper = "Vertical 9:16 smartphone wallpaper for a feminine AI companion phone. An oriental celadon garden still life: white camellias and slender jade leaves behind misty frosted glass, a porcelain teacup, soft bamboo shadows, ink-wash mist, quiet moss-green depth. High-end editorial still-life photography, translucent layered acrylic, soft diffusion, porcelain sheen, fine film grain, shallow depth of field, serene and refined, not theatrical. Calm negative space in the upper third for a clock. Palette: pale jade, porcelain white, soft moss, ink grey. No text, no letters, no logo, no watermark, no people, no hands."
    avatars = "A precise 3x3 contact sheet of nine distinct adult character portraits for a premium otome romance visual novel. Delicate semi-realistic digital illustration, soft airbrush and fine pencil texture, luminous skin, expressive eyes, soft diffused beauty lighting. Beautiful adult women and handsome adult men, diverse features, elegant modern and subtle oriental-inspired clothing. Unified celadon garden palette: pale jade, porcelain white, moss green, ink grey, with camellia and mist details in the background. Each bust centered in its own equal square cell with thin clean divider lines, consistent art direction, serene and refined, no text, no logo, no watermark."
  }
  "sea-glass" = @{
    label = "海盐汽水 · 贝壳琉璃 · 日光玻璃"
    wallpaper = "Vertical 9:16 smartphone wallpaper for a feminine AI companion phone. A sunlit seaside vanity still life: sea glass, iridescent shell, salt crystals, a ribbon of pale aqua silk, gentle water ripples beneath frosted glass, sand-white haze, fresh pearl highlights. High-end editorial still-life photography, translucent layered acrylic, soft diffusion, sea-glass sheen, fine film grain, shallow depth of field, fresh and airy, not cartoonish. Calm negative space in the upper third for a clock. Palette: sea-glass aqua, pale lagoon blue, sand white, pearl. No text, no letters, no logo, no watermark, no people, no hands."
    avatars = "A precise 3x3 contact sheet of nine distinct adult character portraits for a premium otome romance visual novel. Delicate semi-realistic digital illustration, soft airbrush and fine pencil texture, luminous skin, expressive eyes, fresh sunlit beauty lighting. Beautiful adult women and handsome adult men, diverse features, breezy modern hair and clothing. Unified sea-glass palette: aqua, lagoon blue, sand white, pearl, with sea glass and salt-air details in the background. Each bust centered in its own equal square cell with thin clean divider lines, consistent art direction, fresh and luminous, no text, no logo, no watermark."
  }
  "amber-dusk" = @{
    label = "琥珀胶片 · 干玫瑰 · 落日玻璃"
    wallpaper = "Vertical 9:16 smartphone wallpaper for a feminine AI companion phone. A golden-hour boudoir still life: dried amber roses, smoked glass, a folded caramel silk scarf, vintage film grain, honey light and warm shadows, a faint perfume-bottle glow. High-end editorial still-life photography, translucent layered acrylic, soft diffusion, amber sheen, fine film grain, shallow depth of field, intimate and nostalgic, not rustic. Calm negative space in the upper third for a clock. Palette: amber, caramel, cream, smoked brown, muted gold. No text, no letters, no logo, no watermark, no people, no hands."
    avatars = "A precise 3x3 contact sheet of nine distinct adult character portraits for a premium otome romance visual novel. Delicate semi-realistic digital illustration, soft airbrush and fine pencil texture, luminous skin, expressive eyes, warm golden-hour beauty lighting. Beautiful adult women and handsome adult men, diverse features, elegant modern hair and clothing. Unified amber dusk palette: amber, caramel, cream, smoked brown, with dried rose and film-light details in the background. Each bust centered in its own equal square cell with thin clean divider lines, consistent art direction, intimate and cinematic, no text, no logo, no watermark."
  }
  "lilac-dawn" = @{
    label = "紫藤晨雾 · 蝶翼 · 梦境玻璃"
    wallpaper = "Vertical 9:16 smartphone wallpaper for a feminine AI companion phone. A lilac dawn garden still life: wisteria petals, morning dew, a translucent butterfly wing, pale lavender silk, frosted glass, drifting mist and pearl-pink light, airy and dreamy. High-end editorial still-life photography, translucent layered acrylic, soft diffusion, pearl sheen, fine film grain, shallow depth of field, delicate and ethereal, not sugary. Calm negative space in the upper third for a clock. Palette: lilac, iris purple, morning pink, pearly white. No text, no letters, no logo, no watermark, no people, no hands."
    avatars = "A precise 3x3 contact sheet of nine distinct adult character portraits for a premium otome romance visual novel. Delicate semi-realistic digital illustration, soft airbrush and fine pencil texture, luminous skin, expressive eyes, dreamy dawn beauty lighting. Beautiful adult women and handsome adult men, diverse features, elegant modern hair and clothing. Unified lilac dawn palette: lilac, iris purple, morning pink, pearly white, with wisteria and butterfly details in the background. Each bust centered in its own equal square cell with thin clean divider lines, consistent art direction, ethereal and refined, no text, no logo, no watermark."
  }
}

function Invoke-Generation {
  param(
    [string]$Prompt,
    [string]$Size,
    [string]$Format,
    [string]$OutputPath,
    [string]$LogPath
  )

  if ((Test-Path -LiteralPath $OutputPath) -and (Get-Item -LiteralPath $OutputPath).Length -gt 10000) {
    Add-Content -LiteralPath $LogPath -Value "skip existing $([IO.Path]::GetFileName($OutputPath))"
    return
  }

  $body = @{
    model = "gpt-image-2.5-sunburst"
    prompt = $Prompt
    n = 1
    size = $Size
    quality = "high"
    response_format = "url"
    output_format = $Format
  } | ConvertTo-Json -Depth 5

  Add-Content -LiteralPath $LogPath -Value "request $([IO.Path]::GetFileName($OutputPath)) $Size"
  $response = $null
  for ($attempt = 1; $attempt -le 8; $attempt++) {
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
      $retryable = $message -match "429|500|502|503|504|SSL|timed out|Timeout|remote"
      Add-Content -LiteralPath $LogPath -Value "attempt $attempt failed: $message"
      if (-not $retryable -or $attempt -eq 8) {
        throw
      }
      Start-Sleep -Seconds (12 * $attempt)
    }
  }

  $url = $response.data[0].url
  if (-not $url) {
    throw "No URL returned for $OutputPath"
  }

  Add-Content -LiteralPath $LogPath -Value "download $url"
  $tmp = "$OutputPath.part"
  & curl.exe -sS -L --retry 5 --retry-delay 3 --connect-timeout 20 --max-time 900 -o $tmp $url
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

    function Invoke-Generation {
      param($Prompt, $Size, $Format, $OutputPath, $LogPath)

      if ((Test-Path -LiteralPath $OutputPath) -and (Get-Item -LiteralPath $OutputPath).Length -gt 10000) {
        Add-Content -LiteralPath $LogPath -Value "skip existing $([IO.Path]::GetFileName($OutputPath))"
        return
      }

      $body = @{
        model = "gpt-image-2.5-sunburst"
        prompt = $Prompt
        n = 1
        size = $Size
        quality = "high"
        response_format = "url"
        output_format = $Format
      } | ConvertTo-Json -Depth 5

      Add-Content -LiteralPath $LogPath -Value "request $([IO.Path]::GetFileName($OutputPath)) $Size"
      $response = $null
      for ($attempt = 1; $attempt -le 8; $attempt++) {
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
          $retryable = $message -match "429|500|502|503|504|SSL|timed out|Timeout|remote"
          Add-Content -LiteralPath $LogPath -Value "attempt $attempt failed: $message"
          if (-not $retryable -or $attempt -eq 8) {
            throw
          }
          Start-Sleep -Seconds (12 * $attempt)
        }
      }

      $url = $response.data[0].url
      if (-not $url) {
        throw "No URL returned for $OutputPath"
      }

      Add-Content -LiteralPath $LogPath -Value "download $url"
      $tmp = "$OutputPath.part"
      & curl.exe -sS -L --retry 5 --retry-delay 3 --connect-timeout 20 --max-time 900 -o $tmp $url
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
      Invoke-Generation -Prompt $theme.wallpaper -Size "1024x1536" -Format "png" -OutputPath (Join-Path $destination "wallpaper.png") -LogPath $logPath
      Invoke-Generation -Prompt $theme.avatars -Size "1024x1024" -Format "webp" -OutputPath (Join-Path $destination "avatars.webp") -LogPath $logPath
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
