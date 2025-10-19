// Get DOM elements
const titleScreen = document.getElementById('title-screen');
const startBtn = document.getElementById('start-btn');
const gameArea = document.getElementById('game-area');
const endScreen = document.getElementById('end-screen');
const endMessage = document.getElementById('end-message');
const playAgainBtn = document.getElementById('play-again-btn');
const progressBarFill = document.getElementById('progress-bar-fill');
const difficultySelect = document.getElementById('difficulty'); // Get difficulty select

// Game state variables
let bucket = null;
let bucketX = 0; // horizontal position in px
let bucketWidth = 60;
let drops = [];
let dropInterval = null;
let dropSpeed = 2; // px per frame
let dropSpawnRate = 1200; // ms
let progress = 0; // 0 to 100
let gameRunning = false;
let dirtyRatio = 0.2; // starts with 20% dirty
let lastFill = 0; // for lose condition

// Difficulty settings
const DIFFICULTY_SETTINGS = {
    easy: {
        winGoal: 100,         // Fill to 70% to win
        dropSpeed: 1.5,      // Drops fall slower
        dropSpawnRate: 1100, // Drops spawn less often
        dirtyRatio: 0.12     // Fewer dirty drops
    },
    normal: {
        winGoal: 100,
        dropSpeed: 2.5,
        dropSpawnRate: 700,
        dirtyRatio: 0.25
    },
    hard: {
        winGoal: 100,        // Must overfill bucket to win
        dropSpeed: 4,      // Drops fall faster
        dropSpawnRate: 500,  // Drops spawn more often
        dirtyRatio: 0.32     // More dirty drops
    }
};

let difficulty = 'normal'; // Default difficulty
let winGoal = 100;         // How much progress needed to win

// Utility: get game area width
function getGameWidth() {
    // Use actual game area width for calculations
    return gameArea.clientWidth || 340;
}

// Utility: get game area height
function getGameHeight() {
    return gameArea.clientHeight || 400;
}

// Show title screen
function showTitleScreen() {
    titleScreen.style.display = '';
    gameArea.style.display = 'none';
    endScreen.style.display = 'none';
}

// Show game area
function showGameArea() {
    titleScreen.style.display = 'none';
    gameArea.style.display = 'block'; // Ensure game area is visible
    endScreen.style.display = 'none';
}

// Show end screen
function showEndScreen(win) {
    gameRunning = false;
    clearInterval(dropInterval);
    drops.forEach(d => d.el.remove());
    drops = [];
    bucket && bucket.remove();

    // Play win or lose sound
    if (win) {
        // Play win audio
        const winAudio = new Audio('audio/game-win.mp3');
        winAudio.play();
        // Show different win messages for each difficulty
        let msg = '';
        if (difficulty === 'easy') {
            msg = 'Great job! You filled most of the bucket. Try harder modes for a bigger challenge!';
        } else if (difficulty === 'hard') {
            msg = 'Amazing! You overfilled the bucket in Hard mode!';
        } else {
            msg = 'Congratulations!\nEvery drop matters. Millions still don’t have access to clean water.';
        }
        endMessage.textContent = msg;
        showConfetti();
    } else {
        // Play lose audio
        const loseAudio = new Audio('audio/game-over.mp3');
        loseAudio.play();
        endMessage.textContent = 'Try again. Avoid the dirty drops.';
    }
    endScreen.style.display = '';
    gameArea.style.display = 'none';
}

// Simple confetti effect for beginners
function showConfetti() {
    // Create 30 confetti pieces
    for (let i = 0; i < 30; i++) {
        const confetti = document.createElement('div');
        confetti.style.position = 'fixed';
        confetti.style.left = `${Math.random() * 100}vw`;
        confetti.style.top = `-20px`;
        confetti.style.width = '12px';
        confetti.style.height = '12px';
        confetti.style.borderRadius = '50%';
        // Use Charity: water colors
        const colors = ['#FFC907', '#2E9DF7', '#8BD1CB', '#4FCB53', '#FF902A', '#F5402C', '#F16061'];
        confetti.style.background = colors[Math.floor(Math.random() * colors.length)];
        confetti.style.zIndex = '9999';
        confetti.style.opacity = '0.85';
        confetti.style.pointerEvents = 'none';
        // Animate falling
        const duration = 1200 + Math.random() * 1200;
        confetti.animate([
            { transform: `translateY(0) rotate(0deg)` },
            { transform: `translateY(80vh) rotate(${Math.random() > 0.5 ? 360 : -360}deg)` }
        ], {
            duration: duration,
            easing: 'ease-in',
            fill: 'forwards'
        });
        document.body.appendChild(confetti);
        // Remove confetti after animation
        setTimeout(() => confetti.remove(), duration + 200);
    }
}

// Start or restart the game
function startGame() {
    showGameArea();
    // Get selected difficulty
    difficulty = difficultySelect.value;
    // Set difficulty settings
    const settings = DIFFICULTY_SETTINGS[difficulty];
    winGoal = settings.winGoal;
    dropSpeed = settings.dropSpeed;
    dropSpawnRate = settings.dropSpawnRate;
    dirtyRatio = settings.dirtyRatio;
    progress = 0;
    lastFill = 0;
    updateProgressBar(); // <-- update progress bar on start
    // Use actual game area size for bucket sizing
    const gw = getGameWidth();
    bucketWidth = Math.max(75, Math.min(110, gw * 0.22)); // 22% of game area width, min 75, max 110
    bucket
    // Create bucket as image
    bucket = document.createElement('img');
    bucket.src = 'img/water-can-transparent.png';
    bucket.alt = 'Water Can';
    bucket.style.position = 'absolute';
    bucket.style.bottom = '10px';
    bucket.style.left = `${bucketX}px`;
    bucket.style.width = `${bucketWidth}px`;
    bucket.style.height = 'auto';
    bucket.style.zIndex = '2';
    bucket.className = 'bucket';
    gameArea.appendChild(bucket);
    // Remove old drops
    drops.forEach(d => d.el.remove());
    drops = [];
    // Start drop spawning
    gameRunning = true;
    dropInterval = setInterval(spawnDrop, dropSpawnRate);
    requestAnimationFrame(gameLoop);
}

// Spawn a drop at random x, clean or dirty
function spawnDrop() {
    if (!gameRunning) return;
    // Increase difficulty over time
    // Dirty drops become more frequent as time passes
    // For easy mode, increase dirtyRatio slower and cap lower
    if (difficulty === 'easy') {
        dirtyRatio = Math.min(0.35, dirtyRatio + 0.005);
        dropSpeed = Math.min(3, dropSpeed + 0.01);
        dropSpawnRate = Math.max(700, dropSpawnRate - 2);
    } else if (difficulty === 'hard') {
        dirtyRatio = Math.min(0.95, dirtyRatio + 0.007);
        dropSpeed = Math.min(10, dropSpeed + 0.05);
        dropSpawnRate = Math.max(250, dropSpawnRate - 8);
    } else {
        dirtyRatio = Math.min(0.95, dirtyRatio + 0.01);
        dropSpeed = Math.min(8, dropSpeed + 0.02);
        dropSpawnRate = Math.max(300, dropSpawnRate - 4);
    }
    // Use actual game area size for drop sizing
    const gw = getGameWidth();
    // Scale drops with game width. Keep a sensible minimum for mobile,
    // and allow much larger drops on wide screens (max 90px).
    // Formula: a percentage of gw, clamped between min and max.
    const dropW = Math.max(34, Math.min(90, Math.round(gw * 0.11)));
    const x = Math.random() * (gw - dropW);
    // Random clean/dirty
    const isDirty = Math.random() < dirtyRatio; // More likely to be dirty as dirtyRatio increases
    // Create drop as image
    const drop = document.createElement('img');
    drop.className = 'drop' + (isDirty ? ' dirty' : '');
    drop.src = isDirty ? 'img/dirtydrop2.svg' : 'img/cleandrop.svg';
    drop.alt = isDirty ? 'Dirty Drop' : 'Clean Drop';
    drop.style.position = 'absolute';
    drop.style.left = `${x}px`;
    drop.style.top = `0px`;
    drop.style.width = `${dropW}px`;
    drop.style.height = 'auto';
    gameArea.appendChild(drop);
    drops.push({el: drop, x, y: 0, w: dropW, dirty: isDirty});
}

// Main game loop: move drops, check collisions
function gameLoop() {
    if (!gameRunning) return;
    drops.forEach((d, i) => {
        d.y += dropSpeed;
        d.el.style.top = `${d.y}px`;
        // Get bucket top position using actual game area height
        const bucketTop = getGameHeight() - 10 - bucket.offsetHeight;
        // Calculate drop center X
        const dropCenterX = d.x + d.w / 2;
        // Accept drop only if its center is above the bucket and its top touches bucket top
        if (
            d.y >= bucketTop &&
            dropCenterX >= bucketX &&
            dropCenterX <= bucketX + bucketWidth
        ) {
            handleDropCatch(d);
            d.el.remove();
            drops.splice(i, 1);
        } else if (d.y > gameArea.clientHeight) {
            d.el.remove();
            drops.splice(i, 1);
        }
    });
    requestAnimationFrame(gameLoop);
}

// Handle catching a drop
function handleDropCatch(drop) {
    // Play water sound when a drop enters the bucket
    const waterAudio = new Audio('audio/water.m4a');
    waterAudio.play();

    // Splash animation at the top of the bucket
    const splash = document.createElement('img');
    // Use different splash images for clean and dirty drops
    splash.src = drop.dirty ? 'img/dirtysplash.png' : 'img/cleansplash.png';
    splash.alt = drop.dirty ? 'Dirty Splash' : 'Clean Splash';
    splash.className = 'splash';
    // Position splash horizontally at drop.x, vertically at top of bucket
    splash.style.left = `${drop.x}px`;
    splash.style.top = `${bucket.offsetTop}px`;
    splash.style.position = 'absolute';
    splash.style.width = '32px';
    splash.style.height = '32px';
    splash.style.pointerEvents = 'none';
    gameArea.appendChild(splash);
    setTimeout(() => splash.remove(), 400);

    // Update progress
    if (!drop.dirty) {
        progress = Math.min(winGoal, progress + 10);
        flashProgressBar('green');
    } else {
        progress = Math.max(0, progress - 15);
        flashProgressBar('red');
    }
    updateProgressBar();

    // Check for milestones
    MILESTONES.forEach(milestone => {
        // Only show if not already shown and score just reached or passed
        if (
            progress >= milestone.score &&
            !shownMilestones.includes(milestone.score) &&
            (progress - 10 < milestone.score) // Only trigger when crossing the milestone
        ) {
            showMilestoneMessage(milestone.message);
            shownMilestones.push(milestone.score);
        }
    });

    // Win/lose check
    if (progress >= winGoal) {
        showEndScreen(true);
    } else if (progress <= 0 && lastFill > 0) {
        showEndScreen(false);
    }
    lastFill = progress;
}

// Milestone messages for progress
const MILESTONES = [
    { score: 10, message: "Great start!" },
    { score: 50, message: "Halfway there!" },
    { score: 80, message: "Almost full!" }
];

// Track which milestones have been shown
let shownMilestones = [];

// Show a milestone message above the progress bar
function showMilestoneMessage(msg) {
    // Try to find an existing milestone message element
    let milestoneEl = document.getElementById('milestone-message');
    if (!milestoneEl) {
        // If not found, create one
        milestoneEl = document.createElement('div');
        milestoneEl.id = 'milestone-message';
        // Center in the game area
        milestoneEl.style.position = 'absolute';
        milestoneEl.style.top = '50%';
        milestoneEl.style.left = '50%';
        milestoneEl.style.transform = 'translate(-50%, -50%)';
        milestoneEl.style.background = '#FFC907';
        milestoneEl.style.color = '#174A7C';
        milestoneEl.style.fontWeight = 'bold';
        milestoneEl.style.fontFamily = "'Montserrat', Arial, sans-serif";
        milestoneEl.style.fontSize = '1.3em';
        milestoneEl.style.padding = '16px 32px';
        milestoneEl.style.borderRadius = '24px';
        milestoneEl.style.boxShadow = '0 2px 8px rgba(46,157,247,0.08)';
        milestoneEl.style.zIndex = '20';
        milestoneEl.style.opacity = '0.97';
        milestoneEl.style.pointerEvents = 'none';
        gameArea.appendChild(milestoneEl);
    }
    milestoneEl.textContent = msg;
    milestoneEl.style.display = 'block';
    // Hide after 1.5 seconds
    setTimeout(() => {
        if (milestoneEl) milestoneEl.style.display = 'none';
    }, 1500);
}

// Update progress bar fill
function updateProgressBar() {
    // Set the width of the fill to match progress
    progressBarFill.style.width = `${progress}%`;
}

// Flash progress bar color for feedback
function flashProgressBar(color) {
    if (color === 'green') {
        progressBarFill.classList.add('flash-green');
        setTimeout(() => progressBarFill.classList.remove('flash-green'), 200);
    } else {
        progressBarFill.classList.add('flash-red');
        setTimeout(() => progressBarFill.classList.remove('flash-red'), 200);
    }
}

// Handle bucket movement (arrow keys)
document.addEventListener('keydown', function(e) {
    if (!gameRunning || !bucket) return;
    const gw = getGameWidth();
    if (e.key === 'ArrowLeft') {
        bucketX = Math.max(0, bucketX - 24);
        bucket.style.left = `${bucketX}px`;
    } else if (e.key === 'ArrowRight') {
        bucketX = Math.min(gw - bucketWidth, bucketX + 24);
        bucket.style.left = `${bucketX}px`;
    }
});

// Handle bucket movement (touch swipe for mobile)
let touchStartX = null;
gameArea.addEventListener('touchstart', function(e) {
    if (!gameRunning || !bucket) return;
    touchStartX = e.touches[0].clientX;
});
gameArea.addEventListener('touchmove', function(e) {
    if (!gameRunning || !bucket || touchStartX === null) return;
    const gw = getGameWidth();
    const dx = e.touches[0].clientX - touchStartX;
    bucketX = Math.max(0, Math.min(gw - bucketWidth, bucketX + dx));
    bucket.style.left = `${bucketX}px`;
    touchStartX = e.touches[0].clientX;
});
gameArea.addEventListener('touchend', function() {
    touchStartX = null;
});

// Start button
startBtn.onclick = function() {
    startGame(); // Start the game when Start button is clicked
};

// Play again button
playAgainBtn.onclick = function() {
    showTitleScreen();
};

// On load, show title screen
showTitleScreen();

/*
    This code uses simple DOM manipulation and beginner-friendly JavaScript.
    - Use arrow keys or swipe to move the bucket.
    - Catch clean drops to fill the bucket, avoid dirty drops!
    - Progress bar shows your score.
    - Win by filling the bucket, lose if it empties after being filled.
*/

/*
    This code uses simple DOM manipulation and beginner-friendly JavaScript.
    - Use arrow keys or swipe to move the bucket.
    - Catch clean drops to fill the bucket, avoid dirty drops!
    - Progress bar shows your score.
    - Win by filling the bucket, lose if it empties after being filled.
*/

