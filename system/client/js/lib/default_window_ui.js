"use strict";

export class DefaultWindowUI {
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
            MR.initServer
        );
    }
}
