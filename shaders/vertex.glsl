varying vec2 vUv;

uniform float uTime;

void main() {
    vUv = uv;

    vec3 pos = position;

    pos.z += sin(pos.x * 0.03 + uTime * 0.05) * 5.0;
    pos.z += sin(pos.y * 0.03 + uTime * 0.04) * 5.0;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}