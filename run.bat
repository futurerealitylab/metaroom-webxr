REM node server/main.js %*
REM pm2 startOrReload server/ecosystem.config.js && pm2 logs
node ./server/main.js & node ./webxr-server/server.js &
REM open browser and go to localhost:3000