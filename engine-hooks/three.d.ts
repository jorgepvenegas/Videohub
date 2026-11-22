// VideoHub does not install three (each engine ships its own version), so the hooks type only the members they use,
// with three's own signatures. Where the hook passes a plain { x, y } object, the parameter is typed as that shape.
declare module 'three' {
  export const AdditiveBlending: number;

  export class Vector3 {
    x: number;
    y: number;
    z: number;
    set(x: number, y: number, z: number): this;
    fromArray(array: ArrayLike<number>, offset?: number): this;
    toArray(array?: number[], offset?: number): number[];
    clone(): Vector3;
    copy(v: Vector3): this;
    add(v: Vector3): this;
    sub(v: Vector3): this;
    multiplyScalar(s: number): this;
    addScaledVector(v: Vector3, s: number): this;
    applyQuaternion(q: Quaternion): this;
    transformDirection(m: Matrix4): this;
    project(camera: Camera): this;
    normalize(): this;
    length(): number;
    lengthSq(): number;
    setLength(length: number): this;
  }

  export class Quaternion {
    clone(): Quaternion;
    copy(q: Quaternion): this;
    fromArray(array: ArrayLike<number>, offset?: number): this;
    setFromAxisAngle(axis: Vector3, angle: number): this;
    setFromEuler(euler: Euler): this;
    premultiply(q: Quaternion): this;
    multiply(q: Quaternion): this;
    invert(): this;
    normalize(): this;
    toArray(array?: number[], offset?: number): number[];
  }

  export class Euler {
    x: number;
    y: number;
    z: number;
    setFromQuaternion(q: Quaternion, order?: string): this;
  }

  export class Matrix4 {}

  export class Box3 {
    min: Vector3;
    max: Vector3;
    setFromObject(object: Object3D): this;
    isEmpty(): boolean;
    getSize(target: Vector3): Vector3;
    getCenter(target: Vector3): Vector3;
  }

  export class Plane {
    setFromNormalAndCoplanarPoint(normal: Vector3, point: Vector3): this;
  }

  export class Ray {
    intersectPlane(plane: Plane, target: Vector3): Vector3 | null;
  }

  export interface Material {
    transparent: boolean;
    opacity: number;
    blending: number;
  }

  export class Object3D {
    name: string;
    type: string;
    uuid: string;
    visible: boolean;
    parent: Object3D | null;
    children: Object3D[];
    position: Vector3;
    quaternion: Quaternion;
    scale: Vector3;
    matrixWorld: Matrix4;
    // any: three's own type for userData
    userData: Record<string, any>;
    updateMatrixWorld(force?: boolean): void;
    getWorldPosition(target: Vector3): Vector3;
    getWorldDirection(target: Vector3): Vector3;
    worldToLocal(vector: Vector3): Vector3;
    traverse(callback: (object: Object3D) => void): void;
  }

  export class Camera extends Object3D {}

  export class PerspectiveCamera extends Camera {
    fov: number;
    aspect: number;
    updateProjectionMatrix(): void;
  }

  export interface Intersection {
    distance: number;
    point: Vector3;
    object: Object3D;
    face?: { normal: Vector3 } | null;
  }

  export class Raycaster {
    ray: Ray;
    near: number;
    far: number;
    set(origin: Vector3, direction: Vector3): void;
    setFromCamera(coords: { x: number; y: number }, camera: Camera): void;
    intersectObjects(objects: Object3D[], recursive?: boolean): Intersection[];
  }
}
