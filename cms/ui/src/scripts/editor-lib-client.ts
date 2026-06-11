// ── Editor library registration ──
// Imports all extracted editor utilities and exposes them on
// window.CMSEditorLib for consumption by the vanilla editor.js.

import {
  // path-helpers
  parsePath,
  getNestedValue,
  setNestedValue,
  escapeForPre,
  toHexColor,
  formatLabel,
  getFieldHelp,
  generateUniqueSlug,
  // templates
  fileToPage,
  fieldHints,
  selectOptions,
  hiddenFields,
  getComponentOptions,
  shouldHideField,
  getFieldType,
  isImagePathField,
  isAutoNumberField,
  isCollapsibleArray,
  getArrayItemLabel,
  getAddTypeOptions,
  blankClone,
  createEmptyArrayItem,
  createTypedArrayItem,
  // dnd
  attachDragEvents,
  bindContainerDnd,
  moveArrayItem,
  resetDndState,
} from "../lib";

declare global {
  interface Window {
    CMSEditorLib?: typeof lib;
  }
}

const lib = {
  // path-helpers
  parsePath,
  getNestedValue,
  setNestedValue,
  escapeForPre,
  toHexColor,
  formatLabel,
  getFieldHelp,
  generateUniqueSlug,
  // templates & config
  fileToPage,
  fieldHints,
  selectOptions,
  hiddenFields,
  getComponentOptions,
  shouldHideField,
  getFieldType,
  isImagePathField,
  isAutoNumberField,
  isCollapsibleArray,
  getArrayItemLabel,
  getAddTypeOptions,
  blankClone,
  createEmptyArrayItem,
  createTypedArrayItem,
  // dnd
  attachDragEvents,
  bindContainerDnd,
  moveArrayItem,
  resetDndState,
};

export function registerEditorLib() {
  window.CMSEditorLib = lib;
}
