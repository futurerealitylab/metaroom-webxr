REM node server/main.js %*
pm2 startOrReload server/ecosystem.config.js && pm2 logs
REM open browser and go to localhost:3000