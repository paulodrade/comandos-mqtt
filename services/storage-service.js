/**
 * @file storage-service.js
 * @description Logic for persisting and hydrating application state.
 */

const APP_STATE_KEY = 'mqtt_app_state';
const CONFIG_RAW_KEY = 'mqtt_config_raw';

export const StorageService = {
  saveAppState(state) {
    const data = {
      configUrl: state.configUrl,
      lastUrlConfig: state.lastUrlConfig,
      history: state.history,
      activeConfigName: state.activeConfigName,
      activeConfigDate: state.activeConfigDate,
      leftPanelWidth: state.leftPanelWidth,
      selectedBrokerTitle: state.selectedBroker ? state.selectedBroker.title : null,
      selectedTopics: state.selectedTopics
    };
    localStorage.setItem(APP_STATE_KEY, JSON.stringify(data));
  },

  loadAppState(config) {
    const saved = localStorage.getItem(APP_STATE_KEY);
    if (!saved) return null;
    
    const data = JSON.parse(saved);
    const result = { ...data };
    
    if (data.selectedBrokerTitle && config.brokers) {
      result.selectedBroker = config.brokers.find(b => b.title === data.selectedBrokerTitle);
    }
    return result;
  },

  saveRawConfig(config) {
    localStorage.setItem(CONFIG_RAW_KEY, JSON.stringify(config));
  },

  getRawConfig() {
    const saved = localStorage.getItem(CONFIG_RAW_KEY);
    return saved ? JSON.parse(saved) : null;
  }
};
