import './style.css';
import * as THREE from 'three';
import gsap from 'gsap';
import vertex from "../shaders/vertex.glsl";
import fragment from "../shaders/fragment.glsl";

class Site {
    constructor({ dom }) {
        this.time = 0
        this.container = dom
        this.width = window.innerWidth
        this.height = window.innerHeight
        this.images = [...document.querySelectorAll(".images img")]
        this.material
        this.imageStore = []
        this.particles
        this.asteroidGroup
        this.particleGeometry
        this.particlePositions
        this.particleCount = 1100
        this.particleSpeed = 0
        this.targetParticleSpeed = 0
        this.particleOpacity = 0
        this.targetParticleOpacity = 0
        this.particleOpacityEase = 0.012
        this.particleBounceTime = 0
        this.imageTime = 0
        this.asteroidOpacity = 0
        this.targetAsteroidOpacity = 0
        this.asteroidOpacityEase = 0.025
        this.asteroidTime = 0
        this.asteroidRotationSpeed = 0
        this.asteroidRotationSpeedEase = 0.018
        this.noiseStrength = 0
        this.targetNoiseStrength = 0
        this.noiseStrengthEase = 0.018
        this.baseParticleSpeed = 0;
        this.scrollSpeedBoost = 0.12;
        this.maxScrollDelta = 18
        this.scrollSpeedEase = 0.12
        this.maskSpeedMultiplier = 25
        this.cameraStartZ = 200
        this.cameraTravelDistance = 500
        this.cameraSpeedEase = 0.02
        this.cameraTargetZ = this.cameraStartZ
        this.cameraAtFarPoint = false
        this.lastScrollY = window.scrollY
        this.scrollVelocity = 0
        this.currentImageIndex = 0
        this.uStartIndex = 0
        this.uEndIndex = 1
        this.imageTransition = 1
        this.targetImageTransition = 1
        this.imageTransitionEase = 0.01

        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(
            75,
            this.width / this.height,
            10,
            2000
        );

        this.camera.position.z = 200;
        this.camera.fov = 2 * Math.atan(this.height / 2 / 200) * (180 / Math.PI)

        this.renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: true,
        });

        this.renderer.setPixelRatio(window.devicePixelRatio)
        this.renderer.setSize(this.width, this.height);
        this.container.appendChild(this.renderer.domElement);

        this.renderer.render(this.scene, this.camera)


        // this.addObjects()
        this.addImages()
        this.addParticles()
        this.addAsteroids()
        this.resize()
        this.setUpResize()
        this.setUpScroll()
        this.setUpImageHover()
        this.setPosition()
        // this.hoverOverLinks()
        this.render()
    }

    setUpScroll() {
        window.addEventListener("wheel", (event) => {
            if (!this.isImageHovered) return

            this.scrollVelocity = Math.min(
                this.scrollVelocity + Math.abs(event.deltaY) * 0.35,
                this.maxScrollDelta
            )
            this.cameraTargetZ = this.cameraStartZ + this.cameraTravelDistance
        }, { passive: true })
    }

    setUpImageHover() {
        this.isImageHovered = false

        window.addEventListener("pointermove", (event) => {

            this.material.uniforms.uMouse.value.set(
                event.clientX / window.innerWidth,
                event.clientY / window.innerHeight
            );

            const wasImageHovered = this.isImageHovered

            this.isImageHovered = this.images.some((image) => {
                const bounds = image.getBoundingClientRect()

                return event.clientX >= bounds.left &&
                    event.clientX <= bounds.right &&
                    event.clientY >= bounds.top &&
                    event.clientY <= bounds.bottom
            })

            if (this.isImageHovered && !wasImageHovered) {
                this.material.uniforms.uStartIndex.value =
                    this.currentImageIndex
                this.material.uniforms.uEndIndex.value =
                    (this.currentImageIndex + 1) % this.images.length
            }

            this.targetParticleOpacity =
                this.isImageHovered ? 1 : 0

            this.targetNoiseStrength =
                this.isImageHovered ? 1 : 0

            if (!this.isImageHovered) {
                this.material.uniforms.uStartIndex.value =
                    this.currentImageIndex
                this.material.uniforms.uEndIndex.value =
                    (this.currentImageIndex + 1) % this.images.length
                this.scrollVelocity = 0
                this.cameraTargetZ = this.cameraStartZ
                this.cameraAtFarPoint = false
            }
        })

        window.addEventListener("pointerleave", () => {
            this.isImageHovered = false
            this.material.uniforms.uStartIndex.value =
                this.currentImageIndex
            this.material.uniforms.uEndIndex.value =
                (this.currentImageIndex + 1) % this.images.length
            this.targetParticleOpacity = 0
            this.targetNoiseStrength = 0
            this.scrollVelocity = 0
            this.cameraTargetZ = this.cameraStartZ
            this.cameraAtFarPoint = false
        })
    }

    resize() {
        this.width = this.container.offsetWidth;
        this.height = this.container.offsetHeight;
        this.renderer.setSize(this.width, this.height)
        this.camera.aspect = this.width / this.height
        this.camera.updateProjectionMatrix()
        this.setPosition()
    }

    addParticles() {
        const particlePositions = new Float32Array(this.particleCount * 3)

        for (let index = 0; index < this.particleCount; index++) {
            const offset = index * 3

            const radius = 150 + Math.random() * 80
            const azimuth = Math.random() * Math.PI * 2
            const elevation = Math.acos(2 * Math.random() - 1)

            particlePositions[offset] =
                Math.sin(elevation) * Math.cos(azimuth) * radius

            particlePositions[offset + 1] =
                Math.cos(elevation) * radius

            particlePositions[offset + 2] =
                Math.sin(elevation) * Math.sin(azimuth) * radius
        }

        this.particlePositions = particlePositions

        this.particleGeometry = new THREE.BufferGeometry()

        this.particleGeometry.setAttribute(
            'position',
            new THREE.BufferAttribute(
                particlePositions,
                3
            )
        )

        const particleOffsets = new Float32Array(this.particleCount)

        for (let index = 0; index < this.particleCount; index++) {
            particleOffsets[index] = Math.random()
        }

        this.particleGeometry.setAttribute(
            'aOffset',
            new THREE.BufferAttribute(particleOffsets, 1)
        )

        const particleMaterial = new THREE.ShaderMaterial({
            uniforms: {
                uParticleTime: { value: 0 },
                uParticleBounceTime: { value: 0 },
                uOpacity: { value: 0 },
                uMouse: { value: new THREE.Vector2(10, 10) }, // Default value to maintain effect
            },
            vertexShader: `
                attribute float aOffset;
                uniform float uParticleTime;
                uniform float uParticleBounceTime;
                uniform vec2 uMouse; // Keep uniform for shader
                varying float vFade;

                void main() {
                    float phase = fract(uParticleTime * 0.55 + aOffset);
                    float easedPhase = phase * phase * (3.0 - 2.0 * phase);
                    vec3 direction = normalize(position);
                    vec3 burstPosition = direction * mix(40.0, 800.0, easedPhase);
                    burstPosition.y += sin(uParticleBounceTime * 1.2 + aOffset * 6.28318) * 3.0;
                    vec4 modelPosition = modelViewMatrix * vec4(burstPosition, 1.0);
                    vec4 projectedPosition = projectionMatrix * modelPosition;
                    vec2 screenPosition = projectedPosition.xy / projectedPosition.w;


                    gl_PointSize = mix(1.5, 13.0, easedPhase)
    * (180.0 / -modelPosition.z);
                    gl_Position = projectedPosition;
                    vFade = 1.0 - smoothstep(0.82, 1.0, phase);
                }
            `,
            fragmentShader: `
                varying float vFade;
                uniform float uOpacity;

                void main() {
                    float distanceFromCenter = distance(gl_PointCoord, vec2(0.5));
                    float softness = 1.0 - smoothstep(0.15, 0.5, distanceFromCenter);
                    gl_FragColor = vec4(0.6, 0.2, 1.0, softness * vFade * uOpacity);
                }
            `,
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
        })

        this.particles = new THREE.Points(
            this.particleGeometry,
            particleMaterial
        )

        this.particleRotationAxis = new THREE.Vector3(1, 1, 0).normalize()

        this.scene.add(this.particles)
    }

    addAsteroids() {
        this.asteroidGroup = new THREE.Group();

        const asteroidGeometry =
            new THREE.DodecahedronGeometry(18, 0);

        this.asteroidMaterial = new THREE.MeshStandardMaterial({
            color: 0x8c7771,
            roughness: 0.7,
            metalness: 0.0,
            emissive: 0x3d2520,
            emissiveIntensity: 0.35,
            transparent: true,
            opacity: 0,
            depthWrite: false
        });

        const imageWidth = this.imageStore[0]?.width ?? this.width * 0.5;
        const imageHeight = this.imageStore[0]?.height ?? this.height * 0.32;
        const asteroidOrbitX = imageWidth / 2 + 50;
        const asteroidOrbitY = imageHeight / 2 + 30;

        for (let index = 0; index < 64; index++) {

            const asteroid = new THREE.Mesh(
                asteroidGeometry,
                this.asteroidMaterial
            );

            const angle =
                Math.random() * Math.PI * 2;

            asteroid.position.set(
                Math.cos(angle) * asteroidOrbitX,
                Math.sin(angle) * asteroidOrbitY,
                20 + Math.random() * 30
            );
            asteroid.userData.baseY = asteroid.position.y;
            asteroid.userData.bouncePhase = Math.random() * Math.PI * 2;

            asteroid.scale.setScalar(
                0.25 + Math.random() * 0.65
            );

            asteroid.rotation.set(
                Math.random() * Math.PI,
                Math.random() * Math.PI,
                Math.random() * Math.PI
            );

            this.asteroidGroup.add(asteroid);
        }

        this.asteroidGroup.rotation.set(
            THREE.MathUtils.degToRad(35),
            0,
            THREE.MathUtils.degToRad(45)
        );
        this.asteroidGroup.position.z = 10;
        this.asteroidGroup.visible = true;

        this.miniAsteroidGroup = new THREE.Group();
        this.miniAsteroidMaterial = this.asteroidMaterial.clone();
        this.miniAsteroidMaterial.color.set(0xc93636);
        this.miniAsteroidMaterial.emissive.set(0x3a0808);

        for (let index = 0; index < 72; index++) {
            const miniAsteroid = new THREE.Mesh(
                asteroidGeometry,
                this.miniAsteroidMaterial
            );
            const radius = 150 + Math.random() * 180;
            const azimuth = Math.random() * Math.PI * 2;
            const elevation = Math.acos(2 * Math.random() - 1);

            miniAsteroid.position.set(
                Math.sin(elevation) * Math.cos(azimuth) * radius,
                Math.cos(elevation) * radius,
                Math.sin(elevation) * Math.sin(azimuth) * radius
            );
            miniAsteroid.scale.setScalar(0.08 + Math.random() * 0.16);
            miniAsteroid.rotation.set(
                Math.random() * Math.PI,
                Math.random() * Math.PI,
                Math.random() * Math.PI
            );
            this.miniAsteroidGroup.add(miniAsteroid);
        }

        this.diagonalAsteroidGroup = this.asteroidGroup.clone();
        this.diagonalAsteroidGroup.rotation.set(
            THREE.MathUtils.degToRad(35),
            0,
            THREE.MathUtils.degToRad(-45)
        );
        this.diagonalAsteroidGroup.position.z = 10;
        this.diagonalAsteroidGroup.userData.rotationFactor = 0.63;
        this.diagonalAsteroidMaterial = this.asteroidMaterial.clone();
        this.diagonalAsteroidMaterial.color.set(0x4f86a8);
        this.diagonalAsteroidGroup.children.forEach((asteroid) => {
            asteroid.material = this.diagonalAsteroidMaterial;
        });
        this.diagonalAsteroidGroup.children.forEach((asteroid) => {
            asteroid.userData.bouncePhase += Math.PI * 0.63;
        });

        this.asteroidGroups = [
            this.asteroidGroup,
            this.diagonalAsteroidGroup
        ];

        this.scene.add(this.asteroidGroup);
        this.scene.add(this.diagonalAsteroidGroup);
        this.scene.add(this.miniAsteroidGroup);

        const fillLight = new THREE.HemisphereLight(
            0xffffff,
            0x17131a,
            1.8
        );

        this.scene.add(fillLight);

        const keyLight = new THREE.DirectionalLight(
            0xffffff,
            2.5
        );

        keyLight.position.set(-200, 250, 300);
        this.scene.add(keyLight);

        const light = new THREE.PointLight(
            0xffffff,
            85,
            1000
        );

        light.position.set(100, 100, 300);

        this.scene.add(light);
    }


    setUpResize() {
        window.addEventListener("resize", this.resize.bind(this))
    }

    setUpMouse() {

        // Mouse setup removed to disable cursor interaction
    }

    setPosition() {
        this.imageStore.forEach((img) => {
            const bounds = img.img.getBoundingClientRect()
            img.mesh.position.y = -bounds.top + this.height / 2 - bounds.height / 2;
            img.mesh.position.x = bounds.left - this.width / 2 + bounds.width / 2;
        })
    }

    addImages() {
        const textureLoader = new THREE.TextureLoader()
        const textures = this.images.map((img) => textureLoader.load(img.src))
        const uniforms = {
            uTime: { value: 0 },
            uTimeline: { value: 0.2 },
            uStartIndex: { value: 0 },
            uEndIndex: { value: 1 },
            uImage1: { value: textures[0] },
            uImage2: { value: textures[1] },
            uImage3: { value: textures[2] },
            uImage4: { value: textures[3] },
            uNoiseStrength: { value: 0 },
            uImageTransition: { value: 1 },
            uMouse: { value: new THREE.Vector2(0.5, 0.5) },
        }

        this.material = new THREE.ShaderMaterial({
            uniforms: uniforms,
            vertexShader: vertex,
            fragmentShader: fragment,
            transparent: true,
            depthWrite: false,
        });

        this.images.forEach(img => {
            const bounds = img.getBoundingClientRect();
            const geometry = new THREE.PlaneGeometry(bounds.width, bounds.height);
            const mesh = new THREE.Mesh(geometry, this.material);

            this.scene.add(mesh);

            this.imageStore.push({
                img: img,
                mesh: mesh,
                top: bounds.top,
                left: bounds.left,
                width: bounds.width,
                height: bounds.height,
            });
        })
    }

    // hoverOverLinks() {
    //     const links = document.querySelectorAll(".links a");
    //     links.forEach((link, i) => {
    //         link.addEventListener("mouseover", (e) => {
    //             this.material.uniforms.uTimeline.value = 0.0;

    //             gsap.to(this.material.uniforms.uTimeline, {
    //                 value: 4.0,
    //                 duration: 3.2,
    //                 onStart: () => {
    //                     this.uEndIndex = i;
    //                     this.material.uniforms.uStartIndex.value = this.uStartIndex;
    //                     this.material.uniforms.uEndIndex.value = this.uEndIndex;
    //                     this.uStartIndex = this.uEndIndex;
    //                 }
    //             })
    //         })
    //     })
    // }

    // addObjects() {
    //     this.geometry = new THREE.BoxGeometry(1, 1, 1);
    //     this.material = new THREE.MeshBasicMaterial({ color: 0x00ff00, wireframe: true });
    //     this.cube = new THREE.Mesh(this.geometry, this.material);
    //     this.scene.add(this.cube);
    // }

    render() {
        const scrollDelta = window.scrollY - this.lastScrollY;

        const scrollSpeed = this.isImageHovered
            ? Math.min(
                Math.max(Math.abs(scrollDelta), this.scrollVelocity),
                this.maxScrollDelta
            )
            : 0;

        this.scrollVelocity *= 0.97;

        this.targetParticleSpeed =
            this.baseParticleSpeed +
            (scrollSpeed / this.maxScrollDelta) * this.scrollSpeedBoost;

        this.camera.position.z +=
            (this.cameraTargetZ - this.camera.position.z) *
            this.cameraSpeedEase;

        const farCameraZ = this.cameraStartZ + this.cameraTravelDistance;

        if (
            this.isImageHovered &&
            !this.cameraAtFarPoint &&
            this.camera.position.z >= farCameraZ - 2
        ) {
            this.cameraAtFarPoint = true
            this.currentImageIndex =
                (this.currentImageIndex + 1) % this.images.length

            this.material.uniforms.uStartIndex.value =
                this.currentImageIndex
            this.material.uniforms.uEndIndex.value =
                (this.currentImageIndex + 1) % this.images.length
            this.imageTransition = 0
            this.targetImageTransition = 1
            this.cameraTargetZ = this.cameraStartZ
        }

        if (
            this.cameraAtFarPoint &&
            this.camera.position.z <= this.cameraStartZ + 2
        ) {
            this.cameraAtFarPoint = false
        }

        this.lastScrollY = window.scrollY;

        this.particleSpeed +=
            (this.targetParticleSpeed - this.particleSpeed) *
            this.scrollSpeedEase;

        this.particleOpacity +=
            (this.targetParticleOpacity - this.particleOpacity) *
            this.particleOpacityEase;

        this.particles.material.uniforms.uOpacity.value = this.particleOpacity;

        this.noiseStrength +=
            (this.targetNoiseStrength - this.noiseStrength) *
            this.noiseStrengthEase;

        this.material.uniforms.uNoiseStrength.value = this.noiseStrength;

        this.imageTransition +=
            (this.targetImageTransition - this.imageTransition) *
            this.imageTransitionEase;

        this.material.uniforms.uImageTransition.value =
            this.imageTransition;

        this.imageTime += 0.2 + scrollSpeed * 0.08;
        this.material.uniforms.uTime.value = this.imageTime;

        this.particles.material.uniforms.uParticleTime.value +=
            this.particleSpeed;
        this.particleBounceTime += 0.016;
        this.particles.material.uniforms.uParticleBounceTime.value =
            this.particleBounceTime;

        this.particles.rotateOnAxis(
            this.particleRotationAxis,
            this.particleSpeed * 0.25
        );

        this.asteroidTime += 0.01;

        this.asteroidGroups.forEach((group) => {
            if (!group.userData.noBounce) {
                group.children.forEach((asteroid) => {
                    asteroid.position.y =
                        asteroid.userData.baseY +
                        Math.sin(this.asteroidTime * 0.8 + asteroid.userData.bouncePhase) * 7;
                });
            }
        });

        const cameraIsTraveling = this.cameraTargetZ > this.cameraStartZ;
        const targetAsteroidRotationSpeed = cameraIsTraveling ? 1 : 0;
        this.asteroidRotationSpeed +=
            (targetAsteroidRotationSpeed - this.asteroidRotationSpeed) *
            this.asteroidRotationSpeedEase;
        this.targetAsteroidOpacity =
            this.isImageHovered || cameraIsTraveling ? 1 : 0;
        this.asteroidOpacity +=
            (this.targetAsteroidOpacity - this.asteroidOpacity) *
            this.asteroidOpacityEase;
        this.asteroidMaterial.opacity = this.asteroidOpacity;
        this.diagonalAsteroidMaterial.opacity = this.asteroidOpacity;
        this.miniAsteroidMaterial.opacity = this.asteroidOpacity;

        if (this.asteroidRotationSpeed > 0.0001) {
            this.asteroidGroups.forEach((group) => {
                const rotationFactor = group.userData.rotationFactor ?? 1;

                if (group.userData.rotateAroundNormal) {
                    group.rotateZ(0.004 * this.asteroidRotationSpeed * rotationFactor);
                } else {
                    group.rotation.x += 0.0018 * this.asteroidRotationSpeed * rotationFactor;
                    group.rotation.y += 0.0027 * this.asteroidRotationSpeed * rotationFactor;
                    group.rotation.z += 0.004 * this.asteroidRotationSpeed * rotationFactor;
                }

                if (!group.userData.rotateAroundNormal) {
                    group.children.forEach((asteroid) => {
                        asteroid.rotation.x += 0.0032 * this.asteroidRotationSpeed * rotationFactor;
                        asteroid.rotation.y += 0.0024 * this.asteroidRotationSpeed * rotationFactor;
                        asteroid.rotation.z += 0.0029 * this.asteroidRotationSpeed * rotationFactor;
                    });
                }
            });
        }

        this.renderer.render(this.scene, this.camera);

        window.requestAnimationFrame(this.render.bind(this));
    }
}

new Site({
    dom: document.querySelector(".canvas")
})
