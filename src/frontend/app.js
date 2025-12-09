// Configuração da API
const API_BASE_URL = "http://localhost:3000/api/extractions";

// Estado da aplicação
let currentExtractions = [];

// Inicialização
document.addEventListener("DOMContentLoaded", () => {
  loadExtractions();
  setupEventListeners();

  // Atualizar extrações automaticamente a cada 3 segundos se houver alguma em execução
  setInterval(() => {
    if (currentExtractions.some((e) => e.status === "running")) {
      loadExtractions();
    }
  }, 3000);
});

// Configurar event listeners
function setupEventListeners() {
  const form = document.getElementById("createExtractionForm");
  form.addEventListener("submit", handleCreateExtraction);
}

// Carregar todas as extrações
async function loadExtractions() {
  const listContainer = document.getElementById("extractionsList");

  try {
    listContainer.innerHTML = '<p class="loading">Carregando extrações...</p>';

    const response = await fetch(API_BASE_URL);
    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error || "Erro ao carregar extrações");
    }

    currentExtractions = data.data || [];
    renderExtractions();
  } catch (error) {
    console.error("Erro ao carregar extrações:", error);
    listContainer.innerHTML = `
            <div class="empty-state">
                <p>❌ Erro ao carregar extrações</p>
                <p style="font-size: 0.9rem; margin-top: 8px;">${error.message}</p>
            </div>
        `;
    showToast("Erro ao carregar extrações", "error");
  }
}

// Renderizar lista de extrações
function renderExtractions() {
  const listContainer = document.getElementById("extractionsList");

  if (currentExtractions.length === 0) {
    listContainer.innerHTML = `
            <div class="empty-state">
                <p>📋 Nenhuma extração encontrada</p>
                <p style="font-size: 0.9rem; margin-top: 8px;">Crie uma nova extração acima</p>
            </div>
        `;
    return;
  }

  const extractionsHtml = currentExtractions
    .map(
      (extraction) => `
        <div class="extraction-item">
            <div class="extraction-header">
                <div class="extraction-title">
                    ${extraction.repository_owner}/${extraction.repository_name}
                </div>
                <span class="status-badge status-${extraction.status}">
                    ${getStatusText(extraction.status)}
                </span>
            </div>
            
            ${
              extraction.status === "running"
                ? `
            <div class="progress-section">
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${
                      extraction.progress_percentage || 0
                    }%"></div>
                </div>
                <div class="progress-info">
                    <span>${extraction.progress_percentage || 0}%</span>
                    ${
                      extraction.current_step
                        ? `<span class="current-step">Etapa: ${getCurrentStepText(
                            extraction.current_step
                          )}</span>`
                        : ""
                    }
                </div>
                <div class="extraction-stats">
                    <span>📋 Issues: ${extraction.total_issues_fetched || 0}${
                    extraction.total_issues_expected
                      ? `/${extraction.total_issues_expected}`
                      : ""
                  }</span>
                    <span>🔀 PRs: ${extraction.total_prs_fetched || 0}${
                    extraction.total_prs_expected
                      ? `/${extraction.total_prs_expected}`
                      : ""
                  }</span>
                </div>
            </div>
            `
                : ""
            }
            
            <div class="extraction-info">
                <div><strong>ID:</strong> ${extraction.id}</div>
                <div><strong>Criado:</strong> ${formatDate(
                  extraction.created_at
                )}</div>
                <div><strong>Atualizado:</strong> ${formatDate(
                  extraction.updated_at
                )}</div>
            </div>
            
            <div class="extraction-actions">
                ${getActionButtons(extraction)}
            </div>
        </div>
    `
    )
    .join("");

  listContainer.innerHTML = extractionsHtml;
}

// Obter botões de ação baseado no status
function getActionButtons(extraction) {
  const buttons = [];

  // Botão de detalhes
  buttons.push(`
        <button class="btn btn-info" onclick="viewDetails('${extraction.id}')">
            👁️ Detalhes
        </button>
    `);

  // Botões baseados no status
  if (
    extraction.status === "pending" ||
    extraction.status === "paused" ||
    extraction.status === "failed"
  ) {
    const buttonText =
      extraction.status === "pending" ? "▶️ Iniciar" : "🔄 Retomar";
    buttons.push(`
            <button class="btn btn-success" onclick="startExtraction('${extraction.id}')">
                ${buttonText}
            </button>
        `);
  }

  if (extraction.status === "running") {
    buttons.push(`
            <button class="btn btn-danger" onclick="pauseExtraction('${extraction.id}')">
                ⏸️ Pausar
            </button>
        `);
  }

  return buttons.join("");
}

// Criar nova extração
async function handleCreateExtraction(event) {
  event.preventDefault();

  const owner = document.getElementById("owner").value.trim();
  const repoName = document.getElementById("repoName").value.trim();
  const token = document.getElementById("token").value.trim();

  if (!owner || !repoName) {
    showToast("Owner e nome do repositório são obrigatórios", "error");
    return;
  }

  try {
    const body = { owner, repoName };
    if (token) {
      body.token = token;
    }

    const response = await fetch(API_BASE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error || "Erro ao criar extração");
    }

    showToast("Extração criada com sucesso!", "success");

    // Limpar formulário
    document.getElementById("createExtractionForm").reset();

    // Recarregar lista
    await loadExtractions();
  } catch (error) {
    console.error("Erro ao criar extração:", error);
    showToast(error.message, "error");
  }
}

// Iniciar extração
async function startExtraction(id) {
  try {
    const token = prompt(
      "Token do GitHub (deixe vazio se configurado no .env):"
    );

    const body = {};
    if (token && token.trim()) {
      body.token = token.trim();
    }

    const response = await fetch(`${API_BASE_URL}/${id}/start`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error || "Erro ao iniciar extração");
    }

    // Buscar a extração atual para verificar se era failed/paused
    const currentExtraction = currentExtractions.find((e) => e.id === id);
    const wasRetrying =
      currentExtraction &&
      (currentExtraction.status === "failed" ||
        currentExtraction.status === "paused");

    showToast(
      wasRetrying
        ? "Extração retomada com sucesso!"
        : "Extração iniciada com sucesso!",
      "success"
    );
    await loadExtractions();
  } catch (error) {
    console.error("Erro ao iniciar extração:", error);
    showToast(error.message, "error");
  }
}

// Pausar extração
async function pauseExtraction(id) {
  if (!confirm("Deseja pausar esta extração?")) {
    return;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/${id}/pause`, {
      method: "POST",
    });

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error || "Erro ao pausar extração");
    }

    showToast("Extração pausada com sucesso!", "success");
    await loadExtractions();
  } catch (error) {
    console.error("Erro ao pausar extração:", error);
    showToast(error.message, "error");
  }
}

// Ver detalhes da extração
async function viewDetails(id) {
  const detailsSection = document.getElementById("extractionDetails");
  const detailsContent = document.getElementById("detailsContent");

  try {
    detailsContent.innerHTML = '<p class="loading">Carregando detalhes...</p>';
    detailsSection.style.display = "block";

    const response = await fetch(`${API_BASE_URL}/${id}`);
    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error || "Erro ao carregar detalhes");
    }

    const extraction = data.data;

    detailsContent.innerHTML = `
            <div class="details-grid">
                <div class="detail-item">
                    <div class="detail-label">ID:</div>
                    <div class="detail-value">${extraction.id}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Repositório:</div>
                    <div class="detail-value">${extraction.repository_owner}/${
      extraction.repository_name
    }</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Status:</div>
                    <div class="detail-value">
                        <span class="status-badge status-${extraction.status}">
                            ${getStatusText(extraction.status)}
                        </span>
                    </div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Criado em:</div>
                    <div class="detail-value">${formatDate(
                      extraction.created_at
                    )}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Última atualização:</div>
                    <div class="detail-value">${formatDate(
                      extraction.updated_at
                    )}</div>
                </div>
                ${
                  extraction.started_at
                    ? `
                <div class="detail-item">
                    <div class="detail-label">Iniciado em:</div>
                    <div class="detail-value">${formatDate(
                      extraction.started_at
                    )}</div>
                </div>
                `
                    : ""
                }
                ${
                  extraction.completed_at
                    ? `
                <div class="detail-item">
                    <div class="detail-label">Completado em:</div>
                    <div class="detail-value">${formatDate(
                      extraction.completed_at
                    )}</div>
                </div>
                `
                    : ""
                }
                <div class="detail-item">
                    <div class="detail-label">Progresso:</div>
                    <div class="detail-value">${
                      extraction.progress_percentage || 0
                    }%</div>
                </div>
                ${
                  extraction.current_step
                    ? `
                <div class="detail-item">
                    <div class="detail-label">Etapa Atual:</div>
                    <div class="detail-value">${getCurrentStepText(
                      extraction.current_step
                    )}</div>
                </div>
                `
                    : ""
                }
                <div class="detail-item">
                    <div class="detail-label">Issues Extraídas:</div>
                    <div class="detail-value">${
                      extraction.total_issues_fetched || 0
                    }${
      extraction.total_issues_expected
        ? ` / ${extraction.total_issues_expected}`
        : ""
    }</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Pull Requests:</div>
                    <div class="detail-value">${
                      extraction.total_prs_fetched || 0
                    }${
      extraction.total_prs_expected ? ` / ${extraction.total_prs_expected}` : ""
    }</div>
                </div>
                ${
                  extraction.error_message
                    ? `
                <div class="detail-item">
                    <div class="detail-label">Erro:</div>
                    <div class="detail-value" style="color: var(--danger-color);">${extraction.error_message}</div>
                </div>
                `
                    : ""
                }
            </div>
        `;

    // Scroll suave até os detalhes
    detailsSection.scrollIntoView({ behavior: "smooth", block: "nearest" });
  } catch (error) {
    console.error("Erro ao carregar detalhes:", error);
    detailsContent.innerHTML = `
            <p style="color: var(--danger-color);">❌ ${error.message}</p>
        `;
  }
}

// Formatar data
function formatDate(dateString) {
  if (!dateString) return "-";

  const date = new Date(dateString);
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

// Obter texto do status
function getStatusText(status) {
  const statusMap = {
    pending: "Pendente",
    running: "Executando",
    completed: "Concluído",
    paused: "Pausado",
    failed: "Falhou",
    error: "Erro",
  };

  return statusMap[status] || status;
}

// Obter texto da etapa atual
function getCurrentStepText(step) {
  const stepMap = {
    issues: "Extraindo Issues",
    pull_requests: "Extraindo Pull Requests",
    commits: "Extraindo Commits",
    completed: "Finalizado",
  };

  return stepMap[step] || step;
}

// Mostrar notificação toast
function showToast(message, type = "info") {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.className = `toast ${type}`;

  // Forçar reflow para reiniciar animação
  void toast.offsetWidth;

  toast.classList.add("show");

  setTimeout(() => {
    toast.classList.remove("show");
  }, 3000);
}
