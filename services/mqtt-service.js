/**
 * @file mqtt-service.js
 * @description Business logic for MQTT command generation and history management.
 */

import { DateUtils } from '../utils/date-utils.js';

export const MqttService = {
  /**
   * Generates the broker address string based on selected broker details.
   */
  generateBrokerAddr(broker) {
    if (!broker) return '';
    return `-h '${broker.host}' -p '${broker.port}' -u '${broker.username}' -P '${broker.password}' ${broker.extraArgs || ''}`.trim();
  },

  /**
   * Generates the final MQTTX command.
   */
  generateMqttCmd(brokerAddr, selectedTopics) {
    if (!brokerAddr || !selectedTopics || selectedTopics.length === 0) return '';
    const topicsCmd = selectedTopics.map(t => `-t '${t}'`).join(' ');
    return `mqttx sub ${brokerAddr} ${topicsCmd}`;
  },

  /**
   * Creates a display name for a configuration based on its brokers.
   */
  getConfigDisplayName(config) {
    if (!config || !config.brokers || config.brokers.length === 0) return 'Nova Config';
    const brokerTitles = config.brokers.map(b => b.title).join(', ');
    return brokerTitles.length > 30 ? brokerTitles.substring(0, 27) + '...' : brokerTitles;
  },

  /**
   * Formats a timestamp for history items using global utils.
   */
  getTimestamp() {
    return DateUtils.formatTimestamp();
  }
};
