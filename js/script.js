// ======================================================
//                     LOAD IMAGES
// ======================================================
const bgImage = new Image(); bgImage.src = "img/background.jpg";
const spongebobImg = new Image(); spongebobImg.src = "img/bob.jpg";
const patrickImg = new Image(); patrickImg.src = "img/pat.jpg";

let imagesLoaded = 0;

function checkLoad() {
    if (++imagesLoaded === 3) showScreen("charScreen");
}

bgImage.onload = spongebobImg.onload = patrickImg.onload = checkLoad;


// ======================================================
//                     CANVAS SETUP
// ======================================================
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

function resize() {
    canvas.width = innerWidth;
    canvas.height = innerHeight;
}
resize();
addEventListener("resize", resize);


// ======================================================
//                     UI REFERENCES
// ======================================================
const charScreen = document.getElementById("charScreen");
const titleScreen = document.getElementById("titleScreen");
const helpScreen = document.getElementById("helpScreen");
const aboutScreen = document.getElementById("aboutScreen");
const gameOver = document.getElementById("gameOver");
const winScreen = document.getElementById("winScreen");
const finalScore = document.getElementById("finalScore");


// ======================================================
//                     BUTTON EVENTS
// ======================================================
document.getElementById("spongebobBtn").onclick = () => selectCharacter("spongebob");
document.getElementById("patrickBtn").onclick   = () => selectCharacter("patrick");

document.getElementById("playBtn").onclick      = startGame;
document.getElementById("howToBtn").onclick     = () => showScreen("helpScreen");
document.getElementById("backBtn").onclick      = () => showScreen("titleScreen");

document.getElementById("aboutBtn").onclick     = () => showScreen("aboutScreen");
document.getElementById("aboutBackBtn").onclick = () => showScreen("titleScreen");

document.getElementById("replayBtn").onclick    = () => showScreen("charScreen");
document.getElementById("winReplay").onclick    = () => showScreen("charScreen");


// ======================================================
//                     GAME STATE
// ======================================================
let playerType = null, player = null;

let bullets = [],
    enemies = [],
    eBullets = [],
    explosions = [],
    boss = null;

let lastShot = 0,
    lastSpawn = 0,
    spawnInterval = 900;

let lives = 3,
    score = 0,
    kills = 0;

let keys = {},
    mouse = { x: innerWidth / 2, y: innerHeight / 2 };

let screenShake = 0;


// ======================================================
//                     HELPERS
// ======================================================
function showScreen(id) {
    document.querySelectorAll(".screen")
        .forEach(s => s.style.display = "none");

    if (id) document.getElementById(id).style.display = "flex";
}

function rand(a, b) {
    return Math.random() * (b - a) + a;
}

function resetPlayer() {
    player = { x: 120, y: canvas.height - 150, w: 60, h: 72, speed: 6 };
}

function resetGameState() {
    bullets = [];
    enemies = [];
    eBullets = [];
    explosions = [];
    boss = null;
    kills = 0;
    score = 0;
}


// ======================================================
//                CHARACTER SELECTION
// ======================================================
function selectCharacter(type) {
    playerType = type;
    showScreen("titleScreen");
}


// ======================================================
//                     START GAME
// ======================================================
function startGame() {
    lives = 3;
    score = 0;
    kills = 0;

    resetPlayer();
    resetGameState();

    showScreen(null);
}


// ======================================================
//                      INPUTS
// ======================================================
addEventListener("keydown", e => keys[e.key.toLowerCase()] = true);
addEventListener("keyup", e => keys[e.key.toLowerCase()] = false);

canvas.addEventListener("mousemove", e => {
    const r = canvas.getBoundingClientRect();
    mouse.x = e.clientX - r.left;
    mouse.y = e.clientY - r.top;
});


// ======================================================
//                    SPAWN ENEMY
// ======================================================
function spawnEnemy() {
    enemies.push({
        x: canvas.width + 80,
        y: rand(120, canvas.height - 200),
        w: 55, h: 55,
        speed: rand(2, 3),
        hp: 1,
        fireTimer: rand(700, 2000)
    });
}

function spawnBoss() {
    boss = {
        x: canvas.width - 280,
        y: canvas.height / 2 - 130,
        w: 130, h: 210,
        hp: 50,
        vy: 2,
        timer: 1500
    };
}


// ======================================================
//                 PLAYER AUTO-SHOOT
// ======================================================
function autoShoot() {
    const now = performance.now();
    if (now - lastShot < 220) return;

    lastShot = now;

    const px = player.x + player.w / 2;
    const py = player.y + player.h / 2;

    const ang = Math.atan2(mouse.y - py, mouse.x - px);

    const color = playerType === "spongebob" ? "#FFA500" : "#FF69B4";

    bullets.push({
        x: px, y: py,
        vx: Math.cos(ang) * 20,
        vy: Math.sin(ang) * 20,
        color
    });
}


// ======================================================
//                  EXPLOSION EFFECT
// ======================================================
function explode(x, y, size = 26) {
    for (let i = 0; i < 20; i++) {
        const ang = Math.PI * 2 * (i / 20);

        explosions.push({
            x, y,
            vx: Math.cos(ang) * rand(3, 9),
            vy: Math.sin(ang) * rand(3, 9),
            size,
            life: 1
        });
    }
    screenShake = 8;
}


// ======================================================
//                     MAIN GAME LOOP
// ======================================================
(function loop() {
    requestAnimationFrame(loop);
    update();
    draw();
})();


// ======================================================
//                     UPDATE LOGIC
// ======================================================
function update() {

    // pause logic when UI screen visible
    if (!player) return;
    if (document.querySelector(".screen[style*='flex']")) return;

    // ------------- PLAYER MOVEMENT -------------
    if (keys["a"]) player.x -= player.speed;
    if (keys["d"]) player.x += player.speed;
    if (keys["w"]) player.y -= player.speed;
    if (keys["s"]) player.y += player.speed;

    player.x = Math.max(10, Math.min(canvas.width - player.w - 10, player.x));
    player.y = Math.max(10, Math.min(canvas.height - player.h - 10, player.y));

    autoShoot();

    // ------------- ENEMY SPAWN -------------
    if (!boss && performance.now() - lastSpawn > spawnInterval) {
        spawnEnemy();
        lastSpawn = performance.now();
    }

    // ------------- MOVE PLAYER BULLETS -------------
    bullets.forEach(b => {
        b.x += b.vx;
        b.y += b.vy;
    });
    bullets = bullets.filter(b => b.x > -200 && b.x < canvas.width + 200);

    // ------------- MOVE ENEMIES -------------
    enemies.forEach(e => {
        e.x -= e.speed;

        if ((e.fireTimer -= 16) <= 0) {
            const px = player.x + player.w / 2;
            const py = player.y + player.h / 2;
            const ex = e.x + e.w / 2;
            const ey = e.y + e.h / 2;

            const ang = Math.atan2(py - ey, px - ex);

            eBullets.push({
                x: ex, y: ey,
                vx: Math.cos(ang) * 5,
                vy: Math.sin(ang) * 5,
                r: 7
            });

            e.fireTimer = rand(900, 1700);
        }
    });

    enemies = enemies.filter(e => e.x > -200);

    // ------------- SPAWN BOSS -------------
    if (!boss && kills >= 20) spawnBoss();

    // ------------- BOSS BEHAVIOR -------------
    if (boss) {
        boss.y += boss.vy;

        if (boss.y < 60 || boss.y > canvas.height - 280)
            boss.vy *= -1;

        if ((boss.timer -= 16) <= 0) {

            const px = player.x + player.w / 2;
            const py = player.y + player.h / 2;
            const bx = boss.x + boss.w / 2;
            const by = boss.y + boss.h / 2;

            const ang = Math.atan2(py - by, px - bx);

            for (let s = -2; s <= 2; s++) {
                eBullets.push({
                    x: bx, y: by,
                    vx: Math.cos(ang + s * 0.18) * 6,
                    vy: Math.sin(ang + s * 0.18) * 6,
                    r: 12
                });
            }

            boss.timer = 1500;
        }
    }

    // ------------- ENEMY BULLET COLLISION -------------
    eBullets = eBullets.filter(b => {
        b.x += b.vx;
        b.y += b.vy;

        // hit player
        if (
            b.x > player.x && b.x < player.x + player.w &&
            b.y > player.y && b.y < player.y + player.h
        ) {
            explode(player.x + 30, player.y + 35, 40);
            lives--;

            if (lives <= 0) {
                finalScore.textContent = score;
                showScreen("gameOver");
            }
            return false;
        }

        return (
            b.x > -80 && b.x < canvas.width + 80 &&
            b.y > -80 && b.y < canvas.height + 80
        );
    });

    // ------------- PLAYER BULLET COLLISIONS -------------
    let aliveBullets = [];

    bullets.forEach(b => {
        let hit = false;

        // vs enemies
        for (let i = enemies.length - 1; i >= 0; i--) {
            const e = enemies[i];

            if (
                b.x > e.x && b.x < e.x + e.w &&
                b.y > e.y && b.y < e.y + e.h
            ) {
                hit = true;
                explode(b.x, b.y, 20);
                enemies.splice(i, 1);
                kills++;
                score += 10;
                break;
            }
        }

        // vs boss
        if (!hit && boss) {
            if (
                b.x > boss.x && b.x < boss.x + boss.w &&
                b.y > boss.y && b.y < boss.y + boss.h
            ) {
                hit = true;
                boss.hp--;
                explode(b.x, b.y, 26);

                if (boss.hp <= 0) {
                    explode(boss.x + boss.w / 2, boss.y + boss.h / 2, 120);
                    boss = null;
                    showScreen("winScreen");
                }
            }
        }

        if (!hit) aliveBullets.push(b);
    });

    bullets = aliveBullets;

    // ------------- EXPLOSIONS -------------
    explosions = explosions.filter(ex => {
        ex.x += ex.vx;
        ex.y += ex.vy;
        ex.life -= 0.03;
        return ex.life > 0;
    });
}


// ======================================================
//                       DRAW
// ======================================================
function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();

    // Screen shake
    if (screenShake > 0) {
        ctx.translate(
            (Math.random() * 2 - 1) * screenShake,
            (Math.random() * 2 - 1) * screenShake
        );
        screenShake = Math.max(0, screenShake - 0.7);
    }

    // Background
    if (bgImage.complete)
        ctx.drawImage(bgImage, 0, 0, canvas.width, canvas.height);

    // Ground
    ctx.fillStyle = "#deb887";
    ctx.fillRect(0, canvas.height - 80, canvas.width, 80);

    // Player
    if (player) {
        const img = playerType === "spongebob" ? spongebobImg : patrickImg;
        ctx.drawImage(img, player.x, player.y, player.w, player.h);
    }

    // ---------------- ENEMIES ----------------
    enemies.forEach(e => {
        ctx.save();
        ctx.translate(e.x, e.y);

        ctx.fillStyle = "#3aff8a";
        ctx.strokeStyle = "#76ffbd";
        ctx.lineWidth = 4;

        ctx.beginPath();
        ctx.roundRect(0, 0, e.w, e.h, 14);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(e.w / 2, e.h / 2, 12, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = "#000";
        ctx.beginPath();
        ctx.arc(e.w / 2, e.h / 2, 6, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = "#3aff8a";
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(e.w / 2, 0);
        ctx.lineTo(e.w / 2, -15);
        ctx.stroke();

        ctx.restore();
    });

    // ---------------- BOSS (PLANKTON) ----------------
    if (boss) {
        ctx.save();
        ctx.translate(boss.x, boss.y);

        ctx.fillStyle = "#37c471";
        ctx.strokeStyle = "#0c4023";
        ctx.lineWidth = 6;

        ctx.beginPath();
        ctx.roundRect(0, 0, boss.w, boss.h, 40);
        ctx.fill();
        ctx.stroke();

        ctx.strokeStyle = "#0c4023";
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.moveTo(boss.w / 2, -30);
        ctx.lineTo(boss.w / 2, 15);
        ctx.stroke();

        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.ellipse(boss.w / 2, boss.h / 3, 35, 45, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = "#ff3333";
        ctx.beginPath();
        ctx.arc(boss.w / 2, boss.h / 3, 22, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = "#0c4023";
        ctx.lineWidth = 6;

        ctx.beginPath();
        ctx.moveTo(boss.w * 0.2, boss.h * 0.5);
        ctx.lineTo(boss.w * 0.05, boss.h * 0.7);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(boss.w * 0.8, boss.h * 0.5);
        ctx.lineTo(boss.w * 0.95, boss.h * 0.7);
        ctx.stroke();

        // Boss health bar
        ctx.fillStyle = "red";
        ctx.fillRect(0, -20, boss.w * (boss.hp / 50), 12);

        ctx.restore();
    }

    // Enemy bullets
    eBullets.forEach(b => {
        ctx.fillStyle = "#ff00ff";
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
        ctx.fill();
    });

    // Player bullets
    bullets.forEach(b => {
        ctx.fillStyle = b.color;
        ctx.fillRect(b.x - 5, b.y - 5, 10, 10);
    });

    // Explosions
    explosions.forEach(ex => {
        ctx.globalAlpha = ex.life;
        ctx.fillStyle = `hsl(${30 + (1 - ex.life) * 40},100%,60%)`;
        ctx.beginPath();
        ctx.arc(ex.x, ex.y, ex.size * ex.life, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
    });

    // HUD
    ctx.fillStyle = "white";
    ctx.font = "22px Comic Sans MS";
    ctx.fillText(`Lives: ${lives}`, 20, 30);
    ctx.fillText(`Score: ${score}`, 150, 30);
    ctx.fillText(`Kills: ${kills}`, 280, 30);

    ctx.restore();
}
