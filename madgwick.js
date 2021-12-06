class Madgwick {
  constructor(ax, ay, az, mx, my, mz) {
    const ea = eulerAnglesFromImuRad(ax, ay, az, mx, my, mz)
    const iq = toQuaternion(ea)

    // Normalise quaternion
    const recipNorm =
      (iq.w * iq.w + iq.x * iq.x + iq.y * iq.y + iq.z * iq.z) ** -0.5
    this.q0 = iq.w * recipNorm
    this.q1 = iq.x * recipNorm
    this.q2 = iq.y * recipNorm
    this.q3 = iq.z * recipNorm

    this.initalised = true
  }

  updateIMU = (gx, gy, gz, ax, ay, az) => {
    let recipNorm;
    let s0, s1, s2, s3;
    let qDot1, qDot2, qDot3, qDot4;
    let v2q0, v2q1, v2q2, v2q3, v4q0, v4q1, v4q2, v8q1, v8q2, q0q0, q1q1, q2q2, q3q3;

    qDot1 = 0.5 * (-this.q1 * gx - this.q2 * gy - this.q3 * gz);
    qDot2 = 0.5 * (this.q0 * gx + this.q2 * gz - this.q3 * gy);
    qDot3 = 0.5 * (this.q0 * gy - this.q1 * gz + this.q3 * gx);
    qDot4 = 0.5 * (this.q0 * gz + this.q1 * gy - this.q2 * gx);

    if (!(ax === 0.0 && ay === 0.0 && az === 0.0)) {
      recipNorm = (ax * ax + ay * ay + az * az) ** -0.5;
      ax *= recipNorm;
      ay *= recipNorm;
      az *= recipNorm;

      v2q0 = 2.0 * q0;
      v2q1 = 2.0 * q1;
      v2q2 = 2.0 * q2;
      v2q3 = 2.0 * q3;
      v4q0 = 4.0 * q0;
      v4q1 = 4.0 * q1;
      v4q2 = 4.0 * q2;
      v8q1 = 8.0 * q1;
      v8q2 = 8.0 * q2;
      q0q0 = q0 * q0;
      q1q1 = q1 * q1;
      q2q2 = q2 * q2;
      q3q3 = q3 * q3;

      s0 = v4q0 * q2q2 + v2q2 * ax + v4q0 * q1q1 - v2q1 * ay;
      s1 = v4q1 * q3q3 - v2q3 * ax + 4.0 * q0q0 * q1 - v2q0 * ay - v4q1 + v8q1 * q1q1 + v8q1 * q2q2 + v4q1 * az;
      s2 = 4.0 * q0q0 * q2 + v2q0 * ax + v4q2 * q3q3 - v2q3 * ay - v4q2 + v8q2 * q1q1 + v8q2 * q2q2 + v4q2 * az;
      s3 = 4.0 * q1q1 * q3 - v2q1 * ax + 4.0 * q2q2 * q3 - v2q2 * ay;
      recipNorm = (s0 * s0 + s1 * s1 + s2 * s2 + s3 * s3) ** -0.5;
      s0 *= recipNorm;
      s1 *= recipNorm;
      s2 *= recipNorm;
      s3 *= recipNorm;

      qDot1 -= beta * s0;
      qDot2 -= beta * s1;
      qDot3 -= beta * s2;
      qDot4 -= beta * s3;
    }

    q0 += qDot1 * recipSampleFreq;
    q1 += qDot2 * recipSampleFreq;
    q2 += qDot3 * recipSampleFreq;
    q3 += qDot4 * recipSampleFreq;

    recipNorm = (q0 * q0 + q1 * q1 + q2 * q2 + q3 * q3) ** -0.5;
    q0 *= recipNorm;
    q1 *= recipNorm;
    q2 *= recipNorm;
    q3 *= recipNorm;
  }

  cross_product = (ax, ay, az, bx, by, bz) => {
    return {
      x: ay * bz - az * by,
      y: az * bx - ax * bz,
      z: ax * by - ay * bx,
    };
  }

  update = (gx, gy, gz, ax, ay, az, mx, my, mz, deltaTimeSec) => {
    recipSampleFreq = deltaTimeSec || recipSampleFreq;

    if (!initalised) {
      init(ax, ay, az, mx, my, mz);
    }

    let recipNorm;
    let s0, s1, s2, s3;
    let qDot1, qDot2, qDot3, qDot4;
    let hx, hy;
    let v2q0mx, v2q0my, v2q0mz, v2q1mx, v2bx, v2bz, v4bx, v4bz, v2q0, v2q1, v2q2, v2q3, v2q0q2, v2q2q3;
    let q0q0, q0q1, q0q2, q0q3, q1q1, q1q2, q1q3, q2q2, q2q3, q3q3;

    if (mx === undefined || my === undefined || mz === undefined || (mx === 0 && my === 0 && mz === 0)) {
      this.updateIMU(gx, gy, gz, ax, ay, az);
      return;
    }

  toQuaternion = (eulerAngles) => {
    const cy = Math.cos(eulerAngles.heading * 0.5)
    const sy = Math.sin(eulerAngles.heading * 0.5)
    const cp = Math.cos(eulerAngles.pitch * 0.5)
    const sp = Math.sin(eulerAngles.pitch * 0.5)
    const cr = Math.cos(eulerAngles.roll * 0.5)
    const sr = Math.sin(eulerAngles.roll * 0.5)

    return {
      w: cr * cp * cy + sr * sp * sy,
      x: sr * cp * cy - cr * sp * sy,
      y: cr * sp * cy + sr * cp * sy,
      z: cr * cp * sy - sr * sp * cy
    }
  }
}
