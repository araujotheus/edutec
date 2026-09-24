// =====================================================
// JOGO "MERGULHO LIMPO" - TELA INICIAL
// Mostra o recorde, desenha os ícones dos itens e
// anima uma prévia do mergulhador.
// =====================================================

(function () {
    'use strict';

    const Draw = window.BlueMindDraw;

    // Recorde salvo no navegador
    try {
        const record = parseInt(window.localStorage.getItem('bluemind-mergulho-recorde'), 10) || 0;
        document.getElementById('record').textContent = record;
    } catch (e) {
        // armazenamento indisponível: fica 0
    }

    // Ícones dos itens (desenhados com as mesmas funções do jogo)
    function drawIcon(canvas, drawFn, scale) {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const size = canvas.width;
        canvas.width = size * dpr;
        canvas.height = size * dpr;
        canvas.style.width = `${size}px`;
        canvas.style.height = `${size}px`;
        const ctx = canvas.getContext('2d');
        ctx.scale(dpr, dpr);
        ctx.translate(size / 2, size / 2);
        ctx.scale(scale, scale);
        drawFn(ctx);
    }

    document.querySelectorAll('[data-trash]').forEach((canvas) => {
        drawIcon(canvas, (ctx) => Draw.trash(ctx, canvas.dataset.trash), canvas.width / 45);
    });

    document.querySelectorAll('[data-extra]').forEach((canvas) => {
        const type = canvas.dataset.extra;
        drawIcon(canvas, (ctx) => {
            if (type === 'oxygen') Draw.oxygen(ctx, 0);
            else {
                ctx.translate(0, -8);
                Draw.jelly(ctx, 0);
            }
        }, canvas.width / 50);
    });

    // Prévia animada
    const preview = document.getElementById('preview');
    if (!preview) return;

    const W = preview.width;
    const H = preview.height;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    preview.width = W * dpr;
    preview.height = H * dpr;
    const ctx = preview.getContext('2d');

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const bubbles = Array.from({ length: 18 }, () => ({
        x: Math.random() * W,
        y: Math.random() * H,
        r: 2 + Math.random() * 4,
        s: 20 + Math.random() * 30
    }));
    const floating = [
        { type: 'garrafa', x: 0.2, y: 0.25, p: 0 },
        { type: 'sacola', x: 0.8, y: 0.2, p: 2 },
        { type: 'lata', x: 0.72, y: 0.8, p: 4 },
        { type: 'pneu', x: 0.15, y: 0.82, p: 1 }
    ];

    let last = performance.now();
    let time = 0;

    function frame(now) {
        const dt = Math.min((now - last) / 1000, 0.05);
        last = now;
        time += dt;

        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        const water = ctx.createLinearGradient(0, 0, 0, H);
        water.addColorStop(0, '#0f7fb8');
        water.addColorStop(1, '#03234a');
        ctx.fillStyle = water;
        ctx.fillRect(0, 0, W, H);

        // Areia
        ctx.fillStyle = '#6f6a4c';
        ctx.beginPath();
        ctx.moveTo(0, H - 40);
        ctx.quadraticCurveTo(W / 2, H - 70, W, H - 35);
        ctx.lineTo(W, H);
        ctx.lineTo(0, H);
        ctx.fill();

        for (const b of bubbles) {
            b.y -= b.s * dt;
            if (b.y < -10) {
                b.y = H + 10;
                b.x = Math.random() * W;
            }
            ctx.strokeStyle = 'rgba(220, 245, 255, 0.6)';
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            ctx.arc(b.x + Math.sin(time * 2 + b.r) * 4, b.y, b.r, 0, Math.PI * 2);
            ctx.stroke();
        }

        for (const f of floating) {
            ctx.save();
            ctx.translate(f.x * W, f.y * H + Math.sin(time * 1.5 + f.p) * 8);
            ctx.rotate(Math.sin(time + f.p) * 0.4);
            ctx.scale(1.3, 1.3);
            Draw.trash(ctx, f.type);
            ctx.restore();
        }

        ctx.save();
        ctx.translate(W / 2 + Math.sin(time * 0.8) * 40, H / 2 + Math.sin(time * 1.6) * 18);
        ctx.rotate(Math.cos(time * 1.6) * 0.12);
        ctx.scale(1.8, 1.8);
        Draw.diver(ctx, time, 0.6);
        ctx.restore();

        if (!reduceMotion) requestAnimationFrame(frame);
    }

    requestAnimationFrame(frame);
})();
