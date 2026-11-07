# Mở cửa sổ game dành riêng cho quay Live Studio (Window capture).
# Chạy: npm run live:window            (mặc định scale 0.5 = khung 540x960, 30 FPS)
#       npm run live:window -- -Scale 0.75 -Fps 60
#
# Vì sao không mở Chrome thường:
#  - Chrome đang chạy sẽ bỏ qua các cờ mới, nên dùng hồ sơ riêng (--user-data-dir) để cờ có hiệu lực.
#  - Cửa sổ bị Live Studio hoặc cửa sổ khác che sẽ bị Chrome ngừng vẽ và ngừng chạy (game đứng, MC im, hình chụp đen):
#    tắt tính năng đó bằng các cờ --disable-*.
#  - --autoplay-policy cho phát âm thanh và MC mà không cần bấm vào trang.
#  - --force-device-scale-factor=1 để màn hình Windows đặt phóng to 125% hay 150% không làm khung bị lệch kích thước.
param(
  [double]$Scale = 0.5,
  [int]$Fps = 30,
  [string]$Url = 'http://localhost:5173/'
)

$candidates = @(
  "$env:ProgramFiles\Google\Chrome\Application\chrome.exe",
  "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe",
  "$env:LOCALAPPDATA\Google\Chrome\Application\chrome.exe",
  "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe",
  "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe"
)
$browser = $candidates | Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $browser) {
  Write-Error 'Chrome or Edge not found.'
  exit 1
}

# Khung ngoài = khung game + viền và thanh tiêu đề của cửa sổ ứng dụng
$w = [int][Math]::Round(1080 * $Scale) + 16
$h = [int][Math]::Round(1920 * $Scale) + 40
$profile = Join-Path $env:LOCALAPPDATA 'DaiChienVuotChuongNgai\live-profile'
$scaleText = $Scale.ToString([Globalization.CultureInfo]::InvariantCulture)  # máy đặt tiếng Việt sẽ ra "0,5" nếu không ép kiểu số chuẩn
$target = "${Url}?live=1&scale=$scaleText&fps=$Fps"

$flags = @(
  "--app=$target",
  "--user-data-dir=$profile",
  '--autoplay-policy=no-user-gesture-required',
  '--disable-features=CalculateNativeWinOcclusion',
  '--disable-backgrounding-occluded-windows',
  '--disable-renderer-backgrounding',
  '--disable-background-timer-throttling',
  '--force-device-scale-factor=1',
  '--no-first-run',
  '--no-default-browser-check',
  "--window-size=$w,$h",
  '--window-position=0,0'
)
Write-Host "Opening $target"
Start-Process $browser -ArgumentList $flags
