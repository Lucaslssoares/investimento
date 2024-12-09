document.getElementById('depositForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const valor = parseFloat(document.getElementById('valor').value);
    const depositButton = document.getElementById('depositButton');
    const loadingIndicator = document.getElementById('loading');
    const qrcodeContainer = document.getElementById('qrcodeContainer');
    const emailStatus = document.getElementById('emailStatus');

    if (isNaN(valor) || valor <= 0) {
      alert('Por favor, insira um valor válido para o depósito.');
      return;
    }

    depositButton.disabled = true; // Desativa o botão
    loadingIndicator.style.display = 'block'; // Exibe o indicador de carregamento
    qrcodeContainer.innerHTML = ''; // Limpa o conteúdo anterior
    emailStatus.style.display = 'none'; // Esconde a mensagem de sucesso anterior

    try {
      const response = await fetch('http://localhost:3000/depositos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ valor })
      });

      const data = await response.json();
      if (response.ok) {
        qrcodeContainer.innerHTML = `
          <img src="${data.qrCode}" alt="QR Code para depósito" class="img-fluid">
          <p class="mt-3">Escaneie o QR Code acima para completar o depósito.</p>
        `;
        emailStatus.style.display = 'block'; // Exibe a mensagem de sucesso
      } else {
        alert(data.error || 'Erro ao gerar QR Code.');
      }
    } catch (error) {
      console.error('Erro ao gerar QR Code:', error);
      alert('Não foi possível conectar ao servidor. Tente novamente mais tarde.');
    } finally {
      depositButton.disabled = false; // Reativa o botão
      loadingIndicator.style.display = 'none'; // Esconde o indicador de carregamento
    }
  });