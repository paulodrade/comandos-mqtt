/**
 * @file config-panel.js
 * @description Logic for the configuration panel component.
 */

import { EditorFactory } from '../../factories/editor-factory.js';
import { ConfigService } from '../../services/config-service.js';

export const ConfigPanel = {
  /**
   * Initializes event listeners and components for the config panel.
   * @param {HTMLElement} container - The panel container element.
   * @param {Object} state - Application state.
   * @param {Object} actions - Callbacks to update global state and trigger re-renders.
   */
  init(container, state, actions) {
    // 1. Initialize CodeMirror Editor
    const editorEl = container.querySelector('#json-editor');
    if (editorEl) {
      state.editor = EditorFactory.createJsonEditor(editorEl, JSON.stringify(state.config, null, 2), (json) => {
        state.config = json;
      });
    }

    // 2. Action: Apply Config
    container.querySelector('#apply-config')?.addEventListener('click', () => {
      try {
        const newConfig = JSON.parse(state.editor.getValue());
        actions.applyUpdate(ConfigService.prepareNewConfig(newConfig));
        actions.addToHistory(newConfig);
      } catch (e) {
        alert('JSON Inválido!');
      }
    });

    // 3. Action: Load URL
    container.querySelector('#load-url')?.addEventListener('click', async () => {
      const url = container.querySelector('#config-url').value;
      if (!url) return;
      try {
        const json = await ConfigService.loadFromUrl(url);
        actions.applyUpdate(ConfigService.prepareNewConfig(json, url));
        actions.addToHistory(json);
      } catch (e) {
        alert('Erro ao carregar URL.');
      }
    });

    // 4. Action: URL Input change
    container.querySelector('#config-url')?.addEventListener('input', (e) => {
      state.configUrl = e.target.value;
      actions.render();
    });

    // 5. Action: History Selection
    container.querySelectorAll('.history-item').forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        const selected = state.history[parseInt(item.getAttribute('data-index'))];
        actions.applyUpdate({
          config: selected.config,
          activeConfigName: selected.name,
          selectedBroker: null,
          selectedTopics: []
        });
      });
    });

    // 6. Action: Clear History
    container.querySelector('#clear-history')?.addEventListener('click', (e) => {
      e.preventDefault();
      if (confirm('Deseja realmente limpar todo o histórico?')) {
        state.history = [];
        actions.render();
      }
    });
  }
};
