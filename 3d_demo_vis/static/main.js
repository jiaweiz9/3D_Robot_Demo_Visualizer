// main.js
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { TransformControls } from 'three/addons/controls/TransformControls.js';
import GUI from 'https://cdn.jsdelivr.net/npm/lil-gui@0.19/+esm';
import { generateMockPointCloudSequence } from './mock_data.js'; 

// --- 1. Init Scene configs ---
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(80, window.innerWidth / window.innerHeight, 0.01, 100);
camera.up.set(0, 0, 1);
camera.position.set(0.3, 0.3, 0.4);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const axesHelper = new THREE.AxesHelper(0.5);
scene.add(axesHelper);

const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);
const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
directionalLight.position.set(10, 10, 10);
scene.add(directionalLight);

const orbitControls = new OrbitControls(camera, renderer.domElement);
orbitControls.enableDamping = true;

// --- 3. Initial Mock point cloud data to show ---
let T = 150;
let D = 5000;
let pointCloudSequence = generateMockPointCloudSequence(T, D); // use mock data for initial display

const geometry = new THREE.BufferGeometry();
const material = new THREE.PointsMaterial({
    size: 0.01,
    vertexColors: true,
    sizeAttenuation: true
});

const initialPositions = pointCloudSequence[0].filter((_, i) => i % 6 < 3);
const initialColors = pointCloudSequence[0].filter((_, i) => i % 6 >= 3);

geometry.setAttribute('position', new THREE.Float32BufferAttribute(initialPositions, 3));
geometry.setAttribute('color', new THREE.Float32BufferAttribute(initialColors, 3));

const pointCloud = new THREE.Points(geometry, material);
scene.add(pointCloud);

let episodeCount = 0;
let episodeId = 0;

let gui;
let currentFrameController; 
let currentFrame = 0;
let poseFolder;
const params = {
    isPlaying: false,
    playbackSpeed: 1.0,
    currentFrame: 0,
    pointSize: 0.01,
    totalFrames: T,
    annotationMode: false,
    pose: {
        x: 0, y: 0, z: 0,
        rx: 0, ry: 0, rz: 0
    }
};


function createGUI() {
    
    if (gui) gui.destroy(); 
    
    gui = new GUI();
    gui.add(params, 'isPlaying').name('Play/Pause');
    gui.add(params, 'playbackSpeed', 0.1, 3.0).name('Play Speed');
    currentFrameController = gui.add(params, 'currentFrame', 0, T - 1, 1).name('Current Frame').onChange((value) => {
        currentFrame = Math.floor(value);
        updatePointCloudFrame(currentFrame);
    });
    gui.add(params, 'pointSize', 0.005, 0.03).name('Point Size').onChange((value) => {
        material.size = value;
    });
    gui.add(params, 'totalFrames').name('Total Frame').listen();
    gui.add(params, 'annotationMode').name('Annotation Mode').onChange(value => {
        transformControls.visible = value;
        // transformControls.space
        // gizmo.visible = value;
        transformControls.enabled = value;
        // Once entering Annotation Mode，prohibit OrbitControls to avoid conflicts
        // orbitControls.enabled = !value;
    });
    
    poseFolder = gui.addFolder('Gizmo 6D Pose');
    poseFolder.add(params.pose, 'x').listen().disable();
    poseFolder.add(params.pose, 'y').listen().disable();
    poseFolder.add(params.pose, 'z').listen().disable();
    poseFolder.add(params.pose, 'rx').listen().disable();
    poseFolder.add(params.pose, 'ry').listen().disable();
    poseFolder.add(params.pose, 'rz').listen().disable();
    poseFolder.open();
    
    return params;
}

createGUI();


function updatePointCloudData(newData) {
    // newData shape: (300, 1024, 6) -> (300, 1024 * 6)
    pointCloudSequence = newData;
    T = newData.length; 
    D = newData[0].length / 6;
    
    params.isPlaying = false;
    params.currentFrame = 0;
    params.totalFrames = T;
    currentFrame = 0;
    
    updatePointCloudFrame(0);
    
    if (gui) {
        gui.destroy();
        createGUI();
    }
    
    console.log(`Loaded Point Cloud Data has ${T} Frames; ${D} Points Per Frame`);
}

function updatePointCloudFrame(frameIndex) {
    if (!pointCloudSequence || frameIndex >= pointCloudSequence.length) return;
    
    const frameData = pointCloudSequence[frameIndex];
    const positions = new Float32Array(D * 3);
    const colors = new Float32Array(D * 3);

    for(let i = 0; i < D; i++) {
        positions[i * 3] = frameData[i * 6];
        positions[i * 3 + 1] = frameData[i * 6 + 1];
        positions[i * 3 + 2] = frameData[i * 6 + 2];
        colors[i * 3] = frameData[i * 6 + 3];
        colors[i * 3 + 1] = frameData[i * 6 + 4];
        colors[i * 3 + 2] = frameData[i * 6 + 5];
    }
    
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geometry.attributes.position.needsUpdate = true;
    geometry.attributes.color.needsUpdate = true;
}

async function loadZarrData(filePath, statusElement) {
    if (!filePath.trim()) {
        statusElement.textContent = 'Please input valid zarr/H5 file path';
        statusElement.style.color = 'red';
        return null;
    }

    statusElement.textContent = 'Loading...';
    statusElement.style.color = 'yellow';

    try {
        const response = await fetch('/load_zarr', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
                path: filePath,
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error: ${response.status}`);
        }

        const data = await response.json();
        
        if (data.success) {
            statusElement.textContent = `Successfully Loaded ${data.episode_count} Episodes`;
            statusElement.style.color = 'green';
            return data;
        } else {
            throw new Error(data.error || 'Loading failed');
        }
    } catch (error) {
        console.error('Loading failed:', error);
        statusElement.textContent = `Loading failed: ${error.message}`;
        statusElement.style.color = 'red';
        return null;
    }
}

async function showEpisodeData(episodeId, statusElement) {
    if (!Number.isInteger(episodeId) || episodeId >= episodeCount || episodeId < 0) {
        console.error('Invalid episode ID');
        statusElement.textContent = 'Invalid episode ID';
        statusElement.style.color = 'red';
        return;
    }

    statusElement.textContent = `Loading episode ${episodeId}...`;
    statusElement.style.color = 'yellow';

    try {
        const response = await fetch(`/show_episode`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
                episode_id: episodeId,
            })
        });
        if (!response.ok) {
            throw new Error(`HTTP error: ${response.status}`);
        }
        const data = await response.json();
        if (data.success) {
            updatePointCloudData(data.episode_data);
            statusElement.textContent = `Successfully Loaded Episode ${episodeId}`;
            statusElement.style.color = 'green';
        } else {
            throw new Error(data.error || 'Loading failed');
        }
    } catch (error) {
        console.error('Loading episode failed:', error);
        statusElement.textContent = `Loading episode failed: ${error.message}`;
        statusElement.style.color = 'red';
    }
}

function createFilePathInput() {
    const inputContainer = document.createElement('div');
    inputContainer.style.position = 'absolute';
    inputContainer.style.top = '20px';
    inputContainer.style.left = '20px';
    inputContainer.style.zIndex = '1000';
    inputContainer.style.backgroundColor = 'rgba(0, 0, 0, 0)';
    inputContainer.style.padding = '15px';
    inputContainer.style.borderRadius = '8px';
    inputContainer.style.color = 'rgb(255, 255, 255)';
    inputContainer.style.fontFamily = 'Arial, sans-serif';

    const label = document.createElement('label');
    label.textContent = 'zarr/H5 file path: ';
    label.style.display = 'block';
    label.style.marginBottom = '5px';

    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = '/path/to/your/zarr/file';
    input.style.width = '200px';
    input.style.padding = '4px';
    input.style.marginRight = '5px';
    input.style.borderRadius = '4px';
    input.style.border = 'none';

    const loadButton = document.createElement('button');
    loadButton.textContent = 'Load';
    loadButton.style.padding = '4px 7px';
    loadButton.style.backgroundColor = 'rgba(124, 124, 124, 0.5)';
    loadButton.style.color = 'white';
    loadButton.style.border = 'none';
    loadButton.style.borderRadius = '4px';
    loadButton.style.cursor = 'pointer';

    const loadStatusDiv = document.createElement('div');
    loadStatusDiv.style.marginTop = '7px';
    loadStatusDiv.style.fontSize = '14px';
    loadStatusDiv.id = 'loadStatus';

    const episodeContainer = document.createElement('div');
    episodeContainer.style.marginTop = '10px';
    
    const episodeLabel = document.createElement('label');
    episodeLabel.textContent = 'Episode ID: ';
    episodeLabel.style.marginRight = '5px';

    const episodeInput = document.createElement('input');
    episodeInput.type = 'number';
    episodeInput.min = '0';
    episodeInput.max = '0';
    episodeInput.value = '0';
    episodeInput.style.width = '60px';
    episodeInput.style.padding = '4px';
    episodeInput.style.marginRight = '5px';
    episodeInput.style.borderRadius = '4px';
    episodeInput.style.border = 'none';

    const prevButton = document.createElement('button');
    prevButton.textContent = 'Prev';
    prevButton.style.padding = '4px 7px';
    prevButton.style.backgroundColor = 'rgba(124, 124, 124, 0.5)';
    prevButton.style.color = 'white';
    prevButton.style.border = 'none';
    prevButton.style.borderRadius = '4px';
    prevButton.style.cursor = 'pointer';
    prevButton.style.marginRight = '5px';

    const nextButton = document.createElement('button');
    nextButton.textContent = 'Next';
    nextButton.style.padding = '4px 7px';
    nextButton.style.backgroundColor = 'rgba(124, 124, 124, 0.5)';
    nextButton.style.color = 'white';
    nextButton.style.border = 'none';
    nextButton.style.borderRadius = '4px';
    nextButton.style.cursor = 'pointer';

    const showStatusDiv = document.createElement('div');
    showStatusDiv.style.marginTop = '7px';
    showStatusDiv.style.fontSize = '14px';
    showStatusDiv.id = 'loadStatus';

    const updateEpisodeId = (newId) => {
        episodeId = parseInt(newId);
        if (episodeId < 0) episodeId = 0;
        if (episodeId >= episodeCount) episodeId = episodeCount - 1;
        episodeInput.value = episodeId;
        showEpisodeData(episodeId, showStatusDiv);
    };

    episodeInput.addEventListener('change', () => {
        updateEpisodeId(episodeInput.value);
    });

    prevButton.addEventListener('click', () => {
        updateEpisodeId(episodeId - 1);
    });

    nextButton.addEventListener('click', () => {
        updateEpisodeId(episodeId + 1);
    });

    loadButton.addEventListener('click', async () => {
        const response = await loadZarrData(input.value, loadStatusDiv);
        if (response && response.success) {
            episodeCount = response.episode_count;
            episodeInput.max = episodeCount - 1;
            episodeId = 0;
            episodeInput.value = 0;
            await showEpisodeData(episodeId, showStatusDiv);
        }
    });

    episodeContainer.appendChild(episodeLabel);
    episodeContainer.appendChild(episodeInput);
    episodeContainer.appendChild(prevButton);
    episodeContainer.appendChild(nextButton);
    
    inputContainer.appendChild(label);
    inputContainer.appendChild(input);
    inputContainer.appendChild(loadButton);
    inputContainer.appendChild(loadStatusDiv);
    inputContainer.appendChild(episodeContainer);
    inputContainer.appendChild(showStatusDiv);
    
    document.body.appendChild(inputContainer);
}

createFilePathInput();

// --- 5. Annotate Gizmo ---
const gizmoTarget = new THREE.Object3D();
scene.add(gizmoTarget);

const transformControls = new TransformControls(camera, renderer.domElement);
transformControls.attach(gizmoTarget);
transformControls.setSize(0.5);
scene.add(transformControls);

transformControls.visible = false;
transformControls.enabled = false;
transformControls.setSpace('local'); // local frame to show rotation visualization


window.addEventListener('keydown', (event) => {
    if (!params['annotationMode']) return; 

    switch (event.key.toLowerCase()) {
        case 't':
            transformControls.setMode('translate');
            break;
        case 'r':
            transformControls.setMode('rotate');
            break;
    }
});

// --- 6. Record Gizmo pose ---


transformControls.addEventListener('change', () => {
    // Update position
    params.pose.x = parseFloat(gizmoTarget.position.x.toFixed(3));
    params.pose.y = parseFloat(gizmoTarget.position.y.toFixed(3));
    params.pose.z = parseFloat(gizmoTarget.position.z.toFixed(3));

    // Update rotation
    const euler = new THREE.Euler().setFromQuaternion(gizmoTarget.quaternion);
    params.pose.rx = parseFloat(euler.x.toFixed(3));
    params.pose.ry = parseFloat(euler.y.toFixed(3));
    params.pose.rz = parseFloat(euler.z.toFixed(3));

    // console.log("Pose Updated:", params.pose);
});

// // When transformControls is active, disable orbitControls
transformControls.addEventListener('dragging-changed', (event) => {
    orbitControls.enabled = !event.value;
});


const clock = new THREE.Clock();
const fps = 30;
const frameDuration = 1 / fps;
let timeAccumulator = 0;

// --- 7. Animation loop ---
function animate() {
    requestAnimationFrame(animate);

    const deltaTime = clock.getDelta();
    
    // Control camera only in non-annotation mode
    if (orbitControls.enabled) {
        orbitControls.update();
    }
    
    if (params.isPlaying) {
        timeAccumulator += deltaTime * params.playbackSpeed;
        if (timeAccumulator >= frameDuration) {
            timeAccumulator = 0;
            
            currentFrame = (currentFrame + 1) % T;
            updatePointCloudFrame(currentFrame)
            
            params.currentFrame = currentFrame;
            currentFrameController.updateDisplay();
        }
    }
    renderer.render(scene, camera);
}


window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

animate();