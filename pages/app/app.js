Handlebars.registerHelper('json', context => JSON.stringify(context));
Handlebars.registerHelper('eq', (a, b) => a === b);
Handlebars.registerHelper('contains', (arr, item) => arr && arr.includes(item));

// Resizer Global Logic
let isResizing = false;
if (!window._resizerEventsAttached) {
  document.addEventListener('mousemove', (e) => {
    if (!isResizing) return;
    const splitContainer = document.querySelector('#app-split-container');
    const leftPanel = document.querySelector('#left-panel');
    if (!splitContainer || !leftPanel) return;

    const containerRect = splitContainer.getBoundingClientRect();
    const newWidth = ((e.clientX - containerRect.left) / containerRect.width) * 100;

    if (newWidth > 15 && newWidth < 85) {
      leftPanel.style.flexBasis = `${newWidth}%`;
      // We update the state directly but don't call render() during drag to keep it smooth
      if (window._mqtt_app_state) {
        window._mqtt_app_state.leftPanelWidth = `${newWidth}%`;
        if (window._mqtt_app_state.editor) window._mqtt_app_state.editor.refresh();
      }
    }
  });

  document.addEventListener('mouseup', () => {
    if (isResizing) {
      isResizing = false;
      document.body.classList.remove('dragging');
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      if (window._mqtt_app_save) window._mqtt_app_save();
    }
  });
  window._resizerEventsAttached = true;
}

let state = {
  config: null,
  configUrl: '',
  lastUrlConfig: null,
  history: [], // [{name, config}]
  activeConfigName: '', // Nome da config ativa
  isApplying: false, // Estado de carregamento do botão aplicar e overlay da direita
  editor: null, // Instância do CodeMirror
  leftPanelWidth: '40%', // Largura inicial do painel esquerdo
  template: null,
  container: null,
  selectedBroker: null,
  selectedTopics: []
};

function saveState() {
  const data = {
    configUrl: state.configUrl,
    lastUrlConfig: state.lastUrlConfig,
    history: state.history,
    activeConfigName: state.activeConfigName,
    leftPanelWidth: state.leftPanelWidth,
    selectedBrokerTitle: state.selectedBroker ? state.selectedBroker.title : null,
    selectedTopics: state.selectedTopics
  };
  localStorage.setItem('mqtt_app_state', JSON.stringify(data));
}

function addToHistory(config) {
  if (!config || !config.brokers) return;
  const now = new Date();
  const pad = (n) => n.toString().padStart(2, '0');
  const timestamp = `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
  
  const brokerTitles = config.brokers.map(b => b.title).join(', ');
  const displayName = brokerTitles.length > 30 ? brokerTitles.substring(0, 27) + '...' : brokerTitles;
  const name = `${displayName || 'Nova Config'} (${timestamp})`;
  
  // Limpa entradas antigas que não seguem o novo padrão se necessário (opcional)
  // state.history = state.history.filter(h => h.name && !h.name.includes('PM') && !h.name.includes('AM'));

  // Evita duplicatas consecutivas idênticas
  if (state.history.length > 0 && JSON.stringify(state.history[0].config) === JSON.stringify(config)) {
    return;
  }

  state.history.unshift({ name, config });
  state.history = state.history.slice(0, 10); // Mantém apenas os últimos 10
}

function loadState(config) {
  const saved = localStorage.getItem('mqtt_app_state');
  if (saved) {
    const data = JSON.parse(saved);
    state.configUrl = data.configUrl || '';
    state.lastUrlConfig = data.lastUrlConfig || null;
    state.history = data.history || [];
    state.activeConfigName = data.activeConfigName || '';
    state.leftPanelWidth = data.leftPanelWidth || '40%';
    state.selectedTopics = data.selectedTopics || [];
    if (data.selectedBrokerTitle && config.brokers) {
      state.selectedBroker = config.brokers.find(b => b.title === data.selectedBrokerTitle);
    }
  }
}

function render() {
  const { selectedBroker, selectedTopics, config, configUrl, lastUrlConfig, template, container } = state;
  
  // Is dirty if URL exists and current config differs from last fetched config
  const isUrlDirty = !!configUrl && !!lastUrlConfig && JSON.stringify(config) !== JSON.stringify(lastUrlConfig);
  
  // Save focus and selection
  const activeElement = document.activeElement;
  const activeElementId = activeElement ? activeElement.id : null;
  const selectionStart = activeElement ? activeElement.selectionStart : null;
  const selectionEnd = activeElement ? activeElement.selectionEnd : null;

  const brokerAddr = selectedBroker ? `-h ${selectedBroker.host} -p ${selectedBroker.port} -u ${selectedBroker.username} -P ${selectedBroker.password} ${selectedBroker.extraArgs}` : '';
  const topicsCmd = selectedTopics.map(t => `-t '${t}'`).join(' ');
  const mqttCmd = (brokerAddr && selectedTopics.length > 0) ? `mqttx sub ${brokerAddr} ${topicsCmd}` : '';

  container.innerHTML = template({
    ...config,
    configRaw: JSON.stringify(config, null, 2),
    configUrl,
    isUrlDirty,
    history: state.history,
    activeConfigName: state.activeConfigName,
    isApplying: state.isApplying,
    leftPanelWidth: state.leftPanelWidth,
    brokerAddr,
    mqttCmd,
    showTopics: !!selectedBroker,
    selectedBrokerJson: JSON.stringify(selectedBroker),
    selectedTopics
  });

  // Apply stored panel width
  const leftPanel = container.querySelector('#left-panel');
  if (leftPanel) {
    leftPanel.style.flexBasis = state.leftPanelWidth;
  }

  // Restore focus and selection
  if (activeElementId) {
    const el = container.querySelector(`#${activeElementId}`);
    if (el) {
      el.focus();
      if (selectionStart !== null && selectionEnd !== null && typeof el.setSelectionRange === 'function') {
        el.setSelectionRange(selectionStart, selectionEnd); 
      }
    }
  }

  saveState();

  // Initialize CodeMirror if container exists
  const editorEl = container.querySelector('#json-editor');
  if (editorEl) {
    state.editor = CodeMirror(editorEl, {
      value: JSON.stringify(config, null, 2),
      mode: "application/json",
      theme: "dracula",
      lineNumbers: true,
      lint: true,
      gutters: ["CodeMirror-lint-markers"],
      viewportMargin: 10 // Valor padrão pequeno para forçar o scroll interno, em vez de Infinity
    });
    
    // Track manual changes
    state.editor.on('change', (cm) => {
      try {
        state.config = JSON.parse(cm.getValue());
      } catch (e) {}
    });
  }

  // Initialize Read-only Output Editors
  const brokerAddrEl = container.querySelector('#broker-addr-editor');
  if (brokerAddrEl && brokerAddr) {
    CodeMirror(brokerAddrEl, {
      value: brokerAddr,
      mode: "shell",
      theme: "dracula",
      readOnly: true,
      lineNumbers: false,
      viewportMargin: Infinity
    });
  }

  const mqttCmdEl = container.querySelector('#mqtt-cmd-editor');
  if (mqttCmdEl && mqttCmd) {
    CodeMirror(mqttCmdEl, {
      value: mqttCmd,
      mode: "shell",
      theme: "dracula",
      readOnly: true,
      lineNumbers: false,
      lineWrapping: true, // Re-ativado para quebrar linhas automaticamente
      viewportMargin: Infinity
    });
  }

  // Resizer Logic
  const resizer = container.querySelector('#resizer');
  if (resizer) {
    resizer.addEventListener('mousedown', (e) => {
      isResizing = true;
      document.body.classList.add('dragging');
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    });
  }

  // Re-attach listeners after each render
  const brokerSelect = container.querySelector('#broker-select');
  if (brokerSelect) {
    brokerSelect.addEventListener('change', (e) => {
      state.selectedBroker = JSON.parse(e.target.value);
      render();
    });
  }

  if (state.selectedBroker) {
    const topicsSelect = container.querySelector('#topics-select');
    if (topicsSelect) {
      topicsSelect.addEventListener('change', (e) => {
        state.selectedTopics = Array.from(e.target.selectedOptions).map(opt => opt.value);
        render();
      });
    }
  }

  // Config application logic
  container.querySelector('#apply-config').addEventListener('click', () => {
    try {
      const newConfig = JSON.parse(state.editor.getValue());
      state.config = newConfig;
      state.configUrl = '';
      state.lastUrlConfig = null;
      state.selectedBroker = null;
      state.selectedTopics = [];
      
      const now = new Date();
      const pad = (n) => n.toString().padStart(2, '0');
      const timestamp = `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
      const brokerTitles = newConfig.brokers?.map(b => b.title).join(', ') || 'Nova Config';
      const displayName = brokerTitles.length > 30 ? brokerTitles.substring(0, 27) + '...' : brokerTitles;
      state.activeConfigName = `${displayName} (${timestamp})`;
      
      addToHistory(newConfig);
      localStorage.setItem('mqtt_config_raw', JSON.stringify(newConfig));
      
      triggerFakeLoad();
    } catch (e) {
      alert('JSON Inválido!');
    }
  });

  function triggerFakeLoad() {
    state.isApplying = true;
    render();
    setTimeout(() => {
      state.isApplying = false;
      render();
    }, 1000);
  }

  // History selection logic
  container.querySelectorAll('.history-item').forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const index = parseInt(item.getAttribute('data-index'));
      const selected = state.history[index];
      
      state.config = selected.config;
      state.configUrl = '';
      state.lastUrlConfig = null;
      state.activeConfigName = selected.name;
      state.selectedBroker = null;
      state.selectedTopics = [];
      localStorage.setItem('mqtt_config_raw', JSON.stringify(selected.config));
      triggerFakeLoad();
    });
  });

  // Clear history logic
  const clearBtn = container.querySelector('#clear-history');
  if (clearBtn) {
    clearBtn.addEventListener('click', (e) => {
      e.preventDefault();
      if (confirm('Deseja realmente limpar todo o histórico de configurações?')) {
        state.history = [];
        render();
      }
    });
  }

  // URL loading logic
  container.querySelector('#load-url').addEventListener('click', async () => {
    const url = container.querySelector('#config-url').value;
    if (!url) return;

    if (isUrlDirty && !confirm('Você possui alterações não salvas que serão perdidas. Deseja carregar a configuração da URL mesmo assim?')) {
      return;
    }

    try {
      const res = await fetch(url);
      const json = await res.json();
      
      // Se já houver conteúdo no editor e ele for diferente do baixado, pergunta se sobrescreve
      if (state.config && JSON.stringify(state.config) !== JSON.stringify(json)) {
        if (!confirm('O conteúdo baixado é diferente do que está no editor. Deseja sobrescrever as configurações atuais?')) {
          return;
        }
      }

      state.configUrl = url;
      state.lastUrlConfig = json; // Salva a referência original
      state.config = json;
      
      const now = new Date();
      const pad = (n) => n.toString().padStart(2, '0');
      const timestamp = `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
      const brokerTitles = json.brokers?.map(b => b.title).join(', ') || 'URL Config';
      const displayName = brokerTitles.length > 30 ? brokerTitles.substring(0, 27) + '...' : brokerTitles;
      state.activeConfigName = `${displayName} (${timestamp})`;

      state.selectedBroker = null;
      state.selectedTopics = [];
      addToHistory(json);
      localStorage.setItem('mqtt_config_raw', JSON.stringify(json));
      triggerFakeLoad();
    } catch (e) {
      console.error(e);
      alert('Erro ao carregar URL. Verifique o CORS ou o formato do arquivo.');
    }
  });

  // URL input change logic
  container.querySelector('#config-url').addEventListener('input', (e) => {
    state.configUrl = e.target.value;
    if (!state.configUrl) {
      state.lastUrlConfig = null;
    }
    render();
  });

  // Copy buttons logic
  container.querySelectorAll('.copy-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const text = btn.getAttribute('data-text');
      navigator.clipboard.writeText(text).then(() => {
        const originalHtml = btn.innerHTML;
        btn.innerHTML = '<i class="bi bi-check"></i> Copiado!';
        btn.classList.replace('btn-outline-secondary', 'btn-success');
        setTimeout(() => {
          btn.innerHTML = originalHtml;
          btn.classList.replace('btn-success', 'btn-outline-secondary');
        }, 2000);
      });
    });
  });
}

export async function renderApp(container) {
  const appRes = await fetch('pages/app/app.html');
  state.template = Handlebars.compile(await appRes.text());
  state.container = container;

  // Load config: LocalStorage > config.json > default empty
  const savedConfig = localStorage.getItem('mqtt_config_raw');
  if (savedConfig) {
    state.config = JSON.parse(savedConfig);
  } else {
    try {
      const configRes = await fetch('config.json');
      state.config = await configRes.json();
    } catch (e) {
      state.config = { brokers: [], topicosInscricao: [] };
    }
  }

  loadState(state.config);
  
  // Expose state for Global Resizer Logic
  window._mqtt_app_state = state;
  window._mqtt_app_save = saveState;

  render();
}