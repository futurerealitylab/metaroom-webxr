* In order to start the backend, you need to execute 'run' or 'run.bat' depending on your OS
* Otherwise, you can call `pm2 stop all` / `pm2 restart all` should you encounter critical errors
* Specify which branch you want to update for submodule in .gitmodules and update it with
```git submodule update --remote```

* Helpful commands
```$./run```
```$./stop```

* * To then restart the server again, type:
```$pm2 reload all```

* * If you want to bring the server logs back on-line to check them after hitting control-c, type:
```$pm2 logs all```

* * If you want the server to run on system startup (tested on Unix based OS) type:
```$./persist```