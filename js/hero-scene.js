import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { EffectComposer } from 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/postprocessing/UnrealBloomPass.js';
import { FilmPass } from 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/postprocessing/FilmPass.js';

const heroSection = document.querySelector('.hero-section');

if (!heroSection) {
    console.warn('hero-scene: nem található hero szekció, a Three.js effekt nem inicializálható.');
} else {
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    const canvas = renderer.domElement;
    canvas.classList.add('hero-scene-canvas');
    canvas.style.position = 'absolute';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.pointerEvents = 'none';
    canvas.style.zIndex = '-1';

    const heroContent = heroSection.querySelector('.hero-content');
    if (heroContent) {
        heroSection.insertBefore(canvas, heroContent);
    } else {
        heroSection.appendChild(canvas);
    }

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x080b1f, 0.12);

    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
    camera.position.set(0, 0, 6);

    const clock = new THREE.Clock();

    const particleCount = 2200;
    const positions = new Float32Array(particleCount * 3);
    const scales = new Float32Array(particleCount);
    const energies = new Float32Array(particleCount);

    for (let i = 0; i < particleCount; i++) {
        const radius = THREE.MathUtils.randFloat(0.1, 4.2);
        const angle = THREE.MathUtils.randFloatSpread(Math.PI * 2);
        const height = THREE.MathUtils.randFloatSpread(3.5);
        positions[i * 3] = Math.cos(angle) * radius + Math.sin(height * 2.0) * 0.25;
        positions[i * 3 + 1] = height;
        positions[i * 3 + 2] = Math.sin(angle) * radius + Math.cos(height * 1.5) * 0.25;

        scales[i] = THREE.MathUtils.randFloat(0.8, 1.6);
        energies[i] = THREE.MathUtils.randFloat(0.2, 1.0);
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('aScale', new THREE.Float32BufferAttribute(scales, 1));
    geometry.setAttribute('aEnergy', new THREE.Float32BufferAttribute(energies, 1));

    const uniforms = {
        uTime: { value: 0 },
        uSize: { value: 34 },
        uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
        uColorInner: { value: new THREE.Color('#ba6bff') },
        uColorMid: { value: new THREE.Color('#36d7d9') },
        uColorOuter: { value: new THREE.Color('#f5fbff') },
        uGrainStrength: { value: 0.18 },
    };

    const material = new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms,
        vertexShader: /* glsl */`
            uniform float uTime;
            uniform float uSize;
            uniform float uPixelRatio;
            attribute float aScale;
            attribute float aEnergy;
            varying float vEnergy;
            varying vec3 vPos;

            void main() {
                vec3 transformed = position;
                float radial = length(position.xz);
                transformed.x += sin(uTime * 0.25 + position.y * 2.5) * 0.18;
                transformed.y += sin(uTime * 0.35 + radial * 1.8) * 0.22 * (aEnergy + 0.2);
                transformed.z += cos(uTime * 0.2 + position.x * 1.5) * 0.15;

                vec4 mvPosition = modelViewMatrix * vec4(transformed, 1.0);
                gl_Position = projectionMatrix * mvPosition;

                float size = uSize * aScale;
                gl_PointSize = size * (1.0 / -mvPosition.z) * uPixelRatio;

                vEnergy = aEnergy;
                vPos = transformed;
            }
        `,
        fragmentShader: /* glsl */`
            precision highp float;
            uniform vec3 uColorInner;
            uniform vec3 uColorMid;
            uniform vec3 uColorOuter;
            uniform float uGrainStrength;
            varying float vEnergy;
            varying vec3 vPos;

            float random(vec2 co) {
                return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453);
            }

            void main() {
                vec2 uv = gl_PointCoord.xy * 2.0 - 1.0;
                float dist = length(uv);
                if (dist > 1.0) discard;

                float falloff = smoothstep(1.0, 0.0, dist);
                float altitude = clamp((vPos.y + 2.0) / 4.0, 0.0, 1.0);
                float energyMix = smoothstep(0.0, 1.0, vEnergy * 0.8 + falloff * 0.4);

                vec3 gradient = mix(uColorInner, uColorMid, altitude);
                gradient = mix(gradient, uColorOuter, pow(falloff, 2.5));
                gradient = mix(gradient, uColorOuter, energyMix * 0.6);

                float grain = (random(uv + vPos.xy) - 0.5) * uGrainStrength;
                float intensity = falloff + vEnergy * 0.65;
                vec3 color = gradient * intensity + grain;
                color = clamp(color, 0.0, 1.0);

                gl_FragColor = vec4(color, falloff);
            }
        `,
    });

    const particles = new THREE.Points(geometry, material);
    scene.add(particles);

    const composer = new EffectComposer(renderer);
    const heroBounds = heroSection.getBoundingClientRect();
    composer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    composer.setSize(heroBounds.width, heroBounds.height);

    const renderPass = new RenderPass(scene, camera);
    composer.addPass(renderPass);

    const bloomPass = new UnrealBloomPass(new THREE.Vector2(heroBounds.width, heroBounds.height), 1.4, 0.85, 0.35);
    bloomPass.threshold = 0.32;
    bloomPass.strength = 1.45;
    bloomPass.radius = 0.9;
    composer.addPass(bloomPass);

    const filmPass = new FilmPass(0.3, 0.05, 648, false);
    filmPass.uniforms['sCount'].value = 800;
    filmPass.uniforms['sIntensity'].value = 0.12;
    filmPass.uniforms['nIntensity'].value = 0.25;
    composer.addPass(filmPass);

    const resizeRenderer = () => {
        const bounds = heroSection.getBoundingClientRect();
        const width = Math.max(1, bounds.width);
        const height = Math.max(1, bounds.height);
        const aspect = width / height;
        camera.aspect = aspect;
        camera.updateProjectionMatrix();

        renderer.setSize(width, height, false);
        uniforms.uPixelRatio.value = Math.min(window.devicePixelRatio, 2);
        composer.setSize(width, height);
        bloomPass.setSize(width, height);
    };

    resizeRenderer();
    window.addEventListener('resize', resizeRenderer);

    const animate = () => {
        const elapsed = clock.getElapsedTime();
        uniforms.uTime.value = elapsed;
        particles.rotation.y = elapsed * 0.02;
        particles.rotation.x = Math.sin(elapsed * 0.15) * 0.08;
        composer.render();
        requestAnimationFrame(animate);
    };

    animate();
}
