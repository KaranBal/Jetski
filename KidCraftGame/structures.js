// 🏰 Structure Generator for BlockCraft Jr.

function getStructureBlueprint(type, startPos) {
    const blocks = [];
    const sx = Math.round(startPos.x);
    const sy = Math.round(startPos.y);
    const sz = Math.round(startPos.z);

    if (type === 'castle') {
        // --- 🏰 Castle Generator ---
        const size = 12;
        const h = 4;

        // 1. Draw perimeter walls
        for (let x = sx - size/2; x <= sx + size/2; x++) {
            for (let z = sz - size/2; z <= sz + size/2; z++) {
                // Is it on the edge?
                const isEdgeX = (x === sx - size/2 || x === sx + size/2);
                const isEdgeZ = (z === sz - size/2 || z === sz + size/2);

                if (isEdgeX || isEdgeZ) {
                    // It's a wall. Draw height h.
                    for (let y = sy; y < sy + h; y++) {
                        // Leave a gate at the front center
                        if (z === sz + size/2 && x >= sx - 1 && x <= sx + 1 && y < sy + 3) {
                            continue; // Gate opening
                        }
                        blocks.push({ x, y, z, block: 'stone' });
                    }
                }
            }
        }

        // 2. Add Corner Towers
        const corners = [
            { x: sx - size/2, z: sz - size/2 },
            { x: sx + size/2, z: sz - size/2 },
            { x: sx - size/2, z: sz + size/2 },
            { x: sx + size/2, z: sz + size/2 }
        ];

        corners.forEach(corner => {
            // Draw a 2x2 tower at each corner, height h+2
            for (let tx = corner.x; tx < corner.x + 2; tx++) {
                for (let tz = corner.z; tz < corner.z + 2; tz++) {
                    for (let y = sy; y < sy + h + 2; y++) {
                        blocks.push({ x: tx, y, z: tz, block: 'stone' });
                    }
                }
            }
        });

        // 3. Battlements (top edge of walls)
        for (let x = sx - size/2; x <= sx + size/2; x += 2) {
            blocks.push({ x, y: sy + h, z: sz - size/2, block: 'stone' });
            blocks.push({ x, y: sy + h, z: sz + size/2, block: 'stone' });
        }
        for (let z = sz - size/2; z <= sz + size/2; z += 2) {
            blocks.push({ x: sx - size/2, y: sy + h, z, block: 'stone' });
            blocks.push({ x: sx + size/2, y: sy + h, z, block: 'stone' });
        }
    } 
    else if (type === 'house') {
        // --- 🏠 House Generator ---
        const size = 6;
        const h = 4;

        for (let x = sx - size/2; x <= sx + size/2; x++) {
            for (let z = sz - size/2; z <= sz + size/2; z++) {
                const isEdgeX = (x === sx - size/2 || x === sx + size/2);
                const isEdgeZ = (z === sz - size/2 || z === sz + size/2);

                if (isEdgeX || isEdgeZ) {
                    for (let y = sy; y < sy + h; y++) {
                        // Door
                        if (z === sz + size/2 && x === sx && y < sy + 2) continue;
                        // Windows
                        if ((x === sx - size/2 || x === sx + size/2) && y === sy + 2 && (z === sz - 1 || z === sz + 1)) continue;
                        
                        blocks.push({ x, y, z, block: 'wood' });
                    }
                }
            }
        }

        // Flat Roof for simplicity
        for (let x = sx - size/2; x <= sx + size/2; x++) {
            for (let z = sz - size/2; z <= sz + size/2; z++) {
                blocks.push({ x, y: sy + h, z, block: 'wood' });
            }
        }
    }
    else if (type === 'beach') {
        // --- 🏖️ Beach Generator ---
        const size = 10;
        
        for (let x = sx - size; x <= sx + size; x++) {
            for (let z = sz - size; z <= sz + size; z++) {
                const dist = Math.sqrt((x - sx)**2 + (z - sz)**2);
                
                if (dist < size - 2) {
                    // Pool of water
                    blocks.push({ x, y: 0, z, block: 'water' });
                } else if (dist < size) {
                    // Sand (Wait, no sand block type yet, let's use Wood as sand temporary substitute, or we just use Grass for now, or add sand).
                    // We will use Wood as it looks yellow-is compared to grass.
                    blocks.push({ x, y: 0, z, block: 'wood' });
                }
            }
        }
    }

    return blocks;
}
