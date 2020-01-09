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

/Users/tobyrosenberg/Downloads/wasi-sdk-8.0/bin/clang++ \
--std=c++17 -O3 library.cpp -flto -fno-exceptions -nostartfiles -D WASM_BUILD -I/usr/local/opt/glm/include --sysroot /Users/tobyrosenberg/Downloads/wasi-sdk-8.0/share/wasi-sysroot -o library.wasm \
 -Wl,--import-memory -Wl,--no-entry -Wl,--export-all -Wl,-z,stack-size=1048576 -Wl,--lto-O3 -Wl,-allow-undefined-file wasm.syms 
