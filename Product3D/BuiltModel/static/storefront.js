
import * as THREE from "three";

import { OrbitControls } from
    "three/addons/controls/OrbitControls.js";

import { GLTFLoader } from
    "three/addons/loaders/GLTFLoader.js";

const DEMO_MODEL =
    "https://threejs.org/examples/models/gltf/DamagedHelmet/glTF-Binary/DamagedHelmet.glb";


function createLandingDemo(scene) {
    const group = new THREE.Group();
    group.name = "Product3D demo preview";

    const bodyMaterial = new THREE.MeshPhysicalMaterial({
        color: 0x202c48,
        metalness: 0.72,
        roughness: 0.22,
        clearcoat: 1,
        clearcoatRoughness: 0.12
    });

    const darkMaterial = new THREE.MeshStandardMaterial({
        color: 0x090d18,
        metalness: 0.45,
        roughness: 0.32
    });

    const accentMaterial = new THREE.MeshStandardMaterial({
        color: 0x536dfe,
        emissive: 0x263caa,
        emissiveIntensity: 0.7,
        metalness: 0.75,
        roughness: 0.18
    });

    const body = new THREE.Mesh(
        new THREE.BoxGeometry(2.4, 1.35, 0.85),
        bodyMaterial
    );
    body.castShadow = true;
    body.receiveShadow = true;
    group.add(body);

    [-0.66, 0.66].forEach((x) => {
        const speaker = new THREE.Mesh(
            new THREE.CylinderGeometry(0.38, 0.38, 0.07, 48),
            darkMaterial
        );
        speaker.rotation.x = Math.PI / 2;
        speaker.position.set(x, 0, 0.44);
        group.add(speaker);

        const ring = new THREE.Mesh(
            new THREE.TorusGeometry(0.39, 0.025, 16, 48),
            accentMaterial
        );
        ring.position.set(x, 0, 0.49);
        group.add(ring);
    });

    const topButton = new THREE.Mesh(
        new THREE.CylinderGeometry(0.065, 0.065, 0.04, 24),
        accentMaterial
    );
    topButton.position.set(0, 0.69, 0);
    group.add(topButton);

    scene.add(group);
    return group;
}


function mountModel(host, modelUrl, compact = false) {

    if (!host) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x10182b);

    const width = host.clientWidth || 400;
    const height = host.clientHeight || 300;

    const camera = new THREE.PerspectiveCamera(
        35,
        width / height,
        0.01,
        1000
    );

    camera.position.set(2.8, 1.7, 3.2);

    const renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true
    });

    renderer.setSize(width, height);

    renderer.setPixelRatio(
        Math.min(window.devicePixelRatio, 2)
    );

    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;

    host.innerHTML = "";
    host.appendChild(renderer.domElement);

    // Studio lighting
    scene.add(
        new THREE.HemisphereLight(
            0xffffff,
            0x748094,
            2.2
        )
    );

    const keyLight = new THREE.DirectionalLight(
        0xffffff,
        2.5
    );

    keyLight.position.set(4, 6, 5);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(
        0xffffff,
        1.2
    );

    fillLight.position.set(-4, 2, -3);
    scene.add(fillLight);

    // Interactive controls
    const controls = new OrbitControls(
        camera,
        renderer.domElement
    );

    controls.enableDamping = true;
    controls.dampingFactor = 0.06;

    controls.autoRotate = compact;
    controls.autoRotateSpeed = 1.1;

    controls.enableZoom = true;
    controls.enablePan = true;

    controls.minDistance = 0.5;
    controls.maxDistance = 15;

    const loader = new GLTFLoader();

    const selectedModel = modelUrl || DEMO_MODEL;

    loader.load(
        selectedModel,

        (asset) => {

            const model = asset.scene;

            scene.add(model);

            // Center and automatically scale the model
            const box = new THREE.Box3().setFromObject(model);

            const size = box.getSize(
                new THREE.Vector3()
            );

            const center = box.getCenter(
                new THREE.Vector3()
            );

            model.position.sub(center);

            const maxDimension = Math.max(
                size.x,
                size.y,
                size.z
            );

            const distance = maxDimension * 2.2;

            camera.position.set(
                distance,
                distance * 0.7,
                distance
            );

            camera.near = Math.max(
                maxDimension / 100,
                0.001
            );

            camera.far = maxDimension * 100;

            camera.updateProjectionMatrix();

            controls.target.set(0, 0, 0);
            controls.update();

        },

        undefined,

        (error) => {

            console.error(
                "3D model loading failed:",
                error
            );
            host.querySelector(".model-loading")?.remove();
            createLandingDemo(scene);
        }
    );

    // Responsive resizing
    const resizeObserver = new ResizeObserver(() => {

        const newWidth = host.clientWidth;
        const newHeight = host.clientHeight;

        if (!newWidth || !newHeight) return;

        camera.aspect = newWidth / newHeight;

        camera.updateProjectionMatrix();

        renderer.setSize(
            newWidth,
            newHeight
        );
    });

    resizeObserver.observe(host);

    // Animation loop
    function animate() {

        requestAnimationFrame(animate);

        controls.update();

        renderer.render(scene, camera);
    }

    animate();
}


// Explore page product models
document.querySelectorAll(".explore-model").forEach((host) => {

    const actualModelUrl = host.dataset.modelUrl;

    mountModel(
        host,
        actualModelUrl || DEMO_MODEL,
        false
    );

});

document.addEventListener("DOMContentLoaded", () => {
    const heroModel = document.querySelector(".hero-model");

    if (heroModel) {
        const demoModelUrl =
            heroModel.dataset.modelUrl ||
            "https://threejs.org/examples/models/gltf/DamagedHelmet/glTF-Binary/DamagedHelmet.glb";

        mountModel(heroModel, demoModelUrl, true);
    }
});


// Responsive landing-page navigation
const navToggle = document.querySelector(".nav-toggle");
const mainNavigation = document.querySelector("#mainNavigation");

if (navToggle && mainNavigation) {
    navToggle.addEventListener("click", () => {
        const isOpen = mainNavigation.classList.toggle("open");
        navToggle.setAttribute("aria-expanded", String(isOpen));
        navToggle.setAttribute(
            "aria-label",
            isOpen ? "Close navigation" : "Open navigation"
        );
    });

    mainNavigation.querySelectorAll("a").forEach((link) => {
        link.addEventListener("click", () => {
            mainNavigation.classList.remove("open");
            navToggle.setAttribute("aria-expanded", "false");
            navToggle.setAttribute("aria-label", "Open navigation");
        });
    });
}
