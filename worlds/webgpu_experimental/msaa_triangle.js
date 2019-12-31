"use strict";



async function initCommon(state) {
}

async function onReload(state) {
    await initCommon(state);
}

async function onExit(state) {
}

let gpu;

// super hard-coded version assuming 2 floats
class MyUniformBufferObject {
    constructor() {}

    make(Api) {
        this.data = new Float32Array(2);

        // https://gpuweb.github.io/gpuweb/#dictdef-gpubufferdescriptor
        this.buf = Api.device.createBuffer({
            size  : 8, // in bytes
            usage : GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        });

        //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
        // https://gpuweb.github.io/gpuweb/#enumdef-gpubindingtype
        // No Support yet for simple types like Floats, Vec2-3-4, mat4x4, etc
        // So to pass data to a Pipeline(shader), the only way is through a Uniform Buffer.

        // Layout is for the shader.
        // https://gpuweb.github.io/gpuweb/#dom-gpudevice-createbindgrouplayout
        this.bind_layout = Api.device.createBindGroupLayout({ bindings:[
            { binding: 0, visibility: GPUShaderStage.VERTEX, type: "uniform-buffer" }
        ]});

        // But When rendering, we need a bind group that links the layout
        // to the actual data buffer.
        // https://gpuweb.github.io/gpuweb/#bind-groups
        this.bind_group = Api.device.createBindGroup({
            layout      : this.bind_layout,
            bindings    : [
                { binding:0, resource:{ buffer:this.buf } }
            ]
        });
    }

        firstUpload() {
            this.buf.setSubData(0, this.data);
        }
        update( v ){
            this.data[ 0 ] = v;
            this.buf.setSubData( 0, this.data, 0, 8);
        }
        updateAll() {
            this.buf.setSubData( 0, this.data );
        }
}

async function loadShaderCompiler(state) {
    state.shaderCompilerModule = await import(
        "https://unpkg.com/@webgpu/glslang@0.0.12/dist/web-devel/glslang.js"
    );
    state.shaderCompiler = await state.shaderCompilerModule.default();
}

class Shader {
    constructor(){
        this.pipe_line          = null;
        this.bind_grp_layout    = null;
    }

    static make(Api, vert_src, frag_src, ubo, compiler) {
        //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
        // Compile and Create Shader Modules

        // TODO(TR): compilation can be done in another thread
        // to keep animation running uninterrupted during shader reload

        let byte_vert   = compiler.compileGLSL( vert_src, "vertex" );
        let byte_frag   = compiler.compileGLSL( frag_src, "fragment" );
        
        // Shaders are setup as Modules, Just pass in Byte Code.
        let mod_vert = {
            module      : Api.device.createShaderModule({ code:byte_vert }),
            entryPoint  : "main"
        };

        let mod_frag = {
            module      : Api.device.createShaderModule({ code:byte_frag }),
            entryPoint  : "main"
        };


        //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
        // Define the Render Pipeline
        // https://gpuweb.github.io/gpuweb/#primitive-topology

        // The layout of Uniform data that will be bound to the shader
        let pl_layout = Api.device.createPipelineLayout({ 
            bindGroupLayouts : [ubo.bind_layout] 
        });

        // This is how a shader is put together.
        // Define all the Attributes & Uniforms, Draw Mode and Linking the
        // Shader Modules together.
        // https://gpuweb.github.io/gpuweb/#gpurenderpipeline
        let pipe_line = Api.device.createRenderPipeline({
            layout              : pl_layout, //Required
            vertexStage         : mod_vert,
            fragmentStage       : mod_frag,

            // This is like the draw mode from WEBGL
            primitiveTopology   : "triangle-list",

            // How to save the pixels to the frame buffer
            colorStates         : [{format : Api.tex_format}],

            // Tell Pipeline to Use the depth buffer
            depthStencilState   : {
                depthWriteEnabled   : true,
                depthCompare        : "less",
                format              : Api.depth_format,
            },

            // Setting up Vertex Attributes
            vertexState : {
                vertexBuffers : [
                {   
                    arrayStride : 24, // Vertex data Length in Bytes, 6 floats * 4 Bytes
                    attributes  : [ 
                        {shaderLocation : 0, offset : 0, format : "float2"},
                        {shaderLocation : 1, offset : 8, format : "float4"} 
                    ]
                }
                ]
            },
            sampleCount : Api.sampleCount
        });

        const canvas = MR.getCanvas();

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

        //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
        const shader = new Shader();
        shader.pipe_line = pipe_line;
        Api.texture = texture;
        Api.textureView = texture.createView();
        return shader;        
    }
}

//##########################################################
// Creating a Mesh is the same concept, Get a Typed Array of
// Flat Vertex/Index data, create a buffer, pass data to it.
// Keep Track of how many ELEMENTS in the buffer, not the byte size.
// Like How many Vertices exist in this float32array
class Mesh {
    constructor(){
        this.buf_vert   = null;     // Reference to GPU Buffer
        this.elm_cnt    = 0;        // How many Vertices in buffer
    }

    static make(Api, vert_ary, elm_len=2 ){
        let mesh = new Mesh();

        mesh.buf_vert = Api.device.createBuffer({
            size    : vert_ary.byteLength,
            usage   : GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
        });

        mesh.buf_vert.setSubData( 0, vert_ary );
        mesh.elm_cnt = vert_ary.length / elm_len;   // How Many Vertices

        return mesh;
    }
}


function initGPUState(info, canvas) {
    // initialize main structure holding GPU state info
    const gpuInfo = {
        adapter : info.gpuCtxInfo.adapter,
        device  : info.gpuCtxInfo.device,

        tex_format  : "bgra8unorm",
        depth_format : "depth24plus-stencil8",
        sampleCount : 4,
        depth_buffer : null,

        clearColor : {r : 0.0, g : 0.0, b : 0.0, a : 1.0},

        POSITION_LOC : 0, // Shader Attribute Location
        UNIFORM_BIND : 0, // Uniform Buffer Binding Point
    };
    // describes the render pass (color and depth attachments for now)
    gpuInfo.render_pass_descriptor = {
        colorAttachments: [{
            attachment : null,              // reference to color buffer
            loadValue  : gpuInfo.clearColor // initial clear color       
        }],

        // depth view
        depthStencilAttachment:{
            attachment        : null,       
            depthLoadValue    : 1.0,
            depthStoreOp      : "store",
            stencilLoadValue  : 0,
            stencilStoreOp    : "store"
        }
    }
    // swap chain
    gpuInfo.swap_chain = gpu.configureSwapChain({
        device  : gpuInfo.device,
        format  : gpuInfo.tex_format,
    });
    // depth buffer
    gpuInfo.depth_buffer = gpuInfo.device.createTexture({
        size   : {width : canvas.width, height : canvas.height, depth : 1},
        format : gpuInfo.depth_format,
        usage  : GPUTextureUsage.OUTPUT_ATTACHMENT,
        sampleCount : gpuInfo.sampleCount        
    });
    gpuInfo.depth_buffer_view = gpuInfo.depth_buffer.createView();
    
    return gpuInfo;
}

// Steps to take before rendering a frame
function renderBegin(Api){
    // https://developer.apple.com/documentation/metal/mtlcommandencoder
    // https://vulkan-tutorial.com/Drawing_a_triangle/Drawing/Command_buffers
    // Get a Command Buffer, This is where we create all the commands we want to
    // execute on the gpu.
    Api.cmd_encoder = Api.device.createCommandEncoder( {} ); // Create Command Buffer

    // Get the next frame buffer that we can use to render
    // the next frame
    Api.render_pass_descriptor.colorAttachments[0].attachment = Api.textureView; // or texture.createView();
    Api.render_pass_descriptor.colorAttachments[0].resolveTarget = Api.swap_chain.getCurrentTexture().createView();
    Api.render_pass_descriptor.depthStencilAttachment.attachment = Api.depth_buffer_view; // or depth_buffer.createView()
    
    // Start a Shader Command
    Api.pass_encoder = Api.cmd_encoder.beginRenderPass( Api.render_pass_descriptor ); // Kinda like setting up a single Shader Excution Command
}

// Steps to take after rendering a frame
function renderEnd(Api){
    // End a Shader Command
    Api.pass_encoder.endPass();

    // Close our command buffer, then send it to the queue
    // to execute all the commands we created.
    Api.device.defaultQueue
        .submit([Api.cmd_encoder.finish()]); // Send Command Buffer to execute
    
    Api.cmd_encoder    = null;
    Api.pass_encoder   = null;
}

async function setup(state, info) {
    hotReloadFile(getPath('msaa_triangle.js'));

    CanvasUtil.resize(MR.getCanvas(), 1280, 720);

    gpu = gl;

    // initialize:
    //  render pass descriptor, 
    //  swap chain, 
    //  depth buffer
    const canvas = MR.getCanvas();

    state.gpuInfo = initGPUState(info, canvas);
    // load a shader compiler (in this case, for GLSL)
    await loadShaderCompiler(state.gpuInfo);

    {
        const ubo = new MyUniformBufferObject();
        ubo.make(state.gpuInfo);

        state.gpuInfo.ubo = ubo;
        ubo.data[0] = 0;
        ubo.data[1] = canvas.height / canvas.width;
        ubo.updateAll();


        const vsrc = await assetutil.loadText("shaders/vertex.vert.glsl");
        const fsrc = await assetutil.loadText("shaders/fragment.frag.glsl");

        const shader = Shader.make(
            state.gpuInfo,
            vsrc, fsrc, ubo, 
            state.gpuInfo.shaderCompiler
        );
        state.gpuInfo.shader = shader;

        const mesh = Mesh.make(state.gpuInfo, new Float32Array([
             0.0,  0.5,   1.0, 0.0, 0.0, 1.0,
            -0.5, -0.5,   0.0, 1.0, 0.0, 1.0,
             0.5, -0.5,   0.0, 0.0, 1.0, 1.0
        ]));

        state.mesh = mesh;
    }


    CanvasUtil.setOnResizeEventHandler((target, width, height, oldWidth, oldHeight) => {
        console.error("TODO need to reconstruct properly after resize");

    });

    state.ANGLE = 0.0;

    Input.initKeyEvents();
}

function onStartFrame(t, state, info) {
    const gpuInfo = state.gpuInfo;  

    const ubo = gpuInfo.ubo;

    state.ANGLE += 0.01
    ubo.update(state.ANGLE);
}
function onDraw(t, projMat, viewMat, state, info) {
    const gpuInfo = state.gpuInfo;

    const ubo = gpuInfo.ubo;
    const mesh = state.mesh;

    {
        renderBegin(gpuInfo);

        gpuInfo.pass_encoder.setPipeline(gpuInfo.shader.pipe_line );
        gpuInfo.pass_encoder.setBindGroup(gpuInfo.UNIFORM_BIND, ubo.bind_group );
        gpuInfo.pass_encoder.setVertexBuffer(gpuInfo.POSITION_LOC, mesh.buf_vert );
        
        gpuInfo.pass_encoder.draw(mesh.elm_cnt, 1, 0, 0 );

        renderEnd(gpuInfo);
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

            self.time = t / 1000.0;
            self.timeMS = t;

            const gpu = self.GPUCtx; 

            self._animationHandle = window.requestAnimationFrame(self.config.onAnimationFrameWindow);
            
            // const viewport = self.systemArgs.viewport;
            // viewport.x      = 0;
            // viewport.y      = 0;
            // viewport.width  = gl.drawingBufferWidth;
            // viewport.height = gl.drawingBufferHeight;
            
            self.systemArgs.viewIdx = 0;

            mat4.identity(self._viewMatrix);
            
            mat4.perspective(self._projectionMatrix, 
                Math.PI / 4,
                self._canvas.width / self._canvas.height,
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
