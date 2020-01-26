"use strict";

import * as WatchFile from "./watchfile.js";
import * as path      from "/lib/util/path.js";

export function rawURL(url) {
    return url.split(/[?#]/)[0];
}

export function updateWorld(world) {
    MR.worlds[MR.worldIdx].world = world;
}

export function updateFileDefault(filename, args) {
    if (args.file !== filename) {
        //// console.log("file does not match");
        return;
    }

    MR.engine.reloadGeneration += 1;

    const importName = rawURL(window.location.href) + 
                        filename + "?generation=" + 
                        MR.engine.reloadGeneration;

    import(importName).then(
        (world) => {
            updateWorld(world);
            const conf = world.default();
            MR.engine.onReload(conf);
    }).catch(err => { console.error(err); });        
}

export function updateFileUnconditional(filename, args) {
    MR.engine.reloadGeneration += 1;

    const importName = rawURL(window.location.href) + 
                        filename + "?generation=" + 
                        MR.engine.reloadGeneration;

    import(importName).then(
        (world) => {
            updateWorld(world);
            const conf = world.default();
            MR.engine.onReload(conf);
    }).catch(err => { console.error(err); });    
}

let watchList = new Set();
export function hotReloadFile(localPath, watchArr) {
    const parentPath = path.getCurrentPath(window.location.pathname);

    let saveTo = localPath;
    //console.log("initial SAVETO: ", localPath);
    const origin = window.location.origin;

    const originIdx = saveTo.indexOf(origin);
    if (originIdx >= 0) {
        saveTo = saveTo.substring(originIdx + origin.length + 1);

        if (parentPath !== '/' && parentPath !== '\\') {
            const parentIdx = saveTo.indexOf(parentPath);
            saveTo = saveTo.substring(parentIdx + parentPath.length);
        }
    }
    //console.log("SAVETO", saveTo)

    MR.server.subsLocal.subscribe(
        "Update_File", updateFileDefault, saveTo
    );

    WatchFile.watchFiles([saveTo], {});

    reloadMainOnUpdate(watchArr, updateFileUnconditional, saveTo);
}

function reloadMainOnUpdate(watchArr, callback, mainSaveTo) {
    if (!watchArr || watchArr.length == 0) {
        return;
    }
    //console.log("reloadMainOnUpdate")
    const toWatch = [];
    const parentPath = path.getCurrentPath(window.location.pathname);
    for (let i = 0; i < watchArr.length; i += 1) {
        
        let saveTo = watchArr[i].path;

        //if (!watchArr[i].useAbsolutePath) {
            //console.log("SAVETO BEFORE", saveTo);
            const origin = window.location.origin;

            const originIdx = saveTo.indexOf(origin);
            if (originIdx >= 0) {
                saveTo = saveTo.substring(originIdx + origin.length + 1);

                if (parentPath !== '/' && parentPath !== '\\') {
                    const parentIdx = saveTo.indexOf(parentPath);
                    saveTo = saveTo.substring(parentIdx + parentPath.length);
                }
            }
        //}
        //console.log("SAVETO", saveTo)
        MR.server.subsLocal.subscribe("Update_File", (filename, args) => {
            // console.log("filename", filename, 
            //     "args", args, 
            //     "filename == args.file", filename == args.file
            // )
            if (args.file !== filename) {
                //// console.log("file does not match");
                return;
            }

            updateFileUnconditional(mainSaveTo, args);

        }, saveTo);

        toWatch.push(saveTo);

    }
    WatchFile.watchFiles(toWatch, {});
}
