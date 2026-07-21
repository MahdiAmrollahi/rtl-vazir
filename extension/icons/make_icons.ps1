Add-Type -AssemblyName System.Drawing

function New-Icon {
    param([int]$Size, [string]$Out)
    $bmp = New-Object System.Drawing.Bitmap($Size, $Size)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
    $g.Clear([System.Drawing.Color]::Transparent)

    $rect = New-Object System.Drawing.Rectangle(0, 0, $Size, $Size)
    $radius = [int]($Size * 0.22)
    $gp = New-Object System.Drawing.Drawing2D.GraphicsPath
    $gp.AddArc($rect.X, $rect.Y, $radius, $radius, 180, 90)
    $gp.AddArc($rect.Right - $radius, $rect.Y, $radius, $radius, 270, 90)
    $gp.AddArc($rect.Right - $radius, $rect.Bottom - $radius, $radius, $radius, 0, 90)
    $gp.AddArc($rect.X, $rect.Bottom - $radius, $radius, $radius, 90, 90)
    $gp.CloseFigure()
    $bg = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 37, 99, 235))
    $g.FillPath($bg, $gp)

    $fontSize = [int]($Size * 0.52)
    $font = New-Object System.Drawing.Font("Segoe UI", $fontSize, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
    $sf = New-Object System.Drawing.StringFormat
    $sf.Alignment = [System.Drawing.StringAlignment]::Center
    $sf.LineAlignment = [System.Drawing.StringAlignment]::Center

    $wA = $g.MeasureString("A", $font)
    $wB = $g.MeasureString([char]0x0622, $font)
    $gap = [int]($Size * 0.04)
    $totalW = [int]($wA.Width + $wB.Width + $gap)
    $startX = ($Size - $totalW) / 2

    $white = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
    $rA = New-Object System.Drawing.RectangleF([float]$startX, 0, [float]$wA.Width, [float]$Size)
    $rB = New-Object System.Drawing.RectangleF([float]($startX + $wA.Width + $gap), 0, [float]$wB.Width, [float]$Size)
    $g.DrawString("A", $font, $white, $rA, $sf)
    $g.DrawString([char]0x0622, $font, $white, $rB, $sf)

    $bmp.Save($Out, [System.Drawing.Imaging.ImageFormat]::Png)
    $g.Dispose(); $bmp.Dispose()
    Write-Host "Wrote $Out"
}

$dir = "C:\Users\mahdi\Desktop\programming\rtl_vazir_extention\extension\icons"
New-Icon -Size 16  -Out (Join-Path $dir "icon16.png")
New-Icon -Size 48  -Out (Join-Path $dir "icon48.png")
New-Icon -Size 128 -Out (Join-Path $dir "icon128.png")
