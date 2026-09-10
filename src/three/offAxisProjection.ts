import * as THREE from 'three'

/**
 * Generalized Perspective Projection (Robert Kooima, 2008).
 *
 * Given the three corners of the physical screen and the eye position (all in
 * the same world space, meters), produce the asymmetric projection matrix plus
 * the view rotation that makes on-screen geometry line up with the real window.
 *
 *   pa = lower-left screen corner
 *   pb = lower-right screen corner
 *   pc = upper-left screen corner
 *   pe = eye position
 */
export type OffAxisResult = {
  projection: THREE.Matrix4
  /** world-space quaternion the camera should adopt */
  quaternion: THREE.Quaternion
}

const _vr = new THREE.Vector3()
const _vu = new THREE.Vector3()
const _vn = new THREE.Vector3()
const _va = new THREE.Vector3()
const _vb = new THREE.Vector3()
const _vc = new THREE.Vector3()
const _m = new THREE.Matrix4()
const _rot = new THREE.Matrix4()

export function computeOffAxis(
  pa: THREE.Vector3,
  pb: THREE.Vector3,
  pc: THREE.Vector3,
  pe: THREE.Vector3,
  near: number,
  far: number,
  out: OffAxisResult,
): OffAxisResult {
  // Screen basis vectors
  _vr.subVectors(pb, pa).normalize()
  _vu.subVectors(pc, pa).normalize()
  _vn.crossVectors(_vr, _vu).normalize()

  // Vectors from eye to screen corners
  _va.subVectors(pa, pe)
  _vb.subVectors(pb, pe)
  _vc.subVectors(pc, pe)

  // Distance from eye to screen plane (along -normal)
  const d = -_va.dot(_vn)
  const nd = near / Math.max(d, 1e-6)

  const l = _vr.dot(_va) * nd
  const r = _vr.dot(_vb) * nd
  const b = _vu.dot(_va) * nd
  const t = _vu.dot(_vc) * nd

  out.projection.makePerspective(l, r, t, b, near, far)

  // Rotation that aligns the camera axes with the screen basis
  _rot.set(
    _vr.x, _vr.y, _vr.z, 0,
    _vu.x, _vu.y, _vu.z, 0,
    _vn.x, _vn.y, _vn.z, 0,
    0, 0, 0, 1,
  )
  _m.copy(_rot).transpose()
  out.quaternion.setFromRotationMatrix(_m).invert()
  return out
}

export function makeResult(): OffAxisResult {
  return { projection: new THREE.Matrix4(), quaternion: new THREE.Quaternion() }
}
