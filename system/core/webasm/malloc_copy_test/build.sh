#!/bin/bash

echo "building wasm module"

clang \
--target=wasm32-unknown-wasi \
--std=c11 \
-O3 \
-flto \
--sysroot /tmp/wasi-libc \
-nostartfiles \
-Wl,--import-memory \
-Wl,--no-entry \
-Wl,--export-all \
-Wl,--lto-O3 \
-Wl,-z,stack-size=$[8 * 1024 * 1024] \
-o library.wasm \
library.c
