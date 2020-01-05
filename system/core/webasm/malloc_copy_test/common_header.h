#ifndef COMMON_HEADER_H
#define COMMON_HEADER_H

#include <stdio.h>
#include <stdlib.h>
#include <math.h>
#include <stddef.h>
#include <stdbool.h>
#include <stdarg.h>
#include <ctype.h>
#include <assert.h>
#include <math.h>
#include <getopt.h>
#include <string.h>
#include <errno.h>

#include <sys/types.h>
#include <sys/stat.h>
#include <unistd.h>

typedef int8_t   int8;
typedef int16_t  int16;
typedef int32_t  int32;
typedef int64_t  int64;

typedef uint8_t  uint8;
typedef uint16_t uint16;
typedef uint32_t uint32;
typedef uint64_t uint64;

typedef float    float32; 
typedef double   float64;

typedef int8     i8;
typedef int16    i16;
typedef int32    i32;
typedef int64    i64;

typedef i8       s8;
typedef i16      s16;
typedef i32      s32;
typedef i64      s64;

typedef uint8    u8;
typedef uint16   u16;
typedef uint32   u32;
typedef uint64   u64;

typedef float32  f32; 
typedef float64  f64;

typedef u64      usize;
typedef i64      isize;




#ifdef WASM_BUILD
    #define EXPORT_WASM __attribute__((visibility("default"))) extern "C"
    #define __EMSCRIPTEN__ 
#else
    #define EXPORT_WASM
#endif

#ifdef __cplusplus
    #define extern_c_begin() extern "C" {
    #define extern_c_end() }
#else
    #define extern_c_begin()
    #define extern_c_end()
#endif


#endif
