#include "common_header.h"

#define GLM_FORCE_ALIGNED_GENTYPES
#include <glm/glm.hpp>

namespace gmath = glm;

#include <limits>
#include <time.h>
#define POSITIVE_INFINITY (std::numeric_limits<f64>::infinity())
#define NEGATIVE_INFINITY (-POSITIVE_INFINITY)

#include <vector>
#include <type_traits>
#include <new>
#include <memory>

#include <assert.h>

#define when if constexpr

//try -Clink-arg=--export=__heap_base

extern unsigned char __heap_base;
extern unsigned char __data_end;

#include "testing_playground.cpp"

#include "canvas2d_interface.cpp"

extern_c_begin()


float32* raw_cmds;

struct My_State {
    float64 time_ms;
    float64 time_s;

    gmath::vec2 cvs_size;

    c2d::Command_Buffer cmds;
};
My_State state;

float* setup(f32 w, f32 h) 
{
    state.time_ms = 0.0;
    state.time_s  = 0.0;

    state.cvs_size.x = w;
    state.cvs_size.y = h;

    raw_cmds = state.cmds.buf;

    memset(state.cmds.buf, 0, 256);
    state.cmds.idx = 0;

    return (float*)&state.cmds.buf;
}


void on_draw(float64 t) 
{
    const f64 time_s = (f64)t / 1000.0;

    state.time_ms = t;
    state.time_s  = time_s;

    c2d::clear_rect(&state.cmds, 0.0, 0.0, state.cvs_size.x, state.cvs_size.y);

    c2d::fill_color(&state.cmds, 20.0, 127.0, 178.0, sin01(time_s));

    c2d::save(&state.cmds);
    {
        c2d::begin_path(&state.cmds);

        c2d::translate(&state.cmds, state.cvs_size.x * sin01(time_s), 0.0);
        // Set line width
        c2d::line_width(&state.cmds, 10);

        // Wall
        c2d::stroke_rect(&state.cmds, 75, 140, 150, 110);

        // Door
        c2d::fill_rect(&state.cmds, 130, 190, 40, 60);

        // Roof
        c2d::move_to(&state.cmds, 50, 140);
        c2d::line_to(&state.cmds, 150, 60);
        c2d::line_to(&state.cmds, 250, 140);
        c2d::close_path(&state.cmds);
        c2d::stroke(&state.cmds);
    }
    c2d::restore(&state.cmds);

    c2d::submit(&state.cmds);
}

void on_exit()
{

}


///////////////////////////////////////////////////////////
#define EXTERN_C
#include "testing_playground.cpp"

extern_c_end()

