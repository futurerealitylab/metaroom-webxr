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
        this.viewerPoseEXT     = new XRViewerPoseEXT();
    }
}

export class XRViewerPoseEXT {
    constructor() {
        this.viewerPose         = null;
        this.positionAsArray    = new Float32Array(3);
        this.orientationAsArray = new Float32Array(4);
    }
    
    update(viewerPose) {
        this.viewerPose = viewerPose;

        const xform = this.viewerPose.transform;
        positionObjectToArray(xform.position, this.positionAsArray);
        orientationObjectToArray(xform.orientation, this.orientationAsArray);
    }

    isValid() {
        return (this.viewerPose != null);
    }
}

export function positionObjectToArray(obj, buf) {
    buf[0] = obj.x;
    buf[1] = obj.y;
    buf[2] = obj.z;
}
export function orientationObjectToArray(obj, buf) {
    buf[0] = obj.x;
    buf[1] = obj.y;
    buf[2] = obj.z;
    buf[3] = obj.w;
}

