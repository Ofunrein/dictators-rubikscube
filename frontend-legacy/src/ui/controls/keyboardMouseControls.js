import * as THREE from 'three';

/**
 * Translate a selected sticker and arrow key into a cube move.
 * 
 * @param {string} face
 * @param {string} arrowKey
 * @param {number} row
 * @param {number} col
 * @param {THREE.PerspectiveCamera} camera
 * @returns {string|null}
 */
function getMove(face, arrowKey, row, col, camera) {
    const hardCodedMap = {
        F: {
            ArrowUp:    ["L'", "M'", "R"][col],
            ArrowDown:  ["L", "M", "R'"][col],
            ArrowLeft:  ["U", "E'", "D'"][row],
            ArrowRight: ["U'", "E", "D"][row],
        },
        B : {
            ArrowUp:    ["R'", "M", "L"][col],
            ArrowDown:  ["R", "M'", "L'"][col],
            ArrowLeft:  ["U", "E'", "D'"][row],
            ArrowRight: ["U'", "E", "D"][row],
        },
        R: {
            ArrowUp:    ["F'", "S'", "B"][col],
            ArrowDown:  ["F", "S", "B'"][col],
            ArrowLeft:  ["U", "E'", "D'"][row],
            ArrowRight: ["U'", "E", "D"][row],
        },
        L: {
            ArrowUp:    ["B'", "S", "F"][col],
            ArrowDown:  ["B", "S'", "F'"][col],
            ArrowLeft:  ["U", "E'", "D'"][row],
            ArrowRight: ["U'", "E", "D"][row],
        },
    };

    if (hardCodedMap[face]) {
        const move = hardCodedMap[face][arrowKey];
        return move !== undefined ? move : null;
    }

    if (face === 'U' || face === 'D') {
        return getCameraRelativeMove(face, arrowKey, row, col, camera);
    }
    
    return null;
}

/**
 * For U/D face selection, determine move based on camera orientation to maintain intuitive controls.
 * 
 * @param {string} face
 * @param {string} arrowKey
 * @param {number} row
 * @param {number} col
 * @param {THREE.PerspectiveCamera} camera
 * @returns {string|null}
 */
function getCameraRelativeMove(face, arrowKey, row, col, camera) {
    const cameraPosition = camera.position;
    const angle = Math.atan2(cameraPosition.x, cameraPosition.z);

    let frontFace;
    if      (angle > -0.785 && angle <=  0.785) frontFace = 'F'; // -π/4 to π/4
    else if (angle >  0.785 && angle <=  2.356) frontFace = 'R'; // π/4 to 3π/4
    else if (angle > -2.356 && angle <= -0.785) frontFace = 'L'; // -3π/4 to -π/4
    else                                        frontFace = 'B'; // everything else

    if (frontFace === 'R' || frontFace === 'L') {
        const temp = row;
        row = col;
        col = temp;
    }
    

    console.log(`[mkb] camera angle:${angle.toFixed(2)} frontFace:${frontFace}`);
    
    const moveMap = {
        U: {
            F: {
                ArrowUp:    ["L'", "M'", "R"][col],
                ArrowDown:  ["L", "M", "R'"][col],
                ArrowRight: ["F", "S", "B'"][row],
                ArrowLeft:  ["F'", "S'", "B"][row],
            },
            R: {
                ArrowUp:    ["F'", "S'", "B"][col],
                ArrowDown:  ["F", "S", "B'"][col],
                ArrowRight: ["L'", "M'", "R"][row],
                ArrowLeft:  ["L", "M", "R'"][row],
            },
            B: {
                ArrowUp:    ["L", "M", "R'"][col],
                ArrowDown:  ["L'", "M'", "R"][col],
                ArrowRight: ["F'", "S'", "B"][row],
                ArrowLeft:  ["F", "S", "B'"][row],
            },
            L: {
                ArrowUp:    ["F", "S", "B'"][col],
                ArrowDown:  ["F'", "S'", "B"][col],
                ArrowRight: ["L", "M", "R'"][row],
                ArrowLeft:  ["L'", "M'", "R"][row],
            },
        },
        D: {
            F: {
                ArrowUp:    ["L'", "M'", "R"][col],
                ArrowDown:  ["L", "M", "R'"][col],
                ArrowRight: ["B", "S'", "F'"][row],
                ArrowLeft:  ["B'", "S", "F"][row],
            },
            R: {
                ArrowUp:    ["B", "S'", "F'"][col],
                ArrowDown:  ["B'", "S", "F"][col],
                ArrowRight: ["L", "M", "R'"][row],
                ArrowLeft:  ["L'", "M'", "R"][row],
            },
            B: {
                ArrowUp:    ["L", "M", "R'"][col],
                ArrowDown:  ["L'", "M'", "R"][col],
                ArrowRight: ["B'", "S", "F"][row],
                ArrowLeft:  ["B", "S'", "F'"][row],
            },
            L: {
                ArrowUp:    ["B'", "S", "F"][col],
                ArrowDown:  ["B", "S'", "F'"][col],
                ArrowRight: ["L'", "M'", "R"][row],
                ArrowLeft:  ["L", "M", "R'"][row],
            },
        }
    };
    return moveMap[face]?.[frontFace]?.[arrowKey] ?? null;
}

/**
 * Initiliaze mouse (select) and keyboard (move) controls
 * 
 * @param {object} cubeState - Passed to dispatchMove
 * @param {function} dispatchMove - Central handler from controls.js
 */

export function initKeyboardMouseControls(cubeState, dispatchMove, camera, domElement, stickerMap, scene) {
    console.log('[keyboardMouseControls] initKeyboardMouseControls called');

    let selectedFace = null;
    let selectedIndex = null;
    let selectedMesh = null;

    // Creates higlight mesh over selected sticker - starts invisible until selection
    const highlightGeo = new THREE.PlaneGeometry(0.85, 0.85);
    const highlightMat = new THREE.MeshBasicMaterial({
        color: 0xff69b4,
        transparent: true,
        opacity: 0.5,
        side: THREE.FrontSide,
        depthTest: false,
    });
    const highlightMesh = new THREE.Mesh(highlightGeo, highlightMat);
    highlightMesh.visible = false;
    scene.add(highlightMesh);

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    
    function getAllStickers() {
        // Flattens stickerMap to a single array of meshes for raycasting
        return Object.values(stickerMap).flat();
    }

    function findMeshLocation(mesh) {
        for (const [face, meshes] of Object.entries(stickerMap)) {
            const index = meshes.indexOf(mesh);
            if (index !== -1) return {face, index};
        }
        return null;
    }

    function clearSelection() {
        highlightMesh.visible = false;
        selectedFace = null;
        selectedIndex = null;
        selectedMesh = null;
    }

    function handleClick(event) {
        // Convert mouse click to normalized device coordinates for raycasting (Three.js expects NDC)
        const rect = event.target.getBoundingClientRect();
        mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        raycaster.setFromCamera(mouse, camera);
        const hits = raycaster.intersectObjects(getAllStickers(), false);

        if (hits.length === 0) {
            clearSelection();
            return;
        }

        // Hits sorted by distant so [0] is always frontmost sticker under cursor
        const hit = hits[0].object;
        const location = findMeshLocation(hit);
        if (!location) {
            clearSelection();
            return;
        }

        clearSelection();
        selectedMesh = hit;
        selectedFace = location.face;
        selectedIndex = location.index;

        // Sync highlight position and orientation.
        // Since sticker might be a child of rotating group, matrixWorld gives final real-world
        // transform after al parent transformations are complete.
        hit.updateWorldMatrix(true, false);
        highlightMesh.position.setFromMatrixPosition(hit.matrixWorld);
        highlightMesh.quaternion.setFromRotationMatrix(hit.matrixWorld);

        // Nudge highlight outward along sticker for visibility
        const normal = new THREE.Vector3(0, 0, 1).applyQuaternion(highlightMesh.quaternion);
        highlightMesh.position.addScaledVector(normal, 0.01);
        highlightMesh.visible = true;

        console.log(`[keyboardMouseControls] Selected sticker at face ${selectedFace}, index ${selectedIndex}`);
    }

    function handleKeydown(event) {
        if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) return;
        if (!selectedFace) return;
        event.preventDefault(); // prevents arrow keys from scrolling the page

        // stickerMap stores each face as flat 9-element array so int division gives row and modulo gives column
        const row = Math.floor(selectedIndex / 3);
        const col = selectedIndex % 3;
        console.log(`[mkb] face:${selectedFace} index:${selectedIndex} row:${row} col:${col}`);

        const move = getMove(selectedFace, event.key, row, col, camera);

        if(!move) {
            console.warn(`[keyboardMouseControls] No move mapped for face ${selectedFace} key:${event.key}`);
            return;
        }

        console.log(`[keyboardMouseControls] Dispatching move ${move} for selected face ${selectedFace}`);
        dispatchMove(move, cubeState);
        clearSelection();
    }

    domElement.addEventListener('click', handleClick);
    window.addEventListener('keydown', handleKeydown);

    console.log('[keyboardMouseControls] Event listeners for click and keydown added successfully');

    // Returns cleanup funxction so event listeners are detached when this control scheme is terminated/switched
    return function cleanup() {
        clearSelection();
        window.removeEventListener('keydown', handleKeydown);
        domElement.removeEventListener('click', handleClick);
        console.log('[keyboardMouseControls] Keyboard & Mouse event listener removed');
    };
}