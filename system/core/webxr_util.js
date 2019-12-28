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
    UNBOUNDED     : "unbounded",
};

export const XR_HANDEDNESS = {
    NONE  : "none",
    LEFT  : "left",
    RIGHT : "right",
};

export const XR_TARGET_RAY_MODE = {
    GAZE            : "gaze",
    TRACKED_POINTER : "tracked-pointer",
    SCREEN          : "screen",
};

export class XRInfo {
    constructor() {
        this.session           = null;
        this.isImmersive       = false;
        this.immersiveRefSpace = null;
        this.inlineRefSpace    = null;
        this.type              = XR_REFERENCE_SPACE_TYPE.VIEWER;
        this.pose        = null;
        this.poseEXT     = new XRViewerPoseEXT();
    }
}

// this is a wrapper around XRViewerPose that provides additional
// information, namely, pre-computed buffer versions of
// position and orientation. Update with an explicit function call, per frame
export class XRViewerPoseEXT {
    constructor() {
        this.pose         = null;
        this.positionAsArray    = new Float32Array(3);
        this.orientationAsArray = new Float32Array(4);
    }
    
    update(pose) {
        this.pose = pose;

        const xform = this.pose.transform;
        positionObjectToArray(xform.position, this.positionAsArray);
        orientationObjectToArray(xform.orientation, this.orientationAsArray);
    }

    isValid() {
        return (this.pose != null);
    }
}

export class XRRigidTransformEXT {
    constructor() {
        this.positionAsArray    = new Float32Array(3);
        this.orientationAsArray = new Float32Array(4);        
    }

    update(xform) {
        positionObjectToArray(xform.position, this.positionAsArray);
        orientationObjectToArray(xform.orientation, this.orientationAsArray);        
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

