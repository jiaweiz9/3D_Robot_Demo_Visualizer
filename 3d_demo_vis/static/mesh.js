// main.js
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { TransformControls } from 'three/addons/controls/TransformControls.js';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import { MTLLoader } from 'three/addons/loaders/MTLLoader.js';
import GUI from 'https://cdn.jsdelivr.net/npm/lil-gui@0.19/+esm';
import { saveCurrentGizmoPose } from './utils.js';

// --- 1. Init Scene configs ---
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(80, window.innerWidth / window.innerHeight, 0.01, 100);
camera.up.set(0, 1, 0);
camera.position.set(0.3, 0.3, 0.4);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const axesHelper = new THREE.AxesHelper(0.5);
scene.add(axesHelper);

const ambientLight = new THREE.AmbientLight(0xffffff, 2.0);
scene.add(ambientLight);
const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
directionalLight.position.set(10, 10, 10);
scene.add(directionalLight);

const orbitControls = new OrbitControls(camera, renderer.domElement);
orbitControls.enableDamping = true;

const objLoader = new OBJLoader();
const mtlLoader = new MTLLoader();


let gui;
let poseFolder;
const params = {
    annotationMode: false,
    pose: {
        x: 0, y: 0, z: 0,
        qx: 0, qy: 0, qz: 0, qw: 1
    }
};

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
        case 'c':
            saveCurrentGizmoPose(params.pose, -1).then(success => {
                if (success) {
                    console.log(`Pose saved: ${params.pose.x}, ${params.pose.y}, ${params.pose.z}, ${params.pose.qx}, ${params.pose.qy}, ${params.pose.qz}, ${params.pose.qw}`);
                } else {
                    console.error('Failed to save pose');
                }
            });
        break;
    }
});
transformControls.addEventListener('change', () => {
    // Update position
    params.pose.x = parseFloat(gizmoTarget.position.x.toFixed(3));
    params.pose.y = parseFloat(gizmoTarget.position.y.toFixed(3));
    params.pose.z = parseFloat(gizmoTarget.position.z.toFixed(3));

    // Update rotation as quaternion
    params.pose.qx = parseFloat(gizmoTarget.quaternion.x.toFixed(3));
    params.pose.qy = parseFloat(gizmoTarget.quaternion.y.toFixed(3));
    params.pose.qz = parseFloat(gizmoTarget.quaternion.z.toFixed(3));
    params.pose.qw = parseFloat(gizmoTarget.quaternion.w.toFixed(3));

    // console.log("Pose Updated:", params.pose);
});

// // When transformControls is active, disable orbitControls
transformControls.addEventListener('dragging-changed', (event) => {
    orbitControls.enabled = !event.value;
});

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});


function createGUI() {
    if (gui) gui.destroy(); 
    gui = new GUI();
    gui.add(params, 'annotationMode').name('Annotation Mode').onChange(value => {
        transformControls.visible = value;
        transformControls.enabled = value;
    });
    poseFolder = gui.addFolder('Gizmo 6D Pose');
    poseFolder.add(params.pose, 'x').listen().disable();
    poseFolder.add(params.pose, 'y').listen().disable();
    poseFolder.add(params.pose, 'z').listen().disable();
    poseFolder.add(params.pose, 'qx').listen().disable();
    poseFolder.add(params.pose, 'qy').listen().disable();
    poseFolder.add(params.pose, 'qz').listen().disable();
    poseFolder.add(params.pose, 'qw').listen().disable();
    poseFolder.open();
}

createGUI();

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
    label.textContent = 'Mesh file (.obj) path: ';
    label.style.display = 'block';
    label.style.marginBottom = '5px';

    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = '/path/to/your/.obj/file';
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

    loadButton.addEventListener('click', async () => {
        await loadObjFile(input.value, loadStatusDiv);
    });
    
    inputContainer.appendChild(label);
    inputContainer.appendChild(input);
    inputContainer.appendChild(loadButton);
    inputContainer.appendChild(loadStatusDiv);

    document.body.appendChild(inputContainer);
}

createFilePathInput();
let loadedObject = null;
let loadedMaterial = null;

/**
 * Fetch from any path in server, store the file in Blob URL
 * @param {string} filePath 
 * @returns {Promise<string>} 
 */
async function fetchFileAsBlobURL(filePath) {
    const response = await fetch('/load_mesh', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ file_path: filePath }),
    });

    const contentType = response.headers.get('content-type');

    if (!response.ok) {
        if (contentType && contentType.includes('application/json')) {
            const errorData = await response.json();
            throw new Error(`Server error: ${errorData.error || response.statusText}`);
        } else {
            throw new Error(`Server error: ${response.statusText}`);
        }
    }
    if (contentType && contentType.includes('application/json')) {
        const jsonData = await response.json();
        if (jsonData.success === false) {
            throw new Error(`Server error: ${jsonData.error || 'Unknown error'}`);
        }
        throw new Error('Unexpected JSON response when expecting file');
    }

    const blob = await response.blob();
    return URL.createObjectURL(blob);
}


async function loadObjFile(filePath, statusElement) {
    if (!filePath.trim()) {
        statusElement.textContent = 'Please input valid .obj file path';
        statusElement.style.color = 'red';
        return null;
    }
    statusElement.textContent = 'Loading...';
    statusElement.style.color = 'yellow';
    if (loadedObject) {
        disposeObject(loadedObject);
        loadedObject = null;
    }
    console.log(loadedMaterial)
    // if (loadedMaterial) {
    //     disposeMaterial(loadedMaterial);
    //     loadedMaterial = null;
    // }
    const fileDir = filePath.substring(0, filePath.lastIndexOf('/'));
    const mtlFilePath = fileDir + '/material.mtl';
    console.log('MTL file path:', mtlFilePath);

    // Load MTL file if exists
    try {
        const mtlBlobURL = await fetchFileAsBlobURL(mtlFilePath);
        loadedMaterial = await new Promise((resolve, reject) => {
            mtlLoader.load(mtlBlobURL, (materials) => {
                materials.preload();
                resolve(materials);
            }, undefined, (error) => {
                console.error('Failed to load MTL file:', error);
                reject(new Error(`Failed to load MTL file: ${error.message}`));
            });
        });
        console.log('Material loaded:', loadedMaterial);
        objLoader.setMaterials(loadedMaterial);
    } catch (error) {
        console.warn('No MTL file found or failed to load:', error);
        loadedMaterial = null; // No material loaded
    }

    // Load OBJ file
    try {
        const objBlobURL = await fetchFileAsBlobURL(filePath);
        loadedObject = await new Promise((resolve, reject) => {
            objLoader.load(objBlobURL, (object) => {
                object.traverse((child) => {
                    if (child instanceof THREE.Mesh) {
                        child.castShadow = true;
                        child.receiveShadow = true;
                    }
                });
                scene.add(object);
                resolve(object);
            }, undefined, (error) => {
                console.error('Failed to load OBJ file:', error);
                reject(new Error(`Failed to load OBJ file: ${error.message}`));
            });
        });
    }
    catch (error) {
        console.error('Loading failed:', error);
        statusElement.textContent = `Loading failed: ${error.message}`;
        statusElement.style.color = 'red';
        loadedObject = null;
        return null;
    }
        
    statusElement.textContent = 'Loaded';
    statusElement.style.color = 'green';
}

function disposeObject(object) {
    if (!object) {
        return;
    }
    scene.remove(object);
    console.log('Object removed from the scene.');

    object.traverse((child) => {
        if (child instanceof THREE.Mesh) {
            if (child.geometry) {
                child.geometry.dispose();
                console.log('Disposed geometry for', child.name || 'unnamed mesh');
            }

            if (child.material) {
                if (Array.isArray(child.material)) {
                    child.material.forEach(material => disposeMaterial(material));
                } else {
                    disposeMaterial(child.material);
                }
            }
        }
    });
    console.log('Resources disposed.');
}

function disposeMaterial(material) {
    material.dispose();
    console.log('Disposed material:', material.name);

    for (const key of Object.keys(material)) {
        const value = material[key];
        if (value instanceof THREE.Texture && typeof value.dispose === 'function') {
            value.dispose();
            console.log('Disposed texture:', key);
        }
    }
}

// --- 7. Animation loop ---
function animate() {
    requestAnimationFrame(animate);

    // Control camera only in non-annotation mode
    if (orbitControls.enabled) {
        orbitControls.update();
    }
    
    renderer.render(scene, camera);
}
animate();