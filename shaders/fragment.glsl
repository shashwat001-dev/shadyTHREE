varying vec2 vUv;

uniform float uTime;
uniform sampler2D uVideo;

#define NUM_OCTAVES 5

float rand(vec2 n) {
    return fract(sin(dot(n, vec2(12.9898, 4.1414))) * 43758.5453);
}

float noise(vec2 p) {
    vec2 ip = floor(p);
    vec2 u = fract(p);

    u = u * u * (3.0 - 2.0 * u);

    float res = mix(
        mix(rand(ip), rand(ip + vec2(1.0, 0.0)), u.x),
        mix(
            rand(ip + vec2(0.0, 1.0)),
            rand(ip + vec2(1.0, 1.0)),
            u.x
        ),
        u.y
    );

    return res * res;
}

float fbm(vec2 x) {
    float v = 0.0;
    float a = 0.5;

    vec2 shift = vec2(100.0);

    mat2 rot = mat2(
        cos(0.5), sin(0.5),
        -sin(0.5), cos(0.5)
    );

    for (int i = 0; i < NUM_OCTAVES; ++i) {
        v += a * noise(x);

        x = rot * x * 2.0 + shift;
        a *= 0.5;
    }

    return v;
}

void main() {

    vec2 uv = vUv;

    uv -= 0.5;

    float wave = fbm(3.5 * uv + uTime / 13.0);

    float distort = mix(
        1.0,
        1.2,
        wave
    );

    uv *= distort;

    uv += 0.5;

    if (
        uv.x < 0.0 ||
        uv.x > 1.0 ||
        uv.y < 0.0 ||
        uv.y > 1.0
    ) discard;

    vec4 tex = texture2D(uVideo, uv);

    gl_FragColor = tex;
}