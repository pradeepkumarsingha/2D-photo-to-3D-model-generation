import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js'
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/controls/OrbitControls.js'
import { GLTFLoader } from 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/loaders/GLTFLoader.js'

function mountModel(host, url, compact = false) {
  const scene = new THREE.Scene()
  scene.background = new THREE.Color(0xf1f4f8)
  const camera = new THREE.PerspectiveCamera(35, host.clientWidth / host.clientHeight, 0.01, 1000)
  camera.position.set(2.8, 1.7, 3.2)
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
  renderer.setSize(host.clientWidth, host.clientHeight)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.outputColorSpace = THREE.SRGBColorSpace
  host.innerHTML = ''
  host.appendChild(renderer.domElement)
  scene.add(new THREE.HemisphereLight(0xffffff, 0x748094, 2.2))
  const key = new THREE.DirectionalLight(0xffffff, 2.5)
  key.position.set(4, 6, 5)
  scene.add(key)
  const controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true
  controls.autoRotate = compact
  controls.autoRotateSpeed = 1.1
  new GLTFLoader().load(url, (asset) => {
    scene.add(asset.scene)
    const box = new THREE.Box3().setFromObject(asset.scene)
    const size = box.getSize(new THREE.Vector3())
    const center = box.getCenter(new THREE.Vector3())
    asset.scene.position.sub(center)
    const max = Math.max(size.x, size.y, size.z)
    camera.position.set(max * 1.8, max * 1.15, max * 1.8)
    camera.near = max / 100
    camera.far = max * 100
    camera.updateProjectionMatrix()
    controls.target.set(0, 0, 0)
  }, undefined, () => { host.innerHTML = '<span class="model-loading">Preview unavailable</span>' })
  const resize = () => { camera.aspect = host.clientWidth / host.clientHeight; camera.updateProjectionMatrix(); renderer.setSize(host.clientWidth, host.clientHeight) }
  window.addEventListener('resize', resize)
  const animate = () => { requestAnimationFrame(animate); controls.update(); renderer.render(scene, camera) }
  animate()
}

const hero = document.querySelector('#hero-model')
if (hero) mountModel(hero, 'https://threejs.org/examples/models/gltf/DamagedHelmet/glTF-Binary/DamagedHelmet.glb', true)
document.querySelectorAll('.explore-model').forEach((host) => mountModel(host, host.dataset.modelUrl, false))
