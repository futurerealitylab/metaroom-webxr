"use strict";

// initialization

export function defaultInitGPUState(gpu, info, canvas) {
    // initialize main structure holding GPU state info
    const gpuInfo = {
        adapter : info.gpuCtxInfo.adapter,
        device  : info.gpuCtxInfo.device,

        tex_format   : "bgra8unorm",
        depth_format : "depth24plus-stencil8",
        sampleCount  : 4,
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
// shaders

export class Shader {
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

            // cull mode
            rasterizationState : {cullMode : "back"},
            // How to save the pixels to the frame buffer
            colorStates         : [{
                format    : Api.tex_format,
                srcFactor : "src-alpha",
                dstFactor : "one-minus-src-alpha",
                operation : "add"
            }],

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

export async function loadAndRegisterShaderCompiler(state) {
    state.shaderCompilerModule = await import(
        "https://unpkg.com/@webgpu/glslang@0.0.12/dist/web-devel/glslang.js"
    );
    state.shaderCompiler = await state.shaderCompilerModule.default();
}

/// buffer uploads

// taken from https://trac.webkit.org/changeset/246217/webkit/
export function createBufferMappedWithData(device, descriptor, data, offset = 0) {
    const mappedBuffer = device.createBufferMapped(descriptor);
    const dataArray = new Uint8Array(mappedBuffer[1]);
    dataArray.set(new Uint8Array(data), offset);
    mappedBuffer[0].unmap();
    return mappedBuffer[0];
}

export async function mapWriteDataToBuffer(buffer, data, offset = 0) {
    const arrayBuffer = await buffer.mapWriteAsync();
    const writeArray = new Uint8Array(arrayBuffer);
    writeArray.set(new Uint8Array(data), offset);
    buffer.unmap();
}

// https://github.com/gpuweb/gpuweb/blob/master/design/BufferOperations.md
export function bufferMappedSubData(device, destBuffer, destOffset, srcArrayBuffer) {
    const byteCount = srcArrayBuffer.byteLength;
    const [srcBuffer, arrayBuffer] = device.createBufferMapped({
        size: byteCount,
        usage: GPUBufferUsage.COPY_SRC
    });
    new Uint8Array(arrayBuffer).set(new Uint8Array(srcArrayBuffer)); // memcpy
    srcBuffer.unmap();

    const encoder = device.createCommandEncoder();
    encoder.copyBufferToBuffer(srcBuffer, 0, destBuffer, destOffset, byteCount);
    const commandBuffer = encoder.finish();
    const queue = device.defaultQueue;
    queue.submit([commandBuffer]);

    srcBuffer.destroy();
}

// taken from:
// https://github.com/gpuweb/gpuweb/blob/master/design/BufferOperations.md
export function AutoRingBuffer(device, chunkSize) {
    const queue = device.defaultQueue;
    let availChunks = [];

    function Chunk() {
        const size = chunkSize;
        const [buf, initialMap] = this.device.createBufferMapped({
            size: size,
            usage: GPUBufferUsage.MAP_WRITE | GPUBufferUsage.COPY_SRC,
        });

        let mapTyped;
        let pos;
        let enc;
        this.reset = function(mappedArrayBuffer) {
            mapTyped = new Uint8Array(mappedArrayBuffer);
            pos = 0;
            enc = device.createCommandEncoder({});
            if (size == chunkSize) {
                availChunks.push(this);
            }
        };
        this.reset(initialMap);

        this.push = function(destBuffer, destOffset, srcArrayBuffer) {
            const byteCount = srcArrayBuffer.byteLength;
            const end = pos + byteCount;
            if (end > size)
                return false;
            mapTyped.set(new Uint8Array(srcArrayBuffer), pos);
            enc.copyBufferToBuffer(buf, pos, destBuffer, destOffset, byteCount);
            pos = end;
            return true;
        };

        this.flush = async function() {
            const cb = enc.finish();
            queue.submit([cb]);
            const newMap = await buf.mapWriteAsync();
            this.reset(newMap);
        };

        this.destroy = function() {
            buf.destroy();
        };
    };

    this.push = function(destBuffer, destOffset, srcArrayBuffer) {
        if (availChunks.length) {
            const chunk = availChunks[0];
            if (chunk.push(destBuffer, destOffset, srcArrayBuffer))
                return;
            chunk.flush();
            this.destroy();

            while (true) {
                chunkSize *= 2;
                if (chunkSize >= srcArrayBuffer.byteLength)
                    break;
            }
        }

        new Chunk();
        availChunks[0].push(destBuffer, destOffset, srcArrayBuffer);
    };

    this.flush = function() {
        if (availChunks.length) {
            availChunks[0].flush();
            availChunks.shift();
        }
    };

    this.destroy = function() {
        availChunks.forEach(x => x.destroy());
        availChunks = [];
    };
};
