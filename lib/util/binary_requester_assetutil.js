"use strict";

import * as assetutil from "./asset.js";

export const loaderInterface = {
    procs : {
        request : function(url, opts) {
            return assetutil.requestAbsolutePath(url, opts);
        },
        getData : function(result) {
            return result.arrayBuffer();
        }
    }
};
