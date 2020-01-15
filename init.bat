git submodule init
git submodule update --recursive

npm install --cwd ".\server" --prefix ".\server" && npm install --cwd ".\webxr-server" --prefix ".\webxr-server" && npm install -g pm2
