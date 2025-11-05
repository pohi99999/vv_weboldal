uniform sampler2D positionTexture;
uniform sampler2D velocityTexture;
uniform float delta;
uniform vec3 bounds;

vec3 wrapPosition(vec3 position, vec3 limit) {
    vec3 wrapped = position;
    if (wrapped.x > limit.x) wrapped.x = -limit.x;
    if (wrapped.x < -limit.x) wrapped.x = limit.x;
    if (wrapped.y > limit.y) wrapped.y = -limit.y;
    if (wrapped.y < -limit.y) wrapped.y = limit.y;
    if (wrapped.z > limit.z) wrapped.z = -limit.z;
    if (wrapped.z < -limit.z) wrapped.z = limit.z;
    return wrapped;
}

void main() {
    vec2 uv = gl_FragCoord.xy / resolution.xy;
    vec3 position = texture(positionTexture, uv).xyz;
    vec3 velocity = texture(velocityTexture, uv).xyz;

    position += velocity * delta;
    position = wrapPosition(position, bounds);

    gl_FragColor = vec4(position, 1.0);
}
