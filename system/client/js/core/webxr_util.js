"use strict";

export const XR_SESSION_MODE = {
    INLINE       : "inline",
    IMMERSIVE_VR : "immersive-vr",
    IMMERSIVE_AR : "immersive-ar",
};

export const XR_REFERENCE_SPACE_TYPE = {
    VIEWER        : "viewer",
    LOCAL         : "local",
    LOCAL_FLOOR   : "local-floor",
    BOUNDED_FLOOR : "bounded-floor",
    UNBOUNDED     : "unbounded"
};

export class XRInfo {
    constructor() {
        this.session           = null;
        this.isImmersive       = false;
        this.immersiveRefSpace = null;
        this.inlineRefSpace    = null;
        this.type              = XR_REFERENCE_SPACE_TYPE.VIEWER;
        this.viewerPose        = null;
    }
}
