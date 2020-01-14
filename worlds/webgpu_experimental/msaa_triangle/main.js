"use strict";

import {GPU_API_TYPE} from "/lib/core/gpu/gpu.js";
import * as geo       from "./geometry.js";
import * as gpulib    from "./gpu_lib.js";
import * as render    from "./render.js";

// up-to-date as of January 14, 2020

async function initCommon(state) {
}

async function onReload(state) {
    await initCommon(state);
}

async function onExit(state) {
}

let gpu;

// super hard-coded version assuming 3 floats
class MyUniformBufferObject {
    constructor() {}

    make(Api) {
        this.data = new Float32Array(3);

        // https://gpuweb.github.io/gpuweb/#dictdef-gpubufferdescriptor
        this.buf = Api.device.createBuffer({
            size  : 12, // in bytes
            usage : GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        });

        //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
        // https://gpuweb.github.io/gpuweb/#enumdef-gpubindingtype
        // No Support yet for simple types like Floats, Vec2-3-4, mat4x4, etc
        // So to pass data to a Pipeline(shader), the only way is through a Uniform Buffer.

        // Layout is for the shader.
        // https://gpuweb.github.io/gpuweb/#dom-gpudevice-createbindgrouplayout
        this.bind_layout = Api.device.createBindGroupLayout({bindings : [
            {
                binding    : 0, 
                visibility : GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT, 
                type       : "uniform-buffer",
                multisampled : false
            },
        ]});

        // But When rendering, we need a bind group that links the layout
        // to the actual data buffer.
        // https://gpuweb.github.io/gpuweb/#bind-groups
        this.bind_group = Api.device.createBindGroup({
            layout   : this.bind_layout,
            bindings : [
                {binding : 0, resource : {buffer : this.buf}}
            ]
        });
    }

        update(i, v) {
            this.data[i] = v; // dstOffset, data, srcOffset, byteLength
             //this.buf.setSubData(i * 4, this.data, i * 4, 4);
        }
        upload(Api) {

            const buf  = this.buf;
            const data = this.data;

            //gpulib.bufferMappedSubData(Api.device, buf, 0, data.buffer);
            this.buf.setSubData(0, this.data);
        }
}

async function setup(state, info) {
    hotReloadFile(getPath('main.js'));

    CanvasUtil.resize(MR.getCanvas(), 1280, 720);

    gpu = gl;

    // initialize:
    //  render pass descriptor, 
    //  swap chain, 
    //  depth buffer
    const canvas = MR.getCanvas();
    state.gpuInfo = gpulib.defaultInitGPUState(gpu, info, canvas);
    // load a shader compiler (in this case, for GLSL)
    await gpulib.loadShaderCompiler(state.gpuInfo);

    {
        const ubo = new MyUniformBufferObject();
        ubo.make(state.gpuInfo);

        state.gpuInfo.ubo = ubo;
        ubo.data[0] = 0;
        ubo.data[1] = canvas.height / canvas.width;
        ubo.data[2] = 0;


        const vsrc = await asset.loadText("shaders/vertex.vert.glsl");
        const fsrc = await asset.loadText("shaders/fragment.frag.glsl");

        const shader = gpulib.Shader.make(
            state.gpuInfo,
            vsrc, fsrc, ubo, 
            state.gpuInfo.shaderCompiler
        );
        state.gpuInfo.shader = shader;

        const mesh = geo.Mesh.make(state.gpuInfo, new Float32Array([
             0.0,  0.5,   1.0, 0.0, 0.0, 1.0,
            -0.5, -0.5,   0.0, 1.0, 0.0, 1.0,
             0.5, -0.5,   0.0, 0.0, 1.0, 1.0
        ]));

        state.mesh = mesh;
    }


    CanvasUtil.setOnResizeEventHandler((target, width, height, oldWidth, oldHeight) => {
        const gpuInfo = state.gpuInfo;
        
        const Api = gpuInfo;
        const canvas = target;
        
        gpuInfo.texture.destroy();
        gpuInfo.depth_buffer.destroy();

        gpuInfo.ubo.update(1, height / width);

        const texture = Api.device.createTexture({
            size : {
                width  : canvas.width,
                height : canvas.height,
                depth  : 1,
            },
            sampleCount : Api.sampleCount,
            format      : Api.tex_format,
            usage       : GPUTextureUsage.OUTPUT_ATTACHMENT,
        });
        gpuInfo.texture     = texture;
        gpuInfo.textureView = texture.createView();

        const depth_buffer = gpuInfo.device.createTexture({
            size   : {width : canvas.width, height : canvas.height, depth : 1},
            format : gpuInfo.depth_format,
            usage  : GPUTextureUsage.OUTPUT_ATTACHMENT,
            sampleCount : gpuInfo.sampleCount        
        });
        gpuInfo.depth_buffer      = depth_buffer;
        gpuInfo.depth_buffer_view = depth_buffer.createView();
    });

    state.ANGLE = 0.0;

    Input.initKeyEvents();
}

function onStartFrame(t, state, info) {
    const gpuInfo = state.gpuInfo;  

    const ubo = gpuInfo.ubo;

    state.ANGLE += 0.01;
    ubo.update(0, state.ANGLE);
    ubo.update(2, t / 1000.0);
    ubo.upload(gpuInfo);
}
function onDraw(t, projMat, viewMat, state, info) {
    const gpuInfo = state.gpuInfo;

    const ubo = gpuInfo.ubo;
    const mesh = state.mesh;

    {
        render.begin(gpuInfo, info);

        gpuInfo.pass_encoder.setPipeline(gpuInfo.shader.pipe_line);
        gpuInfo.pass_encoder.setBindGroup(gpuInfo.UNIFORM_BIND, ubo.bind_group);
        gpuInfo.pass_encoder.setVertexBuffer(gpuInfo.POSITION_LOC, mesh.buf_vert);
        
        gpuInfo.pass_encoder.draw(mesh.elm_cnt, 1, 0, 0);

        render.end(gpuInfo, info);
    }
}

function onEndFrame(t, state, info) {
    Input.gamepadStateChanged = false;
}

export default function main() {
    const def = {
        name: 'webgpu msaa triangle',
        setup        : setup,
        onStartFrame : onStartFrame,
        onDraw       : onDraw,
        onEndFrame   : onEndFrame,

        onStartFrameXR : onStartFrame,
        onDrawXR       : onDraw,
        onEndFrameXR   : onEndFrame,
        // call upon reload
        onReload       : onReload,
        // call upon world exit
        onExit         : onExit,
        onExitXR       : onExit,

        onAnimationFrameWindow : function(t) {
            const self = MR.engine;

            self._animationHandle = window.requestAnimationFrame(self.config.onAnimationFrameWindow);

            self.timeMS = t;
            self.time = t / 1000.0;

            const gpu = self.GPUCtx; 

            const viewport = self.systemArgs.viewport;
            const extent    = MR.getCanvas();
            viewport.x      = 0;
            viewport.y      = 0;
            viewport.width  = extent.width;
            viewport.height = extent.height;
            viewport.minDepth = 0.0;
            viewport.maxDepth = 1.0;
            
            self.systemArgs.viewIdx = 0;

            mat4.identity(self._viewMatrix);
            
            mat4.perspective(self._projectionMatrix, 
                Math.PI / 4,
                extent.width / extent.height,
                0.01, 1.0
            );

            Input.updateKeyState();

            self.config.onStartFrame(t, self.customState, self.systemArgs);

            self.config.onDraw(t, self._projectionMatrix, self._viewMatrix, self.customState, self.systemArgs);
            
            self.config.onEndFrame(t, self.customState, self.systemArgs);
        },
    };

    return def;

}
