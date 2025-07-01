// main.js
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { TransformControls } from 'three/addons/controls/TransformControls.js';
import GUI from 'https://cdn.jsdelivr.net/npm/lil-gui@0.19/+esm';

// --- 1. 基本场景设置 ---
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(5, 5, 5);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// 辅助坐标轴 (场景)
const axesHelper = new THREE.AxesHelper(5);
scene.add(axesHelper);

// 光照
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);
const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
directionalLight.position.set(10, 10, 10);
scene.add(directionalLight);

// --- 2. 相机控制器 ---
const orbitControls = new OrbitControls(camera, renderer.domElement);
orbitControls.enableDamping = true;

// --- 3. 模拟点云数据 ---
const T = 150; // 总帧数
const D = 5000; // 每帧点数

// 创建一个函数来生成所有帧的数据
function generatePointCloudSequence(numFrames, numPoints) {
    const sequence = [];
    for (let t = 0; t < numFrames; t++) {
        const frameData = new Float32Array(numPoints * 6); // x,y,z,r,g,b
        const phase = (t / numFrames) * Math.PI * 2; // 用相位来模拟动画

        for (let i = 0; i < numPoints; i++) {
            const stride = i * 6;
            
            // 模拟一个随时间变化的形状，例如一个波动的球体
            const u = Math.random();
            const v = Math.random();
            const theta = 2 * Math.PI * u;
            const phi = Math.acos(2 * v - 1);
            
            let r = 2.5 + 0.5 * Math.sin(phi * 5 + phase);

            frameData[stride] = r * Math.sin(phi) * Math.cos(theta); // x
            frameData[stride + 1] = r * Math.sin(phi) * Math.sin(theta); // y
            frameData[stride + 2] = r * Math.cos(phi); // z

            // 颜色也随位置和时间变化
            frameData[stride + 3] = 0.5 + 0.5 * Math.sin(phase); // r
            frameData[stride + 4] = Math.abs(frameData[stride + 1] / 3); // g
            frameData[stride + 5] = Math.abs(frameData[stride + 2] / 3); // b
        }
        sequence.push(frameData);
    }
    return sequence;
}

const pointCloudSequence = generatePointCloudSequence(T, D);

// 创建点云几何体和材质
const geometry = new THREE.BufferGeometry();
const material = new THREE.PointsMaterial({
    size: 0.1,
    vertexColors: true, // 关键：告诉材质使用顶点颜色
    sizeAttenuation: true
});

// 初始化时加载第一帧数据
const initialPositions = pointCloudSequence[0].filter((_, i) => i % 6 < 3);
const initialColors = pointCloudSequence[0].filter((_, i) => i % 6 >= 3);

geometry.setAttribute('position', new THREE.Float32BufferAttribute(initialPositions, 3));
geometry.setAttribute('color', new THREE.Float32BufferAttribute(initialColors, 3));

const points = new THREE.Points(geometry, material);
scene.add(points);


// --- 4. 动画和GUI控制 ---
const params = {
    isPlaying: false,
    'Annotation Mode': false,
    pose: {
        x: 0, y: 0, z: 0,
        rx: 0, ry: 0, rz: 0
    }
};

let currentFrame = 0;
const clock = new THREE.Clock();
const fps = 30;
const frameDuration = 1 / fps;
let timeAccumulator = 0;

const gui = new GUI();
gui.add(params, 'isPlaying').name('Play/Pause');

// --- 5. 标注控制器 (Gizmo) ---
// 创建一个TransformControls将要附着和控制的目标
const gizmoTarget = new THREE.Object3D();
scene.add(gizmoTarget);

// 初始化TransformControls
const transformControls = new TransformControls(camera, renderer.domElement);
transformControls.attach(gizmoTarget);
transformControls.setSize(0.8);
scene.add(transformControls);
// const gizmo = transformControls.getHelper();
// scene.add( gizmo );

// 默认隐藏
transformControls.visible = false;
transformControls.enabled = false;
transformControls.setSpace('local'); // 使用局部空间

// 通过GUI控制标注模式的开启/关闭
gui.add(params, 'Annotation Mode').onChange(value => {
    transformControls.visible = value;
    // transformControls.space
    // gizmo.visible = value;
    transformControls.enabled = value;
    // 进入标注模式时，禁用OrbitControls，防止冲突
    orbitControls.enabled = !value;
});

// 监听键盘事件，切换平移/旋转模式
window.addEventListener('keydown', (event) => {
    if (!params['Annotation Mode']) return; // 仅在标注模式下生效

    switch (event.key.toLowerCase()) {
        case 't':
            transformControls.setMode('translate');
            break;
        case 'r':
            transformControls.setMode('rotate');
            break;
    }
});

// --- 6. 实时记录位姿 ---
const poseFolder = gui.addFolder('Gizmo 6D Pose');
poseFolder.add(params.pose, 'x').listen().disable();
poseFolder.add(params.pose, 'y').listen().disable();
poseFolder.add(params.pose, 'z').listen().disable();
poseFolder.add(params.pose, 'rx').listen().disable();
poseFolder.add(params.pose, 'ry').listen().disable();
poseFolder.add(params.pose, 'rz').listen().disable();
poseFolder.open();

transformControls.addEventListener('change', () => {
    // 更新位置
    params.pose.x = parseFloat(gizmoTarget.position.x.toFixed(3));
    params.pose.y = parseFloat(gizmoTarget.position.y.toFixed(3));
    params.pose.z = parseFloat(gizmoTarget.position.z.toFixed(3));

    // 更新旋转 (欧拉角)
    const euler = new THREE.Euler().setFromQuaternion(gizmoTarget.quaternion);
    params.pose.rx = parseFloat(euler.x.toFixed(3));
    params.pose.ry = parseFloat(euler.y.toFixed(3));
    params.pose.rz = parseFloat(euler.z.toFixed(3));

    // 你可以在这里将 params.pose 发送到服务器或存储在本地
    // console.log("Pose Updated:", params.pose);
});

// 当拖拽TransformControls时，禁用OrbitControls
transformControls.addEventListener('dragging-changed', (event) => {
    orbitControls.enabled = !event.value;
});


// --- 7. 动画循环 ---
function animate() {
    requestAnimationFrame(animate);

    const deltaTime = clock.getDelta();
    
    // 只有在非标注模式下才更新相机控制器
    if (orbitControls.enabled) {
        orbitControls.update();
    }
    
    // 更新点云动画
    if (params.isPlaying) {
        timeAccumulator += deltaTime;
        if (timeAccumulator >= frameDuration) {
            timeAccumulator -= frameDuration;
            
            currentFrame = (currentFrame + 1) % T;
            
            const frameData = pointCloudSequence[currentFrame];
            const positions = new Float32Array(D * 3);
            const colors = new Float32Array(D * 3);

            for(let i=0; i < D; i++) {
                positions[i * 3] = frameData[i * 6];
                positions[i * 3 + 1] = frameData[i * 6 + 1];
                positions[i * 3 + 2] = frameData[i * 6 + 2];
                colors[i * 3] = frameData[i * 6 + 3];
                colors[i * 3 + 1] = frameData[i * 6 + 4];
                colors[i * 3 + 2] = frameData[i * 6 + 5];
            }
            
            // 更新BufferGeometry的属性
            geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
            geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
            geometry.attributes.position.needsUpdate = true; // 关键：通知Three.js更新数据
            geometry.attributes.color.needsUpdate = true;
        }
    }

    renderer.render(scene, camera);
}


// --- 8. 窗口自适应 ---
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// 启动动画
animate();