const API_URL = '/api/employees';
    const tableBody = document.querySelector('#employeeTable tbody');
    const form = document.getElementById('employeeForm');

    async function loadEmployees() {
      const response = await fetch(API_URL);
      const employees = await response.json();
      tableBody.innerHTML = employees.map(emp => `
        <tr>
          <td>${emp.id}</td>
          <td>${emp.nome}</td>
          <td>${emp.cpf}</td>
          <td>${emp.rg}</td>
          <td>${emp.conta_bancaria}</td>
          <td>${emp.endereco}</td>
          <td>${emp.funcao}</td>
          <td>${emp.vinculo}</td>
          <td>${emp.tipo}</td>
          <td>
            <button onclick="editEmployee(${emp.id})">Editar</button>
            <button onclick="deleteEmployee(${emp.id})">Excluir</button>
          </td>
        </tr>
      `).join('');
    }

    form.addEventListener('submit', async e => {
    e.preventDefault();

    const id = document.getElementById('employeeId').value;
    const data = {
      nome: nome.value,
      cpf: cpf.value,
      rg: rg.value,
      conta_bancaria: conta_bancaria.value,
      endereco: endereco.value,
      funcao: funcao.value,
      vinculo: vinculo.value,
      tipo: tipo.value
    };

    const method = id ? 'PUT' : 'POST';
    const url = id ? `${API_URL}/${id}` : API_URL;

    const response = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    if (response.ok) {
      alert('Funcionário salvo com sucesso.');
      clearForm();
      loadEmployees();
    } else {
      const erro = await response.json();
      alert('Erro: ' + (erro.error || 'Erro desconhecido.'));
    }
  });

    async function editEmployee(id) {
      const employees = await (await fetch(API_URL)).json();
      const emp = employees.find(e => e.id === id);
      if (!emp) return;
      document.getElementById('employeeId').value = emp.id;
      document.getElementById('nome').value = emp.nome;
      document.getElementById('cpf').value = emp.cpf;
      document.getElementById('rg').value = emp.rg;
      document.getElementById('conta_bancaria').value = emp.conta_bancaria;
      document.getElementById('endereco').value = emp.endereco;
      document.getElementById('funcao').value = emp.funcao;
      document.getElementById('vinculo').value = emp.vinculo;
      document.getElementById('tipo').value = emp.tipo;
    }

    async function deleteEmployee(id) {
      await fetch(`${API_URL}/${id}`, { method: 'DELETE' });
      loadEmployees();
    }

    function clearForm() {
      form.reset();
      document.getElementById('employeeId').value = '';
    }

    loadEmployees();