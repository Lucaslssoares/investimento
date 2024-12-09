async function carregarHistorico() {
    try {
      const response = await fetch('http://localhost:3000/historico', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        const tableBody = document.getElementById('historicoTable');
        data.transacoes.forEach(transacao => {
          const row = document.createElement('tr');

          const dateCell = document.createElement('td');
          dateCell.textContent = new Date(transacao.data_transacao).toLocaleDateString();
          row.appendChild(dateCell);

          const typeCell = document.createElement('td');
          typeCell.textContent = transacao.tipo;
          row.appendChild(typeCell);

          const valueCell = document.createElement('td');
          valueCell.textContent = `R$ ${transacao.valor.toFixed(2)}`;
          row.appendChild(valueCell);

          tableBody.appendChild(row);
        });
      } else {
        const errorData = await response.json();
        alert(errorData.error || 'Erro ao carregar o histórico');
      }
    } catch (error) {
      console.error('Erro ao carregar histórico:', error);
    }
  }

  carregarHistorico();