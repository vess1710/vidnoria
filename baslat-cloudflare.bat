@echo off
chcp 65001 >nul
title Vidnoria - Otomatik Cloudflare Medya Sunucusu
echo ===============================================================
echo   VIDNORIA.COM - OTOMATIK CLOUDFLARE TUNEL VE MEDYA SUNUCUSU
echo ===============================================================
echo.
echo Bu pencere acik kaldigi surece (veya baslangic servisi aktifken):
echo  1. Yerel Medya Motoru (yt-dlp + FFmpeg) otomatik calisir.
echo  2. Cloudflare HTTPS Tuneli otomatik acilir.
echo  3. Tunel adresi degisirse GitHub (vidnoria.com) otomatik guncellenir.
echo.
cd /d "%~dp0"
node scripts/cloudflare-manager.js
pause
