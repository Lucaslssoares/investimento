document.getElementById('registerForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const telefone = document.getElementById('telefone').value;
    const senha = document.getElementById('senha').value;

    try {
      const response = await fetch('http://localhost:3000/auth/register', { // Rota ajustada
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telefone, senha })
      });

      const data = await response.json();
      if (response.ok) {
        alert('Cadastro realizado com sucesso!');
        window.location.href = '/index.html'; // Redireciona para o login
      } else {
        alert(data.error);
      }
    } catch (error) {
      console.error('Erro ao realizar cadastro:', error);
      alert('Erro ao realizar cadastro. Tente novamente mais tarde.');
    }
  });