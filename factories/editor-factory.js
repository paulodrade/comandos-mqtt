/**
 * @file editor-factory.js
 * @description Factory for creating and configuring CodeMirror instances.
 */

export const EditorFactory = {
  /**
   * Creates a JSON editor for configuration.
   */
  createJsonEditor(element, value, onChange) {
    const editor = CodeMirror(element, {
      value,
      mode: "application/json",
      theme: "dracula",
      lineNumbers: true,
      lint: true,
      gutters: ["CodeMirror-lint-markers"],
      viewportMargin: 10
    });

    if (onChange) {
      editor.on('change', (cm) => {
        try {
          const json = JSON.parse(cm.getValue());
          onChange(json);
        } catch (e) {
          // Silent catch for invalid JSON during typing
        }
      });
    }

    return editor;
  },

  /**
   * Creates a read-only shell editor for command output.
   */
  createShellEditor(element, value, lineWrapping = false) {
    return CodeMirror(element, {
      value,
      mode: "shell",
      theme: "dracula",
      readOnly: true,
      lineNumbers: false,
      lineWrapping,
      viewportMargin: Infinity
    });
  }
};
