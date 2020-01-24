"use strict";

import {createVerticalMenuElement, Menu, MenuItem} from "/lib/ui/default_window_menu.js";
import * as canvasutil from "/lib/util/canvas.js";

export class DefaultWindowMenuUI {
    constructor() {
        this.menu = new Menu();

        this.worldsScroll = createVerticalMenuElement();

        MR.initWorldsScroll = () => {
            window.CLICKMENU = (id) => {
                const el = document.getElementById(id);
                el.classList = "active";
                MR.wrangler.doWorldTransition({direction : null, key : id, broadcast : true}); 
                MR.wrangler.menu.enableDisableWorldsScroll();     

                window.DISABLEMENUFORWORLDSEXCEPT(id);   
            }
            window.DISABLEMENUFORWORLDSEXCEPT = (id) => {
                const worldsMenuItems = this.worldsScroll.getElementsByTagName("div");

                id = parseInt(id);
                for (let i = 0; i < id; i += 1) {
                    worldsMenuItems[i].classList.remove("active");
                }
                for (let i = id + 1; i < worldsMenuItems.length; i += 1) {
                    worldsMenuItems[i].classList.remove("active");
                }
                worldsMenuItems[id].classList.add("active");
            }
            const worlds = MR.worlds;
            const wCount = worlds.length;
            const contentArr = [];
            for (let i = 0; i < wCount; i += 1) {
                contentArr.push(
                    "<div id="
                );
                contentArr.push(i);
                contentArr.push(' onclick="window.CLICKMENU(this.id)">');
                contentArr.push(i);
                contentArr.push(' ');
                contentArr.push(worlds[i].world.default().name);
                contentArr.push("</div>\n");
            }

            this.worldsScroll.innerHTML = contentArr.join('');
        };

        this.worldsScrollEnabled = 0;
        this.worldsScroll.style.display = "none";
        const worldsScrollDisplayOpt = ["none", ""];

        this.menu.enableDisableWorldsScroll = () => {
            this.worldsScrollEnabled = 1 - this.worldsScrollEnabled; 
            this.worldsScroll.style.display = 
            worldsScrollDisplayOpt[this.worldsScrollEnabled]; 
        }

        this.menu.menus.worldsSelection = new MenuItem(
            this.menu.el,
            'ge_menu',
            "Worlds",
            this.menu.enableDisableWorldsScroll
        );
        this.menu.menus.worldsSelection.el.appendChild(this.worldsScroll);

        this.menu.menus.transition = new MenuItem(
            this.menu.el, 
            'ge_menu', 
            'Prev',
            () => { MR.wrangler.doWorldTransition({direction : -1, broadcast : true}); }
        );
        this.menu.menus.transition = new MenuItem(
            this.menu.el, 
            'ge_menu', 
            'Next',
            () => { return MR.wrangler.doWorldTransition({direction : +1, broadcast : true}); }
        );

        this.playerViewScroll = createVerticalMenuElement();

        MR.initPlayerViewSelectionScroll = () => {
            window.CLICKMENUPLAYERS = (id) => {
                const el = document.getElementById(id);
                el.classList = "active";
                MR.wrangler.menu.enableDisablePlayersScroll();     

                window.DISABLEMENUFORPLAYERSEXCEPT(id);   
            }
            window.DISABLEMENUFORPLAYERSEXCEPT = (id) => {
                const playersMenuItems = this.playerViewScroll.getElementsByTagName("div");
                id = parseInt(id);
                for (let i = 0; i < id; i += 1) {
                    playersMenuItems[i].classList.remove("active");
                }

                const len = playersMenuItems.length;
                for (let i = id + 1; i < len; i += 1) {
                    playersMenuItems[i].classList.remove("active");
                }
                playersMenuItems[id].classList.add("active");

                const playerid = playersMenuItems[id].getAttribute("value");
                MR.viewpointController.switchView(playerid);
                MR.updatePlayersMenu();
            }
            function addPlayerMenuEntry(contentArr, i, id) {
                contentArr.push(
                    "<div id="
                );
                contentArr.push(i);
                contentArr.push(" value=");
                contentArr.push(id);
                contentArr.push(' onclick="window.CLICKMENUPLAYERS(this.id)">');
                contentArr.push('       ');
                contentArr.push(id);
                contentArr.push("</div>\n");                        
            }
            MR.updatePlayersMenu = () => {
                const players = MR.avatars;
                const contentArr = [];

                let i = 0;
                for (let id in players) {
                    addPlayerMenuEntry(contentArr, i, id);
                    i += 1;
                }

                this.playerViewScroll.innerHTML = contentArr.join('');
            };
        };

        this.playerViewScrollEnabled = 0;
        this.playerViewScroll.style.display = "none";
        const playerViewScrollDisplayOpt = ["none", ""];

        this.menu.enableDisablePlayersScroll = () => {
            this.playerViewScrollEnabled = 1 - this.playerViewScrollEnabled; 
            this.playerViewScroll.style.display = 
            playerViewScrollDisplayOpt[this.playerViewScrollEnabled]; 
        }
        this.menu.menus.playerViewSelection = new MenuItem(
            this.menu.el,
            'ge_menu',
            'User View',
            this.menu.enableDisablePlayersScroll
        );
        this.menu.menus.playerViewSelection.el.appendChild(this.playerViewScroll);

        

        this.menu.menus.worldsSelection = new MenuItem(
            this.menu.el,
            'ge_menu',
            "Reconnect",
            MR.initWebSocket
        );
    }
}

export class CanvasSet {
    constructor() {
        console.warn("TODO");
        // TODO(TR): support multiple canvases for different graphics API
        // contexts, allow each to be modal - will need to store each canvas
        // and figure which is closest to the mouse cursor at a given time
    }
}

export function makeModalCanvas(targetSurface) {
    const bodyWidth = document.body.getBoundingClientRect().width;
    const parent = document.getElementById('output-container');
    parent.float = 'right';
    let P = parent;
    P.style.left = (((P.style.left) + bodyWidth - targetSurface.width)) + "px";

    const out = targetSurface;
    out.style.position = 'relative';
    out.style.float = 'right';

    let shiftX = parseInt(P.style.left);
    let shiftY = 0;

    let shiftDown__ = false;
    let mouseDown__ = false;
    let altDown = false;
    let clientX = 0;
    let clientY = 0;

    window.getClientX = () => {
        return clientX;
    }

    window.getClientY = () => {
        return clientY;
    }

    const mouseMoveHandler__ = function(event) {
        const w = targetSurface.width;
        const h = targetSurface.height;
        P.style.left = (clientX - (w / 2.0)) + "px";
        P.style.top = (clientY - (h / 2.0)) + "px";
    };

    let beforeW;
    let beforeH;
    let altInitDown = true;
    let initialX = 0;

    document.addEventListener('mousemove', (event) => {
        clientX = event.clientX;
        clientY = event.clientY;

        if (altDown) {
            const cursorX = clientX;
            if (altInitDown) {
                altInitDown = false;
                beforeW = canvasutil.baseCanvasDimensions.width;
                beforeH = canvasutil.baseCanvasDimensions.height;
                initialX = cursorX;
            }

            const xDist = (cursorX - initialX);
            targetSurface.width = Math.max(64, beforeW + xDist);
            targetSurface.height = Math.floor(beforeH * ((targetSurface.width / beforeW)));
            
            canvasutil.baseCanvasDimensions.width = targetSurface.width;
            canvasutil.baseCanvasDimensions.height = targetSurface.height;
            canvasutil.handleResizeEvent(targetSurface, targetSurface.width, targetSurface.height);
        }
    });
    document.addEventListener('mousedown', (event) => {
        clientX = event.clientX;
        clientY = event.clientY;
    });
    document.addEventListener('mouseup', (event) => {
        clientX = event.clientX;
        clientY = event.clientY;
    });
    document.addEventListener('keydown', (event) => {
        if (event.key == "`") {
            window.addEventListener('mousemove', mouseMoveHandler__);
            shiftDown__ = true;
            mouseMoveHandler__({clientX : clientX, clientY : clientY});
        } else if (event.key == 'Alt') {
            if (window.navigator.userAgent.indexOf("Mac") != -1)
                altDown = true;

            event.preventDefault();
        }
    });
    document.addEventListener('keyup', (event) => {
        if (event.key == "`") {
            window.removeEventListener('mousemove', mouseMoveHandler__);
            shiftDown__ = false;
        } else if (event.key == 'Alt') {
            canvasutil.baseCanvasDimensions.width = targetSurface.width;
            canvasutil.baseCanvasDimensions.height = targetSurface.height;
            canvasutil.handleResizeEvent(targetSurface, targetSurface.width, targetSurface.height);

            altInitDown = true;
            altDown = false;

            event.preventDefault();
        }
    });
}
