
// rendering 

// Steps to take before rendering a frame
export function begin(Api, info){
    // https://developer.apple.com/documentation/metal/mtlcommandencoder
    // https://vulkan-tutorial.com/Drawing_a_triangle/Drawing/Command_buffers
    // Get a Command Buffer, This is where we create all the commands we want to
    // execute on the gpu.
    Api.cmd_encoder = Api.device.createCommandEncoder({}); // Create Command Buffer

    // Get the next frame buffer that we can use to render
    // the next frame
    Api.render_pass_descriptor.colorAttachments[0].attachment = Api.textureView; // or texture.createView();
    Api.render_pass_descriptor.colorAttachments[0].resolveTarget = Api.swap_chain.getCurrentTexture().createView();
    Api.render_pass_descriptor.depthStencilAttachment.attachment = Api.depth_buffer_view; // or depth_buffer.createView()
    
    // Start a Shader Command
    Api.pass_encoder = Api.cmd_encoder.beginRenderPass(Api.render_pass_descriptor); // like setting up a single Shader Excution Command
    const viewport = info.viewport;
    Api.pass_encoder.setViewport(
        viewport.x, viewport.y, 
        viewport.width, viewport.height, 
        viewport.minDepth, viewport.maxDepth
    );
}

// Steps to take after rendering a frame
export function end(Api, info){
    // End a Shader Command
    Api.pass_encoder.endPass();

    // Close our command buffer, then send it to the queue
    // to execute all the commands we created.
    Api.device.defaultQueue
        .submit([Api.cmd_encoder.finish()]); // Send Command Buffer to execute
    
    Api.cmd_encoder    = null;
    Api.pass_encoder   = null;
}
