/**
 * @file app.js
 * @description MQTT Command Generator - Orchestrator of autonomous components.
 */

import { MqttService } from '../../services/mqtt-service.js';
import { StorageService } from '../../services/storage-service.js';
import { ResizerService } from '../../services/resizer-service.js';
import { registerHelpers } from '../../utils/handlebars-helpers.js';
import { UIUtils } from '../../utils/ui-utils.js';

// Component Imports
import { ConfigPanel } from '../../components/config-panel/config-panel.js';
import { CommandPanel } from '../../components/command-panel/command-panel.js';

/* CORE INITIALIZATION */

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
  selectedTopics: [],
  isConfigDirty: false
};

/* RENDERING ENGINE */

/**
 * Main render loop. Coordinates the autonomous rendering of sub-components
 * and ensures global state persistence and UI consistency (focus, layout).
 */
function render() {
  const { selectedBroker, selectedTopics, config, template, container } = state;
  
  const brokerAddr = MqttService.generateBrokerAddr(selectedBroker);
  const mqttCmd = MqttService.generateMqttCmd(brokerAddr, selectedTopics);

  // Focus Tracking
  const activeElement = document.activeElement;
  const focusState = { id: activeElement?.id, start: activeElement?.selectionStart, end: activeElement?.selectionEnd };

  // DOM Base Template (Shell only)
  container.innerHTML = template({ leftPanelWidth: state.leftPanelWidth });

  // UI Restoration (Resizer area)
  const leftPanel = container.querySelector('#left-panel');
  if (leftPanel) leftPanel.style.flexBasis = state.leftPanelWidth;

  UIUtils.restoreFocus(focusState.id, focusState.start, focusState.end);

  // Autonomous Rendering
  const actions = { 
    render, 
    applyUpdate, 
    getSavedConfig: () => StorageService.getRawConfig() || state.config 
  };

  ConfigPanel.render(container.querySelector('#left-panel-content'), state, actions);
  CommandPanel.render(container.querySelector('#right-panel-content'), state, actions, brokerAddr, mqttCmd);

  StorageService.saveAppState(state);
}

/* SHARED ACTION HELPERS */

/**
 * Applies a partial state update, persists the raw configuration,
 * and triggers a visual feedback load state.
 * @param {Object} updates - The state properties to update.
 */
function applyUpdate(updates) {
  Object.assign(state, { ...updates, isConfigDirty: false });
  StorageService.saveRawConfig(state.config);
  triggerFakeLoad();
}

/**
 * Triggers a temporary loading state for visual feedback when applying changes.
 * @private
 */
function triggerFakeLoad() {
  state.isApplying = true;
  render();
  setTimeout(() => { state.isApplying = false; render(); }, 800);
}

/* ENTRY POINT */

/**
 * Entry point for the application. Pre-loads all necessary templates,
 * hydrates the initial state from storage or defaults, and starts the render loop.
 * @param {HTMLElement} container - The root DOM element for the application.
 */
export async function renderApp(container) {
  // Load templates in parallel
  await Promise.all([
    ConfigPanel.load(),
    CommandPanel.load()
  ]);
  
  const appRes = await fetch('pages/app/app.html');
  state.template = Handlebars.compile(await appRes.text());
  state.container = container;

  const config = StorageService.getRawConfig() || await fetch('config.json').then(r => r.json()).catch(() => ({ brokers: [] }));
  state.config = config;

  Object.assign(state, StorageService.loadAppState(config));
  
  ResizerService.init(state, () => StorageService.saveAppState(state));

  render();
}