import * as THREE from 'three';
import './style.css';

const app = document.getElementById('app');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x101216);

const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  100
);
camera.position.set(4.8, 4.8, 6.2);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
app.appendChild(renderer.domElement);

scene.add(new THREE.AmbientLight(0xffffff, 0.65));
const keyLight = new THREE.DirectionalLight(0xffffff, 1.1);
keyLight.position.set(7, 9, 6);
scene.add(keyLight);

const cubeGroup = new THREE.Group();
const spacing = 1.05;
const geometry = new THREE.BoxGeometry(0.92, 0.92, 0.92);
const palette = [0xfdfdfd, 0x2d6bff, 0x27b24e, 0xe23f3f, 0xff9130, 0xf7db3f];

for (let x = -1; x <= 1; x += 1) {
  for (let y = -1; y <= 1; y += 1) {
    for (let z = -1; z <= 1; z += 1) {
      const material = new THREE.MeshStandardMaterial({
        color: palette[(x + y + z + 12) % palette.length],
        metalness: 0.05,
        roughness: 0.35
      });
      const cubie = new THREE.Mesh(geometry, material);
      cubie.position.set(x * spacing, y * spacing, z * spacing);
      cubeGroup.add(cubie);
    }
  }
}

scene.add(cubeGroup);

function animate() {
  requestAnimationFrame(animate);
  cubeGroup.rotation.x += 0.005;
  cubeGroup.rotation.y += 0.008;
  renderer.render(scene, camera);
}
animate();

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
