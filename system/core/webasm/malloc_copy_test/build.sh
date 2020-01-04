#!/bin/bash

echo "building wasm module"

clang++ \
--target=wasm32-unknown-wasi \
--std=c++11 \
-stdlib=libc++ \
-O3 \
-flto \
-fno-exceptions \
-D WASM_BUILD \
-D _LIBCPP_HAS_NO_THREADS \
--sysroot /usr/local/opt/wasi-libc \
-I/usr/local/opt/wasi-libc/include \
-I/usr/local/opt/glm/include \
-I./libcxx/ \
-L./ \
-lc++ \
-lc++abi \
-nostartfiles \
-Wl,-allow-undefined-file wasm.syms \
-Wl,--import-memory \
-Wl,--no-entry \
-Wl,--export-all \
-Wl,--lto-O3 \
-Wl,-lc++, \
-Wl,-lc++abi, \
-Wl,-z,stack-size=$[1024 * 1024] \
-o library.wasm \
library.cpp

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
