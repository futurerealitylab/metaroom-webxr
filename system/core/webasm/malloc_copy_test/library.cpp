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

extern_c_begin()

#include "canvas2d_interface.cpp"

struct My_State {
    float64 time_ms;
    float64 time_s;

    gmath::vec2 cvs_size;
};
My_State state;


My_State* setup(f32 w, f32 h) 
{
    state.time_ms = 0.0;
    state.time_s  = 0.0;

    state.cvs_size.x = w;
    state.cvs_size.y = h;

    return &state;
}


void on_draw(float64 t) 
{
    const f64 time_s = (f64)t / 1000.0;

    state.time_ms = t;
    state.time_s  = time_s;

    c2d::clear_rect(0.0, 0.0, state.cvs_size.x, state.cvs_size.y);


    c2d::fill_color_i(20, 127, 178, sin01(time_s));
    c2d::fill_rect(0.0 + sin01(time_s), 0.0 + sin01(time_s), state.cvs_size.x, state.cvs_size.y);
    
    // c2d::save();
    // {
    //     //c2d::translate();
    //     // Set line width
    //     c2d::line_width(10);

    //     // Wall
    //     c2d::stroke_rect(75, 140, 150, 110);

    //     // Door
    //     c2d::fill_rect(130, 190, 40, 60);

    //     // Roof
    //     c2d::move_to(50, 140);
    //     c2d::line_to(150, 60);
    //     c2d::line_to(250, 140);
    //     c2d::close_path();
    //     c2d::stroke();
    // }
    // c2d::restore();
}

void on_exit()
{

}


///////////////////////////////////////////////////////////
#define EXTERN_C
#include "testing_playground.cpp"

extern_c_end()

