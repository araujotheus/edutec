// Botão "Compartilhar": usa o compartilhamento nativo do celular
// ou copia o link da página quando não estiver disponível.
const shareButton = document.querySelector('.share-btn');

if (shareButton) {
    shareButton.addEventListener('click', async () => {
        const data = { title: document.title, url: window.location.href };

        try {
            if (navigator.share) {
                await navigator.share(data);
            } else {
                await navigator.clipboard.writeText(data.url);
                alert('Link copiado!');
            }
        } catch (error) {
            // Usuário cancelou o compartilhamento
        }
    });
}

// Formulário da newsletter (página Como Ajudar)
const newsletterForm = document.getElementById('newsletter-form');

if (newsletterForm) {
    newsletterForm.addEventListener('submit', (event) => {
        event.preventDefault();
        document.getElementById('form-message').textContent = 'Obrigado por assinar! Em breve você receberá novidades.';
        newsletterForm.reset();
    });
}
