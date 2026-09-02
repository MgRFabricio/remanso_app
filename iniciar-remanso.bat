@echo off
setlocal

title Remanso - Backend e Frontend
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js nao foi encontrado no PATH.
  echo Instale o Node.js LTS e tente novamente.
  pause
  exit /b 1
)

where npm >nul 2>nul
if errorlevel 1 (
  echo npm nao foi encontrado no PATH.
  echo Instale o Node.js LTS e tente novamente.
  pause
  exit /b 1
)

echo Inicializando o banco SQLite local...
call npm --prefix backend run db:init
if errorlevel 1 (
  echo Falha ao inicializar o banco SQLite.
  pause
  exit /b 1
)

echo Iniciando o backend na porta 3002...
start "" /b cmd /c "cd /d ""%~dp0backend"" && npm run dev"

echo Iniciando o frontend na porta 5174...
start "" /b cmd /c "cd /d ""%~dp0frontend"" && npm run dev -- --host 0.0.0.0 --port 5174"

echo Aguardando os servicos iniciarem...
timeout /t 3 /nobreak >nul
start "" "http://127.0.0.1:5174"

echo.
echo Remanso online em http://127.0.0.1:5174
echo API disponivel em http://127.0.0.1:3002/api/status
echo Feche esta janela para encerrar os servicos.
pause >nul
