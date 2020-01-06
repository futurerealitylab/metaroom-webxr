#ifndef CANVAS2D_INTERFACE_HPP
#define CANVAS2D_INTERFACE_HPP

namespace c2d {

    enum struct COMMAND_TYPE : int32 {
        CLEAR_RECT,
        FILL_COLOR,
        FILL_RECT,
        SUBMIT_BUFFER,

        SAVE,
        RESTORE,
        TRANSLATE,
        LINE_WIDTH,
        STROKE_RECT,
        MOVE_TO,
        LINE_TO,
        CLOSE_PATH,
        STROKE,
        BEGIN_PATH,

        COMMAND_COUNT
    };
    // struct Command {
    //     //int32   val_i32;
    //     float32 val_f32;
    // };

    typedef float32 Command;

    struct Command_Buffer {
        int32 idx;
        //int32 next;

        float32 buf[256];
    };

    /////////////////////////////////////////////////////

    void global_alpha(Command_Buffer* buf, float32 a);

    void fill_color_f(Command_Buffer* buf, float32 r, float32 g, float32 b, float32 a);
    void line_color_f(Command_Buffer* buf, float32 r, float32 g, float32 b, float32 a);
    // simplify for now by using only f32s
    // void fill_color_i(Command_Buffer* buf, int32 r, int32 g, int32 b, float32 a);
    // void line_color_i(Command_Buffer* buf, int32 r, int32 g, int32 b, float32 a);
    // void fill_color(Command_Buffer* buf, int32 r, int32 g, int32 b, float32 a);
    // void line_color(Command_Buffer* buf, int32 r, int32 g, int32 b, float32 a);

    void line_width(Command_Buffer* buf, f32 w);

    void save(Command_Buffer* buf);
    void restore(Command_Buffer* buf);
    void translate(Command_Buffer* buf, f32 x, f32 y);
    void scale(Command_Buffer* buf, f32 x, f32 y);
    float32* transform(Command_Buffer* buf, f32 a, f32 b, f32 c, f32 d, f32 e, f32 f);
    void set_transform(Command_Buffer* buf, f32 a, f32 b, f32 c, f32 d, f32 e, f32 f);
    void rotate(Command_Buffer* buf, f32 angle_rad);
    
    void begin_path(Command_Buffer* buf);
    
    void line_to(Command_Buffer* buf, f32 x, f32 y);
    void move_to(Command_Buffer* buf, f32 x, f32 y);
    void arc(Command_Buffer* buf, f32 x, f32 y, f32 radius, f32 start_angle_rad, f32 end_angle_rad, i32 anticlockwise = 0);
    void arc_to(Command_Buffer* buf, f32 x0, f32 y0, f32 x1, f32 y1, f32 radius);
    void rect(Command_Buffer* buf, f32 x, f32 y, f32 width, f32 height);
    void ellipse(Command_Buffer* buf, f32 x, f32 y, f32 radius_x, f32 radius_y, f32 rotation_rad, f32 start_angle_rad, f32 end_angle_rad, i32 anticlockwise = 0);
    void close_path(Command_Buffer* buf);
    
    void fill(Command_Buffer* buf);
    void stroke(Command_Buffer* buf);
    void stroke_rect(Command_Buffer* buf, f32 x, f32 y, f32 width, f32 height);
    void fill_rect(Command_Buffer* buf, f32 x0, f32 y0, f32 x1, f32 x2);
    void draw_rect(Command_Buffer* buf, f32 x0, f32 y0, f32 x1, f32 x2);
    void clear_rect(Command_Buffer* buf, f32 x, f32 y, f32 width, f32 height);
    void submit(Command_Buffer* buf);

    #define UNWRAP_COMMAND_BUFFER_PTR(buf__, idx_name__, internal_buf_name__) \
        int32 idx_name__ = buf__->idx; float32* internal_buf_name__  = buf__->buf

    void clear_rect(Command_Buffer* buf, f32 x, f32 y, f32 width, f32 height)
    {
        UNWRAP_COMMAND_BUFFER_PTR(buf, idx, cmds);

        cmds[idx] = (f32)COMMAND_TYPE::CLEAR_RECT;
        idx += 1;

        cmds[idx] = x;
        idx += 1;
        cmds[idx] = y;
        idx += 1;
        cmds[idx] = width;
        idx += 1;
        cmds[idx] = height;
        idx += 1;

        buf->idx = idx;
    }
    void fill_color(Command_Buffer* buf, float32 r, float32 g, float32 b, float32 a)
    {
        UNWRAP_COMMAND_BUFFER_PTR(buf, idx, cmds);

        cmds[idx] = (f32)COMMAND_TYPE::FILL_COLOR;
        idx += 1;

        cmds[idx] = r;
        idx += 1;
        cmds[idx] = g;
        idx += 1;
        cmds[idx] = b;
        idx += 1;
        cmds[idx] = a;
        idx += 1;

        buf->idx = idx;
    }
    void fill_rect(Command_Buffer* buf, float32 r, float32 g, float32 b, float32 a)
    {
        UNWRAP_COMMAND_BUFFER_PTR(buf, idx, cmds);

        cmds[idx] = (f32)COMMAND_TYPE::FILL_RECT;
        idx += 1;

        cmds[idx] = r;
        idx += 1;
        cmds[idx] = g;
        idx += 1;
        cmds[idx] = b;
        idx += 1;
        cmds[idx] = a;
        idx += 1;

        buf->idx = idx;
    }
    void save(Command_Buffer* buf)
    {
        UNWRAP_COMMAND_BUFFER_PTR(buf, idx, cmds);

        cmds[idx] = (f32)COMMAND_TYPE::SAVE;
        idx += 1;

        buf->idx = idx;        
    }
    void restore(Command_Buffer* buf)
    {
        UNWRAP_COMMAND_BUFFER_PTR(buf, idx, cmds);

        cmds[idx] = (f32)COMMAND_TYPE::RESTORE;
        idx += 1;
        
        buf->idx = idx;
    }
    void stroke_rect(Command_Buffer* buf, f32 x, f32 y, f32 width, f32 height)
    {
        UNWRAP_COMMAND_BUFFER_PTR(buf, idx, cmds);

        cmds[idx] = (f32)COMMAND_TYPE::STROKE_RECT;
        idx += 1;

        cmds[idx] = x;
        idx += 1;
        cmds[idx] = y;
        idx += 1;
        cmds[idx] = width;
        idx += 1;
        cmds[idx] = height;
        idx += 1;

        buf->idx = idx;
    }
    void line_to(Command_Buffer* buf, f32 x, f32 y)
    {
        UNWRAP_COMMAND_BUFFER_PTR(buf, idx, cmds);

        cmds[idx] = (f32)COMMAND_TYPE::LINE_TO;
        idx += 1;

        cmds[idx] = x;
        idx += 1;
        cmds[idx] = y;
        idx += 1;

        buf->idx = idx;
    }
    void move_to(Command_Buffer* buf, f32 x, f32 y)
    {
        UNWRAP_COMMAND_BUFFER_PTR(buf, idx, cmds);

        cmds[idx] = (f32)COMMAND_TYPE::MOVE_TO;
        idx += 1;

        cmds[idx] = x;
        idx += 1;
        cmds[idx] = y;
        idx += 1;

        buf->idx = idx;
    }
    void translate(Command_Buffer* buf, f32 x, f32 y)
    {
        UNWRAP_COMMAND_BUFFER_PTR(buf, idx, cmds);

        cmds[idx] = (f32)COMMAND_TYPE::TRANSLATE;
        idx += 1;

        cmds[idx] = x;
        idx += 1;
        cmds[idx] = y;
        idx += 1;

        buf->idx = idx;
    }
    void begin_path(Command_Buffer* buf)
    {
        UNWRAP_COMMAND_BUFFER_PTR(buf, idx, cmds);

        cmds[idx] = (f32)COMMAND_TYPE::BEGIN_PATH;
        idx += 1;

        buf->idx = idx;  
    }
    void close_path(Command_Buffer* buf)
    {
        UNWRAP_COMMAND_BUFFER_PTR(buf, idx, cmds);

        cmds[idx] = (f32)COMMAND_TYPE::CLOSE_PATH;
        idx += 1;

        buf->idx = idx;  
    }
    void line_width(Command_Buffer* buf, f32 w)
    {
        UNWRAP_COMMAND_BUFFER_PTR(buf, idx, cmds);

        cmds[idx] = (f32)COMMAND_TYPE::LINE_WIDTH;
        idx += 1;

        cmds[idx] = w;
        idx += 1;

        buf->idx = idx;  
    }    
    void stroke(Command_Buffer* buf)
    {
        UNWRAP_COMMAND_BUFFER_PTR(buf, idx, cmds);

        cmds[idx] = (f32)COMMAND_TYPE::STROKE;
        idx += 1;

        buf->idx = idx;  
    }
    void submit(Command_Buffer* buf)
    {
        UNWRAP_COMMAND_BUFFER_PTR(buf, idx, cmds);

        cmds[idx] = (f32)COMMAND_TYPE::SUBMIT_BUFFER;

        buf->idx = 0;
    }

}

#endif
