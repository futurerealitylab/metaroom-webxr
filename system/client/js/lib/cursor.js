"use strict";

/**
 * @description used to track the cursor<br>
 *      and set its position, click state, and graphic
 * @namespace
 */
window.ScreenCursor = (function() {
    let _cursor = {};

    /**
     * default graphic
     * @memberof Cursor
     * @type {string}
     * @final
     */
    _cursor.DEFAULT_CURSOR = "default";
    /**
     * hand graphic
     * @memberof Cursor
     * @type {string}
     * @final
     */
    _cursor.HAND_CURSOR    = "pointer";

    // set the default cursor graphic
    _cursor.cursorType     = _cursor.DEFAULT_CURSOR;

    /**
     * @description set the cursor graphic
     * @memberOf Cursor
     * @param {string} cursorType Cursor.DEFAULT_CURSOR or Cursor.HAND_CURSOR
     */
    _cursor.set = function(cursorType) {
        document.body.style.cursor = cursorType; 
        _cursor.cursorType = cursorType;
    };

    let targetEventCleanupFuncs = [];

    function clearTargetEvents() {
        for (let f = 0; f < targetEventCleanupFuncs.length; f += 1) {
            targetEventCleanupFuncs[f]();
        }
    }
    _cursor.clearTargetEvents = clearTargetEvents;


    /**
     * @description tracks the cursor<br>
     * @param {Object} target the HTML DOM element to which we are attaching cursor event handlers
     * @param {Object} handler the object containing functions to handle cursor events (the restoration program passes a CrystalApplet instance)
     * @param {Object} callbacks map of down, move, up to respective functions attached to the handler, example:
     * <pre><code>
     *      canvas, // pass a canvas element here
     *      object, // the "handler" is the object that contains functions for cursor-down, cursor-move, and cursor-up handling
     *      { // this is the callbacks object, which maps "down,""move," and "up" to the *names* of the functions attached to "handler" that should respond to the respective events"  
     *          down : "mouseDown",
     *          move : "mouseMove",
     *          up   : null,
     *      }
     * </pre><code>
     * @memberOf Cursor
     *
     * @return {function(void) : Object} a function that returns the cursor state attached to a given call of trackCursor
     */
    function trackCursor(target, callbacks) {
        // internal object that stores the x, y, and z values for the cursor
        const cursor = new Float32Array([
            0,
            0,
            0 
        ]);

        const prevCursor = new Float32Array([
            0,
            0,
            0
        ]);

        const tempBuf = new Float32Array([
            0,
            0,
            0
        ]);

        // save the callbacks individually
        const downCallback = callbacks.down;
        const moveCallback = callbacks.move;
        const upCallback   = callbacks.up;

        let prevDir = [0.0, 0.0, 0.0];

        const info = {
            position : () => {
                return cursor;
            },
            prevPosition : () => {
                return prevCursor;
            },
            toClipPosition : (pos, w, h) => {
                tempBuf[0] = (2.0 * (pos[0] / w)) - 1.0;
                tempBuf[1] = -1.0 * ((2.0 * (pos[1] / h)) - 1.0);
                return tempBuf;
            },
            positionChange : () => {
                tempBuf[0] = cursor[0] - prevCursor[0];
                tempBuf[1] = cursor[1] - prevCursor[1];
                tempBuf[2] = 0.0;    

                return tempBuf;
            },
            direction : (tolerance = 0.1) => {
                tempBuf[0] = tolerance * prevDir[0] + cursor[0] - prevCursor[0];
                tempBuf[1] = tolerance * prevDir[1] + cursor[1] - prevCursor[1];
                tempBuf[2] = 0.0;

                // normalize
                const x = tempBuf[0];
                const y = tempBuf[1];
                const z = tempBuf[2];
                let len = x*x + y*y + z*z;
                if (len > 0) {
                    len = 1 / Math.sqrt(len);
                }
                tempBuf[0] = x * len;
                tempBuf[1] = y * len;
                tempBuf[2] = z * len;

                prevDir[0] = tempBuf[0];
                prevDir[1] = tempBuf[1];
                prevDir[2] = tempBuf[2];

                return tempBuf;
            },
            hide : () => {
                if (target.style) {
                    target.style.cursor = "none";
                }
            },
            show : () => {
                if (target.style) {
                    return target.style.cursor = "";
                }
            },
        };

        // sets cursor coordinates offset from the top-left of the program bounding rectangle
        target.set = function(x, y, z) {
            const r = this.getBoundingClientRect();

            prevCursor[0] = cursor[0];
            prevCursor[1] = cursor[1];
            cursor[0] = (x - r.left) | 0;
            cursor[1] = (y - r.top) | 0;

            if (z !== undefined) {
                cursor[2] = z;
            }
        };

        
        // mouse-down handler
        target.onmousedown = function(e) {
            if (e.which != 1) {
                return;
            }

            // set cursor state using the given cursor event "e"
            this.set(e.clientX, e.clientY, 1);

            if (downCallback != null) {
               downCallback(info);
            }
        };


        // mouse-move handler
        target.onmousemove = function(e) {
            // set cursor state using the given cursor event "e"
            this.set(e.clientX, e.clientY);
            if (moveCallback != null) {
               moveCallback(info);
           }
        };


    	
        // mouse-up handler
        target.onmouseup = function(e) {
            if (e.which != 1) {
                return;
            }
            // set cursor state using the given cursor event "e"
            this.set(e.clientX, e.clientY, 0);

            if (upCallback != null) {
               upCallback(info);
            }
        };
    	

        targetEventCleanupFuncs.push(function() {
            target.set         = undefined;
            target.onmousedown = undefined;
            target.onmouseup   = undefined;
            target.onmousemove = undefined;
        });

        return info;

    }
    _cursor.trackCursor = trackCursor;

    return _cursor;
}());
