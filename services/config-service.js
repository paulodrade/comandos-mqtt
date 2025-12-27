/**
 * @file config-service.js
 * @description Logic for remote and local configuration operations.
 */

import { MqttService } from './mqtt-service.js';
import { StorageService } from './storage-service.js';

export const ConfigService = {
  /**
   * Fetches configuration from a remote URL.
   */
  async loadFromUrl(url) {
    if (!url) return null;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch configuration');
    const json = await res.json();
    return json;
  },

  /**
   * Orchestrates the application of a new configuration.
   */
  prepareNewConfig(newConfig, url = '') {
    const timestamp = MqttService.getTimestamp();
    const displayName = MqttService.getConfigDisplayName(newConfig);
    
    return {
      config: newConfig,
      configUrl: url,
      lastUrlConfig: url ? newConfig : null,
      activeConfigName: `${displayName} (${timestamp})`,
      selectedBroker: null,
      selectedTopics: []
    };
  }
};
