"use strict";

import * as path             from "/lib/util/path.js";

export default class Profile {
    constructor() {
        this.RESOLUTION = document.getElementById("resolution").getAttribute("value").split(',');
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
};