"use strict";

import {clamp} from "/lib/math/math.js";

const quat = glMatrix.quat;
const vec3 = glMatrix.vec3;
const mat4 = glMatrix.mat4;

export const axis_right   = vec3.fromValues(1, 0,  0);
export const axis_up      = vec3.fromValues(0, 1,  0);
export const axis_forward = vec3.fromValues(0, 0, -1);

const scale_identity = vec3.fromValues(1, 1, 1);

const buf_quat = quat.create();
const buf_vec3 = vec3.create();

export function quaternion_forward(rotation) {
	return vec3.transformQuat(buf_vec3, axis_forward, rotation);
}
export function quaternion_right(rotation) {
	return vec3.transformQuat(buf_vec3, axis_right, rotation);
}
export function quaternion_up(rotation) {
	return vec3.transformQuat(buf_vec3, axis_up, rotation);
}
export function quaternion_angle_axis(rad, axis) {
	return quat.setAxisAngle(buf_quat, axis, rad);
}
export function quaternion_multiply_vec3(rotation, v) {
	return vec3.transformQuat(vec3.create(), v, rotation);
}

const FRICTION_DEFAULT       = 0.01;
const ACCELERATION_DEFAULT   = 50.0;
const ROTATION_SPEED_DEFAULT = 1.0;

export class WorldCamera {

	static rotate_around_intern(self, position, rotation, origin) {
  //       console.group("origin = " + origin);
		// console.log("pos before", position, origin);
		// console.log("rotate");

		origin = vec3.clone(origin);

		let out;
		out = vec3.subtract(vec3.create(), position, origin);
		const rotated = quaternion_multiply_vec3(rotation, out);
		//const rotated = vec3.transformMat4(out, position, mat4.fromQuat(mat4.create(), rotation));
		//console.log("rotated", rotated);
		vec3.copy(out, rotated);
		vec3.add(position, out, origin);
		//console.log("pos after", position, origin);

		//console.groupEnd();
	}
	static move(self, dt, friction, isLeft, isRight, isUp, isDown, isPerpendicular, 
				cursor_dx = 0, cursor_dy = 0) {
		// vector3
		const position = self._position;
		// vector3
		const velocity = self._velocity;
		// quaternion
		const rotation = self.rotation;

		const direction = vec3.fromValues(0, 0, 0);

		if (self.rotation_is_lerping) {
			self.elapsed_time += dt;

			if (self.elapsed_time >= self.target_elapsed_time) {
				self.elapsed_time = self.target_elapsed_time;
				self.rotation_is_lerping = false;
			}

			const prev_rotation = quat.clone(rotation);
			quat.slerp(rotation, self.rotation_init, self.rotation_target, self.elapsed_time / self.target_elapsed_time);

			WorldCamera.rotate_around_intern(self, position, 
				quat.multiply(quat.create(), 
					rotation, quat.invert(quat.create(), prev_rotation)
				), self.origin
			);
		} else {
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
		}

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

		vec3.add(velocity, velocity, vec3.scale(buf_vec3, direction, ACCELERATION_DEFAULT * dt));
		vec3.add(position, position, vec3.scale(buf_vec3, velocity, dt));
		vec3.scale(velocity, velocity, Math.pow(FRICTION_DEFAULT, dt));
	}

	static calculate_direction(self) {
		return quaternion_forward(self.rotation);
	}

	static rotate_rad_axis(self, rad, axis, center, target_elapsed_time = 0.0) {
		self.target_elapsed_time = target_elapsed_time;
		self.elapsed_time = 0.0;
		const rotation = self.rotation;
		const rotation_init = quat.copy(quat.create(), rotation);
		const rotation_target = quat.multiply(quat.create(), 
			quaternion_angle_axis(
				rad,
				axis
			),
			rotation
		);
		self.rotation_init   = rotation_init;
		self.rotation_target = rotation_target;

		if (target_elapsed_time == 0.0) {
			quat.copy(rotation, rotation_target);

			WorldCamera.rotate_around_intern(self, self._position, 
				quaternion_angle_axis(rad, axis), self.origin
			);

			self.rotation_is_lerping = false;
		} else {
			self.rotation_is_lerping = true;
		}
	}
	static rotate(self, quat_angle_axis, center, target_elapsed_time = 0.0) {
		if (self.rotation_is_lerping) {
			return;
		}

		self.target_elapsed_time = target_elapsed_time;
		self.elapsed_time = 0.0;
		const rotation = self.rotation;
		const rotation_init = quat.copy(quat.create(), rotation);
		const rotation_target = quat.multiply(quat.create(),
			quat_angle_axis,
			rotation
		);
		self.rotation_init   = rotation_init;
		self.rotation_target = rotation_target;

		if (target_elapsed_time == 0.0) {
			quat.copy(rotation, rotation_target);

			WorldCamera.rotate_around_intern(self, self._position, 
				quat_angle_axis, self.origin
			);

			self.rotation_is_lerping = false;
		} else {
			self.rotation_is_lerping = true;
			self.initial_position = vec3.clone(self._position);
		}
	}

	static calculate_matrix_transform(self) {
		const xform = self._transform;
		const position = self._position;
		const rotation = self.rotation;

		vec3.negate(self.buf_position, position);
		quat.invert(self.bufrotation, rotation);

		const out = mat4.fromRotationTranslationScaleOrigin(
			xform, 
			self.bufrotation,
			self.buf_position,
			scale_identity,
			position
		);
		return out;
	}

	static reset_transform(self, position, rotation) {
		vec3.copy(self._position, position);
		quat.copy(self.rotation, rotation);
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
        this.rotation = quat.create();
        this._velocity = vec3.fromValues(0, 0, 0);
        this._SPEED    = 10.0;

        this._transform = mat4.create();
		this.buf_position = vec3.create();
		this.bufrotation = quat.create();   

		this.direction = vec3.create();

		this.origin = this._position;     
		this.origin_buffer = vec3.create();

		window.SET_ORIGIN = (origin) => {
			WorldCamera.set_origin(this, origin);
		}
		window.SET_ORIGIN_TO_SELF = (origin) => {
			WorldCamera.set_origin_to_self(this);
		}
    }

    static set_origin(self, origin) {
    	self.origin = self.origin_buffer;
    	vec3.copy(self.origin, origin)
    }
    static set_origin_to_self(self) {
    	self.origin = self._position;
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
}
