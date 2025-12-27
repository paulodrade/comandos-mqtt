/**
 * @file app.js
 * @description MQTT Command Generator - View Coordinator delegating to components.
 */

import { MqttService } from '../../services/mqtt-service.js';
import { StorageService } from '../../services/storage-service.js';
import { ConfigService } from '../../services/config-service.js';
import { ResizerService } from '../../services/resizer-service.js';
import { registerHelpers } from '../../utils/handlebars-helpers.js';
import { UIUtils } from '../../utils/ui-utils.js';

// Component Imports
import { ConfigPanel } from '../../components/config-panel/config-panel.js';
import { CommandPanel } from '../../components/command-panel/command-panel.js';

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

  // Focus Tracking
  const activeElement = document.activeElement;
  const focusState = { id: activeElement?.id, start: activeElement?.selectionStart, end: activeElement?.selectionEnd };

  // DOM Update
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

  // UI Restoration
  const leftPanel = container.querySelector('#left-panel');
  if (leftPanel) leftPanel.style.flexBasis = state.leftPanelWidth;

  UIUtils.restoreFocus(focusState.id, focusState.start, focusState.end);

  // Delegate Interactions to Components
  // Actions object to pass to components (callbacks)
  const actions = { render, applyUpdate, addToHistory };

  ConfigPanel.init(container.querySelector('#left-panel'), state, actions);
  CommandPanel.init(container.querySelector('#right-panel'), state, actions, brokerAddr, mqttCmd);

  StorageService.saveAppState(state);
}

/* ==========================================================================
   3. SHARED ACTION HELPERS
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

/**
 * Loads and registers Handlebars partials from the components directory.
 */
async function registerPartials() {
  const partials = [
    { name: 'configPanel', url: 'components/config-panel/config-panel.html' },
    { name: 'commandPanel', url: 'components/command-panel/command-panel.html' }
  ];

  for (const partial of partials) {
    const res = await fetch(partial.url);
    const text = await res.text();
    Handlebars.registerPartial(partial.name, text);
  }
}

/* ==========================================================================
   4. ENTRY POINT
   ========================================================================== */

export async function renderApp(container) {
  await registerPartials();
  
  const appRes = await fetch('pages/app/app.html');
  state.template = Handlebars.compile(await appRes.text());
  state.container = container;

  const config = StorageService.getRawConfig() || await fetch('config.json').then(r => r.json()).catch(() => ({ brokers: [] }));
  state.config = config;

  Object.assign(state, StorageService.loadAppState(config));
  
  ResizerService.init(state, () => StorageService.saveAppState(state));

  render();
}