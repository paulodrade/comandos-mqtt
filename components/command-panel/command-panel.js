
import { EditorFactory } from '../../factories/editor-factory.js';
import { UIUtils } from '../../utils/ui-utils.js';

export const CommandPanel = {
  template: null,

  /**
   * Pre-loads the template.
   */
  async load() {
    const res = await fetch('components/command-panel/command-panel.html');
    this.template = Handlebars.compile(await res.text());
  },

  /**
   * Main render function for the command generation panel.
   * @param {HTMLElement} container - DOM node for the right panel.
   * @param {Object} state - Global state.
   * @param {Object} actions - UI callbacks.
   * @param {string} brokerAddr - Pre-computed broker address string.
   * @param {string} mqttCmd - Pre-computed final MQTT command string.
   */
  render(container, state, actions, brokerAddr, mqttCmd) {
    if (!this.template) return;

    container.innerHTML = this.template({
      ...state.config,
      activeConfigName: state.activeConfigName,
      activeConfigDate: state.activeConfigDate,
      isApplying: state.isApplying,
      brokerAddr,
      mqttCmd,
      showTopics: !!state.selectedBroker,
      selectedBrokerJson: JSON.stringify(state.selectedBroker),
      selectedTopics: state.selectedTopics
    });

    this.attachEvents(container, state, actions, brokerAddr, mqttCmd);
  },

  /**
   * Attaches event listeners and initializes read-only CodeMirror editors for output.
   * @private
   */
  attachEvents(container, state, actions, brokerAddr, mqttCmd) {
    if (brokerAddr) {
      const bAddrEl = container.querySelector('#broker-addr-editor');
      if (bAddrEl) EditorFactory.createShellEditor(bAddrEl, brokerAddr);
    }

    if (mqttCmd) {
      const mCmdEl = container.querySelector('#mqtt-cmd-editor');
      if (mCmdEl) EditorFactory.createShellEditor(mCmdEl, mqttCmd, true);
    }

    container.querySelector('#broker-select')?.addEventListener('change', (e) => {
      state.selectedBroker = JSON.parse(e.target.value);
      actions.render();
    });

    container.querySelector('#topics-select')?.addEventListener('change', (e) => {
      state.selectedTopics = Array.from(e.target.selectedOptions).map(opt => opt.value);
      actions.render();
    });

    container.querySelectorAll('.copy-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const text = btn.getAttribute('data-text');
        const original = btn.innerHTML;
        navigator.clipboard.writeText(text).then(() => UIUtils.showSuccessState(btn, original));
      });
    });
  }
};
