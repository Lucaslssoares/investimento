    // Verifica se há token armazenado
    const token = localStorage.getItem('token');
    if (!token) {
      window.location.href = '/index.html';
    }

    document.getElementById('logoutBtn').addEventListener('click', () => {
      localStorage.removeItem('token');
      window.location.href = '/index.html';
    });

    let saldoDisponivel = 0; // Variável para armazenar o saldo

    // Busca o saldo do usuário
    async function fetchSaldo() {
      try {
        const response = await fetch('http://localhost:3000/dashboard', {
          method: 'GET',
          headers: { 'Authorization': `Bearer ${token}` }
        });

        const data = await response.json();

        if (response.ok) {
          saldoDisponivel = data.saldo; // Atualiza a variável de saldo
          document.getElementById('saldoContainer').innerHTML = `
            <p><strong>Saldo Atual:</strong> R$ ${data.saldo}</p>
          `;
        } else {
          document.getElementById('saldoContainer').innerHTML = `<p>Erro ao carregar saldo.</p>`;
        }
      } catch (error) {
        console.error('Erro na requisição:', error);
        document.getElementById('saldoContainer').innerHTML = `<p>Erro ao carregar saldo.</p>`;
      }
    }

    fetchSaldo();

    // Função para realizar o investimento
    async function investir(opcao) {
      const valor = parseFloat(document.getElementById('valorInvestimento').value);

      if (!valor || valor <= 0) {
        alert('Por favor, insira um valor válido.');
        return;
      }

      if (valor < 80) {
        alert('O valor mínimo para investimento é R$80,00.');
        return;
      }

      if (valor > saldoDisponivel) {
        alert('Saldo insuficiente para realizar o investimento.');
        return;
      }

      try {
        const response = await fetch('http://localhost:3000/investimentos', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ valor, opcao })
        });

        const data = await response.json();

        if (response.ok) {
          document.getElementById('investimentoFeedback').innerHTML = `
            <div class="alert alert-success" role="alert">
              Investimento em ${opcao} realizado com sucesso!
            </div>
          `;
          fetchSaldo(); // Atualiza o saldo após o investimento
        } else {
          document.getElementById('investimentoFeedback').innerHTML = `
            <div class="alert alert-danger" role="alert">
              Erro: ${data.error || 'Não foi possível completar o investimento.'}
            </div>
          `;
        }
      } catch (error) {
        console.error('Erro ao realizar investimento:', error);
        document.getElementById('investimentoFeedback').innerHTML = `
          <div class="alert alert-danger" role="alert">
            Ocorreu um erro ao tentar realizar o investimento. Tente novamente mais tarde.
          </div>
        `;
      }
    }