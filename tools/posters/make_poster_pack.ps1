# Whylee — Poster Pack Builder (PowerShell)
# Requires: ImageMagick in PATH (magick), zip (PowerShell Compress-Archive is fine)

$src = "media/posters/src"
$out = "media/posters/build"
$wm  = "media/icons/whylee-fox.png"

$one = Join-Path $out "1x1"
$wide = Join-Path $out "16x9"
$vert = Join-Path $out "9x16"
$webp = Join-Path $out "webp"

New-Item -ItemType Directory -Force -Path $one,$wide,$vert,$webp | Out-Null

$map = @{
  "poster-1-welcome.png"   = "poster-1-start.png";
  "poster-2-level1.png"    = "poster-2-level1.png";
  "poster-3-level2.png"    = "poster-3-level2.png";
  "poster-4-level3.png"    = "poster-4-level3.png";
  "poster-5-reflection.png"= "poster-5-reflection.png";
  "poster-6-pro-invite.png"= "poster-6-pro.png";
  "poster-7-rewards.png"   = "poster-7-rewards.png";
  "poster-8-progress.png"  = "poster-8-progress.png";
  "poster-9-community.png" = "poster-9-community.png";
  "poster-10-closing.png"  = "poster-10-closing.png";
}

foreach ($k in $map.Keys) {
  $srcFile = Join-Path $src $k
  if (!(Test-Path $srcFile)) { throw "Missing $srcFile" }
  $outName = $map[$k]

  # 1:1 (2048)
  & magick "$srcFile" -resize "2048x2048^" -gravity center -extent 2048x2048 `
    "$wm" -gravity southeast -geometry +56+56 -compose over -composite `
    (Join-Path $one $outName)

  # 16:9 (3840x2160)
  & magick "$srcFile" -resize "3840x2160^" -gravity center -extent 3840x2160 `
    "$wm" -gravity southeast -geometry +80+80 -compose over -composite `
    (Join-Path $wide ($outName.Replace(".png","-16x9.png")))

  # 9:16 (1080x1920)
  & magick "$srcFile" -resize "1080x1920^" -gravity center -extent 1080x1920 `
    "$wm" -gravity southeast -geometry +40+40 -compose over -composite `
    (Join-Path $vert ($outName.Replace(".png","-9x16.png")))
}

# (Optional) WebP via magick
Get-ChildItem $one,$wide,$vert -Filter *.png -Recurse | ForEach-Object {
  $dest = Join-Path $webp ($_.BaseName + ".webp")
  & magick $_.FullName -quality 88 "$dest"
}

@"
{
  ""version"": ""v3.4"",
  ""theme"": ""dark_premium_gold"",
  ""palette"": { ""bg"":""#0a0e18"", ""gold"":""#d8a84e"", ""blue"":""#2f9fff"" },
  ""files"": { ""count"": 10, ""ratios"": [""1x1"",""16x9"",""9x16""], ""formats"": [""png"",""webp""] }
}
"@ | Set-Content -Path (Join-Path $out "metadata.json") -Encoding UTF8

"Posters × ratios generated. Creating ZIP…"
Compress-Archive -Path "$one","$wide","$vert","$webp", (Join-Path $out "metadata.json") `
  -DestinationPath (Join-Path $out "whylee_poster_pack_full.zip") -Force

"Done → media/posters/build/whylee_poster_pack_full.zip"
