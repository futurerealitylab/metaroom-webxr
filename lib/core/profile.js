"use strict";

import * as path from "/lib/util/path.js";
import {SpatialAudioContext} from "/lib/media/audio.js";
import * as assetutil from "/lib/util/asset.js";

const USE_AXIOS = false;

export default class Profile {
    constructor() {
        this.RESOLUTION = document.getElementById("resolution").getAttribute("value").split(',');

        if (USE_AXIOS) {

            SpatialAudioContext.setBinaryLoaderProc((url, opts) => {
                return axios.get(url, opts);
            });
            SpatialAudioContext.setBinaryLoaderGetDataProc((result) => {
                // the result is the response
                return result.data;
            });
        } else {

            SpatialAudioContext.setBinaryLoaderProc(async (url, opts) => {
                return assetutil.loadBinaryAbsolutePath(url, opts);
            });   
            SpatialAudioContext.setBinaryLoaderGetDataProc((result) => {
                // the result is the data
                return result;
            });
        }
    }

    main() {
        MR.initWorldsScroll();
        MR.initPlayerViewSelectionScroll();
        MR.syncClient.connect(window.IP, window.PORT_SYNC);

        window.COUNT = 0;
        MR.server.subs.subscribe("Load_World", (_, args) => {
            if (args.key === MR.worldIdx) {
                return;
            }

            //console.log("loading world", args);
            if (wrangler.isTransitioning) {
                //console.log("is deferring transition");
                this.deferredActions = [];
                this.deferredActions.push(() => { 
                    MR.engine.doWorldTransition({direction : null, key : args.key, broadcast : false});
                });
                return;
            }
            //console.log("not deferring transition");
            MR.engine.doWorldTransition({direction : null, key : args.key, broadcast : false});
        });
    }

    async loadWorlds() {
        const sourceFiles = document.getElementsByClassName("worlds");

        let worldIt = sourceFiles[0].firstElementChild;
        while (worldIt !== null) {
            const src = worldIt.src;
            console.log("loading world: %s", src);
            const world     = await import(src);
            const localPath = path.getCurrentPath(src)

            MR.registerWorld({
                world     : world, 
                localPath : localPath
            });

            worldIt = worldIt.nextElementSibling;
        }
    }

};