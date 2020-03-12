#version 300 es
precision highp float;

in vec3 vPos;
in vec3 vWorldPos;
in vec4 vColor;

uniform float uTime;

#ifdef BASIC_LIGHTING

struct Light {
	vec4 direction;
	vec4 color;	
};

#define MAX_LIGHT_COUNT (2)
Light lights[MAX_LIGHT_COUNT];

struct Material {
	vec3  ambient;
	vec3  diffuse;
	vec3  specular;
	float spec_pow;
};

const vec4 ambient = vec4(1.0);

vec3 

#else

out vec4 fragColor;

void main(void) 
{
    fragColor = vColor;
}

#endif

