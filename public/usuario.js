const API_URL = '/api/employees';
    const form = document.getElementById('employeeForm');

    form.addEventListener('submit', async e => {
      e.preventDefault();
      const data = {
      nome: document.getElementById('nome').value,
      cpf: document.getElementById('cpf').value,
      rg: document.getElementById('rg').value,
      conta_bancaria: document.getElementById('conta_bancaria').value,
      endereco: document.getElementById('endereco').value,
      funcao: document.getElementById('funcao').value,
      vinculo: document.getElementById('vinculo').value,
      tipo: document.getElementById('tipo').value,
      data_validade_certificado: document.getElementById('data_validade_certificado').value
      };
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (response.ok) {
        alert('Cadastrado com sucesso!');
        form.reset();
      } else {
         const erro = await response.json();
        alert('Erro: ' + (erro.error || 'Erro desconhecido.'));
      }
    });