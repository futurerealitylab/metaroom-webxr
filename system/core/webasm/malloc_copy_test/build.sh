#!/bin/bash

echo "building wasm module"

clang \
--target=wasm32-unknown-wasi \
--std=c11 \
-O3 \
-flto \
--sysroot /Users/Shared/wasi-libc-root \
-nostartfiles \
-Wl,-allow-undefined-file wasm.syms \
-Wl,--import-memory \
-Wl,--no-entry \
-Wl,--export-all \
-Wl,--lto-O3 \
-Wl,-z,stack-size=$[8 * 1024 * 1024] \
-o library.wasm \
library.c

# clang \
# -cc1 \
# -Ofast \
# -emit-llvm-bc \
# -triple=wasm32-unknown-unknown-wasm \
# -std=c11 \
# ./*\.c

# llvm-link -o wasm.bc ./*\.bc opt -O3 wasm.bc -o wasm.bc

# llc -O3 -filetype=obj wasm.bc -o wasm.o

# wasm-ld --no-entry \
# wasm.o -o \
# binary.wasm --export-all \
# -allow-undefined-file wasm.syms \
# --import-memory
