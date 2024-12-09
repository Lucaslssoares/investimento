   // Função para carregar o bônus do usuário
   async function carregarBonus() {
    try {
      const response = await fetch('http://localhost:3000/dashboard', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      const data = await response.json();
      if (response.ok) {
        const bonus = data.bonus || 0; // Verifica o valor de bônus
        document.getElementById('bonusDisponivel').textContent = `R$ ${bonus.toFixed(2)}`;
        document.getElementById('btnSacar').disabled = bonus <= 0;
      } else {
        alert(data.error);
      }
    } catch (error) {
      console.error('Erro ao carregar bônus:', error);
    }
  }

  // Função para sacar o bônus
  async function sacarBonus() {
    try {
      const response = await fetch('http://localhost:3000/bonus/sacar', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      if (response.ok) {
        document.getElementById('statusSaque').innerHTML = `
          <div class="alert alert-success">
            Saque de R$ ${data.valor.toFixed(2)} realizado com sucesso!
          </div>
        `;
        carregarBonus();
      } else {
        document.getElementById('statusSaque').innerHTML = `
          <div class="alert alert-danger">${data.error}</div>
        `;
      }
    } catch (error) {
      console.error('Erro ao sacar bônus:', error);
    }
  }

  // Vincula o evento ao botão de saque
  document.getElementById('btnSacar').addEventListener('click', sacarBonus);

  // Carrega o valor do bônus ao abrir a página
  carregarBonus();