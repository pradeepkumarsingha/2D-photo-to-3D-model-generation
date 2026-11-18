
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js";

import { OrbitControls } from "https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/controls/OrbitControls.js";

import { GLTFLoader } from "https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/loaders/GLTFLoader.js";


const container = document.getElementById("hero3DViewer");

if (container) {

    // SCENE
    const scene = new THREE.Scene();

    // CAMERA
    const camera = new THREE.PerspectiveCamera(
        35,
        container.clientWidth / container.clientHeight,
        0.1,
        100
    );

    camera.position.set(4, 2.5, 5);

    // RENDERER
    const renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true
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
    renderer.toneMappingExposure = 1.3;

    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.appendChild(renderer.domElement);


    // LIGHTING
    const ambientLight = new THREE.AmbientLight(
        0xffffff,
        1.8
    );

    scene.add(ambientLight);


    const mainLight = new THREE.DirectionalLight(
        0xffffff,
        3
    );

    mainLight.position.set(4, 7, 5);
    mainLight.castShadow = true;

    scene.add(mainLight);


    const fillLight = new THREE.PointLight(
        0x718cff,
        35,
        15
    );

    fillLight.position.set(-4, 2, -3);

    scene.add(fillLight);


    const rimLight = new THREE.PointLight(
        0xffffff,
        20,
        12
    );

    rimLight.position.set(2, 3, -4);

    scene.add(rimLight);


    // FLOOR
    const floorGeometry = new THREE.CircleGeometry(
        2.8,
        64
    );

    const floorMaterial = new THREE.MeshStandardMaterial({
        color: 0xe8edff,
        roughness: 0.8,
        metalness: 0
    });

    const floor = new THREE.Mesh(
        floorGeometry,
        floorMaterial
    );

    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -1.4;
    floor.receiveShadow = true;

    scene.add(floor);


    // CONTROLS
    const controls = new OrbitControls(
        camera,
        renderer.domElement
    );

    controls.enableDamping = true;
    controls.dampingFactor = 0.05;

    controls.enableZoom = true;
    controls.enablePan = false;

    controls.autoRotate = true;
    controls.autoRotateSpeed = 1.5;

    controls.minDistance = 3;
    controls.maxDistance = 9;

    controls.target.set(0, 0, 0);


    // MODEL GROUP
    const productGroup = new THREE.Group();

    scene.add(productGroup);


    // FALLBACK MODEL
    function createFallbackSpeaker() {

        const bodyMaterial = new THREE.MeshPhysicalMaterial({
            color: 0x242b3c,
            metalness: 0.65,
            roughness: 0.28,
            clearcoat: 1
        });

        const body = new THREE.Mesh(
            new THREE.BoxGeometry(2.4, 1.5, 0.9),
            bodyMaterial
        );

        body.castShadow = true;

        productGroup.add(body);


        const speakerMaterial = new THREE.MeshStandardMaterial({
            color: 0x101522,
            metalness: 0.3,
            roughness: 0.5
        });


        [-0.65, 0.65].forEach((x) => {

            const speaker = new THREE.Mesh(
                new THREE.CylinderGeometry(
                    0.42,
                    0.42,
                    0.06,
                    48
                ),
                speakerMaterial
            );

            speaker.rotation.z = Math.PI / 2;
            speaker.position.set(x, 0, 0.48);

            productGroup.add(speaker);

        });


        const ringMaterial = new THREE.MeshStandardMaterial({
            color: 0x8ba3ff,
            metalness: 0.9,
            roughness: 0.2
        });


        [-0.65, 0.65].forEach((x) => {

            const ring = new THREE.Mesh(
                new THREE.TorusGeometry(0.42, 0.025, 12, 48),
                ringMaterial
            );

            ring.position.set(x, 0, 0.52);

            productGroup.add(ring);

        });

    }


    // LOAD THREE.JS SAMPLE MODEL
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

            const scale = 2.5 / maxDimension;

            model.scale.setScalar(scale);

            model.traverse((child) => {

                if (child.isMesh) {

                    child.castShadow = true;
                    child.receiveShadow = true;

                }

            });

            productGroup.add(model);

        },

        undefined,

        (error) => {

            console.error(
                "Could not load demo model:",
                error
            );

            createFallbackSpeaker();

        }

    );


    // RESPONSIVE CAMERA
    const resizeObserver = new ResizeObserver(() => {

        const width = container.clientWidth;
        const height = container.clientHeight;

        camera.aspect = width / height;

        camera.updateProjectionMatrix();

        renderer.setSize(width, height);

    });

    resizeObserver.observe(container);


    // ANIMATION
    function animate() {

        requestAnimationFrame(animate);

        controls.update();

        renderer.render(scene, camera);

    }

    animate();

}
