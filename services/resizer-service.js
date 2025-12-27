/**
 * @file resizer-service.js
 * @description State-independent logic for the resizable split-pane.
 */

export const ResizerService = {
  /**
   * Attaches global listeners for resizing logic.
   * @param {Object} state - Application state to update during drag.
   * @param {Function} onFinish - Callback to execute when dragging stops.
   */
  init(state, onFinish) {
    if (window._resizerEventsAttached) return;

    let isDragging = false;

    document.addEventListener('mousedown', (e) => {
      if (e.target.id === 'resizer') {
        isDragging = true;
        document.body.classList.add('dragging');
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
      }
    });

    document.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      const splitContainer = document.querySelector('#app-split-container');
      const leftPanel = document.querySelector('#left-panel');
      if (!splitContainer || !leftPanel) return;

      const containerRect = splitContainer.getBoundingClientRect();
      const newWidth = ((e.clientX - containerRect.left) / containerRect.width) * 100;

      if (newWidth > 15 && newWidth < 85) {
        leftPanel.style.flexBasis = `${newWidth}%`;
        state.leftPanelWidth = `${newWidth}%`;
        if (state.editor) state.editor.refresh();
      }
    });

    document.addEventListener('mouseup', () => {
      if (isDragging) {
        isDragging = false;
        document.body.classList.remove('dragging');
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        if (onFinish) onFinish();
      }
    });

    window._resizerEventsAttached = true;
  }
};
