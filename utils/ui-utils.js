/**
 * @file ui-utils.js
 * @description Utility functions for UI manipulations and feedback.
 */

export const UIUtils = {
  /**
   * Triggers a temporary success state on a button (like "Copied!").
   */
  showSuccessState(button, originalHtml, successText = 'Copiado!', duration = 2000) {
    button.innerHTML = `<i class="bi bi-check"></i> ${successText}`;
    button.classList.replace('btn-outline-secondary', 'btn-success');
    setTimeout(() => {
      button.innerHTML = originalHtml;
      button.classList.replace('btn-success', 'btn-outline-secondary');
    }, duration);
  },

  /**
   * Saves and restores cursor focus and selection in the document.
   */
  restoreFocus(id, start, end) {
    if (!id) return;
    const el = document.getElementById(id);
    // Do not restore focus if element is disabled or doesn't exist
    if (el && !el.disabled) {
      el.focus();
      if (start !== null && end !== null && typeof el.setSelectionRange === 'function') {
        el.setSelectionRange(start, end);
      }
    }
  }
};
