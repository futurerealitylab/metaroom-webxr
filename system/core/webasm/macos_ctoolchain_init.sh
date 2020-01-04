#!/bin/bash

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

mkdir /usr/local/opt/wasi-libc
make install INSTALL_DIR=/usr/local/opt/wasi-libc
