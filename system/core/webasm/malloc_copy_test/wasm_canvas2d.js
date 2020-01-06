"use strict";


export const COMMAND_TYPE_CLEAR_RECT    = 0;
export const COMMAND_TYPE_FILL_COLOR    = 1;
export const COMMAND_TYPE_FILL_RECT     = 2;
export const COMMAND_TYPE_SUBMIT_BUFFER = 3;
export const COMMAND_TYPE_SAVE          = 4;
export const COMMAND_TYPE_RESTORE       = 5;
export const COMMAND_TYPE_TRANSLATE     = 6;
export const COMMAND_TYPE_LINE_WIDTH    = 7;
export const COMMAND_TYPE_STROKE_RECT   = 8;
export const COMMAND_TYPE_MOVE_TO       = 9;
export const COMMAND_TYPE_LINE_TO       = 10;
export const COMMAND_TYPE_CLOSE_PATH    = 11;
export const COMMAND_TYPE_STROKE        = 12;
export const COMMAND_TYPE_BEGIN_PATH    = 13;
export const COMMAND_TYPE_COMMAND_COUNT = 14;


export function attachBindings(imports, ctx) {
    imports.global_alpha = function(a) {
      //console.log("global_alpha()", a)
      ctx.globalAlpha = a;
    }
    imports.fill_color_f = function(r, g, b, a) {
      //console.log("fill_color_f()", r, g, b, a);
      ctx.fillStyle = 'rgba(' + (255*r) + ',' + (255*g) + ',' + (255*b) + ',' + (a) + ')';
    };
    imports.line_color_f = function(r, g, b, a) {
      //console.log("line_color_f()", r, g, b, a);
      ctx.strokeStyle = 'rgba(' + (255*r) + ',' + (255*g) + ',' + (255*b) + ',' + (a) + ')';
    };
    imports.fill_color_i = function(r, g, b, a) {
      //console.log("fill_color_i()", r, g, b, a);
      ctx.fillStyle = 'rgba(' + (r) + ',' + (g) + ',' + (b) + ',' + (a) + ')';
    };
    imports.line_color_i = function(r, g, b, a) {
      //console.log("line_color_i()", r, g, b, a);
      ctx.strokeStyle = 'rgba(' + (r) + ',' + (g) + ',' + (b) + ',' + (a) + ')';
    };
    imports.fill_color = function(r, g, b, a) {
      //console.log("fill_color()", r, g, b, a);
      ctx.fillStyle = 'rgba(' + (r) + ',' + (g) + ',' + (b) + ',' + (a) + ')';
    };
    imports.line_color = function(r, g, b, a) {
      //console.log("line_color()", r, g, b, a);
      ctx.strokeStyle = 'rgba(' + (r) + ',' + (g) + ',' + (b) + ',' + (a) + ')';
    };
    imports.line_width = function(w) {
      //console.log("line_width()", w);
      ctx.lineWidth = w;
    };
    imports.save = function() {
      //console.log("save()");
      ctx.save();
    };
    imports.restore = function() {
      //console.log("restore()");
      ctx.restore();
    };
    imports.translate = function(x, y) {
      //console.log("translate()", x, y);
      ctx.translate(x, y);
    };
    imports.scale = function(x, y) {
      //console.log("scale()", x, y);
      ctx.scale(x, y);
    };
    imports.transform = function(a, b, c, d, e, f) {
      //console.log("transform()", a, b, c, d, e, f);
      ctx.transform(a, b, c, d, e, f);
    };
    imports.set_transform = function(a, b, c, d, e, f) {
      //console.log("set_transform()", a, b, c, d, e, f);
      ctx.setTransform(a, b, c, d, e, f);
    };
    imports.rotate = function(angle_rad) {
      //console.log("rotate()", angle_rad);
      ctx.rotate(angle_rad);
    };
    imports.begin_path = function() {
      //console.log("begin_path()");
      ctx.beginPath();
    };
    imports.line_to = function(x, y) {
      //console.log("line_to()", x, y);
      ctx.lineTo(x, y);
    };
    imports.move_to = function(x, y) {
      //console.log("move_to()", x, y);
      ctx.moveTo(x, y);
    }
    imports.arc = function(x, y, radius, start_angle_rad, end_angle_rad, anticlockwise) {
      //console.log("arc()", x, y, radius, start_angle_rad, end_angle_rad, anticlockwise);

      ctx.arc(x, y, radius, start_angle_rad, eng_angle_rad, anticlockwise);
    };
    imports.arc_to = function(x0, y0, x1, y1, radius) {
      //console.log("arc_to()", x0, y0, x1, y1, radius);
      ctx.arcTo(x0, y0, x1, y1, radius);
    };
    imports.rect = function(x, y, width, height) {
      //console.log("rect()", x, y, width, height);
      ctx.rect(x, y, width, height);
    };
    imports.ellipse = function(x, y, radius_x, radius_y, rotation_rad, start_angle_rad, end_angle_rad, anticlockwise) {
      //console.log("ellipse()", x, y, radius_x, radius_y, rotation_rad, start_angle_rad, end_angle_rad, anticlockwise);
      ctx.ellipse(x, y, radius_x, radius_y, rotation_rad,
        start_angle_rad, end_angle_rad, anticlockwise);
    };
    imports.close_path = function() {
      //console.log("close_path()");
      ctx.closePath();
    };
    imports.fill = function() {
      //console.log("fill()");
      ctx.fill();
    };
    imports.stroke = function() {
      //console.log("stroke()");
      ctx.stroke();
    };
    imports.stroke_rect = function(x, y, width, height) {
      //console.log("stroke_rect()", x, y, width, height);
      ctx.strokeRect(x, y, width, height);
    };
    imports.fill_rect = function(x0, y0, x1, x2) {
      //console.log("fill_rect()", x0, y0, x1, x2);
      ctx.fillRect(x0, y0, x1, x2);
    };
    imports.draw_rect = function(x0, y0, x1, y1) {
      //console.log("draw_rect()", x0, y0, x1, y1);
      ctx.drawRect(x0, y0, x1, y1);
    };
    imports.clear_rect = function(x, y, width, height) {
      //console.log("clear_rect()", x, y, width, height);
      ctx.clearRect(x, y, width, height);
    };
}
