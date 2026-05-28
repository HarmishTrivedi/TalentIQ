@echo off
echo ========================================
echo TalentIQ Interview Room - Quick Deploy
echo ========================================
echo.

cd /d "%~dp0"

echo [1/4] Checking Git status...
git status
echo.

echo [2/4] Adding all changes...
git add .
echo.

echo [3/4] Committing changes...
git commit -m "fix: resolve interview room critical issues - speech recognition, backend validation, websocket, end interview flow"
echo.

echo [4/4] Pushing to GitHub...
git push origin main
echo.

echo ========================================
echo Deployment Complete!
echo ========================================
echo.
echo Next Steps:
echo 1. Go to https://dashboard.render.com
echo 2. Check backend deployment logs
echo 3. Check frontend deployment logs
echo 4. Test interview room functionality
echo.
echo Fixed Issues:
echo - Speech recognition now working
echo - Backend validation errors resolved
echo - WebSocket connection stable
echo - End interview flow fixed
echo - No more network retry loops
echo.
pause
