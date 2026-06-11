@echo off
REM Double-cliquez ce fichier pour mettre le sondage en ligne (tunnel public).
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0start-survey.ps1"
pause
