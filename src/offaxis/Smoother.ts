/** Exponential moving-average smoother for a 3D viewpoint position (metres). */
export class ViewpointSmoother {
  x = 0
  y = 0
  z = 0.6
  private started = false

  /** alpha: 0 = frozen, 1 = no smoothing */
  push(x: number, y: number, z: number, alpha: number) {
    if (!this.started) {
      this.x = x
      this.y = y
      this.z = z
      this.started = true
      return
    }
    const a = Math.min(Math.max(alpha, 0.001), 1)
    this.x += (x - this.x) * a
    this.y += (y - this.y) * a
    this.z += (z - this.z) * a
  }

  reset() {
    this.started = false
  }
}
