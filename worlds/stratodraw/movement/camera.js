"use strict";

import {clamp} from "/lib/math/math.js";

/*
// movement
if get_input(inputs, .W) do g_main_camera.position += la.quaternion_mul_vector3(g_main_camera.rotation, la.Vector3{ 0,  0,  1}) * MOVE_SPEED * dt;
if get_input(inputs, .S) do g_main_camera.position += la.quaternion_mul_vector3(g_main_camera.rotation, la.Vector3{ 0,  0, -1}) * MOVE_SPEED * dt;
if get_input(inputs, .A) do g_main_camera.position += la.quaternion_mul_vector3(g_main_camera.rotation, la.Vector3{-1,  0,  0}) * MOVE_SPEED * dt;
if get_input(inputs, .D) do g_main_camera.position += la.quaternion_mul_vector3(g_main_camera.rotation, la.Vector3{ 1,  0,  0}) * MOVE_SPEED * dt;
if get_input(inputs, .E) do g_main_camera.position += la.quaternion_mul_vector3(g_main_camera.rotation, la.Vector3{ 0,  1,  0}) * MOVE_SPEED * dt;
if get_input(inputs, .Q) do g_main_camera.position += la.quaternion_mul_vector3(g_main_camera.rotation, la.Vector3{ 0, -1,  0}) * MOVE_SPEED * dt;

// rotation
g_main_camera.rotation = g_main_camera.rotation * la.quaternion_angle_axis(inputs.mouse_delta_pixels.y * ROTATE_SPEED * dt, la.Vector3{1, 0, 0});
g_main_camera.rotation = la.quaternion_angle_axis(inputs.mouse_delta_pixels.x * ROTATE_SPEED * dt, la.Vector3{0, 1, 0}) * g_main_camera.rotation;
*/

/*
main_camera.position += main_camera.velocity * dt;
main_camera.velocity *= FRICTION * dt; // todo: frame-rate-independent friction
*/
/*
dir: Vec3;
if w is pressed { dir +=  quaternion_forward(camera.rotation); }
if s is pressed { dir += -quaternion_forward(camera.rotation); }
if a is pressed { dir += -quaternion_right(camera.rotation); }
if d is pressed { dir +=  quaternion_right(camera.rotation); }
dir = normalize(dir);
camera.velocity += dir * CAMERA_ACCELERATION * dt;
camera.position += camera.velocity * dt;
camera.velocity *= CAMERA_FRICTION;
*/
const quat = glMatrix.quat;
const vec3 = glMatrix.vec3;
const mat4 = glMatrix.mat4;

const axis_right   = vec3.fromValues(1, 0,  0);
const axis_up      = vec3.fromValues(0, 1,  0);
const axis_forward = vec3.fromValues(0, 0, -1);

const scale_identity = vec3.fromValues(1, 1, 1);

const buf_quat = quat.create();
const buf_vec3 = vec3.create();

function quaternion_forward(rotation) {
	return vec3.transformQuat(buf_vec3, axis_forward, rotation);
}
function quaternion_right(rotation) {
	return vec3.transformQuat(buf_vec3, axis_right, rotation);
}
function quaternion_up(rotation) {
	return vec3.transformQuat(buf_vec3, axis_up, rotation);
}
function quaternion_angle_axis(rad, axis) {
	return quat.setAxisAngle(buf_quat, axis, rad);
}

const FRICTION_DEFAULT       = 0.01;
const ACCELERATION_DEFAULT   = 50.0;
const ROTATION_SPEED_DEFAULT = 1.0;

export class WorldCamera {
	static move(self, dt, friction, isLeft, isRight, isUp, isDown, isPerpendicular, 
				cursor_dx = 0, cursor_dy = 0) {
		// vector3
		const position = self._position;
		// vector3
		const velocity = self._velocity;
		// quaternion
		const rotation = self._rotation;

		const direction = vec3.fromValues(0, 0, 0);

		quat.multiply(rotation,
			rotation, 
			quaternion_angle_axis(
				cursor_dy * ROTATION_SPEED_DEFAULT * dt,
				axis_right
			)
		);
		quat.multiply(rotation, 
			quaternion_angle_axis(
				cursor_dx * ROTATION_SPEED_DEFAULT * dt,
				axis_up
			),
			rotation
		);

		if (isPerpendicular) {
			if (isUp) {
				vec3.add(direction, direction, 
					quaternion_up(rotation)
				);
			}
			if (isDown) {
				vec3.subtract(direction, direction, 
					quaternion_up(rotation)
				);
			}
			if (isLeft) {
				vec3.subtract(direction, direction, 
					quaternion_right(rotation)
				);
			}
			if (isRight) {
				vec3.add(direction, direction, 
					quaternion_right(rotation)
				);
			}
		} else {
			if (isUp) {
				vec3.add(direction, direction, 
					quaternion_forward(rotation)
				);
			}
			if (isDown) {
				vec3.subtract(direction, direction, 
					quaternion_forward(rotation)
				);
			}
			if (isLeft) {
				vec3.subtract(direction, direction, 
					quaternion_right(rotation)
				);
			}
			if (isRight) {
				vec3.add(direction, direction, 
					quaternion_right(rotation)
				);
			}			
		}

		vec3.normalize(direction, direction);

		/*
		dir: Vec3;
		if w is pressed { dir +=  quaternion_forward(camera.rotation); }
		if s is pressed { dir += -quaternion_forward(camera.rotation); }
		if a is pressed { dir += -quaternion_right(camera.rotation); }
		if d is pressed { dir +=  quaternion_right(camera.rotation); }
		dir = normalize(dir);
		camera.velocity += dir * CAMERA_ACCELERATION * dt;
		camera.position += camera.velocity * dt;
		camera.velocity *= CAMERA_FRICTION;
		*/

		vec3.add(velocity, velocity, vec3.scale(buf_vec3, direction, ACCELERATION_DEFAULT * dt));
		vec3.add(position, position, vec3.scale(buf_vec3, velocity, dt));
		vec3.scale(velocity, velocity, Math.pow(FRICTION_DEFAULT, dt));
	}

	static calculate_direction(self) {
		return quaternion_forward(self._rotation);
	}

	static rotate_y(self, rad) {
		const rotation = self._rotation;

		quat.multiply(rotation, 
			quaternion_angle_axis(
				rad,
				axis_up
			),
			rotation
		);
	}

	static calculate_matrix_transform(self) {
		const xform = self._transform;
		const position = self._position;
		const rotation = self._rotation;

		vec3.negate(self.buf_position, position);
		quat.invert(self.buf_rotation, rotation);

		const out = mat4.fromRotationTranslationScaleOrigin(
			xform, 
			self.buf_rotation,
			self.buf_position,
			scale_identity,
			position
		);
		return out;
	}

	static reset_transform(self, position, rotation) {
		vec3.copy(self._position, position);
		quat.copy(self._rotation, rotation);
		self._velocity[0] = 0;
		self._velocity[1] = 0;
		self._velocity[2] = 0;
	}

    constructor(args) {
        this.startPosition   = [0.0, 0.1, 10.0];
        this.position        = args.position || [
            this.startPosition[0], 
            this.startPosition[1], 
            this.startPosition[2]
        ];

        this.velocity        = args.velocity || [0, 0, 0];
        this.angle           = args.angle || 0.0;
        this.angularVelocity = args.angularVelocity || 0.0;
        this.acceleration     = args.acceleration || 100.0;
        this.angularAcceleration = args.angularAcceleration || 20;
        this.maxSpeed        = args.maxSpeed || 28;

        this.rotateX = 0;
        this.rotateY = 0;

        this.scale = 1.0;

        this._position = [this.startPosition[0], this.startPosition[1], this.startPosition[2]];
        this._rotation = quat.create();
        this._velocity = vec3.fromValues(0, 0, 0);
        this._SPEED    = 10.0;

        this._transform = mat4.create();
		this.buf_position = vec3.create();
		this.buf_rotation = quat.create();   

		this.direction = vec3.create();     
    }

    updateWithCursor(deltaTime, friction, left_, right_, up_, down_, vertical_, xRes, yRes, cx, cy) {

        // mouse controls
        let yRot = -0.5 * Math.PI * (((cx / xRes) * 2) - 1)
        let xRot = (0.5 * Math.PI * (((cy / yRes) * 2) - 1));

        const dist2 = (xRot * xRot) + (yRot * yRot);

        if (dist2 < 0.1 * 0.1) {
            yRot = 0.0;
            xRot = 0.0;
        }

        this.update(deltaTime, friction, left_, right_, up_, down_, vertical_, xRot, yRot);
    }
    update(deltaTime, friction, left_, right_, up_, down_, vertical_, rotateX, rotateY) {
        this.rotateX = rotateX || 0.0;
        this.rotateY = rotateY || 0.0;

        let up        = 0;
        let down      = 0;
        let left      = left_;
        let right     = right_;
        let forward   = up_;
        let backward  = down_;

        const v = this.velocity;
        const ACC = this.acceleration;

        if (vertical_) {
            up       = -forward;
            down     = -backward;
            forward  = 0;
            backward = 0;

            const hz = left + right;
            const vt = up + down;
            const hypo = Math.sqrt((hz * hz) + (vt * vt));
        
            const hcomp = ACC * (hz / hypo);
            const vcomp = ACC * (vt / hypo);

            v[1] += ACC * vt * deltaTime;            
        } else {
            const hz = left + right;
            this.angularVelocity += this.angularAcceleration * hz * deltaTime;

            this.angle += this.angularVelocity * deltaTime;
            let az = Math.cos(this.angle);
            let ax = Math.sin(this.angle);

            const vt = (forward + backward);

            //if (vt != 0.0) {
                const hcomp = ACC * ax * vt;
                const vcomp = ACC * az * vt;

                v[0] -= hcomp * deltaTime;
                v[2] += vcomp * deltaTime;
            //}
        }

        // clamp speed
        const MAX_SPEED = this.maxSpeed;
        v[0] = clamp(v[0], -MAX_SPEED, MAX_SPEED);
        v[1] = clamp(v[1], -MAX_SPEED, MAX_SPEED);
        v[2] = clamp(v[2], -MAX_SPEED, MAX_SPEED);
        
        // apply drag
        const drag = Math.pow(friction, deltaTime);
        v[0] *= drag;
        v[1] *= drag;
        v[2] *= drag;
        this.angularVelocity *= drag;
        if (Math.abs(this.angularVelocity) < 0.001) {
            this.angularVelocity = 0.0;
        }

        if (Math.abs(v[0]) < 0.01) {
            v[0] = 0;
        }
        if (Math.abs(v[1]) < 0.01) {
            v[1] = 0;
        }
        if (Math.abs(v[2]) < 0.01) {
            v[2] = 0;
        }

        const pos = this.position;
        pos[0] += v[0] * deltaTime;
        pos[1] += v[1] * deltaTime;
        pos[2] += v[2] * deltaTime;
    }

    updateUsingDefaults(deltaTime, FRICTION, Input, cursor, cvs) {
        if (Input.keyWentDown(Input.KEY_ZERO)) {
            this.reset();
            return;
        }

        // look-around with mouse cursor
        if (cursor.z()) {
            // press down the mouse cursor to look around in the non-VR view
            const cpos = cursor.position();
            this.updateWithCursor(
                deltaTime,
                FRICTION,
                -Input.keyIsDown(Input.KEY_LEFT),
                 Input.keyIsDown(Input.KEY_RIGHT),
                -Input.keyIsDown(Input.KEY_UP),
                 Input.keyIsDown(Input.KEY_DOWN),
                 Input.keyIsDown(Input.KEY_SHIFT),
                 cvs.width,
                 cvs.height,
                 cpos[0],
                 cpos[1]
            );
        } 
        else {
            this.update(
                deltaTime,
                FRICTION,
                -Input.keyIsDown(Input.KEY_LEFT),
                 Input.keyIsDown(Input.KEY_RIGHT),
                -Input.keyIsDown(Input.KEY_UP),
                 Input.keyIsDown(Input.KEY_DOWN),
                 Input.keyIsDown(Input.KEY_SHIFT),
            );
        }
    }

    rotationX() {
        return this.rotateX;
    }
    rotationY() {
        return this.angle - this.rotateY;
    }

    translationX() {
        return -this._position[0];
    }
    translationY() {
        return -this._position[1];
    }
    translationZ() {
        return -this._position[2];
    }
    translationAtDim(i) {
        return -this._position[i];
    }

    calcViewMatrixUsingDefaultMatrixStack(m) {
        let mat = null;
        m.save();
        {
            m.identity();
            m.rotateX(
                0,
            );
            m.rotateY(
                0,
            );
            m.translate( 
                0,
                0,
                0
            );
            mat = m.value();     
        }
        m.restore();

        return mat;
    }


    reset() {
        this.position[0] = this.startPosition[0];
        this.position[1] = this.startPosition[1];
        this.position[2] = this.startPosition[2];
        this.angle = 0.0;
        this.angularVelocity = 0.0;
        this.velocity[0] = 0.0;
        this.velocity[1] = 0.0;
        this.velocity[2] = 0.0;
        this.rotateX = 0;
        this.rotateY = 0;
    }
}
