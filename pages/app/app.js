/**
 * @file app.js
 * @description MQTT Command Generator - Lean View orchestrator.
 */

import { MqttService } from '../../services/mqtt-service.js';
import { StorageService } from '../../services/storage-service.js';
import { ConfigService } from '../../services/config-service.js';
import { ResizerService } from '../../services/resizer-service.js';
import { EditorFactory } from '../../factories/editor-factory.js';
import { registerHelpers } from '../../utils/handlebars-helpers.js';
import { UIUtils } from '../../utils/ui-utils.js';

/* ==========================================================================
   1. CORE INITIALIZATION
   ========================================================================== */

registerHelpers();

let state = {
  config: null,
  configUrl: '',
  lastUrlConfig: null,
  history: [],
  activeConfigName: '',
  isApplying: false,
  editor: null,
  leftPanelWidth: '40%',
  template: null,
  container: null,
  selectedBroker: null,
  selectedTopics: []
};

/* ==========================================================================
   2. RENDERING ENGINE
   ========================================================================== */

function render() {
  const { selectedBroker, selectedTopics, config, configUrl, lastUrlConfig, template, container } = state;
  const isUrlDirty = !!configUrl && !!lastUrlConfig && JSON.stringify(config) !== JSON.stringify(lastUrlConfig);
  
  const brokerAddr = MqttService.generateBrokerAddr(selectedBroker);
  const mqttCmd = MqttService.generateMqttCmd(brokerAddr, selectedTopics);

  const activeElement = document.activeElement;
  const focusState = { id: activeElement?.id, start: activeElement?.selectionStart, end: activeElement?.selectionEnd };

  container.innerHTML = template({
    ...config,
    configRaw: JSON.stringify(config, null, 2),
    configUrl, isUrlDirty,
    history: state.history,
    activeConfigName: state.activeConfigName,
    isApplying: state.isApplying,
    leftPanelWidth: state.leftPanelWidth,
    brokerAddr, mqttCmd,
    showTopics: !!selectedBroker,
    selectedBrokerJson: JSON.stringify(selectedBroker),
    selectedTopics
  });

  const leftPanel = container.querySelector('#left-panel');
  if (leftPanel) leftPanel.style.flexBasis = state.leftPanelWidth;

  UIUtils.restoreFocus(focusState.id, focusState.start, focusState.end);
  attachViewInteractions(container, config, brokerAddr, mqttCmd);
  StorageService.saveAppState(state);
}

/* ==========================================================================
   3. VIEW INTERACTIONS
   ========================================================================== */

function attachViewInteractions(container, config, brokerAddr, mqttCmd) {
  // Editors
  const editorEl = container.querySelector('#json-editor');
  if (editorEl) state.editor = EditorFactory.createJsonEditor(editorEl, JSON.stringify(config, null, 2), (json) => state.config = json);
  if (brokerAddr) EditorFactory.createShellEditor(container.querySelector('#broker-addr-editor'), brokerAddr);
  if (mqttCmd) EditorFactory.createShellEditor(container.querySelector('#mqtt-cmd-editor'), mqttCmd, true);

  // Form
  container.querySelector('#broker-select')?.addEventListener('change', (e) => {
    state.selectedBroker = JSON.parse(e.target.value);
    render();
  });

  container.querySelector('#topics-select')?.addEventListener('change', (e) => {
    state.selectedTopics = Array.from(e.target.selectedOptions).map(opt => opt.value);
    render();
  });

  // Actions
  container.querySelector('#apply-config')?.addEventListener('click', () => {
    try {
      const newConfig = JSON.parse(state.editor.getValue());
      applyUpdate(ConfigService.prepareNewConfig(newConfig));
      addToHistory(newConfig);
    } catch (e) { alert('JSON Inválido!'); }
  });

  container.querySelectorAll('.history-item').forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const selected = state.history[parseInt(item.getAttribute('data-index'))];
      applyUpdate({ config: selected.config, activeConfigName: selected.name, selectedBroker: null, selectedTopics: [] });
    });
  });

  container.querySelector('#clear-history')?.addEventListener('click', (e) => {
    if (confirm('Limpar histórico?')) { state.history = []; render(); }
  });

  container.querySelector('#load-url')?.addEventListener('click', async () => {
    const url = container.querySelector('#config-url').value;
    if (!url) return;
    try {
      const json = await ConfigService.loadFromUrl(url);
      applyUpdate(ConfigService.prepareNewConfig(json, url));
      addToHistory(json);
    } catch (e) { alert('Erro ao carregar URL.'); }
  });

  container.querySelector('#config-url')?.addEventListener('input', (e) => { state.configUrl = e.target.value; render(); });

  container.querySelectorAll('.copy-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const original = btn.innerHTML;
      navigator.clipboard.writeText(btn.getAttribute('data-text')).then(() => UIUtils.showSuccessState(btn, original));
    });
  });
}

/* ==========================================================================
   4. DOMAIN HELPERS
   ========================================================================== */

function applyUpdate(updates) {
  Object.assign(state, updates);
  StorageService.saveRawConfig(state.config);
  triggerFakeLoad();
}

function addToHistory(config) {
  if (!config?.brokers) return;
  const name = `${MqttService.getConfigDisplayName(config)} (${MqttService.getTimestamp()})`;
  if (state.history[0]?.config && JSON.stringify(state.history[0].config) === JSON.stringify(config)) return;
  state.history.unshift({ name, config });
  state.history = state.history.slice(0, 10);
}

function triggerFakeLoad() {
  state.isApplying = true;
  render();
  setTimeout(() => { state.isApplying = false; render(); }, 800);
}

/* ==========================================================================
   5. ENTRY POINT
   ========================================================================== */

export async function renderApp(container) {
  const appRes = await fetch('pages/app/app.html');
  state.template = Handlebars.compile(await appRes.text());
  state.container = container;

  const config = StorageService.getRawConfig() || await fetch('config.json').then(r => r.json()).catch(() => ({ brokers: [] }));
  state.config = config;

  Object.assign(state, StorageService.loadAppState(config));
  
  ResizerService.init(state, () => StorageService.saveAppState(state));

  render();
}