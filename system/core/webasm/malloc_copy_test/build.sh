#!/bin/bash

echo "building wasm module"

# clang++ \
# --target=wasm32-unknown-wasi \
# --std=c++17 \
# -nostdlib++ \
# -O3 \
# -flto \
# -fno-exceptions \
# -D WASM_BUILD \
# -D _LIBCPP_HAS_NO_THREADS \
# --sysroot /usr/local/opt/wasi-libc \
# -I/usr/local/opt/wasi-libc/include \
# -I/usr/local/opt/glm/include \
# -I./libcxx/ \
# -L./ \
# -Wl,--export=malloc \
# -lc++ \
# -lc++abi \
# -nostartfiles \
# -Wl,-allow-undefined-file wasm.syms \
# -Wl,--import-memory \
# -Wl,--no-entry \
# -Wl,--export-all \
# -Wl,--lto-O3 \
# -Wl,-lc++, \
# -Wl,-lc++abi, \
# -Wl,-z,stack-size=$[1024 * 1024] \
# -o library.wasm \
# library.cpp

# get the toolchain from: https://github.com/CraneStation/wasi-sdk
"$WASI_SDK_HOME"/bin/clang++ \
--std=c++17 \
-O3 \
library.cpp \
-flto \
-fno-exceptions \
-nostartfiles \
-D WASM_BUILD \
-I/usr/local/opt/glm/include \
--sysroot "$WASI_SDK_HOME"/share/wasi-sysroot \
-o library.wasm \
 -Wl,--import-memory \
 -Wl,--no-entry \
 -Wl,--export-all \
 -Wl,-z,stack-size=1048576 \
 -Wl,--lto-O3 \
 -Wl,-allow-undefined-file wasm.syms

