#ifndef CANVAS2D_INTERFACE_HPP
#define CANVAS2D_INTERFACE_HPP

namespace c2d {
    void global_alpha(float32 a);

    void fill_color_f(float32 r, float32 g, float32 b, float32 a);
    void line_color_f(float32 r, float32 g, float32 b, float32 a);
    void fill_color_i(int32 r, int32 g, int32 b, float32 a);
    void line_color_i(int32 r, int32 g, int32 b, float32 a);
    void fill_color(int32 r, int32 g, int32 b, float32 a);
    void line_color(int32 r, int32 g, int32 b, float32 a);

    void line_width(f32 w);

    void save();
    void restore();
    void translate(f32 x, f32 y);
    void scale(f32 x, f32 y);
    float32* transform(f32 a, f32 b, f32 c, f32 d, f32 e, f32 f);
    void set_transform(f32 a, f32 b, f32 c, f32 d, f32 e, f32 f);
    void rotate(f32 angle_rad);
    
    void begin_path();
    
    void line_to(f32 x, f32 y);
    void move_to(f32 x, f32 y);
    void arc(f32 x, f32 y, f32 radius, f32 start_angle_rad, f32 end_angle_rad, i32 anticlockwise = 0);
    void arc_to(f32 x0, f32 y0, f32 x1, f32 y1, f32 radius);
    void rect(f32 x, f32 y, f32 width, f32 height);
    void ellipse(f32 x, f32 y, f32 radius_x, f32 radius_y, f32 rotation_rad, f32 start_angle_rad, f32 end_angle_rad, i32 anticlockwise = 0);
    void close_path();
    
    void fill();
    void stroke();
    void stroke_rect(f32 x, f32 y, f32 width, f32 height);
    void fill_rect(f32 x0, f32 y0, f32 x1, f32 x2);
    void draw_rect(f32 x0, f32 y0, f32 x1, f32 x2);
    void clear_rect(f32 x, f32 y, f32 width, f32 height);
}

#endif