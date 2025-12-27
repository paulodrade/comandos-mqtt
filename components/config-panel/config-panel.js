
import { EditorFactory } from '../../factories/editor-factory.js';
import { ConfigService } from '../../services/config-service.js';
import { MqttService } from '../../services/mqtt-service.js';

export const ConfigPanel = {
  template: null,

  /**
   * Pre-loads the template for the component.
   */
  async load() {
    const res = await fetch('components/config-panel/config-panel.html');
    this.template = Handlebars.compile(await res.text());
  },

  /**
   * Main render function for the configuration panel.
   * Compiles the state into the pre-loaded Handlebars template.
   * @param {HTMLElement} container - DOM node where the panel will be rendered.
   * @param {Object} state - Global application state.
   * @param {Object} actions - Orchestrator callbacks (render, applyUpdate, getSavedConfig).
   */
  render(container, state, actions) {
    if (!this.template) return;

    const isUrlDirty = !!state.configUrl && !!state.lastUrlConfig && 
                      JSON.stringify(state.config) !== JSON.stringify(state.lastUrlConfig);

    container.innerHTML = this.template({
      ...state.config,
      configRaw: JSON.stringify(state.config, null, 2),
      configUrl: state.configUrl,
      isUrlDirty,
      isConfigDirty: state.isConfigDirty,
      history: state.history,
      isApplying: state.isApplying
    });

    this.attachEvents(container, state, actions);
  },

  /**
   * Attaches DOM event listeners and initializes third-party widgets like CodeMirror.
   * This is called after every render to ensure listeners and widgets are fresh.
   * @private
   */
  attachEvents(container, state, actions) {
    // 1. Editor
    const editorEl = container.querySelector('#json-editor');
    if (editorEl) {
      const initialValue = JSON.stringify(state.config, null, 2);
      state.editor = EditorFactory.createJsonEditor(editorEl, initialValue, (json) => {
        state.config = json;
        
        // Dirty check: Compare current editor value with saved configuration
        const currentRaw = state.editor.getValue().trim();
        const savedConfig = actions.getSavedConfig();
        const savedRaw = JSON.stringify(savedConfig, null, 2).trim();
        const isNowDirty = currentRaw !== savedRaw;

        if (state.isConfigDirty !== isNowDirty) {
          state.isConfigDirty = isNowDirty;
          // Update button state directly to avoid global re-render and focus loss
          const applyBtn = container.querySelector('#apply-config');
          if (applyBtn) {
            applyBtn.disabled = !isNowDirty || state.isApplying;
          }
        }
      });
    }

    // 2. Actions
    container.querySelector('#apply-config')?.addEventListener('click', () => {
      try {
        const newConfig = JSON.parse(state.editor.getValue());
        this.addToHistory(state, newConfig);
        actions.applyUpdate(ConfigService.prepareNewConfig(newConfig));
      } catch (e) { alert('JSON Inválido!'); }
    });

    container.querySelector('#load-url')?.addEventListener('click', async () => {
      const url = container.querySelector('#config-url').value;
      if (!url) return;
      
      if (state.isConfigDirty && !confirm('Você tem alterações não salvas. Deseja descartá-las e carregar a nova configuração?')) {
        return;
      }

      try {
        const json = await ConfigService.loadFromUrl(url);
        this.addToHistory(state, json);
        actions.applyUpdate(ConfigService.prepareNewConfig(json, url));
      } catch (e) { alert('Erro ao carregar URL.'); }
    });

    container.querySelector('#config-url')?.addEventListener('input', (e) => {
      state.configUrl = e.target.value;
      // Removed actions.render() to prevent focus loss during typing
    });

    container.querySelectorAll('.history-item').forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();

        if (state.isConfigDirty && !confirm('Você tem alterações não salvas. Deseja descartá-las e carregar este item do histórico?')) {
          return;
        }

        const selected = state.history[parseInt(item.getAttribute('data-index'))];
        actions.applyUpdate({
          config: selected.config,
          activeConfigName: selected.name,
          selectedBroker: null,
          selectedTopics: []
        });
      });
    });

    container.querySelector('#clear-history')?.addEventListener('click', (e) => {
      e.preventDefault();
      if (confirm('Limpar histórico?')) {
        state.history = [];
        actions.render();
      }
    });
  },

  addToHistory(state, config) {
    if (!config?.brokers) return;
    const name = MqttService.getConfigDisplayName(config);
    const date = MqttService.getTimestamp();
    const historyItem = { name, date, config };

    // Avoid duplicate entry if the latest one is the same
    if (state.history[0]?.config && JSON.stringify(state.history[0].config) === JSON.stringify(config)) return;
    
    state.history.unshift(historyItem);
    state.history = state.history.slice(0, 10);
  }
};
