// Game Constants
const CELL_SIZE = 20;
const CANVAS_WIDTH = 560;
const CANVAS_HEIGHT = 620;

const canvas = document.getElementById('pacman-canvas');
const ctx = canvas.getContext('2d');

// Size setup
canvas.width = CANVAS_WIDTH;
canvas.height = CANVAS_HEIGHT;

let gameMaze = getMazeCopy();
let ghosts = getGhosts();
let score = 0;
let highScore = localStorage.getItem('pacman-high-score') || 4200;
let lives = 3;
let timer = 0;
let gameStatus = "menu"; // menu, playing, over

// Pacman State
const pacman = {
    x: 14,
    y: 23,
    pixelX: 14 * CELL_SIZE,
    pixelY: 23 * CELL_SIZE,
    dirX: 0,
    dirY: 0,
    nextDirX: 0,
    nextDirY: 0,
    speed: 2,
    radius: 8,
    mouthAngle: 0.2,
    mouthSpeed: 0.02
};

// Controls
document.addEventListener('keydown', (e) => {
    switch(e.code) {
        case 'ArrowUp':
        case 'KeyW':
            pacman.nextDirX = 0; pacman.nextDirY = -1;
            break;
        case 'ArrowDown':
        case 'KeyS':
            pacman.nextDirX = 0; pacman.nextDirY = 1;
            break;
        case 'ArrowLeft':
        case 'KeyA':
            pacman.nextDirX = -1; pacman.nextDirY = 0;
            break;
        case 'ArrowRight':
        case 'KeyD':
            pacman.nextDirX = 1; pacman.nextDirY = 0;
            break;
    }
});

document.getElementById('play-btn').addEventListener('click', startGame);
document.getElementById('restart-btn').addEventListener('click', resetGame);

function startGame() {
    document.getElementById('start-panel').style.display = 'none';
    gameStatus = "playing";
    loop();
}

function resetGame() {
    score = 0;
    lives = 3;
    gameMaze = getMazeCopy();
    pacman.x = 14;
    pacman.y = 23;
    pacman.pixelX = 14 * CELL_SIZE;
    pacman.pixelY = 23 * CELL_SIZE;
    pacman.dirX = 0;
    pacman.dirY = 0;
    pacman.nextDirX = 0;
    pacman.nextDirY = 0;
    ghosts.forEach(g => g.reset());

    document.getElementById('game-over-panel').style.display = 'none';
    updateUI();
    gameStatus = "playing";
    loop(); // Restart loop!
}

function updateUI() {
    document.getElementById('score-val').textContent = String(score).padStart(6, '0');
    document.getElementById('high-score-val').textContent = String(highScore).padStart(6, '0');
    
    let livesHtml = "";
    for(let i=0; i<lives; i++) {
        livesHtml += '<span class="life-icon">🟡</span>';
    }
    document.getElementById('lives-container').innerHTML = livesHtml;
}

// Game Loop
function loop() {
    if (gameStatus !== "playing") return;

    update();
    draw();

    requestAnimationFrame(loop);
}

function update() {
    timer++;

    // 1. Move Pacman
    // Decision point: cell-aligned
    if (pacman.pixelX % CELL_SIZE === 0 && pacman.pixelY % CELL_SIZE === 0) {
        pacman.x = Math.floor(pacman.pixelX / CELL_SIZE);
        pacman.y = Math.floor(pacman.pixelY / CELL_SIZE);

        // Can we turn to next direction?
        const nextTargetX = pacman.x + pacman.nextDirX;
        const nextTargetY = pacman.y + pacman.nextDirY;

        if (gameMaze[nextTargetY] && gameMaze[nextTargetY][nextTargetX] !== 1) {
            pacman.dirX = pacman.nextDirX;
            pacman.dirY = pacman.nextDirY;
        } else {
            // Otherwise, can we continue moving forward?
            const forwardX = pacman.x + pacman.dirX;
            const forwardY = pacman.y + pacman.dirY;
            if (gameMaze[forwardY] && gameMaze[forwardY][forwardX] === 1) { // Wall
                pacman.dirX = 0;
                pacman.dirY = 0;
            }
        }

        // Eat Dots
        if (gameMaze[pacman.y][pacman.x] === 2) {
            gameMaze[pacman.y][pacman.x] = 0;
            score += 10;
            updateUI();
        } else if (gameMaze[pacman.y][pacman.x] === 3) { // Power Pellet
            gameMaze[pacman.y][pacman.x] = 0;
            score += 50;
            updateUI();
            triggerFrightenedGhosts();
        }
    }

    pacman.pixelX += pacman.dirX * pacman.speed;
    pacman.pixelY += pacman.dirY * pacman.speed;

    // Wrap Tunnel
    if (pacman.pixelX < 0) pacman.pixelX = (CANVAS_WIDTH) - 1;
    if (pacman.pixelX >= CANVAS_WIDTH) pacman.pixelX = 0;

    // Mouth Animation
    pacman.mouthAngle += pacman.mouthSpeed;
    if (pacman.mouthAngle > 0.4 || pacman.mouthAngle < 0.1) {
        pacman.mouthSpeed = -pacman.mouthSpeed;
    }

    // 2. Move Ghosts
    ghosts.forEach(g => {
        g.updateTarget(pacman, ghosts[0]); // Blinky is first ghost
        g.move(gameMaze);

        // Collision Check
        const dist = Math.sqrt(Math.pow(g.pixelX - pacman.pixelX, 2) + Math.pow(g.pixelY - pacman.pixelY, 2));
        if (dist < 15) {
            if (g.state === "frightened") {
                score += 200;
                g.reset();
                updateUI();
            } else {
                pacmanHit();
            }
        }
    });
}

function triggerFrightenedGhosts() {
    ghosts.forEach(g => {
        g.state = "frightened";
        setTimeout(() => g.state = "chase", 7000); // 7 seconds
    });
}

function pacmanHit() {
    lives--;
    updateUI();
    if (lives <= 0) {
        gameStatus = "over";
        if (score > highScore) {
            highScore = score;
            localStorage.setItem('pacman-high-score', highScore);
        }
        document.getElementById('final-score').textContent = `Final Score: ${score}`;
        document.getElementById('game-over-panel').style.display = 'flex';
    } else {
        // Reset positions
        pacman.x = 14;
        pacman.y = 23;
        pacman.pixelX = 14 * CELL_SIZE;
        pacman.pixelY = 23 * CELL_SIZE;
        pacman.dirX = 0;
        pacman.dirY = 0;
        ghosts.forEach(g => g.reset());
    }
}

function draw() {
    ctx.fillStyle = "#0d111e"; // Clear color
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Draw Maze
    for (let r = 0; r < MAZE_HEIGHT; r++) {
        for (let c = 0; c < MAZE_WIDTH; c++) {
            const cell = gameMaze[r][c];
            if (cell === 1) {
                ctx.fillStyle = "#00f0ff"; // Walls neon blue
                ctx.fillRect(c * CELL_SIZE + 2, r * CELL_SIZE + 2, CELL_SIZE - 4, CELL_SIZE - 4);
            } else if (cell === 2) {
                ctx.fillStyle = "#fff"; // Dots
                ctx.fillRect(c * CELL_SIZE + 8, r * CELL_SIZE + 8, 4, 4);
            } else if (cell === 3) {
                ctx.fillStyle = "#ff007f"; // Power pellets neon pink
                ctx.beginPath();
                ctx.arc(c * CELL_SIZE + 10, r * CELL_SIZE + 10, 6, 0, Math.PI * 2);
                ctx.fill();
            } else if (cell === 4) {
                ctx.fillStyle = "#94a3b8"; // Ghost gate
                ctx.fillRect(c * CELL_SIZE, r * CELL_SIZE + 8, CELL_SIZE, 4);
            }
        }
    }

    // Draw Pacman
    ctx.fillStyle = "#ffea00";
    ctx.beginPath();
    let startAngle = pacman.mouthAngle;
    let endAngle = Math.PI * 2 - pacman.mouthAngle;

    if (pacman.dirX === 1) { startAngle = pacman.mouthAngle; endAngle = Math.PI * 2 - pacman.mouthAngle; }
    else if (pacman.dirX === -1) { startAngle = Math.PI + pacman.mouthAngle; endAngle = Math.PI - pacman.mouthAngle; }
    else if (pacman.dirY === 1) { startAngle = Math.PI/2 + pacman.mouthAngle; endAngle = Math.PI*5/2 - pacman.mouthAngle; }
    else if (pacman.dirY === -1) { startAngle = Math.PI*3/2 + pacman.mouthAngle; endAngle = Math.PI*3/2 - pacman.mouthAngle; }

    ctx.arc(pacman.pixelX + 10, pacman.pixelY + 10, pacman.radius, startAngle, endAngle);
    ctx.lineTo(pacman.pixelX + 10, pacman.pixelY + 10);
    ctx.fill();

    // Draw Ghosts
    ghosts.forEach(g => {
        if (g.state === "frightened") {
            ctx.fillStyle = "#38bdf8"; // Blue frightened
        } else {
            switch(g.color) {
                case "red": ctx.fillStyle = "#ff3366"; break;
                case "pink": ctx.fillStyle = "#ff66cc"; break;
                case "cyan": ctx.fillStyle = "#00ffff"; break;
                case "orange": ctx.fillStyle = "#ff9933"; break;
            }
        }
        ctx.beginPath();
        ctx.arc(g.pixelX + 10, g.pixelY + 10, 8, Math.PI, Math.PI * 2);
        ctx.lineTo(g.pixelX + 18, g.pixelY + 20);
        ctx.lineTo(g.pixelX + 2, g.pixelY + 20);
        ctx.fill();

        // Eyes
        ctx.fillStyle = "#fff";
        ctx.beginPath();
        ctx.arc(g.pixelX + 6, g.pixelY + 6, 3, 0, Math.PI * 2);
        ctx.arc(g.pixelX + 14, g.pixelY + 6, 3, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = "#000";
        ctx.beginPath();
        ctx.arc(g.pixelX + 6 + g.dirX, g.pixelY + 6 + g.dirY, 1.5, 0, Math.PI * 2);
        ctx.arc(g.pixelX + 14 + g.dirX, g.pixelY + 6 + g.dirY, 1.5, 0, Math.PI * 2);
        ctx.fill();
    });
}

updateUI(); // Initial UI
loop(); // Start loop but paused if state is menu
