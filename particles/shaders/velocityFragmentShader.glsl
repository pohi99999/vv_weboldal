uniform sampler2D positionTexture;
uniform sampler2D velocityTexture;
uniform float time;
uniform float delta;
uniform float damping;
uniform float curlScale;
uniform float noiseFrequency;
uniform vec3 cursorPosition;
uniform float cursorRadius;
uniform float cursorStrength;

const float EPS = 0.1;

float hash(vec3 p) {
    return fract(sin(dot(p, vec3(12.9898, 78.233, 45.164))) * 43758.5453);
}

float noise(vec3 p) {
    vec3 i = floor(p);
    vec3 f = fract(p);

    float n000 = hash(i + vec3(0.0, 0.0, 0.0));
    float n001 = hash(i + vec3(0.0, 0.0, 1.0));
    float n010 = hash(i + vec3(0.0, 1.0, 0.0));
    float n011 = hash(i + vec3(0.0, 1.0, 1.0));
    float n100 = hash(i + vec3(1.0, 0.0, 0.0));
    float n101 = hash(i + vec3(1.0, 0.0, 1.0));
    float n110 = hash(i + vec3(1.0, 1.0, 0.0));
    float n111 = hash(i + vec3(1.0, 1.0, 1.0));

    vec3 u = f * f * (3.0 - 2.0 * f);

    float nx00 = mix(n000, n100, u.x);
    float nx01 = mix(n001, n101, u.x);
    float nx10 = mix(n010, n110, u.x);
    float nx11 = mix(n011, n111, u.x);

    float nxy0 = mix(nx00, nx10, u.y);
    float nxy1 = mix(nx01, nx11, u.y);

    return mix(nxy0, nxy1, u.z);
}

vec3 curlNoise(vec3 p) {
    float n1 = noise(vec3(p.y, p.z, p.x));
    float n2 = noise(vec3(p.z, p.x, p.y));
    float n3 = noise(vec3(p.x, p.y, p.z));

    vec3 grad = vec3(
        n1 - noise(vec3(p.y + EPS, p.z, p.x)),
        n2 - noise(vec3(p.z + EPS, p.x, p.y)),
        n3 - noise(vec3(p.x + EPS, p.y, p.z))
    );

    return normalize(vec3(grad.y - grad.z, grad.z - grad.x, grad.x - grad.y));
}

void main() {
    vec2 uv = gl_FragCoord.xy / resolution.xy;

    vec3 position = texture(positionTexture, uv).xyz;
    vec3 velocity = texture(velocityTexture, uv).xyz;

    vec3 p = position * noiseFrequency + time * 0.15;
    vec3 curl = curlNoise(p) * curlScale;

    velocity += curl * delta;

    vec3 toCursor = position - cursorPosition;
    float dist = length(toCursor);
    if (cursorRadius > 0.0 && dist < cursorRadius) {
        float falloff = 1.0 - smoothstep(0.0, cursorRadius, dist);
        if (dist > 0.0001) {
            velocity += normalize(toCursor) * cursorStrength * falloff * delta;
        }
    }

    velocity *= exp(-damping * delta);

    gl_FragColor = vec4(velocity, 1.0);
}
