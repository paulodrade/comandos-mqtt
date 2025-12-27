/**
 * @file handlebars-helpers.js
 * @description Custom Handlebars helpers for the application.
 */

export const registerHelpers = () => {
  Handlebars.registerHelper('json', context => JSON.stringify(context));
  Handlebars.registerHelper('eq', (a, b) => a === b);
  Handlebars.registerHelper('contains', (arr, item) => arr && arr.includes(item));
};
