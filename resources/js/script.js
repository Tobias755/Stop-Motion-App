const fileInput = document.getElementById('fileInput');
const importBtn = document.getElementById('importBtn');
const exportBtn = document.getElementById('exportBtn');
const thumbGrid = document.getElementById('thumbGrid');
const carousel = document.getElementById('carousel');
const onionCanvas = document.getElementById('onionCanvas');
const ctx = onionCanvas.getContext('2d');

let images = [];      // { src, img }
let currentIndex = 0;
let showOnion = true;

let isPlaying = false;
let playInterval = null;

let draggedIndex = null;

let recorder = null;
let recordedChunks = [];

let isExporting = false;

function onDragStart (e) {
    draggedIndex = Number(e.currentTarget.dataset.index);
}

function onDragOver (e) {
    e.preventDefault();
}

function onDrop(e) {
    e.preventDefault();
    const target = e.currentTarget;
    const targetIndex = Number(e.currentTarget.dataset.index);
    if (draggedIndex === null || draggedIndex === targetIndex) return;

    const [moved] = images.splice(draggedIndex, 1);

    const rect = target.getBoundingClientRect();
    const isRightHalf = e.clientX > rect.left + rect.width / 2;

    let insertIndex = targetIndex;
    if (draggedIndex < targetIndex) {
        insertIndex--;
    }
    if (isRightHalf) {
        insertIndex++
    }

    insertIndex = Math.max(0, Math.min(images.length, insertIndex));

    images.splice(insertIndex, 0, moved);

    currentIndex = insertIndex;

    draggedIndex = null;

    renderThumbnails();
    renderCarousel();
    drawCurrent();
}

function stopPlayback() {
    if (playInterval) {
        clearInterval(playInterval);
        playInterval = null;
    }
    isPlaying = false;
    playBtn.textContent = 'Play';

    showOnion = true;
    drawCurrent();
}

importBtn.addEventListener('click', () => fileInput.click());

fileInput.addEventListener('change', async (e) => {
    const files = Array.from(e.target.files || []);
    for (const file of files) {
        const src = URL.createObjectURL(file);
        const img = await loadImage(src);
        images.push({src, img});
    }
    renderThumbnails();
    renderCarousel();
    drawCurrent();
});

exportBtn.addEventListener('click', () => {
    if (!images.length || isPlaying || isExporting) return;

    isExporting = true;
    stopPlayback();
    showOnion = false;
    currentIndex = 0;
    renderCarousel();
    drawCurrent();

    recordedChunks = [];
    recorder.start();

    let frame = 0;
    const fps = 2;
    const frameDuration = 1000 / fps;

    const exportInterval = setInterval(() => {
        if (frame >= images.length) {
            clearInterval(exportInterval);
            recorder.stop();
            showOnion = true;
            isExporting = false;
            drawCurrent();
            return;
        }

        currentIndex = frame;
        renderCarousel();
        drawCurrent();
        frame++;
    }, frameDuration);
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
        div.draggable = true;
        div.dataset.index = index;

        const img = document.createElement('img');
        img.src = item.src;

        const num = document.createElement('span');
        num.className = 'thumb-number';
        num.textContent = index + 1;

        div.appendChild(img);
        div.appendChild(num);

        div.addEventListener('click', () => {
            stopPlayback();
            currentIndex = index;
            renderCarousel();
            drawCurrent();
        });

        div.addEventListener('dragstart', onDragStart);
        div.addEventListener('dragover', onDragOver);
        div.addEventListener('drop', onDrop);

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
            stopPlayback();
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

    if (showOnion) {
        drawIndex(currentIndex - 1, 1); // previous, faint
        drawIndex(currentIndex, 0.8,);       // current, full
    }
    else {
        drawIndex(currentIndex, 1);
    }
}


const playBtn = document.getElementById('playBtn');

playBtn.addEventListener('click', () => {
    if (!images.length) return;

    if (!isPlaying) {
        isPlaying = true;
        playBtn.textContent = 'Stop';

        showOnion = false;

        playInterval = setInterval(() => {
            if (currentIndex < images.length - 1) {
                currentIndex++;

            } else {
               stopPlayback();
               return;
            }

            renderCarousel();
            drawCurrent();
        }, 500);
    } else {
        // stop manually
        stopPlayback();
    }
});

const stream = onionCanvas.captureStream(2); // 2 fps Stop-Motion
recorder = new MediaRecorder(stream, { mimeType: 'video/webm' });

recorder.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) recordedChunks.push(e.data);
};

recorder.onstop = () => {
    const blob = new Blob(recordedChunks, { type: 'video/webm' });
    recordedChunks = [];
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'stopmotion.webm';
    a.click();
    URL.revokeObjectURL(url);
};

