// =====================================================
// DESENHOS DO JOGO "MERGULHO LIMPO"
// Funções de desenho em canvas usadas pela página inicial
// do jogo e pela partida. Todos os desenhos são centrados
// na origem (0, 0); quem chama faz o translate.
// =====================================================

(function () {
    'use strict';

    // Tipos de lixo: nome, pontos, raio de colisão, velocidade
    // de afundar (px/s), peso aproximado (kg) e chance de aparecer.
    const TRASH_TYPES = {
        garrafa: { nome: 'Garrafa PET', pontos: 10, raio: 17, afunda: 40, kg: 0.05, chance: 30 },
        lata: { nome: 'Lata de alumínio', pontos: 10, raio: 14, afunda: 55, kg: 0.015, chance: 25 },
        sacola: { nome: 'Sacola plástica', pontos: 15, raio: 18, afunda: 24, kg: 0.01, chance: 25 },
        pneu: { nome: 'Pneu', pontos: 30, raio: 22, afunda: 75, kg: 7, chance: 10 },
        rede: { nome: 'Rede de pesca', pontos: 40, raio: 24, afunda: 32, kg: 2.5, chance: 10 }
    };

    function roundRect(ctx, x, y, w, h, r) {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.arcTo(x + w, y, x + w, y + h, r);
        ctx.arcTo(x + w, y + h, x, y + h, r);
        ctx.arcTo(x, y + h, x, y, r);
        ctx.arcTo(x, y, x + w, y, r);
        ctx.closePath();
    }

    // ---------------- MERGULHADOR (virado para a direita) ----------------
    function diver(ctx, time, speed) {
        const kick = Math.sin(time * (6 + speed * 8)) * (0.25 + speed * 0.35);

        // Nadadeiras
        ctx.fillStyle = '#ffd23f';
        for (const side of [-1, 1]) {
            ctx.save();
            ctx.translate(-50, side * 4);
            ctx.rotate(kick * side);
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(-26, -9 + side * 3);
            ctx.lineTo(-26, 9 + side * 3);
            ctx.closePath();
            ctx.fill();
            ctx.restore();
        }

        // Pernas
        ctx.strokeStyle = '#10243f';
        ctx.lineCap = 'round';
        ctx.lineWidth = 11;
        for (const side of [-1, 1]) {
            ctx.beginPath();
            ctx.moveTo(-14, side * 3);
            ctx.lineTo(-48, side * 4 + kick * side * 6);
            ctx.stroke();
        }

        // Cilindro de oxigênio
        ctx.fillStyle = '#f4b41a';
        roundRect(ctx, -30, -24, 40, 13, 6);
        ctx.fill();
        ctx.fillStyle = '#5b6b7c';
        ctx.fillRect(10, -21, 6, 7);

        // Corpo (roupa de neoprene)
        ctx.fillStyle = '#10243f';
        ctx.beginPath();
        ctx.ellipse(0, 0, 28, 13, 0, 0, Math.PI * 2);
        ctx.fill();

        // Faixa azul da roupa
        ctx.strokeStyle = '#47B9D4';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(-22, 4);
        ctx.quadraticCurveTo(0, 9, 24, 3);
        ctx.stroke();

        // Braço segurando a sacola de coleta
        const reach = Math.sin(time * 3) * 3;
        ctx.strokeStyle = '#10243f';
        ctx.lineWidth = 8;
        ctx.beginPath();
        ctx.moveTo(14, 2);
        ctx.lineTo(40, 10 + reach);
        ctx.stroke();

        ctx.strokeStyle = '#ff8c42';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(46, 16 + reach, 8, 0, Math.PI * 2);
        ctx.moveTo(38, 16 + reach);
        ctx.lineTo(54, 16 + reach);
        ctx.moveTo(46, 8 + reach);
        ctx.lineTo(46, 24 + reach);
        ctx.stroke();

        // Cabeça
        ctx.fillStyle = '#10243f';
        ctx.beginPath();
        ctx.arc(32, -6, 12, 0, Math.PI * 2);
        ctx.fill();

        // Máscara
        ctx.fillStyle = 'rgba(150, 230, 255, 0.9)';
        ctx.strokeStyle = '#0a1628';
        ctx.lineWidth = 2;
        roundRect(ctx, 33, -14, 12, 9, 3);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.fillRect(35, -12, 3, 3);

        // Mangueira do regulador
        ctx.strokeStyle = '#1b1b1b';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(14, -18);
        ctx.quadraticCurveTo(30, -26, 40, 0);
        ctx.stroke();
        ctx.fillStyle = '#1b1b1b';
        ctx.beginPath();
        ctx.arc(41, 1, 3.5, 0, Math.PI * 2);
        ctx.fill();
    }

    // ---------------- LIXO ----------------
    function trash(ctx, type) {
        switch (type) {
            case 'garrafa':
                ctx.fillStyle = 'rgba(130, 225, 170, 0.6)';
                ctx.strokeStyle = 'rgba(210, 255, 230, 0.9)';
                ctx.lineWidth = 1.5;
                roundRect(ctx, -8, -14, 16, 30, 5);
                ctx.fill();
                ctx.stroke();
                ctx.fillRect(-4, -20, 8, 7);
                ctx.fillStyle = '#2b7de9';
                ctx.fillRect(-5, -25, 10, 5);
                ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
                ctx.fillRect(-8, -2, 16, 8);
                break;

            case 'lata':
                ctx.fillStyle = '#d93636';
                roundRect(ctx, -9, -13, 18, 26, 3);
                ctx.fill();
                ctx.fillStyle = '#f1f1f1';
                ctx.fillRect(-9, -3, 18, 5);
                ctx.fillStyle = '#b8c2cc';
                ctx.beginPath();
                ctx.ellipse(0, -13, 9, 3, 0, 0, Math.PI * 2);
                ctx.fill();
                break;

            case 'sacola':
                ctx.fillStyle = 'rgba(240, 244, 255, 0.6)';
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.moveTo(-15, -8);
                ctx.quadraticCurveTo(-18, 12, -8, 17);
                ctx.quadraticCurveTo(0, 21, 9, 16);
                ctx.quadraticCurveTo(19, 10, 14, -8);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
                ctx.beginPath();
                ctx.arc(-8, -10, 5, Math.PI, 0);
                ctx.arc(8, -10, 5, Math.PI, 0);
                ctx.stroke();
                break;

            case 'pneu':
                ctx.strokeStyle = '#1c1c1c';
                ctx.lineWidth = 11;
                ctx.beginPath();
                ctx.arc(0, 0, 16, 0, Math.PI * 2);
                ctx.stroke();
                ctx.strokeStyle = '#3d3d3d';
                ctx.lineWidth = 2;
                for (let i = 0; i < 10; i++) {
                    const a = (i / 10) * Math.PI * 2;
                    ctx.beginPath();
                    ctx.moveTo(Math.cos(a) * 12, Math.sin(a) * 12);
                    ctx.lineTo(Math.cos(a) * 21, Math.sin(a) * 21);
                    ctx.stroke();
                }
                break;

            case 'rede':
                ctx.strokeStyle = 'rgba(225, 210, 170, 0.9)';
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                for (let i = -18; i <= 18; i += 6) {
                    ctx.moveTo(i, -16);
                    ctx.lineTo(i + 4, 16);
                    ctx.moveTo(-20, i * 0.8);
                    ctx.lineTo(20, i * 0.8 + 3);
                }
                ctx.stroke();
                ctx.fillStyle = '#ff7a1a';
                ctx.beginPath();
                ctx.arc(-17, -15, 5, 0, Math.PI * 2);
                ctx.arc(18, 14, 5, 0, Math.PI * 2);
                ctx.fill();
                break;
        }
    }

    // ---------------- ÁGUA-VIVA ----------------
    function jelly(ctx, time) {
        const pulse = 1 + Math.sin(time * 4) * 0.08;

        ctx.strokeStyle = 'rgba(255, 170, 225, 0.65)';
        ctx.lineWidth = 2;
        for (let i = -2; i <= 2; i++) {
            ctx.beginPath();
            ctx.moveTo(i * 6, 2);
            for (let s = 1; s <= 6; s++) {
                ctx.lineTo(i * 6 + Math.sin(time * 5 + s + i) * 4, 2 + s * 6);
            }
            ctx.stroke();
        }

        const glow = ctx.createRadialGradient(0, -4, 2, 0, -4, 22);
        glow.addColorStop(0, 'rgba(255, 220, 245, 0.95)');
        glow.addColorStop(1, 'rgba(255, 90, 190, 0.55)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.ellipse(0, 0, 20 * pulse, 18 / pulse, 0, Math.PI, 0);
        ctx.quadraticCurveTo(0, 6, -20 * pulse, 0);
        ctx.fill();
    }

    // ---------------- BOLHA DE OXIGÊNIO ----------------
    function oxygen(ctx, time) {
        const r = 19 + Math.sin(time * 5) * 1.5;
        const g = ctx.createRadialGradient(-6, -6, 2, 0, 0, r);
        g.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
        g.addColorStop(0.4, 'rgba(140, 235, 255, 0.55)');
        g.addColorStop(1, 'rgba(60, 190, 255, 0.25)');
        ctx.fillStyle = g;
        ctx.strokeStyle = 'rgba(220, 250, 255, 0.9)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#0A2342';
        ctx.font = 'bold 14px Montserrat, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('O₂', 0, 1);
    }

    // ---------------- PEIXE DECORATIVO (virado para a direita) ----------------
    function fish(ctx, color, time) {
        const tail = Math.sin(time * 10) * 4;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.ellipse(0, 0, 14, 7, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(-10, 0);
        ctx.lineTo(-22, -7 + tail);
        ctx.lineTo(-22, 7 + tail);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#0a1628';
        ctx.beginPath();
        ctx.arc(7, -2, 1.6, 0, Math.PI * 2);
        ctx.fill();
    }

    window.BlueMindDraw = { TRASH_TYPES, diver, trash, jelly, oxygen, fish, roundRect };
})();
