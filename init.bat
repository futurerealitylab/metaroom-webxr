git submodule init
git submodule update --recursive

pushd system
pushd server
npm install
popd server
popd system
pushd webxr-server
npm install
popd webxr-server
npm install -g pm2
