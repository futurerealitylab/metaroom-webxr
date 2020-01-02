#!/bin/bash

if [ hash brew 2&> /dev/null]; then
    echo "WEE"
fi
exit

if [[ $(command -v brew) == "" ]]; then
    echo "Installing Hombrew"
    /usr/bin/ruby -e "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/master/install)"
else
    echo "Updating Homebrew"
    brew update
fi

brew install llvm

echo 'export PATH="/usr/local/opt/llvm/bin:$PATH"' >> ~/.bash_profile
export LDFLAGS="-L/usr/local/opt/llvm/lib -Wl,-rpath,/usr/local/opt/llvm/lib"

git clone https://github.com/CraneStation/wasi-libc.git
cd wasi-libc

export PATH=/usr/local/opt/llvm/bin:$PATH
make install INSTALL_DIR=/tmp/wasi-libc
