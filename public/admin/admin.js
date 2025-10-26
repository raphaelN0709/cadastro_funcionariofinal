const API_URL = '/api/employees';
const tableBody = document.querySelector('#employeeTable tbody');
const form = document.getElementById('employeeForm');

let allEmployees = []; // Armazena todos os funcionários

// Carrega todos os funcionários
async function loadEmployees() {
  const response = await fetch(API_URL);
  allEmployees = await response.json();
  renderEmployees(allEmployees);
  loadExpiringCertificates();
}

// Renderiza a tabela de funcionários
function renderEmployees(employeesToRender) {
  tableBody.innerHTML = employeesToRender.map(emp => `
    <tr>
      <td data-label="ID">${emp._id}</td>
      <td data-label="Nome">${emp.nome}</td>
      <td data-label="CPF">${emp.cpf}</td>
      <td data-label="RG">${emp.rg}</td>
      <td data-label="Conta Bancária">${emp.conta_bancaria}</td>
      <td data-label="Endereço">${emp.endereco}</td>
      <td data-label="Função">${emp.funcao}</td>
      <td data-label="Vínculo">${emp.vinculo}</td>
      <td data-label="Data Validade Certificado">${emp.data_validade_certificado ? new Date(emp.data_validade_certificado).toLocaleDateString("pt-BR") : "N/A"}</td>
      <td data-label="Posto">${emp.tipo}</td>
      <td data-label="Ações">
        <button onclick="editEmployee('${emp._id}')">Editar</button>
        <button onclick="deleteEmployee('${emp._id}')">Excluir</button>
      </td>
    </tr>
  `).join('');
}

// Envia formulário (novo ou edição)
form.addEventListener('submit', async e => {
  e.preventDefault();

  const id = document.getElementById('employeeId').value;
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

// Edita funcionário
async function editEmployee(id) {
  const emp = allEmployees.find(e => e._id === id);
  if (!emp) return;

  document.getElementById('employeeId').value = emp._id;
  document.getElementById('nome').value = emp.nome;
  document.getElementById('cpf').value = emp.cpf;
  document.getElementById('rg').value = emp.rg;
  document.getElementById('conta_bancaria').value = emp.conta_bancaria;
  document.getElementById('endereco').value = emp.endereco;
  document.getElementById('funcao').value = emp.funcao;
  document.getElementById('vinculo').value = emp.vinculo;
  document.getElementById('tipo').value = emp.tipo;
  document.getElementById('data_validade_certificado').value = emp.data_validade_certificado ? new Date(emp.data_validade_certificado).toISOString().split('T')[0] : '';
}

// Deleta funcionário
async function deleteEmployee(id) {
  if (!confirm('Tem certeza que deseja excluir este funcionário?')) return;
  await fetch(`${API_URL}/${id}`, { method: 'DELETE' });
  loadEmployees();
}

// Limpa formulário
function clearForm() {
  form.reset();
  document.getElementById('employeeId').value = '';
}

// Filtra funcionários pelo nome
function filterEmployees() {
  const searchTerm = document.getElementById('searchName').value.toLowerCase();
  const filteredEmployees = allEmployees.filter(emp =>
    emp.nome.toLowerCase().includes(searchTerm)
  );
  renderEmployees(filteredEmployees);
}

// Carrega certificados próximos do vencimento
async function loadExpiringCertificates() {
  const response = await fetch('/api/employees/expiring');
  const expiringEmployees = await response.json();
  const expiringCertificatesDiv = document.getElementById('expiringCertificates');

  if (expiringEmployees.length > 0) {
    expiringCertificatesDiv.innerHTML = '';
    expiringEmployees.forEach(emp => {
      const expiryDate = new Date(emp.data_validade_certificado).toLocaleDateString("pt-BR");
      const p = document.createElement("p");
      p.textContent = `Atenção: O certificado de ${emp.nome} vence em ${expiryDate}!`;
      expiringCertificatesDiv.appendChild(p);
    });
  } else {
    expiringCertificatesDiv.textContent = "Nenhum certificado próximo do vencimento.";
  }
}

loadEmployees();
