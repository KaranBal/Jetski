class Ghost {
    constructor(x, y, color, speed) {
        this.x = x;
        this.y = y;
        this.startX = x;
        this.startY = y;
        this.color = color;
        this.speed = speed;
        this.dirX = 0;
        this.dirY = -1; // Start moving up/out of house
        this.targetX = 0;
        this.targetY = 0;
        this.state = "chase"; // chase, scatter, frightened
        this.pixelX = x * 20; // Assuming 20px grid
        this.pixelY = y * 20;
    }

    reset() {
        this.x = this.startX;
        this.y = this.startY;
        this.pixelX = this.x * 20;
        this.pixelY = this.y * 20;
        this.dirX = 0;
        this.dirY = -1;
        this.state = "chase";
    }

    updateTarget(pacman, blinky) {
        if (this.state === "scatter") {
            this.setScatterTarget();
            return;
        }

        if (this.state === "frightened") {
            // Random targets or run away
            this.targetX = Math.floor(Math.random() * 28);
            this.targetY = Math.floor(Math.random() * 31);
            return;
        }

        // Chase Targets
        if (this.color === "red") { // Blinky
            this.targetX = pacman.x;
            this.targetY = pacman.y;
        } else if (this.color === "pink") { // Pinky
            this.targetX = pacman.x + pacman.dirX * 4;
            this.targetY = pacman.y + pacman.dirY * 4;
        } else if (this.color === "cyan") { // Inky
            const px = pacman.x + pacman.dirX * 2;
            const py = pacman.y + pacman.dirY * 2;
            const dx = px - blinky.x;
            const dy = py - blinky.y;
            this.targetX = px + dx;
            this.targetY = py + dy;
        } else if (this.color === "orange") { // Clyde
            const dist = Math.sqrt(Math.pow(this.x - pacman.x, 2) + Math.pow(this.y - pacman.y, 2));
            if (dist > 8) {
                this.targetX = pacman.x;
                this.targetY = pacman.y;
            } else {
                this.setScatterTarget();
            }
        }
    }

    setScatterTarget() {
        if (this.color === "red") { this.targetX = 25; this.targetY = 2; }
        else if (this.color === "pink") { this.targetX = 2; this.targetY = 2; }
        else if (this.color === "cyan") { this.targetX = 25; this.targetY = 29; }
        else if (this.color === "orange") { this.targetX = 2; this.targetY = 29; }
    }

    // Basic movement logic: At intersections, pick direction that minimizes distance to target
    move(mazeData) {
        // Only make decisions when cell-aligned
        if (this.pixelX % 20 === 0 && this.pixelY % 20 === 0) {
            this.x = Math.floor(this.pixelX / 20);
            this.y = Math.floor(this.pixelY / 20);

            let possibleDirs = [];
            const dirs = [{dx: 0, dy: -1}, {dx: 0, dy: 1}, {dx: -1, dy: 0}, {dx: 1, dy: 0}];

            dirs.forEach(d => {
                // Cant turn 180 deg instantly
                if (d.dx === -this.dirX && d.dy === -this.dirY) return;

                const nextX = this.x + d.dx;
                const nextY = this.y + d.dy;

                // Wrap tunnel
                if (nextX < 0 || nextX >= 28) return; 

                if (mazeData[nextY] && mazeData[nextY][nextX] !== 1) { // Not a wall
                    const dist = Math.sqrt(Math.pow(nextX - this.targetX, 2) + Math.pow(nextY - this.targetY, 2));
                    possibleDirs.push({dx: d.dx, dy: d.dy, dist: dist});
                }
            });

            if (possibleDirs.length > 0) {
                // Find direction with minimum distance to target
                possibleDirs.sort((a, b) => a.dist - b.dist);
                this.dirX = possibleDirs[0].dx;
                this.dirY = possibleDirs[0].dy;
            }
        }

        this.pixelX += this.dirX * this.speed;
        this.pixelY += this.dirY * this.speed;

        // Wrap around screen tunnel (row 14)
        if (this.pixelX < 0) this.pixelX = (28 * 20) - 1;
        if (this.pixelX >= 28 * 20) this.pixelX = 0;
    }
}

// Instantiate the ghosts
const GHOSTS = [
    new Ghost(13, 11, "red", 2),    // Blinky
    new Ghost(14, 11, "pink", 2),   // Pinky
    new Ghost(13, 13, "cyan", 1.8),  // Inky
    new Ghost(14, 13, "orange", 1.8) // Clyde
];

function getGhosts() {
    return GHOSTS;
}
