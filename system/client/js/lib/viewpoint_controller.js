"use strict";

class ViewpointController {
    constructor() {
        this.splitscreen = true;
        this.playerid    = MR.playerid;
    }

    viewIsSelf() {
        return this.playerid == MR.playerid;
    }

    shouldShowAlternativeView() {
        return !MR.VRIsActive() && !MR.viewpointController.viewIsSelf() && this.playerid != -1;
    }

    switchView(playerid) {
        if (playerid == -1) {
            this.playerid = MR.playerid;
            return this.playerid;
        }
        if (!MR.avatars[playerid]) {
            console.warn("playerid does not exist");
            return -1;
        }
        this.playerid = playerid;
        return this.playerid;
    }
}
