import { describe, expect, it } from 'vitest'
import * as THREE from 'three'
import { computeOffAxis, makeResult } from './projection'

/**
 * A 0.6m × 0.34m screen centred at the origin in the XY plane (z = 0) —
 * the same physical-screen convention OffAxisCamera uses.
 */
const SCREEN = {
  pa: new THREE.Vector3(-0.3, -0.17, 0), // lower-left
  pb: new THREE.Vector3(0.3, -0.17, 0), // lower-right
  pc: new THREE.Vector3(-0.3, 0.17, 0), // upper-left
}
const NEAR = 0.05
const FAR = 100

function frustum(eye: THREE.Vector3) {
  const out = makeResult()
  computeOffAxis(SCREEN.pa, SCREEN.pb, SCREEN.pc, eye, NEAR, FAR, out)
  const e = out.projection.elements
  // column-major Matrix4: e[0] = m00 (horizontal scale), e[8] = m02 (x-shear)
  return { m00: e[0], m11: e[5], xShear: e[8], yShear: e[9] }
}

describe('computeOffAxis', () => {
  it('is a symmetric frustum when the eye is centred on the screen', () => {
    const { xShear, yShear, m00 } = frustum(new THREE.Vector3(0, 0, 0.6))
    expect(xShear).toBeCloseTo(0, 10)
    expect(yShear).toBeCloseTo(0, 10)
    // 2*near / screenWidth*(near/dist) = 2*dist/width = 2*0.6/0.6 = 2
    expect(m00).toBeCloseTo(2, 10)
  })

  it('shears the frustum left when the eye moves right (window stays put)', () => {
    const { xShear } = frustum(new THREE.Vector3(0.15, 0, 0.6))
    // hand-derived: l=-0.0375, r=0.0125 -> (r+l)/(r-l) = -0.5
    expect(xShear).toBeCloseTo(-0.5, 10)
  })

  it('shears the other way for a symmetric eye offset to the left', () => {
    const right = frustum(new THREE.Vector3(0.15, 0, 0.6)).xShear
    const left = frustum(new THREE.Vector3(-0.15, 0, 0.6)).xShear
    expect(left).toBeCloseTo(-right, 10)
  })

  it('widens the field of view (smaller m00) as the eye moves closer — the screen subtends a bigger angle, same as leaning toward a real window', () => {
    const far = frustum(new THREE.Vector3(0, 0, 0.6)).m00
    const near = frustum(new THREE.Vector3(0, 0, 0.35)).m00
    expect(near).toBeLessThan(far)
    // exact: m00 = 2*distance / screenWidth
    expect(far).toBeCloseTo((2 * 0.6) / 0.6, 10)
    expect(near).toBeCloseTo((2 * 0.35) / 0.6, 10)
  })

  it('sets projectionMatrixInverse-compatible output (finite, invertible)', () => {
    const out = makeResult()
    computeOffAxis(SCREEN.pa, SCREEN.pb, SCREEN.pc, new THREE.Vector3(0.1, -0.05, 0.5), NEAR, FAR, out)
    const inv = out.projection.clone().invert()
    expect(inv.elements.every((n) => Number.isFinite(n))).toBe(true)
  })
})
