import * as THREE from 'https://unpkg.com/three@0.158.0/build/three.module.js';
import { GPUComputationRenderer } from 'https://unpkg.com/three@0.158.0/examples/jsm/misc/GPUComputationRenderer.js?module';

const TEXTURE_SIZE = 128;
const PARTICLE_COUNT = TEXTURE_SIZE * TEXTURE_SIZE;
const BOUNDS = new THREE.Vector3(3.0, 2.0, 3.0);

async function loadShader(url) {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Shader betöltése sikertelen: ${url}`);
    }
    return response.text();
}

function createFallback(heroSection, reason) {
    const fallback = document.createElement('div');
    fallback.className = 'hero-particles-fallback';
    fallback.textContent = reason || 'A böngésző nem támogatja a részecske-animációt.';
    fallback.style.position = 'absolute';
    fallback.style.top = '50%';
    fallback.style.left = '50%';
    fallback.style.transform = 'translate(-50%, -50%)';
    fallback.style.padding = '1rem 1.5rem';
    fallback.style.borderRadius = '999px';
    fallback.style.background = 'rgba(10, 20, 40, 0.85)';
    fallback.style.color = 'rgba(255, 255, 255, 0.7)';
    fallback.style.fontSize = '0.85rem';
    fallback.style.letterSpacing = '0.08em';
    fallback.style.pointerEvents = 'none';
    heroSection.style.position = heroSection.style.position || 'relative';
    heroSection.appendChild(fallback);
}

function setupRenderer(container) {
    try {
        const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
        renderer.setSize(container.clientWidth, container.clientHeight);
        renderer.domElement.style.position = 'absolute';
        renderer.domElement.style.top = '0';
        renderer.domElement.style.left = '0';
        renderer.domElement.style.width = '100%';
        renderer.domElement.style.height = '100%';
        renderer.domElement.style.pointerEvents = 'none';
        return renderer;
    } catch (error) {
        console.error('WebGL renderer inicializálása sikertelen:', error);
        return null;
    }
}

function initializeTextures(gpuCompute) {
    const dtPosition = gpuCompute.createTexture();
    const dtVelocity = gpuCompute.createTexture();

    const posArray = dtPosition.image.data;
    const velArray = dtVelocity.image.data;

    for (let i = 0; i < PARTICLE_COUNT; i++) {
        const stride = i * 4;
        posArray[stride + 0] = (Math.random() * 2 - 1) * BOUNDS.x;
        posArray[stride + 1] = (Math.random() * 2 - 1) * BOUNDS.y;
        posArray[stride + 2] = (Math.random() * 2 - 1) * BOUNDS.z;
        posArray[stride + 3] = 1.0;

        velArray[stride + 0] = (Math.random() * 2 - 1) * 0.2;
        velArray[stride + 1] = (Math.random() * 2 - 1) * 0.2;
        velArray[stride + 2] = (Math.random() * 2 - 1) * 0.2;
        velArray[stride + 3] = 1.0;
    }

    return { dtPosition, dtVelocity };
}

function createParticleGeometry() {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(PARTICLE_COUNT * 3);
    const uvs = new Float32Array(PARTICLE_COUNT * 2);

    let p = 0;
    let u = 0;
    for (let i = 0; i < TEXTURE_SIZE; i++) {
        for (let j = 0; j < TEXTURE_SIZE; j++) {
            positions[p++] = 0;
            positions[p++] = 0;
            positions[p++] = 0;

            uvs[u++] = j / (TEXTURE_SIZE - 1);
            uvs[u++] = i / (TEXTURE_SIZE - 1);
        }
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));

    return geometry;
}

function createParticleMaterial(positionTexture) {
    const vertexShader = /* glsl */`
        uniform sampler2D positionTexture;
        uniform float size;
        varying float vDepthFade;

        void main() {
            vec3 pos = texture(positionTexture, uv).xyz;
            vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
            float dist = -mvPosition.z;
            gl_PointSize = size * (300.0 / max(dist, 1.0));
            vDepthFade = clamp(dist / 6.0, 0.0, 1.0);
            gl_Position = projectionMatrix * mvPosition;
        }
    `;

    const fragmentShader = /* glsl */`
        uniform vec3 color;
        uniform float intensity;
        varying float vDepthFade;

        void main() {
            float d = length(gl_PointCoord - 0.5);
            float alpha = smoothstep(0.5, 0.0, d);
            vec3 finalColor = color * intensity;
            gl_FragColor = vec4(finalColor, alpha * vDepthFade);
        }
    `;

    return new THREE.ShaderMaterial({
        uniforms: {
            positionTexture: { value: positionTexture },
            size: { value: 3.5 },
            color: { value: new THREE.Color(0x86c9ff) },
            intensity: { value: 1.8 }
        },
        vertexShader,
        fragmentShader,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending
    });
}

function bindPointer(heroSection, cursorVector) {
    function updateCursor(clientX, clientY) {
        const rect = heroSection.getBoundingClientRect();
        const x = ((clientX - rect.left) / rect.width) * 2 - 1;
        const y = ((clientY - rect.top) / rect.height) * -2 + 1;
        cursorVector.set(x * BOUNDS.x, y * BOUNDS.y, 0);
    }

    const pointerMoveHandler = (event) => {
        updateCursor(event.clientX, event.clientY);
    };

    const pointerLeaveHandler = () => {
        cursorVector.set(9999, 9999, 9999);
    };

    const pointerEnterHandler = (event) => {
        updateCursor(event.clientX, event.clientY);
    };

    window.addEventListener('pointermove', pointerMoveHandler);
    heroSection.addEventListener('pointerleave', pointerLeaveHandler);
    heroSection.addEventListener('pointerenter', pointerEnterHandler);

    return () => {
        window.removeEventListener('pointermove', pointerMoveHandler);
        heroSection.removeEventListener('pointerleave', pointerLeaveHandler);
        heroSection.removeEventListener('pointerenter', pointerEnterHandler);
    };
}

export async function initHeroParticles() {
    const heroSection = document.querySelector('.hero-section');
    if (!heroSection) {
        return;
    }

    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.top = '0';
    container.style.left = '0';
    container.style.width = '100%';
    container.style.height = '100%';
    container.style.pointerEvents = 'none';
    heroSection.style.position = heroSection.style.position || 'relative';
    heroSection.appendChild(container);

    const renderer = setupRenderer(container);
    if (!renderer || !renderer.capabilities.isWebGL2) {
        if (renderer) {
            renderer.dispose();
        }
        createFallback(heroSection, 'Interaktív háttérhez WebGL2 szükséges.');
        return;
    }
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 100);
    camera.position.z = 8;

    const positionShaderURL = new URL('./shaders/positionFragmentShader.glsl', import.meta.url);
    const velocityShaderURL = new URL('./shaders/velocityFragmentShader.glsl', import.meta.url);

    let positionShaderSource;
    let velocityShaderSource;
    try {
        [positionShaderSource, velocityShaderSource] = await Promise.all([
            loadShader(positionShaderURL),
            loadShader(velocityShaderURL)
        ]);
    } catch (error) {
        console.error('Shader betöltési hiba:', error);
        createFallback(heroSection, 'Nem sikerült betölteni a részecske-shadereket.');
        return;
    }

    const gpuCompute = new GPUComputationRenderer(TEXTURE_SIZE, TEXTURE_SIZE, renderer);
    let initialTextures;
    try {
        initialTextures = initializeTextures(gpuCompute);
    } catch (error) {
        console.error('Compute textúrák inicializálása sikertelen:', error);
        createFallback(heroSection, 'Nem sikerült létrehozni a részecske textúrákat.');
        return;
    }

    const positionVariable = gpuCompute.addVariable('positionTexture', positionShaderSource, initialTextures.dtPosition);
    const velocityVariable = gpuCompute.addVariable('velocityTexture', velocityShaderSource, initialTextures.dtVelocity);

    gpuCompute.setVariableDependencies(positionVariable, [positionVariable, velocityVariable]);
    gpuCompute.setVariableDependencies(velocityVariable, [positionVariable, velocityVariable]);

    positionVariable.material.uniforms = {
        delta: { value: 0 },
        bounds: { value: BOUNDS.clone() }
    };

    velocityVariable.material.uniforms = {
        time: { value: 0 },
        delta: { value: 0 },
        damping: { value: 1.2 },
        curlScale: { value: 1.8 },
        noiseFrequency: { value: 0.5 },
        cursorPosition: { value: new THREE.Vector3(9999, 9999, 9999) },
        cursorRadius: { value: 1.2 },
        cursorStrength: { value: 18.0 }
    };

    const error = gpuCompute.init();
    if (error) {
        console.error('GPU számítás inicializálása sikertelen:', error);
        createFallback(heroSection, 'A böngésző nem támogatja a GPU számítást.');
        return;
    }

    const geometry = createParticleGeometry();
    const particleMaterial = createParticleMaterial(gpuCompute.getCurrentRenderTarget(positionVariable).texture);
    const points = new THREE.Points(geometry, particleMaterial);
    scene.add(points);

    const cursorVector = velocityVariable.material.uniforms.cursorPosition.value;
    const removeListeners = bindPointer(heroSection, cursorVector);

    const clock = new THREE.Clock();

    function onResize() {
        const width = container.clientWidth;
        const height = container.clientHeight;
        renderer.setSize(width, height);
        camera.aspect = width / Math.max(height, 1);
        camera.updateProjectionMatrix();
    }

    let resizeObserver;
    if (typeof ResizeObserver !== 'undefined') {
        resizeObserver = new ResizeObserver(onResize);
        resizeObserver.observe(heroSection);
    } else {
        window.addEventListener('resize', onResize);
    }
    onResize();

    function renderLoop() {
        const delta = clock.getDelta();
        const elapsed = clock.elapsedTime;

        positionVariable.material.uniforms.delta.value = delta;
        velocityVariable.material.uniforms.delta.value = delta;
        velocityVariable.material.uniforms.time.value = elapsed;

        gpuCompute.compute();

        particleMaterial.uniforms.positionTexture.value = gpuCompute.getCurrentRenderTarget(positionVariable).texture;
        renderer.render(scene, camera);

        requestAnimationFrame(renderLoop);
    }

    requestAnimationFrame(renderLoop);

    return () => {
        if (resizeObserver) {
            resizeObserver.disconnect();
        } else {
            window.removeEventListener('resize', onResize);
        }
        removeListeners();
        renderer.dispose();
        geometry.dispose();
        particleMaterial.dispose();
    };
}
