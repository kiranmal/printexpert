# Local MariaDB start — reboot ke baad ye file run karo
# (admin rights na hone ki wajah se Windows service install nahi hui)
$maria = "C:\Program Files\MariaDB 13.0\bin\mariadbd.exe"
$running = Get-Process mariadbd -ErrorAction SilentlyContinue
if ($running) {
    Write-Output "MariaDB already running"
} else {
    Start-Process -FilePath $maria -ArgumentList '--datadir="C:\Program Files\MariaDB 13.0\data"','--port=3306' -WindowStyle Hidden
    Write-Output "MariaDB started on port 3306"
}
