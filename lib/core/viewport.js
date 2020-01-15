"use strict";

export class Viewport {
    constructor() {
        this.x      = 0;
        this.y      = 0;
        this.width  = 0;
        this.height = 0;

        this.minDepth = 0.0;
        this.maxDepth = 1.0;
    }
}
