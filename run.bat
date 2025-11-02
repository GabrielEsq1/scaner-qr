@echo off
echo ===============================================
echo    INICIANDO SERVIDOR CCB PROMOTORES
echo ===============================================

echo Verificando Python...
python --version
if errorlevel 1 (
    echo ERROR: Python no esta instalado o no esta en el PATH
    pause
    exit /b 1
)

echo.
echo Verificando dependencias...
pip list | findstr "Flask pandas"
if errorlevel 1 (
    echo Instalando dependencias...
    pip install -r requirements.txt
)

echo.
echo Iniciando servidor...
echo Si hay errores, se mostraran abajo:
echo ===============================================
python app.py

echo.
echo ===============================================
echo El servidor se ha detenido.
echo ===============================================
pause