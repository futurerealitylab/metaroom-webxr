"use strict"

import Profile                  from "./profile.js";
import * as GPU                 from "./gpu/gpu.js";
import {ServerPublishSubscribe} from "./event_pubsub.js";
import {ShaderTextEditor}       from "/lib/core/shader_text_editor.js";
import * as canvasutil          from "/lib/util/canvas.js";
import * as path                from "/lib/util/path.js";
import * as errs                from "/lib/core/error_handler.js";
import * as assetutil           from "/lib/util/asset.js";
import {ScreenCursor}           from "/lib/input/cursor.js";
import * as Input               from "/lib/input/input.js";

import {SpatialAudioContext} from "/lib/media/audio.js";
import {BinaryRequester}     from "/lib/util/binary_requester.js";

export default class WebXRProfile extends Profile {
    constructor(){
        super();        
    }

    // load worlds first
    async loadWorlds() {
        this.sourceFiles = document.getElementsByClassName("worlds");
        let worldIt = this.sourceFiles[0].firstElementChild;
        while (worldIt !== null) {
            // {   
            //     console.log("WEE")
            //     const W = await import("/worlds/week10/week10.js");
            //     console.log(W, W.default());
            //     const conf = await assetutil.loadTextAbsolutePath("/locallib/wee.mrconf.json");
            //     console.log(conf);
            //     console.log("HUH")


            // }
            const src = worldIt.src;
            console.log("loading world: %s", src);
            const world     = await import(src);
            const localPath    = path.getCurrentPath(src);
            const mainFileName = path.genMainFileName(src);

            MR.registerWorld({
                world        : world,
                localPath    : localPath,
                mainFileName : mainFileName,
                mainFilePath : src
            });

            worldIt = worldIt.nextElementSibling;
        }
    }

    async main() {

        const USE_AXIOS = true;
        SpatialAudioContext.setBinaryLoader(await BinaryRequester.make(
            (USE_AXIOS) ? "axios" : "assetutil"
        ));

        {
            const ui   = await import("../ui/default_window_ui.js");
            MR.engine.ui = new ui.DefaultWindowMenuUI();
            // temp hack
            MR.engine.menu = MR.engine.ui.menu;

            ui.makeModalCanvas(MR.getCanvas());
        }

        ShaderTextEditor.enable();

        ShaderTextEditor.init({
            defaultShaderCompilationFunction : ShaderTextEditor.onNeedsCompilationDefault,
        });

        this.deferredActions = [];
        super.main();

        ShaderTextEditor.detectFeatures();

        MR.engine.isTransitioning = false;

        try {
            const worldInfo = MR.worlds[MR.worldIdx];

            path.setPathInfo(
                worldInfo.mainFilePath,
                worldInfo.localPath,
                worldInfo.mainFileName
            );

            wrangler.isTransitioning = true;
            MR.engine.beginSetup(worldInfo.world.default()).catch(err => {
                console.error(err);
                MR.engine.doWorldTransition({direction : 1, broadcast : true});
            }).then(() => { wrangler.isTransitioning = false;               
                for (let d = 0; d < this.deferredActions.length; d += 1) {
                    this.deferredActions[d]();
                }
                this.deferredActions = [];

                canvasutil.rightAlignCanvasContainer(MR.getCanvas());

                window.DISABLEMENUFORWORLDSEXCEPT(MR.worldIdx);
            });

        } catch (err) {
            console.error(err);
        }
      
        MR.engine.defineWorldTransitionProcedure(function(args) {
            //console.trace();
            let ok = false;
            COUNT += 1;
            //console.log(COUNT, args);
            // try to transition to the next world
            while (!ok) {
                if (args.direction) {
                    //console.log(COUNT, "has direction");
                    MR.worldIdx = (MR.worldIdx + args.direction) % MR.worlds.length;
                    if (MR.worldIdx < 0) {
                        MR.worldIdx = MR.worlds.length - 1;
                    }
                } else if (args.key !== null) {
                    //console.log(COUNT, "key exists", args.key, "worldidx", MR.worldIdx);
                    if (args.key == MR.worldIdx) {
                        ok = true;
                        continue;
                    }
                    MR.worldIdx = parseInt(args.key);
                    //console.log(COUNT, "WORLDIDX",  MR.worldIdx);
                }


                MR.engine.isTransitioning = true;

                //console.log(COUNT, "transitioning to world: [" + MR.worldIdx + "]");
                //console.log(COUNT, "broadcast", args.broadcast, "direction: ", args.direction, "key", args.key);

                canvasutil.setOnResizeEventHandler(null);
                canvasutil.resize(MR.getCanvas(), 
                    MR.engine.options.outputWidth, 
                    MR.engine.options.outputHeight
                );

                MR.engine.clearWorld();
                ScreenCursor.clearTargetEvents();
                Input.deregisterKeyHandlers();

                try {
                    // call the main function of the selected world
                    MR.server.subsLocal = new ServerPublishSubscribe();
                    ShaderTextEditor.resetState();
                    
                    let hadError = false;

                    const worldInfo = MR.worlds[MR.worldIdx];
                    path.setPathInfo(
                        worldInfo.mainFilePath,
                        worldInfo.localPath,
                        worldInfo.mainFileName
                    );

                    MR.engine.beginSetup(worldInfo.world.default()).catch((e) => {
                        console.error(e);
                        setTimeout(function(){ 
                            console.log("Trying another world");
                            wrangler.doWorldTransition({direction : 1, broadcast : true});
                        }, 500);  
                    }).then(() => {
                        MR.engine.isTransitioning = false;

                        //console.log("now we should do deferred actions");
                        //console.log("ready");

                        for (let d = 0; d < this.deferredActions.length; d += 1) {
                            this.deferredActions[d]();
                        }
                        this.deferredActions = [];

                        canvasutil.rightAlignCanvasContainer(MR.getCanvas());

                        window.DISABLEMENUFORWORLDSEXCEPT(MR.worldIdx);

                    });

                    ok = true;

                } catch (e) {
                    console.error(e);


                    setTimeout(function(){ 
                        console.log(COUNT, "Trying another world");
                    }, 500);
                }
            }

            if (args.broadcast && MR.server.sock.readyState == WebSocket.OPEN) {
                //console.log(COUNT, "broadcasting");
                try {
                    MR.server.sock.send(JSON.stringify({
                        "MR_Message" : "Load_World", "key" : MR.worldIdx, "content" : "TODO", "count" : COUNT})
                    );
                } catch (e) {
                    console.error(e);
                }
            }
        });
    }

    async run(){
        try {
            await this.loadWorlds();
        } catch (err) {
            console.error(err);
            errs.initFailed(err.message);
            return;
        }

        MR.init({
            outputSurfaceName      : 'output-surface',
            outputWidth            : parseInt(this.RESOLUTION[0]),
            outputHeight           : parseInt(this.RESOLUTION[1]),
            useGlobalContext       : true,
            // frees gpu resources upon world switch
            doGPUResourceTracking     : true,
            GPUAPIProvidedContext     : null,
            GPUAPIType                : GPU.GPU_API_TYPE.WEBGL,
            enableEntryByButton       : true,
            enableBellsAndWhistles    : true,
            synchronizeTimeWithServer : false,
            // comment "useLocalSpace" out when/if we start using coordinates
            // with respect to the floor
            useLocalSpace             : true,
            main                      : this.main,
        });
    }
}