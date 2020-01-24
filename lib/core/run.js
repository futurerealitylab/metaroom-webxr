"use strict";

import {Metaroom}               from "./metaroom.js";
import {ServerPublishSubscribe} from "./event_pubsub.js";
import {ShaderTextEditor}       from "./shader_text_editor.js";
import * as WatchFile           from "./watchfile.js";
import * as GPU                 from "./gpu/gpu.js";
import * as path                from "/lib/util/path.js";

import {WebXRButton}            from "./webxr_button.js";
import WebVRProfile             from "./webvr_profile.js";
import WebXRProfile             from "./webxr_profile.js";

import * as WindowUIStyle       from "/lib/ui/default_window_css_style.js";

import * as DefaultSystemEvents from "/lib/core/event_callback.js";

WindowUIStyle.init(document);

window.treq = function (data) {
    fetch("/world_transition", {
        method: "POST",
        body: JSON.stringify(data),         
        headers: {
            'Content-Type': 'application/json',
            // 'Content-Type': 'application/x-www-form-urlencoded',
        },
        mode: 'cors'
    }).then(res => res.json()).then(parsed => {
        console.log(parsed);
    }).error(err => {
        console.error(err);
    });
}

function rawURL(url) {
    return url.split(/[?#]/)[0];
}

function updateWorld(world) {
    MR.worlds[MR.worldIdx].world = world;
}
window.hotReloadFile = function(localPath) {
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

    console.log(saveTo);
	MR.server.subsLocal.subscribe("Update_File", (filename, args) => {
        if (args.file !== filename) {
            console.log("file does not match");
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

    }, saveTo);

    WatchFile.watchFiles([saveTo], {});
}

const VERSION = document.getElementById("version").getAttribute("value");
MR.VERSION = parseInt(VERSION);
console.log(
    "%crunning version=[%d], backend=[%s]",
    "font-size: 15px; color: #9faaff",
    MR.VERSION, 
    Metaroom.TYPE_TO_NAME[MR.type]
);

function MRInit(){

    DefaultSystemEvents.init(MR);

    // TODO initialization order revision
    MR.initialWorldIdx = 0;
    MR.server.subs.subscribe("Init", (_, args) => {
        MR.worldIdx = args.key || 0;
        MR.initialWorldIdx = args.key || 0;
        MR.server.uid = args.uid;
    });

    MR.server.subs.subscribe("Log", (_, args) => {
        if (MR.VRIsActive() || args.playerid == MR.playerid) {
            return;
        }

        console.groupCollapsed("%clogs from pid=[%d]", "color: #00dd00;", args.id);
        const joined = args.msg.join('\n');
        console.log(joined);
        console.groupEnd();

    }, null);
    MR.initWebSocket();
}

switch (MR.VERSION) {
    case 1: {    
        MRInit();
        setTimeout(() => {
            if(typeof webvrProfile === 'undefined')
                var webvrProfile = new WebVRProfile();
            webvrProfile.run();
        }, 100);
        break;
    }
    case 2: {        
        MRInit();
        setTimeout(() => {
            if(typeof webxrProfile === 'undefined')
                var webxrProfile = new WebXRProfile();
            webxrProfile.run();
        }, 100);
        break;
    }    
    default: {
        break;
    }
}
