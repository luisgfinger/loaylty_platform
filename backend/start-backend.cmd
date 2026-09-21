@echo off

cd /d C:\LoayltyPlatform\backend

if not exist logs mkdir logs

"C:\Program Files\nodejs\node.exe" dist\server.js >> logs\backend.log 2>&1