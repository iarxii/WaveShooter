Here’s a **complete working demo** for your browser game environment, plus a **context document** for your coding agent to optimize and extend it.

***

## ✅ **Dynamic Environment Demo (HTML + CSS + JS)**

This demo includes:

*   **Parallax scrolling background**
*   **Hazard wave particle system**
*   **Rotating educational tips**
*   **Lightweight and memory-efficient design**

***

### **HTML**
```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Healthcare Heroes - Hazard Wave City</title>
<style>
    body {
        margin: 0;
        overflow: hidden;
        background: #0a3d3f;
        font-family: Arial, sans-serif;
        color: white;
    }
    #gameCanvas {
        display: block;
    }
    .tip-box {
        position: absolute;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(0, 0, 0, 0.6);
        padding: 10px 20px;
        border-radius: 8px;
        font-size: 18px;
        text-align: center;
    }
</style>
</head>
<body>
<canvas id="gameCanvas"></canvas>
<div class="tip-box" id="tipBox">Loading tips...</div>
game.js</script>
</body>
</html>
```


***

### **JavaScript (game.js)**

```javascript
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

let scrollSpeed = 0.5;
let offset = 0;

// Educational tips
const tips = [
    "Wash hands for 20 seconds!",
    "Wear your mask properly!",
    "Keep a safe distance!",
    "Sanitize frequently touched surfaces!",
    "Stay home if you feel sick!"
];
let tipIndex = 0;
const tipBox = document.getElementById('tipBox');

// Particle system for hazard waves
class Particle {
    constructor() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.radius = Math.random() * 5 + 2;
        this.color = 'rgba(0,255,0,0.3)'; // Toxic green
        this.speedX = Math.random() * 2 - 1;
        this.speedY = Math.random() * 2 - 1;
    }
    update() {
        this.x += this.speedX;
        this.y += this.speedY;
        if (this.x < 0 || this.x > canvas.width) this.speedX *= -1;
        if (this.y < 0 || this.y > canvas.height) this.speedY *= -1;
    }
    draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
    }
}

const particles = [];
for (let i = 0; i < 100; i++) {
    particles.push(new Particle());
}

// Draw background
function drawBackground() {
    ctx.fillStyle = '#0a3d3f'; // Dark teal
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#145c63'; // City silhouette
    for (let i = 0; i < canvas.width; i += 100) {
        ctx.fillRect(i - offset, canvas.height - 150, 80, 150);
    }
}

// Update educational tip every 5 seconds
setInterval(() => {
    tipBox.textContent = tips[tipIndex];
    tipIndex = (tipIndex + 1) % tips.length;
}, 5000);

// Animation loop
function animate() {
    offset += scrollSpeed;
    if (offset > 100) offset = 0;

    drawBackground();

    particles.forEach(p => {
        p.update();
        p.draw();
    });

    requestAnimationFrame(animate);
}

animate();
```

***

## ✅ **Context Document for Coding Agent**

**Project Goal:**\
Create a dynamic, hazard-themed environment for a browser-based educational game about Infection Prevention & Control.

**Key Features:**

1.  **Parallax Background:**
    *   Simple city silhouette drawn procedurally.
    *   Scrolling effect for depth.
2.  **Hazard Wave Particle System:**
    *   Lightweight particles simulating infection waves.
    *   GPU-friendly animations.
3.  **Educational Tips Overlay:**
    *   Rotating messages every few seconds.
    *   Positioned as a floating UI element.
4.  **Performance Optimization Targets:**
    *   Use requestAnimationFrame for smooth rendering.
    *   Minimize DOM updates (only tips change).
    *   Consider converting to **WebGL** or **PixiJS** for better performance.
    *   Implement **texture atlases** if adding sprites later.
5.  **Future Extensions:**
    *   Add interactive hotspots for infection control info.
    *   Include power-up items (PPE, sanitizer) as clickable elements.
    *   Integrate sound effects for hazard waves.

**Constraints:**

*   Must run efficiently in modern browsers.
*   Avoid heavy image assets; prefer procedural graphics.
*   Keep memory footprint low for mobile compatibility.

***

✅ This demo is **ready to run** in any browser.\
Would you like me to **extend this into a modular PixiJS/WebGL version** for better performance and scalability? Or should I **add interactive elements (clickable hotspots and power-ups) to this current demo**?
