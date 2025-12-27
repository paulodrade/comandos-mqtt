/**
 * @file command-panel.js
 * @description Logic for the command generation panel component.
 */

import { EditorFactory } from '../../factories/editor-factory.js';
import { UIUtils } from '../../utils/ui-utils.js';

export const CommandPanel = {
  /**
   * Initializes event listeners and output editors for the command panel.
   * @param {HTMLElement} container - The panel container element.
   * @param {Object} state - Application state.
   * @param {Object} actions - Callbacks to trigger re-renders or other global effects.
   */
  init(container, state, actions, brokerAddr, mqttCmd) {
    // 1. Initialize Output Editors via Factory
    if (brokerAddr) {
      const bAddrEl = container.querySelector('#broker-addr-editor');
      if (bAddrEl) EditorFactory.createShellEditor(bAddrEl, brokerAddr);
    }

    if (mqttCmd) {
      const mCmdEl = container.querySelector('#mqtt-cmd-editor');
      if (mCmdEl) EditorFactory.createShellEditor(mCmdEl, mqttCmd, true);
    }

    // 2. Action: Broker Selection
    container.querySelector('#broker-select')?.addEventListener('change', (e) => {
      state.selectedBroker = JSON.parse(e.target.value);
      actions.render();
    });

    // 3. Action: Topics Selection
    container.querySelector('#topics-select')?.addEventListener('change', (e) => {
      state.selectedTopics = Array.from(e.target.selectedOptions).map(opt => opt.value);
      actions.render();
    });

    // 4. Action: Copy Buttons
    container.querySelectorAll('.copy-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const text = btn.getAttribute('data-text');
        const original = btn.innerHTML;
        navigator.clipboard.writeText(text).then(() => {
          UIUtils.showSuccessState(btn, original);
        });
      });
    });
  }
};
