// 🧱 BlockCraft Jr. by Jetski

let scene, camera, renderer;
let controlsLocked = false; // Custom state instead of PointerLock
let moveForward = false, moveBackward = false, moveLeft = false, moveRight = false;
let lookUp = false, lookDown = false, lookLeft = false, lookRight = false;
let canJump = false;
let prevTime = performance.now();
let velocity = new THREE.Vector3();
let direction = new THREE.Vector3();

// Voxel Map & Materials
const voxels = {}; // key: "x,y,z", value: Mesh
let currentBlockType = 'grass';
const blockSize = 2;
const gridSize = 12; // 12x12 world for performance

// Textures
const textures = {};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    setupTextures();
    init();
    animate();
});

function setupTextures() {
    // Generate procedural pixel textures using HTML canvas
    textures.grass = createVoxelTexture('#4ade80', '#22c55e'); // Green
    textures.wood = createVoxelTexture('#b45309', '#78350f');  // Brown
    textures.stone = createVoxelTexture('#94a3b8', '#64748b');  // Slate
    textures.leaves = createVoxelTexture('#15803d', '#166534'); // Dark green
    textures.water = createVoxelTexture('#3b82f6', '#1d4ed8');  // Blue
}

function createVoxelTexture(color1, color2) {
    const canvas = document.createElement('canvas');
    canvas.width = 16;
    canvas.height = 16;
    const ctx = canvas.getContext('2d');

    // Create a 4x4 pixelated feel
    for (let x = 0; x < 16; x += 4) {
        for (let y = 0; y < 16; y += 4) {
            ctx.fillStyle = Math.random() > 0.5 ? color1 : color2;
            ctx.fillRect(x, y, 4, 4);
        }
    }
    
    // Add border
    ctx.strokeStyle = 'rgba(0,0,0,0.1)';
    ctx.strokeRect(0, 0, 16, 16);

    const texture = new THREE.CanvasTexture(canvas);
    texture.magFilter = THREE.NearestFilter; // Sharp pixels!
    texture.minFilter = THREE.NearestFilter;
    return texture;
}

function init() {
    // 1. Scene & Camera
    scene = new THREE.Scene();
    scene.background = new THREE.Color('#7dd3fc'); // Sky blue
    scene.fog = new THREE.FogExp2('#7dd3fc', 0.02);

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 5, 0);

    // 2. Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(10, 20, 10);
    dirLight.castShadow = true;
    scene.add(dirLight);

    // 3. Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    document.getElementById('game-container').appendChild(renderer.domElement);

    // 4. Controls (Pointer Replacement)
    const startBtn = document.getElementById('start-btn');
    const overlay = document.getElementById('ui-overlay');

    startBtn.addEventListener('click', () => {
        controlsLocked = true;
        overlay.style.opacity = '0';
        setTimeout(() => overlay.style.display = 'none', 500);
    });

    // We can use Escape to go back to menu manually since PointerLock is gone
    document.addEventListener('keydown', (e) => {
        // Cmd+K (Meta+K on Mac)
        if ((e.metaKey || e.ctrlKey) && e.code === 'KeyK') {
            e.preventDefault();
            const cmdModal = document.getElementById('cmd-modal');
            const cmdInput = document.getElementById('cmd-input');
            
            if (cmdModal.style.display === 'none') {
                cmdModal.style.display = 'block';
                cmdInput.focus();
                controlsLocked = false; // Pause game
            } else {
                cmdModal.style.display = 'none';
                controlsLocked = true;
            }
            return;
        }

        if (e.code === 'Escape') {
            const cmdModal = document.getElementById('cmd-modal');
            if (cmdModal.style.display === 'block') {
                cmdModal.style.display = 'none';
                controlsLocked = true;
                return;
            }

            if (controlsLocked) {
                controlsLocked = false;
                overlay.style.display = 'flex';
                setTimeout(() => overlay.style.opacity = '1', 10);
            }
        }
    });

    // Handle Cmd Input submission
    const cmdInput = document.getElementById('cmd-input');
    cmdInput.addEventListener('keydown', (e) => {
        if (e.code === 'Enter') {
            const type = cmdInput.value.trim().toLowerCase();
            if (type) {
                spawnStructure(type); // Async call handles own lifecycle
                cmdInput.value = '';
                // Let spawnStructure close modal after completion
            }
        }
    });

    camera.rotation.order = 'YXZ'; // Important for FPS look!

    // 5. Input Listeners
    const onKeyDown = (e) => {
        if (!controlsLocked) return;
        switch (e.code) {
            case 'KeyW': moveForward = true; break;
            case 'KeyA': moveLeft = true; break;
            case 'KeyS': moveBackward = true; break;
            case 'KeyD': moveRight = true; break;
            case 'ArrowUp': lookUp = true; break;
            case 'ArrowDown': lookDown = true; break;
            case 'ArrowLeft': lookLeft = true; break;
            case 'ArrowRight': lookRight = true; break;
            case 'KeyE': // E for Jump
                if (canJump === true) velocity.y += 350;
                canJump = false;
                break;
            case 'Space': // Space for Place
                triggerAction('place');
                break;
            case 'Enter': // Enter for Break
                triggerAction('break');
                break;
        }
    };

    const onKeyUp = (e) => {
        switch (e.code) {
            case 'KeyW': moveForward = false; break;
            case 'KeyA': moveLeft = false; break;
            case 'KeyS': moveBackward = false; break;
            case 'KeyD': moveRight = false; break;
            case 'ArrowUp': lookUp = false; break;
            case 'ArrowDown': lookDown = false; break;
            case 'ArrowLeft': lookLeft = false; break;
            case 'ArrowRight': lookRight = false; break;
        }
    };

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);

    // Keeping mouse for debugging/testing but optional for user
    document.addEventListener('mousedown', (e) => {
        if (!controlsLocked) return;
        if (e.button === 0) triggerAction('break');
        if (e.button === 2) triggerAction('place');
    });

    // 6. UI Interaction
    const hotbarItems = document.querySelectorAll('.hotbar-item');
    hotbarItems.forEach(item => {
        item.addEventListener('click', () => {
            hotbarItems.forEach(i => i.classList.remove('active'));
            item.classList.add('active');
            currentBlockType = item.getAttribute('data-block');
        });
    });

    // 7. Base Generation
    generateHills();

    window.addEventListener('resize', onWindowResize);
}

function generateHills() {
    const geometry = new THREE.BoxGeometry(blockSize, blockSize, blockSize);

    // Create a 16x16 flat base with dirt
    for (let x = -gridSize; x <= gridSize; x++) {
        for (let z = -gridSize; z <= gridSize; z++) {
            // Base layer (Grass)
            createBlock(x, 0, z, 'grass', geometry);
            
            // Random trees
            if (Math.random() > 0.98 && Math.abs(x) > 2 && Math.abs(z) > 2) {
                createTree(x, 1, z, geometry);
            }
        }
    }
}

function createTree(x, y, z, geometry) {
    // Trunk
    for (let h = 0; h < 4; h++) {
        createBlock(x, y + h, z, 'wood', geometry);
    }
    // Leaves
    for (let lx = -1; lx <= 1; lx++) {
        for (let lz = -1; lz <= 1; lz++) {
            createBlock(x + lx, y + 4, z + lz, 'leaves', geometry);
            createBlock(x + lx, y + 3, z + lz, 'leaves', geometry);
        }
    }
    createBlock(x, y + 5, z, 'leaves', geometry);
}

function createBlock(x, y, z, type, geometry) {
    const key = `${x},${y},${z}`;
    if (voxels[key]) return; // Already exists

    const material = new THREE.MeshLambertMaterial({ map: textures[type] });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x * blockSize, y * blockSize, z * blockSize);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    
    // Store type in userData for raycasting
    mesh.userData = { type: type, grid: { x, y, z } };

    scene.add(mesh);
    voxels[key] = mesh;
}

function removeBlock(x, y, z) {
    const key = `${x},${y},${z}`;
    if (voxels[key] && y > 0) { // Don't allow breaking bedrock (y=0)
        scene.remove(voxels[key]);
        voxels[key].material.dispose(); // Cleanup
        delete voxels[key];
    }
}

async function spawnStructure(type) {
    const forward = new THREE.Vector3(0, 0, -10).applyAxisAngle(new THREE.Vector3(0, 1, 0), camera.rotation.y);
    const startPos = new THREE.Vector3().copy(camera.position).add(forward);
    startPos.y = 0; // Fix to ground

    const loadingEl = document.getElementById('cmd-loading');
    const modalEl = document.getElementById('cmd-modal');

    try {
        if (loadingEl) loadingEl.style.display = 'block';
        console.log(`🤖 Requesting dynamic build for: ${type}...`);
        
        const response = await fetch(`http://localhost:8007/api/build?prompt=${encodeURIComponent(type)}`);
        if (!response.ok) throw new Error("Backend unavailable");
        
        const blueprint = await response.json();
        if (blueprint && blueprint.length > 0) {
            const geometry = new THREE.BoxGeometry(blockSize, blockSize, blockSize);
            blueprint.forEach(b => {
                const px = Math.round(startPos.x) + (b.x || 0);
                const py = Math.round(startPos.y) + (b.y || 0);
                const pz = Math.round(startPos.z) + (b.z || 0);
                createBlock(px, py, pz, b.block, geometry);
            });
        }
    } catch (e) {
        console.error("❌ Failed to generate AI structures:", e);
    } finally {
        if (loadingEl) loadingEl.style.display = 'none';
        if (modalEl) modalEl.style.display = 'none';
        controlsLocked = true; // Turn movement back on
    }
}

function triggerAction(type) {
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera({ x: 0, y: 0 }, camera);

    const meshes = Object.values(voxels);
    const intersects = raycaster.intersectObjects(meshes);

    if (intersects.length > 0) {
        const intersect = intersects[0];
        const mesh = intersect.object;
        const grid = mesh.userData.grid;

        if (type === 'break') {
            removeBlock(grid.x, grid.y, grid.z);
        } else if (type === 'place') {
            const normal = intersect.face.normal;
            const px = grid.x + normal.x;
            const py = grid.y + normal.y;
            const pz = grid.z + normal.z;

            const geometry = new THREE.BoxGeometry(blockSize, blockSize, blockSize);
            createBlock(px, py, pz, currentBlockType, geometry);
        }
    }
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
    requestAnimationFrame(animate);

    if (controlsLocked) {
        const time = performance.now();
        const delta = (time - prevTime) / 1000;

        // --- Rotation (Look Around) ---
        const rotSpeed = 1.5 * delta;
        if (lookLeft) camera.rotation.y += rotSpeed;
        if (lookRight) camera.rotation.y -= rotSpeed;
        if (lookUp) camera.rotation.x += rotSpeed;
        if (lookDown) camera.rotation.x -= rotSpeed;

        // Clamp Pitch (Up/Down) to avoid flipping
        camera.rotation.x = Math.max(-Math.PI/2, Math.min(Math.PI/2, camera.rotation.x));

        // --- Movement ---
        // Friction/Damping
        velocity.x -= velocity.x * 10.0 * delta;
        velocity.z -= velocity.z * 10.0 * delta;
        velocity.y -= 9.8 * 100.0 * delta; // standard gravity

        // Forward/Right vectors relative to Camera Y-rotation
        const forward = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), camera.rotation.y);
        const right = new THREE.Vector3(1, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), camera.rotation.y);

        direction.set(0, 0, 0);
        if (moveForward) direction.add(forward);
        if (moveBackward) direction.sub(forward);
        if (moveLeft) direction.sub(right);
        if (moveRight) direction.add(right);
        
        if (direction.length() > 0) direction.normalize();

        if (moveForward || moveBackward || moveLeft || moveRight) {
            velocity.x += direction.x * 400.0 * delta;
            velocity.z += direction.z * 400.0 * delta;
        }

        camera.position.x += velocity.x * delta;
        camera.position.z += velocity.z * delta;
        camera.position.y += velocity.y * delta; // gravity

        if (camera.position.y < 5) { // Ground level offset
            velocity.y = 0;
            camera.position.y = 5;
            canJump = true;
        }

        prevTime = time;
    }

    renderer.render(scene, camera);
}
