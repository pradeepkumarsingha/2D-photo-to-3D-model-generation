
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

const container = document.getElementById("hero3DViewer");
const loading = document.getElementById("modelLoading");

if (container) {

    // =====================================
    // 1. SCENE
    // =====================================

    const scene = new THREE.Scene();

    scene.background = null;

    // =====================================
    // 2. CAMERA
    // =====================================

    const camera = new THREE.PerspectiveCamera(
        38,
        container.clientWidth / container.clientHeight,
        0.1,
        100
    );

    camera.position.set(4, 2.5, 5);


    // =====================================
    // 3. RENDERER
    // =====================================

    const renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: true,
        powerPreference: "high-performance"
    });

    renderer.setSize(
        container.clientWidth,
        container.clientHeight
    );

    renderer.setPixelRatio(
        Math.min(window.devicePixelRatio, 2)
    );

    renderer.outputColorSpace = THREE.SRGBColorSpace;

    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.35;

    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.appendChild(renderer.domElement);


    // =====================================
    // 4. LIGHTING
    // =====================================

    const ambient = new THREE.AmbientLight(
        0xffffff,
        1.5
    );

    scene.add(ambient);


    const mainLight = new THREE.DirectionalLight(
        0xffffff,
        3.5
    );

    mainLight.position.set(4, 7, 5);
    mainLight.castShadow = true;

    scene.add(mainLight);


    const blueLight = new THREE.PointLight(
        0x496cff,
        40,
        12
    );

    blueLight.position.set(-4, 2, -3);

    scene.add(blueLight);


    const rimLight = new THREE.PointLight(
        0x55d8ff,
        30,
        12
    );

    rimLight.position.set(2, 3, -4);

    scene.add(rimLight);


    // =====================================
    // 5. FLOOR
    // =====================================

    const floorGeometry = new THREE.CircleGeometry(
        2.7,
        64
    );

    const floorMaterial = new THREE.MeshStandardMaterial({
        color: 0x192846,
        roughness: 0.65,
        metalness: 0.25,
        transparent: true,
        opacity: 0.7
    });

    const floor = new THREE.Mesh(
        floorGeometry,
        floorMaterial
    );

    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -1.25;
    floor.receiveShadow = true;

    scene.add(floor);


    // =====================================
    // 6. PRODUCT GROUP
    // =====================================

    const productGroup = new THREE.Group();

    scene.add(productGroup);


    // =====================================
    // 7. FALLBACK SPEAKER
    // =====================================

    function createFallbackSpeaker() {

        const bodyMaterial = new THREE.MeshPhysicalMaterial({
            color: 0x202c43,
            metalness: 0.7,
            roughness: 0.23,
            clearcoat: 1,
            clearcoatRoughness: 0.15
        });

        const body = new THREE.Mesh(
            new THREE.BoxGeometry(2.3, 1.4, 0.9),
            bodyMaterial
        );

        body.castShadow = true;
        body.receiveShadow = true;

        productGroup.add(body);


        const speakerMaterial = new THREE.MeshStandardMaterial({
            color: 0x0b1220,
            metalness: 0.4,
            roughness: 0.35
        });

        const ringMaterial = new THREE.MeshStandardMaterial({
            color: 0x7695ff,
            metalness: 0.8,
            roughness: 0.2,
            emissive: 0x172d70
        });


        [-0.65, 0.65].forEach((x) => {

            const speaker = new THREE.Mesh(
                new THREE.CylinderGeometry(
                    0.38,
                    0.38,
                    0.07,
                    48
                ),
                speakerMaterial
            );

            speaker.rotation.x = Math.PI / 2;
            speaker.position.set(x, 0, 0.49);

            productGroup.add(speaker);


            const ring = new THREE.Mesh(
                new THREE.TorusGeometry(
                    0.39,
                    0.035,
                    16,
                    48
                ),
                ringMaterial
            );

            ring.position.set(x, 0, 0.55);

            productGroup.add(ring);

        });


        const topButton = new THREE.Mesh(
            new THREE.CylinderGeometry(
                0.07,
                0.07,
                0.04,
                24
            ),
            ringMaterial
        );

        topButton.position.set(0, 0.72, 0);

        productGroup.add(topButton);

    }


    // =====================================
    // 8. MODEL LOADER
    // =====================================

    const loader = new GLTFLoader();

    const modelURL =
        "https://threejs.org/examples/models/gltf/BoomBox/glTF-Binary/BoomBox.glb";

    loader.load(

        modelURL,

        (gltf) => {

            const model = gltf.scene;

            const box = new THREE.Box3().setFromObject(model);

            const center = box.getCenter(new THREE.Vector3());

            const size = box.getSize(new THREE.Vector3());

            model.position.sub(center);

            const maxDimension = Math.max(
                size.x,
                size.y,
                size.z
            );

            const scale = 2.2 / maxDimension;

            model.scale.setScalar(scale);

            model.traverse((child) => {

                if (child.isMesh) {

                    child.castShadow = true;
                    child.receiveShadow = true;

                }

            });

            productGroup.add(model);

            if (loading) {
                loading.classList.add("hidden");
            }

            console.log("3D demo model loaded successfully.");

        },

        undefined,

        (error) => {

            console.error("GLB loading failed:", error);

            createFallbackSpeaker();

            if (loading) {
                loading.classList.add("hidden");
            }

            document.getElementById("modelName").textContent =
                "3D Demo Speaker";

        }

    );


    // =====================================
    // 9. ORBIT CONTROLS
    // =====================================

    const controls = new OrbitControls(
        camera,
        renderer.domElement
    );

    controls.enableDamping = true;
    controls.dampingFactor = 0.05;

    controls.enableZoom = true;
    controls.enablePan = false;

    controls.autoRotate = true;
    controls.autoRotateSpeed = 1.2;

    controls.minDistance = 3;
    controls.maxDistance = 8;

    controls.target.set(0, 0, 0);


    // =====================================
    // 10. RESPONSIVE
    // =====================================

    const resizeObserver = new ResizeObserver(() => {

        const width = container.clientWidth;
        const height = container.clientHeight;

        if (!width || !height) return;

        camera.aspect = width / height;
        camera.updateProjectionMatrix();

        renderer.setSize(width, height);

    });

    resizeObserver.observe(container);


    // =====================================
    // 11. ANIMATION
    // =====================================

    const clock = new THREE.Clock();

    function animate() {

        requestAnimationFrame(animate);

        const elapsed = clock.getElapsedTime();

        // Subtle floating animation
        productGroup.position.y =
            Math.sin(elapsed * 1.2) * 0.045;

        controls.update();

        renderer.render(scene, camera);

    }

    animate();


    // =====================================
    // 12. CLEANUP
    // =====================================

    window.addEventListener("pagehide", () => {

        resizeObserver.disconnect();

        controls.dispose();

        renderer.dispose();

    });

}
