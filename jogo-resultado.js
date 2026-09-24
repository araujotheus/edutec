// =====================================================
// JOGO "MERGULHO LIMPO" - TELA DE RESULTADO
// Lê o resultado enviado pela partida (pelo endereço da
// página) e monta o placar final.
// =====================================================

(function () {
    'use strict';

    const Draw = window.BlueMindDraw;
    const params = new URLSearchParams(window.location.search);

    // Lê um número do endereço com segurança
    function num(name, max) {
        const value = parseFloat(params.get(name));
        if (!Number.isFinite(value) || value < 0) return 0;
        return Math.min(value, max);
    }

    const score = Math.round(num('pontos', 1000000));
    const trash = Math.round(num('lixo', 100000));
    const kg = num('kg', 100000);
    const combo = Math.max(1, Math.round(num('combo', 5)));
    const time = Math.round(num('tempo', 600));
    const reason = params.get('motivo');
    const isRecord = params.get('recorde') === '1';

    // Sem resultado (página aberta direto): manda jogar
    if (!params.has('pontos')) {
        document.querySelector('.result-card h1').textContent = 'Nenhuma partida ainda';
        document.getElementById('fact').textContent = 'Jogue uma partida de Mergulho Limpo para ver seu resultado aqui.';
    }

    // Estrelas e título
    const stars = score >= 1500 ? 3 : score >= 900 ? 2 : score >= 400 ? 1 : 0;
    const ranks = ['Aprendiz do Mar', 'Mergulhador Consciente', 'Guardião dos Oceanos', 'Lenda BlueMind'];

    document.querySelectorAll('#stars i').forEach((star, i) => {
        if (i < stars) {
            star.classList.add('earned');
            star.style.animationDelay = `${0.3 + i * 0.25}s`;
        }
    });
    document.getElementById('stars').setAttribute('aria-label', `${stars} de 3 estrelas`);
    document.getElementById('rank').textContent = ranks[stars];

    // Motivo do fim
    const reasonEl = document.getElementById('result-reason');
    if (reason === 'oxigenio') {
        reasonEl.innerHTML = '<i class="fa-solid fa-lungs"></i> O OXIGÊNIO ACABOU';
    } else if (reason === 'tempo') {
        reasonEl.innerHTML = '<i class="fa-solid fa-stopwatch"></i> TEMPO ESGOTADO';
    }

    // Recorde
    let best = score;
    try {
        best = Math.max(score, parseInt(window.localStorage.getItem('bluemind-mergulho-recorde'), 10) || 0);
    } catch (e) {
        // sem armazenamento: mostra a pontuação atual
    }
    document.getElementById('best').textContent = best;
    document.getElementById('new-record').hidden = !(isRecord && score > 0);

    // Estatísticas
    document.getElementById('stat-trash').textContent = trash;
    document.getElementById('stat-kg').textContent = `${kg.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} kg`;
    document.getElementById('stat-combo').textContent = `x${combo}`;
    document.getElementById('stat-time').textContent = `${time}s`;

    ['garrafa', 'lata', 'sacola', 'pneu', 'rede'].forEach((type) => {
        document.getElementById(`count-${type}`).textContent = Math.round(num(type, 100000));
    });

    // Pontuação subindo aos poucos
    const scoreEl = document.getElementById('score');
    const duration = 1200;
    const start = performance.now();
    function countUp(now) {
        const progress = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        scoreEl.textContent = Math.round(score * eased);
        if (progress < 1) requestAnimationFrame(countUp);
    }
    requestAnimationFrame(countUp);

    // Curiosidade sobre o oceano
    const facts = [
        'Cerca de 11 milhões de toneladas de plástico chegam aos oceanos todos os anos.',
        'Uma garrafa plástica pode levar mais de 400 anos para se decompor no mar.',
        'Redes de pesca abandonadas, as "redes fantasma", continuam prendendo animais por décadas.',
        'Tartarugas marinhas confundem sacolas plásticas com águas-vivas, seu alimento.',
        'Mais da metade do oxigênio que respiramos é produzida pelos oceanos.',
        'A Inteligência Artificial já ajuda a mapear manchas de lixo no oceano usando imagens de satélite.'
    ];
    if (params.has('pontos')) {
        document.getElementById('fact').textContent = facts[Math.floor(Math.random() * facts.length)];
    }

    // Ícones do lixo
    document.querySelectorAll('[data-trash]').forEach((canvas) => {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const size = canvas.width;
        canvas.width = size * dpr;
        canvas.height = size * dpr;
        canvas.style.width = `${size}px`;
        canvas.style.height = `${size}px`;
        const ctx = canvas.getContext('2d');
        ctx.scale(dpr, dpr);
        ctx.translate(size / 2, size / 2);
        ctx.scale(size / 50, size / 50);
        Draw.trash(ctx, canvas.dataset.trash);
    });
})();
