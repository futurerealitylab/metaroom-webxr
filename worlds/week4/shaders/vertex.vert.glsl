#version 300 es
precision highp float;

// input vertex
in  vec3 aPos;

// interpolated position
out vec3 vPos;
// interpolated cursor
out vec3 vCursor;

// matrices
uniform mat4 uModel;
uniform mat4 uView;
uniform mat4 uProj;

// window resolution
uniform vec2 uResolution;
// window aspect ratio x / y
uniform float uAspect;
// cursor in pixel coordinates
uniform vec3 uCursor;
// time in seconds
uniform float uTime;

void main(void) {
    gl_Position = /*uProj * uView * uModel * */ vec4(aPos, 1.0);
    // vPos will be interpolated across fragmented
    vPos = aPos;
    // for non-square aspect ratios, multiply x by the aspect ratio to
    // avoid distortion (NOTE: there are multiple standards 
    // -- e.g. calculate aspect by width/height or height/width)
    vPos.x *= uAspect;

    // starts as x=[left=0, right=xwidth], y=[top=0, bottom=yheight]
    vCursor = uCursor;
    // make cursor match vPos coordinates (though other behavior may be desired)
    // 0 to +1
    vCursor.xy /= uResolution;
    // -1 to +1
    vCursor.x = (vCursor.x - 0.5) * 2.0;
    // top +1 to bottom -1
    vCursor.y = (((1.0 - vCursor.y) - 0.5) * 2.0);
    // aspect ratio corrected
    vCursor.x *= uAspect;
}
