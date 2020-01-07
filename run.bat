REM node server/main.js %*
REM stop
pm2 start server/ecosystem.config.js && pm2 logs
REM open browser and go to localhost:3000