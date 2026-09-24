// =====================================================
// JOGO "MERGULHO LIMPO" - PARTIDA
// O mergulhador recolhe o lixo que afunda no oceano,
// desvia das águas-vivas e pega bolhas de oxigênio.
// A partida termina quando o tempo ou o oxigênio acaba.
// =====================================================

(function () {
    'use strict';

    const Draw = window.BlueMindDraw;
    const TRASH_TYPES = Draw.TRASH_TYPES;

    // ---------------- CONFIGURAÇÕES ----------------
    const W = 960;
    const H = 540;
    const FLOOR = 470;               // altura da areia
    const GAME_TIME = 90;            // segundos de partida
    const OXYGEN_DRAIN = 1.25;       // % de oxigênio perdido por segundo
    const OXYGEN_BONUS = 25;         // % recuperado por bolha
    const JELLY_DAMAGE = 15;         // % perdido ao encostar numa água-viva
    const MAX_SPEED = 270;
    const PICK_RADIUS = 30;
    const RECORD_KEY = 'bluemind-mergulho-recorde';
    const MUTE_KEY = 'bluemind-mergulho-mudo';

    // ---------------- ELEMENTOS DA PÁGINA ----------------
    const canvas = document.getElementById('game');
    const ctx = canvas.getContext('2d');
    const hud = {
        score: document.getElementById('hud-score'),
        time: document.getElementById('hud-time'),
        oxygen: document.getElementById('hud-oxygen'),
        oxygenBox: document.getElementById('hud-oxygen-box'),
        trash: document.getElementById('hud-trash'),
        combo: document.getElementById('hud-combo')
    };
    const countdownEl = document.getElementById('countdown');
    const pauseMenu = document.getElementById('pause-menu');
    const gameOverEl = document.getElementById('game-over');
    const gameOverTitle = document.getElementById('game-over-title');
    const btnPause = document.getElementById('btn-pause');
    const btnMute = document.getElementById('btn-mute');

    // ---------------- ARMAZENAMENTO (pode falhar em modo privado) ----------------
    function readStorage(key) {
        try {
            return window.localStorage.getItem(key);
        } catch (e) {
            return null;
        }
    }

    function writeStorage(key, value) {
        try {
            window.localStorage.setItem(key, value);
        } catch (e) {
            // sem armazenamento: o recorde só não fica salvo
        }
    }

    // ---------------- SOM (sintetizado, sem arquivos) ----------------
    let audio = null;
    let muted = readStorage(MUTE_KEY) === '1';

    function initAudio() {
        if (audio) {
            if (audio.state === 'suspended') audio.resume();
            return;
        }
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) audio = new AudioCtx();
    }

    function tone(freq, duration, type, volume, slideTo) {
        if (!audio || muted) return;
        const now = audio.currentTime;
        const osc = audio.createOscillator();
        const gain = audio.createGain();
        osc.type = type || 'sine';
        osc.frequency.setValueAtTime(freq, now);
        if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, now + duration);
        gain.gain.setValueAtTime(volume || 0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
        osc.connect(gain).connect(audio.destination);
        osc.start(now);
        osc.stop(now + duration);
    }

    const sfx = {
        collect: (combo) => tone(520 + combo * 90, 0.15, 'triangle', 0.18, 900 + combo * 120),
        hurt: () => tone(220, 0.35, 'sawtooth', 0.12, 80),
        oxygen: () => {
            tone(600, 0.12, 'sine', 0.15);
            setTimeout(() => tone(800, 0.12, 'sine', 0.15), 90);
            setTimeout(() => tone(1000, 0.18, 'sine', 0.15), 180);
        },
        count: (last) => tone(last ? 880 : 440, 0.2, 'square', 0.08),
        alarm: () => tone(700, 0.12, 'square', 0.06),
        end: () => tone(500, 0.6, 'triangle', 0.15, 150)
    };

    function updateMuteButton() {
        btnMute.innerHTML = muted
            ? '<i class="fa-solid fa-volume-xmark"></i>'
            : '<i class="fa-solid fa-volume-high"></i>';
        btnMute.setAttribute('aria-label', muted ? 'Ativar som' : 'Desativar som');
    }

    // ---------------- CANVAS NÍTIDO EM TELAS DE ALTA RESOLUÇÃO ----------------
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = W * dpr;
    canvas.height = H * dpr;

    // ---------------- CENÁRIO FIXO (desenhado uma vez) ----------------
    const background = document.createElement('canvas');
    background.width = W * dpr;
    background.height = H * dpr;
    drawStaticBackground(background.getContext('2d'));

    function drawStaticBackground(g) {
        g.scale(dpr, dpr);

        const water = g.createLinearGradient(0, 0, 0, H);
        water.addColorStop(0, '#0f7fb8');
        water.addColorStop(0.45, '#0a4f86');
        water.addColorStop(1, '#03234a');
        g.fillStyle = water;
        g.fillRect(0, 0, W, H);

        // Rochas distantes
        g.fillStyle = 'rgba(4, 30, 60, 0.7)';
        g.beginPath();
        g.moveTo(0, FLOOR);
        g.lineTo(0, 380);
        g.quadraticCurveTo(70, 330, 150, 390);
        g.quadraticCurveTo(210, 420, 260, FLOOR);
        g.moveTo(640, FLOOR);
        g.quadraticCurveTo(700, 360, 790, 350);
        g.quadraticCurveTo(900, 340, W, 400);
        g.lineTo(W, FLOOR);
        g.fill();

        // Areia
        const sand = g.createLinearGradient(0, FLOOR - 10, 0, H);
        sand.addColorStop(0, '#8f8a67');
        sand.addColorStop(1, '#4f4a36');
        g.fillStyle = sand;
        g.beginPath();
        g.moveTo(0, FLOOR);
        for (let x = 0; x <= W; x += 40) {
            g.quadraticCurveTo(x + 20, FLOOR - 8 * Math.sin(x * 0.05), x + 40, FLOOR);
        }
        g.lineTo(W, H);
        g.lineTo(0, H);
        g.fill();

        // Pedrinhas
        for (let i = 0; i < 60; i++) {
            g.fillStyle = `rgba(40, 35, 25, ${0.2 + Math.random() * 0.3})`;
            g.beginPath();
            g.ellipse(Math.random() * W, FLOOR + 12 + Math.random() * 55, 2 + Math.random() * 4, 1.5 + Math.random() * 2, 0, 0, Math.PI * 2);
            g.fill();
        }

        // Corais
        const corals = [[90, '#ff6f91'], [330, '#ff9f45'], [560, '#c86bfa'], [860, '#ff6f91']];
        for (const [cx, color] of corals) {
            g.fillStyle = color;
            g.globalAlpha = 0.75;
            for (let i = 0; i < 7; i++) {
                g.beginPath();
                g.arc(cx + (i - 3) * 7, FLOOR - 6 - Math.abs(3 - i) * -3 - (i % 2) * 10, 7 + (i % 3) * 2, 0, Math.PI * 2);
                g.fill();
            }
            g.globalAlpha = 1;
        }
    }

    // Algas que balançam
    const seaweeds = [];
    for (let i = 0; i < 14; i++) {
        seaweeds.push({
            x: 20 + i * 70 + Math.random() * 30,
            h: 50 + Math.random() * 70,
            phase: Math.random() * Math.PI * 2,
            color: Math.random() > 0.5 ? '#2f9e5b' : '#1f7a45'
        });
    }

    // ---------------- ESTADO DO JOGO ----------------
    let state;          // 'countdown' | 'playing' | 'paused' | 'over'
    let player, trash, jellies, oxygenBubbles, fishes, particles, floatingTexts;
    let score, collected, byType, kg, combo, comboCount, comboTimer, maxCombo;
    let elapsed, oxygenLevel, shake, time;
    let trashTimer, jellyTimer, oxygenTimer, fishTimer, bubbleTimer, alarmTimer;
    let countdownValue, countdownTimer;
    let endReason;

    const keys = {};
    const pointer = { active: false, x: 0, y: 0 };

    function resetGame() {
        player = { x: 200, y: 250, vx: 0, vy: 0, facing: 1, hurtTimer: 0 };
        trash = [];
        jellies = [];
        oxygenBubbles = [];
        fishes = [];
        particles = [];
        floatingTexts = [];

        score = 0;
        collected = 0;
        byType = { garrafa: 0, lata: 0, sacola: 0, pneu: 0, rede: 0 };
        kg = 0;
        combo = 1;
        comboCount = 0;
        comboTimer = 0;
        maxCombo = 1;

        elapsed = 0;
        oxygenLevel = 100;
        shake = 0;
        time = 0;

        trashTimer = 0.3;
        jellyTimer = 4;
        oxygenTimer = 9;
        fishTimer = 0;
        bubbleTimer = 0;
        alarmTimer = 0;

        // Alguns lixos já começam no fundo
        for (let i = 0; i < 4; i++) {
            const t = spawnTrash();
            t.y = FLOOR - t.raio * 0.5;
            t.resting = true;
        }
        for (let i = 0; i < 4; i++) spawnFish(true);

        startCountdown();
        updateHud();
    }

    // ---------------- CRIAÇÃO DE ELEMENTOS ----------------
    function randomTrashType() {
        const types = Object.keys(TRASH_TYPES);
        const total = types.reduce((sum, t) => sum + TRASH_TYPES[t].chance, 0);
        let r = Math.random() * total;
        for (const t of types) {
            r -= TRASH_TYPES[t].chance;
            if (r <= 0) return t;
        }
        return types[0];
    }

    function spawnTrash() {
        const type = randomTrashType();
        const info = TRASH_TYPES[type];
        const item = {
            type,
            x: 50 + Math.random() * (W - 100),
            y: -30,
            raio: info.raio,
            afunda: info.afunda * (0.85 + Math.random() * 0.3),
            angle: Math.random() * Math.PI,
            spin: (Math.random() - 0.5) * 1.5,
            sway: Math.random() * Math.PI * 2,
            resting: false
        };
        trash.push(item);
        return item;
    }

    function spawnJelly() {
        const fromLeft = Math.random() > 0.5;
        jellies.push({
            x: fromLeft ? -30 : W + 30,
            baseY: 110 + Math.random() * 280,
            y: 0,
            vx: (fromLeft ? 1 : -1) * (35 + Math.random() * 35 + difficulty() * 30),
            phase: Math.random() * Math.PI * 2
        });
    }

    function spawnOxygen() {
        oxygenBubbles.push({
            x: 80 + Math.random() * (W - 160),
            y: FLOOR + 10,
            phase: Math.random() * Math.PI * 2
        });
    }

    function spawnFish(anywhere) {
        const fromLeft = Math.random() > 0.5;
        const colors = ['#ffd23f', '#ff8c42', '#47B9D4', '#9be15d', '#ff6f91'];
        fishes.push({
            x: anywhere ? Math.random() * W : (fromLeft ? -30 : W + 30),
            y: 60 + Math.random() * 330,
            vx: (fromLeft ? 1 : -1) * (40 + Math.random() * 60),
            scale: 0.6 + Math.random() * 0.6,
            color: colors[Math.floor(Math.random() * colors.length)],
            phase: Math.random() * 10
        });
    }

    function addParticles(x, y, color, amount) {
        for (let i = 0; i < amount; i++) {
            const a = Math.random() * Math.PI * 2;
            const s = 60 + Math.random() * 120;
            particles.push({
                x, y,
                vx: Math.cos(a) * s,
                vy: Math.sin(a) * s,
                life: 0.6 + Math.random() * 0.4,
                max: 1,
                size: 2 + Math.random() * 3,
                color,
                bubble: false
            });
        }
    }

    function addBubble(x, y) {
        particles.push({
            x, y,
            vx: (Math.random() - 0.5) * 15,
            vy: -40 - Math.random() * 30,
            life: 1.5,
            max: 1.5,
            size: 2 + Math.random() * 3,
            color: 'rgba(220, 245, 255, 0.8)',
            bubble: true
        });
    }

    function addText(x, y, text, color) {
        floatingTexts.push({ x, y, text, color, life: 1 });
    }

    function difficulty() {
        return Math.min(elapsed / GAME_TIME, 1);
    }

    // ---------------- CONTAGEM REGRESSIVA ----------------
    function startCountdown() {
        state = 'countdown';
        countdownValue = 3;
        countdownTimer = 1;
        showCountdown('3');
        sfx.count(false);
    }

    function showCountdown(text) {
        countdownEl.textContent = text;
        countdownEl.classList.remove('pop');
        void countdownEl.offsetWidth; // reinicia a animação
        countdownEl.classList.add('pop');
        countdownEl.hidden = false;
    }

    function updateCountdown(dt) {
        countdownTimer -= dt;
        if (countdownTimer > 0) return;

        countdownValue--;
        countdownTimer = 1;

        if (countdownValue > 0) {
            showCountdown(String(countdownValue));
            sfx.count(false);
        } else if (countdownValue === 0) {
            showCountdown('Mergulhe!');
            sfx.count(true);
            state = 'playing';
            setTimeout(() => { countdownEl.hidden = true; }, 700);
        }
    }

    // ---------------- ATUALIZAÇÃO ----------------
    function update(dt) {
        elapsed += dt;
        const diff = difficulty();

        // Tempo e oxigênio
        oxygenLevel -= OXYGEN_DRAIN * dt;
        if (oxygenLevel <= 0) {
            oxygenLevel = 0;
            return endGame('oxigenio');
        }
        if (elapsed >= GAME_TIME) {
            elapsed = GAME_TIME;
            return endGame('tempo');
        }

        if (oxygenLevel < 25) {
            alarmTimer -= dt;
            if (alarmTimer <= 0) {
                sfx.alarm();
                alarmTimer = 1;
            }
        }

        // Combo
        if (comboTimer > 0) {
            comboTimer -= dt;
            if (comboTimer <= 0) {
                combo = 1;
                comboCount = 0;
            }
        }

        updatePlayer(dt);

        // Surgimento de elementos (fica mais difícil com o tempo)
        trashTimer -= dt;
        if (trashTimer <= 0) {
            spawnTrash();
            trashTimer = 1.35 - diff * 0.65;
        }

        jellyTimer -= dt;
        if (jellyTimer <= 0) {
            if (jellies.length < 1 + Math.floor(diff * 4)) spawnJelly();
            jellyTimer = 3.2 - diff * 1.5;
        }

        oxygenTimer -= dt;
        if (oxygenTimer <= 0) {
            spawnOxygen();
            oxygenTimer = 8 + Math.random() * 4;
        }

        fishTimer -= dt;
        if (fishTimer <= 0) {
            spawnFish(false);
            fishTimer = 2 + Math.random() * 2;
        }

        updateTrash(dt);
        updateJellies(dt);
        updateOxygen(dt);
        updateFishes(dt);
        updateEffects(dt);

        if (shake > 0) shake = Math.max(0, shake - dt * 30);
    }

    function updatePlayer(dt) {
        let ix = 0;
        let iy = 0;

        if (keys.ArrowLeft || keys.KeyA) ix -= 1;
        if (keys.ArrowRight || keys.KeyD) ix += 1;
        if (keys.ArrowUp || keys.KeyW) iy -= 1;
        if (keys.ArrowDown || keys.KeyS) iy += 1;

        if (ix === 0 && iy === 0 && pointer.active) {
            const dx = pointer.x - player.x;
            const dy = pointer.y - player.y;
            const dist = Math.hypot(dx, dy);
            if (dist > 10) {
                const strength = Math.min(1, dist / 80);
                ix = (dx / dist) * strength;
                iy = (dy / dist) * strength;
            }
        }

        const len = Math.hypot(ix, iy);
        if (len > 1) {
            ix /= len;
            iy /= len;
        }

        const control = player.hurtTimer > 1 ? 0.3 : 1;
        const smooth = Math.min(1, 5 * dt);
        player.vx += (ix * MAX_SPEED * control - player.vx) * smooth;
        player.vy += (iy * MAX_SPEED * control - player.vy) * smooth;

        player.x += player.vx * dt;
        player.y += player.vy * dt;

        player.x = Math.max(45, Math.min(W - 45, player.x));
        player.y = Math.max(40, Math.min(FLOOR - 22, player.y));

        if (Math.abs(player.vx) > 15) player.facing = player.vx > 0 ? 1 : -1;
        if (player.hurtTimer > 0) player.hurtTimer -= dt;

        // Bolhas saindo do regulador
        bubbleTimer -= dt;
        if (bubbleTimer <= 0) {
            addBubble(player.x + player.facing * 40, player.y - 8);
            bubbleTimer = 0.35 + Math.random() * 0.3;
        }
    }

    function updateTrash(dt) {
        for (let i = trash.length - 1; i >= 0; i--) {
            const t = trash[i];

            if (!t.resting) {
                t.sway += dt * 2;
                t.y += t.afunda * dt;
                t.x += Math.sin(t.sway) * 20 * dt;
                t.angle += t.spin * dt;
                const restY = FLOOR - t.raio * 0.5;
                if (t.y >= restY) {
                    t.y = restY;
                    t.resting = true;
                    addParticles(t.x, FLOOR, 'rgba(180, 170, 130, 0.7)', 6);
                }
            }

            if (Math.hypot(t.x - player.x, t.y - player.y) < t.raio + PICK_RADIUS) {
                collectTrash(t);
                trash.splice(i, 1);
            }
        }
    }

    function collectTrash(t) {
        const info = TRASH_TYPES[t.type];

        comboCount++;
        comboTimer = 2.5;
        combo = Math.min(5, 1 + Math.floor(comboCount / 3));
        maxCombo = Math.max(maxCombo, combo);

        const points = info.pontos * combo;
        score += points;
        collected++;
        byType[t.type]++;
        kg += info.kg;

        addParticles(t.x, t.y, '#ffd23f', 12);
        addText(t.x, t.y - 20, `+${points}`, combo > 1 ? '#ffd23f' : '#ffffff');
        sfx.collect(combo);
    }

    function updateJellies(dt) {
        for (let i = jellies.length - 1; i >= 0; i--) {
            const j = jellies[i];
            j.phase += dt;
            j.x += j.vx * dt;
            j.y = j.baseY + Math.sin(j.phase * 1.5) * 35;

            if (j.x < -60 || j.x > W + 60) {
                jellies.splice(i, 1);
                continue;
            }

            if (player.hurtTimer <= 0 && Math.hypot(j.x - player.x, j.y + 8 - player.y) < 42) {
                player.hurtTimer = 1.6;
                oxygenLevel = Math.max(0, oxygenLevel - JELLY_DAMAGE);
                combo = 1;
                comboCount = 0;
                comboTimer = 0;
                shake = 10;
                player.vx = Math.sign(player.x - j.x || 1) * 250;
                player.vy = -120;
                addParticles(player.x, player.y, '#ff5ab8', 16);
                addText(player.x, player.y - 40, `-${JELLY_DAMAGE}% O₂`, '#ff7ac8');
                sfx.hurt();
            }
        }
    }

    function updateOxygen(dt) {
        for (let i = oxygenBubbles.length - 1; i >= 0; i--) {
            const o = oxygenBubbles[i];
            o.phase += dt;
            o.y -= 45 * dt;
            o.x += Math.sin(o.phase * 2) * 25 * dt;

            if (o.y < -30) {
                oxygenBubbles.splice(i, 1);
                continue;
            }

            if (Math.hypot(o.x - player.x, o.y - player.y) < 45) {
                oxygenLevel = Math.min(100, oxygenLevel + OXYGEN_BONUS);
                addParticles(o.x, o.y, 'rgba(180, 240, 255, 0.9)', 14);
                addText(o.x, o.y - 25, `+${OXYGEN_BONUS}% O₂`, '#8ff0ff');
                sfx.oxygen();
                oxygenBubbles.splice(i, 1);
            }
        }
    }

    function updateFishes(dt) {
        for (let i = fishes.length - 1; i >= 0; i--) {
            const f = fishes[i];
            f.x += f.vx * dt;
            f.phase += dt;
            if (f.x < -50 || f.x > W + 50) fishes.splice(i, 1);
        }
    }

    function updateEffects(dt) {
        for (let i = particles.length - 1; i >= 0; i--) {
            const p = particles[i];
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            if (!p.bubble) {
                p.vx *= 0.92;
                p.vy *= 0.92;
            }
            p.life -= dt;
            if (p.life <= 0 || p.y < -10) particles.splice(i, 1);
        }

        for (let i = floatingTexts.length - 1; i >= 0; i--) {
            const t = floatingTexts[i];
            t.y -= 40 * dt;
            t.life -= dt;
            if (t.life <= 0) floatingTexts.splice(i, 1);
        }
    }

    // ---------------- DESENHO ----------------
    function render() {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, W, H);

        ctx.save();
        if (shake > 0) {
            ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);
        }

        ctx.drawImage(background, 0, 0, W, H);
        drawLightRays();

        // Peixes ao fundo
        for (const f of fishes) {
            ctx.save();
            ctx.globalAlpha = 0.55;
            ctx.translate(f.x, f.y);
            ctx.scale(f.scale * Math.sign(f.vx), f.scale);
            Draw.fish(ctx, f.color, f.phase);
            ctx.restore();
        }

        drawSeaweed();

        for (const t of trash) {
            ctx.save();
            ctx.translate(t.x, t.y);
            ctx.rotate(t.resting ? t.angle * 0.3 : t.angle);
            // brilho para o jogador enxergar o lixo
            ctx.shadowColor = 'rgba(255, 230, 120, 0.6)';
            ctx.shadowBlur = 10;
            Draw.trash(ctx, t.type);
            ctx.restore();
        }

        for (const o of oxygenBubbles) {
            ctx.save();
            ctx.translate(o.x, o.y);
            Draw.oxygen(ctx, o.phase);
            ctx.restore();
        }

        for (const j of jellies) {
            ctx.save();
            ctx.translate(j.x, j.y);
            ctx.shadowColor = 'rgba(255, 100, 200, 0.8)';
            ctx.shadowBlur = 16;
            Draw.jelly(ctx, j.phase);
            ctx.restore();
        }

        drawPlayer();

        for (const p of particles) {
            ctx.globalAlpha = Math.max(0, p.life / p.max);
            if (p.bubble) {
                ctx.strokeStyle = p.color;
                ctx.lineWidth = 1.2;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.stroke();
            } else {
                ctx.fillStyle = p.color;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        ctx.globalAlpha = 1;

        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = 'bold 20px Montserrat, sans-serif';
        for (const t of floatingTexts) {
            ctx.globalAlpha = Math.max(0, t.life);
            ctx.fillStyle = t.color;
            ctx.strokeStyle = 'rgba(0, 20, 50, 0.7)';
            ctx.lineWidth = 4;
            ctx.strokeText(t.text, t.x, t.y);
            ctx.fillText(t.text, t.x, t.y);
        }
        ctx.globalAlpha = 1;

        ctx.restore();

        drawVignette();
    }

    function drawPlayer() {
        const speed = Math.min(1, Math.hypot(player.vx, player.vy) / MAX_SPEED);
        ctx.save();
        ctx.translate(player.x, player.y);
        ctx.scale(player.facing, 1);
        ctx.rotate((player.vy / MAX_SPEED) * 0.35);
        if (player.hurtTimer > 0 && Math.floor(player.hurtTimer * 10) % 2 === 0) {
            ctx.globalAlpha = 0.35;
        }
        Draw.diver(ctx, time, speed);
        ctx.restore();
    }

    function drawLightRays() {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        for (let i = 0; i < 5; i++) {
            const x = 120 + i * 190 + Math.sin(time * 0.3 + i) * 40;
            const alpha = 0.035 + Math.sin(time * 0.8 + i * 2) * 0.02;
            const g = ctx.createLinearGradient(0, 0, 0, FLOOR);
            g.addColorStop(0, `rgba(200, 240, 255, ${alpha * 2})`);
            g.addColorStop(1, 'rgba(200, 240, 255, 0)');
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.moveTo(x - 25, 0);
            ctx.lineTo(x + 25, 0);
            ctx.lineTo(x + 110, FLOOR);
            ctx.lineTo(x - 20, FLOOR);
            ctx.fill();
        }
        ctx.restore();
    }

    function drawSeaweed() {
        ctx.lineCap = 'round';
        for (const s of seaweeds) {
            ctx.strokeStyle = s.color;
            ctx.lineWidth = 6;
            ctx.beginPath();
            ctx.moveTo(s.x, FLOOR + 6);
            const segments = 6;
            for (let i = 1; i <= segments; i++) {
                const y = FLOOR + 6 - (s.h / segments) * i;
                const x = s.x + Math.sin(time * 1.5 + s.phase + i * 0.6) * i * 2.2;
                ctx.lineTo(x, y);
            }
            ctx.stroke();
        }
    }

    function drawVignette() {
        const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 0.95);
        g.addColorStop(0, 'rgba(0, 0, 0, 0)');
        g.addColorStop(1, 'rgba(0, 10, 30, 0.55)');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, W, H);

        // Alerta vermelho quando o oxigênio está acabando
        if (state === 'playing' && oxygenLevel < 25) {
            const pulse = (Math.sin(time * 8) + 1) / 2;
            const r = ctx.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H);
            r.addColorStop(0, 'rgba(255, 0, 0, 0)');
            r.addColorStop(1, `rgba(255, 30, 60, ${0.15 + pulse * 0.25})`);
            ctx.fillStyle = r;
            ctx.fillRect(0, 0, W, H);
        }
    }

    // ---------------- PAINEL (HUD) ----------------
    function formatTime(seconds) {
        const s = Math.ceil(seconds);
        return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
    }

    function updateHud() {
        hud.score.textContent = score;
        hud.time.textContent = formatTime(GAME_TIME - elapsed);
        hud.trash.textContent = collected;
        hud.combo.textContent = `x${combo}`;
        hud.combo.classList.toggle('hot', combo > 1);
        hud.oxygen.style.width = `${oxygenLevel}%`;
        hud.oxygenBox.classList.toggle('low', oxygenLevel < 25);
    }

    // ---------------- PAUSA E FIM ----------------
    function pauseGame() {
        if (state !== 'playing' && state !== 'countdown') return;
        state = 'paused';
        pauseMenu.hidden = false;
        countdownEl.hidden = true;
        btnPause.innerHTML = '<i class="fa-solid fa-play"></i>';
        btnPause.setAttribute('aria-label', 'Continuar');
        document.getElementById('btn-resume').focus();
    }

    function resumeGame() {
        if (state !== 'paused') return;
        pauseMenu.hidden = true;
        btnPause.innerHTML = '<i class="fa-solid fa-pause"></i>';
        btnPause.setAttribute('aria-label', 'Pausar');
        startCountdown();
        lastFrame = performance.now();
    }

    function endGame(reason) {
        if (state === 'over') return;
        state = 'over';
        endReason = reason;
        updateHud();
        sfx.end();

        gameOverTitle.textContent = reason === 'oxigenio' ? 'Sem oxigênio!' : 'Tempo esgotado!';
        gameOverEl.hidden = false;

        const previous = parseInt(readStorage(RECORD_KEY), 10) || 0;
        const isRecord = score > previous;
        if (isRecord) writeStorage(RECORD_KEY, String(score));

        const params = new URLSearchParams({
            pontos: score,
            lixo: collected,
            garrafa: byType.garrafa,
            lata: byType.lata,
            sacola: byType.sacola,
            pneu: byType.pneu,
            rede: byType.rede,
            kg: kg.toFixed(2),
            combo: maxCombo,
            tempo: Math.round(elapsed),
            motivo: endReason,
            recorde: isRecord ? 1 : 0
        });

        setTimeout(() => {
            window.location.href = `./jogo-resultado.html?${params.toString()}`;
        }, 2000);
    }

    // ---------------- LAÇO PRINCIPAL ----------------
    let lastFrame = performance.now();

    function loop(now) {
        const dt = Math.min((now - lastFrame) / 1000, 0.05);
        lastFrame = now;

        if (state !== 'paused') time += dt;

        if (state === 'countdown') updateCountdown(dt);
        else if (state === 'playing') update(dt);

        if (state === 'countdown' || state === 'over') {
            updateEffects(dt);
            updateFishes(dt);
        }

        render();
        if (state !== 'paused') updateHud();
        requestAnimationFrame(loop);
    }

    // ---------------- CONTROLES ----------------
    const GAME_KEYS = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'KeyA', 'KeyD', 'KeyW', 'KeyS'];

    window.addEventListener('keydown', (e) => {
        initAudio();
        if (GAME_KEYS.includes(e.code)) {
            keys[e.code] = true;
            e.preventDefault();
        }
        if (e.code === 'Escape' || e.code === 'KeyP') {
            if (state === 'paused') resumeGame();
            else pauseGame();
        }
    });

    window.addEventListener('keyup', (e) => {
        keys[e.code] = false;
    });

    function toGameCoords(e) {
        const rect = canvas.getBoundingClientRect();
        pointer.x = ((e.clientX - rect.left) / rect.width) * W;
        pointer.y = ((e.clientY - rect.top) / rect.height) * H;
    }

    canvas.addEventListener('pointerdown', (e) => {
        initAudio();
        pointer.active = true;
        toGameCoords(e);
        canvas.setPointerCapture(e.pointerId);
    });

    canvas.addEventListener('pointermove', (e) => {
        if (pointer.active) toGameCoords(e);
    });

    ['pointerup', 'pointercancel'].forEach((type) => {
        canvas.addEventListener(type, () => { pointer.active = false; });
    });

    // Pausa sozinho quando o jogador troca de aba
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) pauseGame();
    });

    window.addEventListener('blur', () => {
        for (const k in keys) keys[k] = false;
    });

    btnPause.addEventListener('click', () => {
        initAudio();
        if (state === 'paused') resumeGame();
        else pauseGame();
    });

    btnMute.addEventListener('click', () => {
        initAudio();
        muted = !muted;
        writeStorage(MUTE_KEY, muted ? '1' : '0');
        updateMuteButton();
    });

    document.getElementById('btn-resume').addEventListener('click', resumeGame);

    document.getElementById('btn-restart').addEventListener('click', () => {
        pauseMenu.hidden = true;
        btnPause.innerHTML = '<i class="fa-solid fa-pause"></i>';
        resetGame();
    });

    // ---------------- INÍCIO ----------------
    updateMuteButton();
    resetGame();
    requestAnimationFrame(loop);
})();
