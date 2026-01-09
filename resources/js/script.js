const fileInput = document.getElementById('fileInput');
const importBtn = document.getElementById('importBtn');
const exportBtn = document.getElementById('exportBtn');
const thumbGrid = document.getElementById('thumbGrid');
const carousel = document.getElementById('carousel');
const onionCanvas = document.getElementById('onionCanvas');
const ctx = onionCanvas.getContext('2d');

let images = [];      // { src, img }
let currentIndex = 0;

importBtn.addEventListener('click', () => fileInput.click());

fileInput.addEventListener('change', async (e) => {
    const files = Array.from(e.target.files || []);
    for (const file of files) {
        const src = URL.createObjectURL(file);
        const img = await loadImage(src);
        images.push({ src, img });
    }
    renderThumbnails();
    renderCarousel();
    drawCurrent();
});
exportBtn.addEventListener('click', () => {
    const data = {
        count: images.length
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: 'application/json'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'project.json';
    a.click();
    URL.revokeObjectURL(url);
});

function loadImage(src) {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.src = src;
    });
}
function renderThumbnails() {
    thumbGrid.innerHTML = '';
    images.forEach((item, index) => {
        const div = document.createElement('div');
        div.className = 'thumb';

        const img = document.createElement('img');
        img.src = item.src;

        const num = document.createElement('span');
        num.className = 'thumb-number';
        num.textContent = index + 1;

        div.appendChild(img);
        div.appendChild(num);

        div.addEventListener('click', () => {
            currentIndex = index;
            renderCarousel();
            drawCurrent();
        });

        thumbGrid.appendChild(div);
    });
}
function renderCarousel() {
    carousel.innerHTML = '';
    if (!images.length) return;

    const start = Math.max(0, currentIndex - 2);
    const end = Math.min(images.length - 1, currentIndex + 2);

    for (let i = start; i <= end; i++) {
        const div = document.createElement('div');
        let cls;
        if (i === currentIndex) cls = 'center';
        else if (Math.abs(i - currentIndex) === 1) cls = 'side';
        else cls = 'outer';
        div.className = `carousel-item ${cls}`;

        // inner preview with image
        const thumbBox = document.createElement('div');
        thumbBox.className = 'carousel-thumb';
        const img = document.createElement('img');
        img.src = images[i].src;
        thumbBox.appendChild(img);

        const num = document.createElement('span');
        num.className = 'carousel-number';
        num.textContent = i + 1;

        div.appendChild(thumbBox);
        div.appendChild(num);

        div.addEventListener('click', () => {
            currentIndex = i;
            renderCarousel();
            drawCurrent();
        });

        carousel.appendChild(div);
    }
}

function resizeCanvas() {
    const rect = onionCanvas.getBoundingClientRect();
    onionCanvas.width = rect.width;
    onionCanvas.height = rect.height;
}

window.addEventListener('resize', () => {
    resizeCanvas();
    drawCurrent();
});

function drawCurrent() {
    if (!images.length) return;

    resizeCanvas();
    ctx.clearRect(0, 0, onionCanvas.width, onionCanvas.height);

    const drawIndex = (idx, alpha) => {
        if (idx < 0 || idx >= images.length) return;
        const img = images[idx].img;

        const scale = Math.min(
            onionCanvas.width / img.width,
            onionCanvas.height / img.height
        );
        const w = img.width * scale;
        const h = img.height * scale;
        const x = (onionCanvas.width - w) / 2;
        const y = (onionCanvas.height - h) / 2;

        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.drawImage(img, x, y, w, h);
        ctx.restore();
    };

    drawIndex(currentIndex - 1, 0.3); // previous, faint
    drawIndex(currentIndex + 1, 0.3); // next, faint
    drawIndex(currentIndex, 1);       // current, full
}