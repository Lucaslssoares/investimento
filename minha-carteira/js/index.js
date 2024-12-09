document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const telefone = document.getElementById('telefone').value;
    const senha = document.getElementById('senha').value;
    const loginButton = document.getElementById('loginButton');

    loginButton.disabled = true; // Desabilita o botão durante a requisição
    loginButton.textContent = 'Carregando...';

    try {
      const response = await fetch('http://localhost:3000/auth/login', {  
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telefone, senha })
      });

      const data = await response.json();
      if (response.ok) {
        localStorage.setItem('token', data.token);
        window.location.href = '/home.html'; // Redireciona para o home
      } else {
        alert(data.error || 'Erro ao fazer login. Verifique suas credenciais.');
      }
    } catch (error) {
      console.error('Erro ao fazer login:', error);
      alert('Não foi possível conectar ao servidor. Tente novamente mais tarde.');
    } finally {
      loginButton.disabled = false; // Reabilita o botão
      loginButton.textContent = 'Entrar';
    }
  });