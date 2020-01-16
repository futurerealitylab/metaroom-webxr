"use strict"

import Profile from "./profile.js";
import * as GPU                 from "./gpu/gpu.js";
import {ServerPublishSubscribe} from "./event_pubsub.js";

export default class WebVRProfile extends Profile {
    constructor(){
        super();
    }

    async main(){
        ShaderTextEditor.detectFeatures();
        this.deferredActions = [];
        wrangler.isTransitioning = false;
        
        // call the main function of the selected world
        if (MR.engine.options.enableMultipleWorlds) {
            try {
                this.sourceFiles = document.getElementsByClassName("worlds");
                let worldIt = this.sourceFiles[0].firstElementChild;

                while (worldIt !== null) {
                    const src = worldIt.src;
                    console.log("loading world:", src);
                    const world     = await import(src);
                    const localPath = getCurrentPath(src);

                    MR.worlds.push({world : world, localPath : localPath});
                    worldIt = worldIt.nextElementSibling;
                }

                const worldInfo = MR.worlds[MR.worldIdx];
                setPath(worldInfo.localPath);
                wrangler.isTransitioning = true;
                MR.engine.beginSetup(worldInfo.world.default()).catch(err => {
                        //console.trace();
                        console.error(err);
                        MR.engine.doWorldTransition({direction : 1, broadcast : true});
                }).then(() => { wrangler.isTransitioning = false;               
                        for (let d = 0; d < this.deferredActions.length; d += 1) {
                            this.deferredActions[d]();
                        }
                        this.deferredActions = [];

                        CanvasUtil.rightAlignCanvasContainer(MR.getCanvas());

                        window.DISABLEMENUFORWORLDSEXCEPT(MR.worldIdx);
                });

            } catch (err) {
                console.error(err);
            }
        } else {
            try {                
                const src  = this.sourceFiles[0].firstElementChild.src;
                setPath(getCurrentPath(src));

                const world = await import(src);
                MR.engine.beginSetup(world.default()).catch(err => {
                        console.trace();
                        console.error(err);
                        CanvasUtil.rightAlignCanvasContainer(MR.getCanvas());
                });
            } catch (err) {
                console.error(err);
            }
        }
                    
        wrangler.defineWorldTransitionProcedure(function(args) {
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
                wrangler.isTransitioning = true;
                //console.log(COUNT, "transitioning to world: [" + MR.worldIdx + "]");
                //console.log(COUNT, "broadcast", args.broadcast, "direction: ", args.direction, "key", args.key);

                CanvasUtil.setOnResizeEventHandler(null);
                CanvasUtil.resize(MR.getCanvas(), 
                    MR.engine.options.outputWidth, 
                    MR.engine.options.outputHeight
                );

                MR.engine._gl.useProgram(null);
                MR.engine._reset();
                MR.engine._glFreeResources();
                ScreenCursor.clearTargetEvents();
                Input.deregisterKeyHandlers();

                //console.log(COUNT, "SWITCH");

                try {
                    // call the main function of the selected world
                    MR.server.subsLocal = new ServerPublishSubscribe();
                    ShaderTextEditor.resetState();                        

                    let hadError = false;

                    const worldInfo = MR.worlds[MR.worldIdx];
                    setPath(worldInfo.localPath);

                    MR.engine.beginSetup(worldInfo.world.default()).catch((e) => {
                            console.error(e);
                            setTimeout(function(){ 
                                    console.log("Trying another world");
                                    wrangler.doWorldTransition({direction : 1, broadcast : true});
                            }, 500);  
                    }).then(() => {
                        wrangler.isTransitioning = false;

                        //console.log("now we should do deferred actions");
                        //console.log("ready");

                        for (let d = 0; d < this.deferredActions.length; d += 1) {
                            this.deferredActions[d]();
                        }
                        this.deferredActions = [];

                        CanvasUtil.rightAlignCanvasContainer(MR.getCanvas());

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
        super.main();
    }

    run(){
        MR.init({
            outputSurfaceName      : 'output-surface',
            outputWidth            : parseInt(this.RESOLUTION[0]),
            outputHeight           : parseInt(this.RESOLUTION[1]),
            glUseGlobalContext     : true,
            // frees gl resources upon world switch
            glDoResourceTracking   : true,
            glEnableEditorHook     : true,
            enableMultipleWorlds   : true,
            enableEntryByButton    : true,
            enableBellsAndWhistles : true,
            synchronizeTimeWithServer : false,
            // main() is the system's entry point
            // main : async () => {
            //     this.main();     
            // },
            main :this.main,
            useExternalWindow : (new URLSearchParams(window.location.search)).has('externWin')
        });
    }
}