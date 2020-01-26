"use strict";

import * as WatchFile from "./watchfile.js";
import * as path      from "/lib/util/path.js";

export function rawURL(url) {
    return url.split(/[?#]/)[0];
}

export function updateWorld(world) {
    MR.worlds[MR.worldIdx].world = world;
}
export function hotReloadFile(localPath) {
    const parentPath = path.getCurrentPath(window.location.pathname);

    let saveTo = localPath;

    saveTo = localPath;

    const origin = window.location.origin;
    const originIdx = saveTo.indexOf(origin);
    saveTo = saveTo.substring(originIdx + origin.length + 1);

    if (parentPath !== '/' && parentPath !== '\\') {
        const parentIdx = saveTo.indexOf(parentPath);
        saveTo = saveTo.substring(parentIdx + parentPath.length);
    }

    MR.server.subsLocal.subscribe("Update_File", (filename, args) => {
        if (args.file !== filename) {
            //// console.log("file does not match");
            return;
        }

        MR.engine.reloadGeneration += 1;

        const importName = rawURL(window.location.href) + 
                            filename + "?generation=" + 
                            MR.engine.reloadGeneration;

        console.log("IMPORTING", importName);
        import(importName).then(
            (world) => {
                updateWorld(world);
                const conf = world.default();
                MR.engine.onReload(conf);
            }).catch(err => { console.error(err); });

    }, saveTo);

    WatchFile.watchFiles([saveTo], {});
}
