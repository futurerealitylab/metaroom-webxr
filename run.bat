REM node system\server\main.js %*
stop
pm2 start ecosystem.config.js && pm2 logs
REM open browser and go to localhost:3000
