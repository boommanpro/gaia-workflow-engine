"use strict";
(self["webpackChunk_flowgram_ai_demo_free_layout"] = self["webpackChunk_flowgram_ai_demo_free_layout"] || []).push([["29"], {
2930: (function (__unused_webpack_module, __webpack_exports__, __webpack_require__) {
__webpack_require__.r(__webpack_exports__);
__webpack_require__.d(__webpack_exports__, {
  deprecatedEditorActiveIndentGuides: () => (deprecatedEditorActiveIndentGuides),
  deprecatedEditorIndentGuides: () => (deprecatedEditorIndentGuides),
  editorActiveIndentGuide1: () => (editorActiveIndentGuide1),
  editorActiveIndentGuide2: () => (editorActiveIndentGuide2),
  editorActiveIndentGuide3: () => (editorActiveIndentGuide3),
  editorActiveIndentGuide4: () => (editorActiveIndentGuide4),
  editorActiveIndentGuide5: () => (editorActiveIndentGuide5),
  editorActiveIndentGuide6: () => (editorActiveIndentGuide6),
  editorActiveLineNumber: () => (editorActiveLineNumber),
  editorBracketHighlightingForeground1: () => (editorBracketHighlightingForeground1),
  editorBracketHighlightingForeground2: () => (editorBracketHighlightingForeground2),
  editorBracketHighlightingForeground3: () => (editorBracketHighlightingForeground3),
  editorBracketHighlightingForeground4: () => (editorBracketHighlightingForeground4),
  editorBracketHighlightingForeground5: () => (editorBracketHighlightingForeground5),
  editorBracketHighlightingForeground6: () => (editorBracketHighlightingForeground6),
  editorBracketHighlightingUnexpectedBracketForeground: () => (editorBracketHighlightingUnexpectedBracketForeground),
  editorBracketMatchBackground: () => (editorBracketMatchBackground),
  editorBracketMatchBorder: () => (editorBracketMatchBorder),
  editorBracketPairGuideActiveBackground1: () => (editorBracketPairGuideActiveBackground1),
  editorBracketPairGuideActiveBackground2: () => (editorBracketPairGuideActiveBackground2),
  editorBracketPairGuideActiveBackground3: () => (editorBracketPairGuideActiveBackground3),
  editorBracketPairGuideActiveBackground4: () => (editorBracketPairGuideActiveBackground4),
  editorBracketPairGuideActiveBackground5: () => (editorBracketPairGuideActiveBackground5),
  editorBracketPairGuideActiveBackground6: () => (editorBracketPairGuideActiveBackground6),
  editorBracketPairGuideBackground1: () => (editorBracketPairGuideBackground1),
  editorBracketPairGuideBackground2: () => (editorBracketPairGuideBackground2),
  editorBracketPairGuideBackground3: () => (editorBracketPairGuideBackground3),
  editorBracketPairGuideBackground4: () => (editorBracketPairGuideBackground4),
  editorBracketPairGuideBackground5: () => (editorBracketPairGuideBackground5),
  editorBracketPairGuideBackground6: () => (editorBracketPairGuideBackground6),
  editorCodeLensForeground: () => (editorCodeLensForeground),
  editorCursorBackground: () => (editorCursorBackground),
  editorCursorForeground: () => (editorCursorForeground),
  editorDimmedLineNumber: () => (editorDimmedLineNumber),
  editorGutter: () => (editorGutter),
  editorIndentGuide1: () => (editorIndentGuide1),
  editorIndentGuide2: () => (editorIndentGuide2),
  editorIndentGuide3: () => (editorIndentGuide3),
  editorIndentGuide4: () => (editorIndentGuide4),
  editorIndentGuide5: () => (editorIndentGuide5),
  editorIndentGuide6: () => (editorIndentGuide6),
  editorLineHighlight: () => (editorLineHighlight),
  editorLineHighlightBorder: () => (editorLineHighlightBorder),
  editorLineNumbers: () => (editorLineNumbers),
  editorMultiCursorPrimaryBackground: () => (editorMultiCursorPrimaryBackground),
  editorMultiCursorPrimaryForeground: () => (editorMultiCursorPrimaryForeground),
  editorMultiCursorSecondaryBackground: () => (editorMultiCursorSecondaryBackground),
  editorMultiCursorSecondaryForeground: () => (editorMultiCursorSecondaryForeground),
  editorOverviewRulerBackground: () => (editorOverviewRulerBackground),
  editorOverviewRulerBorder: () => (editorOverviewRulerBorder),
  editorRangeHighlight: () => (editorRangeHighlight),
  editorRangeHighlightBorder: () => (editorRangeHighlightBorder),
  editorRuler: () => (editorRuler),
  editorSymbolHighlight: () => (editorSymbolHighlight),
  editorSymbolHighlightBorder: () => (editorSymbolHighlightBorder),
  editorUnicodeHighlightBackground: () => (editorUnicodeHighlightBackground),
  editorUnicodeHighlightBorder: () => (editorUnicodeHighlightBorder),
  editorUnnecessaryCodeBorder: () => (editorUnnecessaryCodeBorder),
  editorUnnecessaryCodeOpacity: () => (editorUnnecessaryCodeOpacity),
  editorWhitespaces: () => (editorWhitespaces),
  ghostTextBackground: () => (ghostTextBackground),
  ghostTextBorder: () => (ghostTextBorder),
  ghostTextForeground: () => (ghostTextForeground),
  overviewRulerError: () => (overviewRulerError),
  overviewRulerInfo: () => (overviewRulerInfo),
  overviewRulerRangeHighlight: () => (overviewRulerRangeHighlight),
  overviewRulerWarning: () => (overviewRulerWarning)
});
/* ESM import */var _nls_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(2644);
/* ESM import */var _base_common_color_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(2769);
/* ESM import */var _platform_theme_common_colorRegistry_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(2805);
/* ESM import */var _platform_theme_common_themeService_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(2781);
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/




/**
 * Definition of the editor colors
 */
const editorLineHighlight = (0,_platform_theme_common_colorRegistry_js__WEBPACK_IMPORTED_MODULE_2__.registerColor)('editor.lineHighlightBackground', null, _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('lineHighlight', 'Background color for the highlight of line at the cursor position.'));
const editorLineHighlightBorder = (0,_platform_theme_common_colorRegistry_js__WEBPACK_IMPORTED_MODULE_2__.registerColor)('editor.lineHighlightBorder', { dark: '#282828', light: '#eeeeee', hcDark: '#f38518', hcLight: _platform_theme_common_colorRegistry_js__WEBPACK_IMPORTED_MODULE_2__.contrastBorder }, _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('lineHighlightBorderBox', 'Background color for the border around the line at the cursor position.'));
const editorRangeHighlight = (0,_platform_theme_common_colorRegistry_js__WEBPACK_IMPORTED_MODULE_2__.registerColor)('editor.rangeHighlightBackground', { dark: '#ffffff0b', light: '#fdff0033', hcDark: null, hcLight: null }, _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('rangeHighlight', 'Background color of highlighted ranges, like by quick open and find features. The color must not be opaque so as not to hide underlying decorations.'), true);
const editorRangeHighlightBorder = (0,_platform_theme_common_colorRegistry_js__WEBPACK_IMPORTED_MODULE_2__.registerColor)('editor.rangeHighlightBorder', { dark: null, light: null, hcDark: _platform_theme_common_colorRegistry_js__WEBPACK_IMPORTED_MODULE_2__.activeContrastBorder, hcLight: _platform_theme_common_colorRegistry_js__WEBPACK_IMPORTED_MODULE_2__.activeContrastBorder }, _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('rangeHighlightBorder', 'Background color of the border around highlighted ranges.'));
const editorSymbolHighlight = (0,_platform_theme_common_colorRegistry_js__WEBPACK_IMPORTED_MODULE_2__.registerColor)('editor.symbolHighlightBackground', { dark: _platform_theme_common_colorRegistry_js__WEBPACK_IMPORTED_MODULE_2__.editorFindMatchHighlight, light: _platform_theme_common_colorRegistry_js__WEBPACK_IMPORTED_MODULE_2__.editorFindMatchHighlight, hcDark: null, hcLight: null }, _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('symbolHighlight', 'Background color of highlighted symbol, like for go to definition or go next/previous symbol. The color must not be opaque so as not to hide underlying decorations.'), true);
const editorSymbolHighlightBorder = (0,_platform_theme_common_colorRegistry_js__WEBPACK_IMPORTED_MODULE_2__.registerColor)('editor.symbolHighlightBorder', { dark: null, light: null, hcDark: _platform_theme_common_colorRegistry_js__WEBPACK_IMPORTED_MODULE_2__.activeContrastBorder, hcLight: _platform_theme_common_colorRegistry_js__WEBPACK_IMPORTED_MODULE_2__.activeContrastBorder }, _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('symbolHighlightBorder', 'Background color of the border around highlighted symbols.'));
const editorCursorForeground = (0,_platform_theme_common_colorRegistry_js__WEBPACK_IMPORTED_MODULE_2__.registerColor)('editorCursor.foreground', { dark: '#AEAFAD', light: _base_common_color_js__WEBPACK_IMPORTED_MODULE_1__.Color.black, hcDark: _base_common_color_js__WEBPACK_IMPORTED_MODULE_1__.Color.white, hcLight: '#0F4A85' }, _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('caret', 'Color of the editor cursor.'));
const editorCursorBackground = (0,_platform_theme_common_colorRegistry_js__WEBPACK_IMPORTED_MODULE_2__.registerColor)('editorCursor.background', null, _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('editorCursorBackground', 'The background color of the editor cursor. Allows customizing the color of a character overlapped by a block cursor.'));
const editorMultiCursorPrimaryForeground = (0,_platform_theme_common_colorRegistry_js__WEBPACK_IMPORTED_MODULE_2__.registerColor)('editorMultiCursor.primary.foreground', editorCursorForeground, _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('editorMultiCursorPrimaryForeground', 'Color of the primary editor cursor when multiple cursors are present.'));
const editorMultiCursorPrimaryBackground = (0,_platform_theme_common_colorRegistry_js__WEBPACK_IMPORTED_MODULE_2__.registerColor)('editorMultiCursor.primary.background', editorCursorBackground, _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('editorMultiCursorPrimaryBackground', 'The background color of the primary editor cursor when multiple cursors are present. Allows customizing the color of a character overlapped by a block cursor.'));
const editorMultiCursorSecondaryForeground = (0,_platform_theme_common_colorRegistry_js__WEBPACK_IMPORTED_MODULE_2__.registerColor)('editorMultiCursor.secondary.foreground', editorCursorForeground, _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('editorMultiCursorSecondaryForeground', 'Color of secondary editor cursors when multiple cursors are present.'));
const editorMultiCursorSecondaryBackground = (0,_platform_theme_common_colorRegistry_js__WEBPACK_IMPORTED_MODULE_2__.registerColor)('editorMultiCursor.secondary.background', editorCursorBackground, _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('editorMultiCursorSecondaryBackground', 'The background color of secondary editor cursors when multiple cursors are present. Allows customizing the color of a character overlapped by a block cursor.'));
const editorWhitespaces = (0,_platform_theme_common_colorRegistry_js__WEBPACK_IMPORTED_MODULE_2__.registerColor)('editorWhitespace.foreground', { dark: '#e3e4e229', light: '#33333333', hcDark: '#e3e4e229', hcLight: '#CCCCCC' }, _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('editorWhitespaces', 'Color of whitespace characters in the editor.'));
const editorLineNumbers = (0,_platform_theme_common_colorRegistry_js__WEBPACK_IMPORTED_MODULE_2__.registerColor)('editorLineNumber.foreground', { dark: '#858585', light: '#237893', hcDark: _base_common_color_js__WEBPACK_IMPORTED_MODULE_1__.Color.white, hcLight: '#292929' }, _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('editorLineNumbers', 'Color of editor line numbers.'));
const deprecatedEditorIndentGuides = (0,_platform_theme_common_colorRegistry_js__WEBPACK_IMPORTED_MODULE_2__.registerColor)('editorIndentGuide.background', editorWhitespaces, _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('editorIndentGuides', 'Color of the editor indentation guides.'), false, _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('deprecatedEditorIndentGuides', '\'editorIndentGuide.background\' is deprecated. Use \'editorIndentGuide.background1\' instead.'));
const deprecatedEditorActiveIndentGuides = (0,_platform_theme_common_colorRegistry_js__WEBPACK_IMPORTED_MODULE_2__.registerColor)('editorIndentGuide.activeBackground', editorWhitespaces, _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('editorActiveIndentGuide', 'Color of the active editor indentation guides.'), false, _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('deprecatedEditorActiveIndentGuide', '\'editorIndentGuide.activeBackground\' is deprecated. Use \'editorIndentGuide.activeBackground1\' instead.'));
const editorIndentGuide1 = (0,_platform_theme_common_colorRegistry_js__WEBPACK_IMPORTED_MODULE_2__.registerColor)('editorIndentGuide.background1', deprecatedEditorIndentGuides, _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('editorIndentGuides1', 'Color of the editor indentation guides (1).'));
const editorIndentGuide2 = (0,_platform_theme_common_colorRegistry_js__WEBPACK_IMPORTED_MODULE_2__.registerColor)('editorIndentGuide.background2', '#00000000', _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('editorIndentGuides2', 'Color of the editor indentation guides (2).'));
const editorIndentGuide3 = (0,_platform_theme_common_colorRegistry_js__WEBPACK_IMPORTED_MODULE_2__.registerColor)('editorIndentGuide.background3', '#00000000', _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('editorIndentGuides3', 'Color of the editor indentation guides (3).'));
const editorIndentGuide4 = (0,_platform_theme_common_colorRegistry_js__WEBPACK_IMPORTED_MODULE_2__.registerColor)('editorIndentGuide.background4', '#00000000', _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('editorIndentGuides4', 'Color of the editor indentation guides (4).'));
const editorIndentGuide5 = (0,_platform_theme_common_colorRegistry_js__WEBPACK_IMPORTED_MODULE_2__.registerColor)('editorIndentGuide.background5', '#00000000', _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('editorIndentGuides5', 'Color of the editor indentation guides (5).'));
const editorIndentGuide6 = (0,_platform_theme_common_colorRegistry_js__WEBPACK_IMPORTED_MODULE_2__.registerColor)('editorIndentGuide.background6', '#00000000', _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('editorIndentGuides6', 'Color of the editor indentation guides (6).'));
const editorActiveIndentGuide1 = (0,_platform_theme_common_colorRegistry_js__WEBPACK_IMPORTED_MODULE_2__.registerColor)('editorIndentGuide.activeBackground1', deprecatedEditorActiveIndentGuides, _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('editorActiveIndentGuide1', 'Color of the active editor indentation guides (1).'));
const editorActiveIndentGuide2 = (0,_platform_theme_common_colorRegistry_js__WEBPACK_IMPORTED_MODULE_2__.registerColor)('editorIndentGuide.activeBackground2', '#00000000', _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('editorActiveIndentGuide2', 'Color of the active editor indentation guides (2).'));
const editorActiveIndentGuide3 = (0,_platform_theme_common_colorRegistry_js__WEBPACK_IMPORTED_MODULE_2__.registerColor)('editorIndentGuide.activeBackground3', '#00000000', _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('editorActiveIndentGuide3', 'Color of the active editor indentation guides (3).'));
const editorActiveIndentGuide4 = (0,_platform_theme_common_colorRegistry_js__WEBPACK_IMPORTED_MODULE_2__.registerColor)('editorIndentGuide.activeBackground4', '#00000000', _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('editorActiveIndentGuide4', 'Color of the active editor indentation guides (4).'));
const editorActiveIndentGuide5 = (0,_platform_theme_common_colorRegistry_js__WEBPACK_IMPORTED_MODULE_2__.registerColor)('editorIndentGuide.activeBackground5', '#00000000', _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('editorActiveIndentGuide5', 'Color of the active editor indentation guides (5).'));
const editorActiveIndentGuide6 = (0,_platform_theme_common_colorRegistry_js__WEBPACK_IMPORTED_MODULE_2__.registerColor)('editorIndentGuide.activeBackground6', '#00000000', _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('editorActiveIndentGuide6', 'Color of the active editor indentation guides (6).'));
const deprecatedEditorActiveLineNumber = (0,_platform_theme_common_colorRegistry_js__WEBPACK_IMPORTED_MODULE_2__.registerColor)('editorActiveLineNumber.foreground', { dark: '#c6c6c6', light: '#0B216F', hcDark: _platform_theme_common_colorRegistry_js__WEBPACK_IMPORTED_MODULE_2__.activeContrastBorder, hcLight: _platform_theme_common_colorRegistry_js__WEBPACK_IMPORTED_MODULE_2__.activeContrastBorder }, _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('editorActiveLineNumber', 'Color of editor active line number'), false, _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('deprecatedEditorActiveLineNumber', 'Id is deprecated. Use \'editorLineNumber.activeForeground\' instead.'));
const editorActiveLineNumber = (0,_platform_theme_common_colorRegistry_js__WEBPACK_IMPORTED_MODULE_2__.registerColor)('editorLineNumber.activeForeground', deprecatedEditorActiveLineNumber, _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('editorActiveLineNumber', 'Color of editor active line number'));
const editorDimmedLineNumber = (0,_platform_theme_common_colorRegistry_js__WEBPACK_IMPORTED_MODULE_2__.registerColor)('editorLineNumber.dimmedForeground', null, _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('editorDimmedLineNumber', 'Color of the final editor line when editor.renderFinalNewline is set to dimmed.'));
const editorRuler = (0,_platform_theme_common_colorRegistry_js__WEBPACK_IMPORTED_MODULE_2__.registerColor)('editorRuler.foreground', { dark: '#5A5A5A', light: _base_common_color_js__WEBPACK_IMPORTED_MODULE_1__.Color.lightgrey, hcDark: _base_common_color_js__WEBPACK_IMPORTED_MODULE_1__.Color.white, hcLight: '#292929' }, _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('editorRuler', 'Color of the editor rulers.'));
const editorCodeLensForeground = (0,_platform_theme_common_colorRegistry_js__WEBPACK_IMPORTED_MODULE_2__.registerColor)('editorCodeLens.foreground', { dark: '#999999', light: '#919191', hcDark: '#999999', hcLight: '#292929' }, _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('editorCodeLensForeground', 'Foreground color of editor CodeLens'));
const editorBracketMatchBackground = (0,_platform_theme_common_colorRegistry_js__WEBPACK_IMPORTED_MODULE_2__.registerColor)('editorBracketMatch.background', { dark: '#0064001a', light: '#0064001a', hcDark: '#0064001a', hcLight: '#0000' }, _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('editorBracketMatchBackground', 'Background color behind matching brackets'));
const editorBracketMatchBorder = (0,_platform_theme_common_colorRegistry_js__WEBPACK_IMPORTED_MODULE_2__.registerColor)('editorBracketMatch.border', { dark: '#888', light: '#B9B9B9', hcDark: _platform_theme_common_colorRegistry_js__WEBPACK_IMPORTED_MODULE_2__.contrastBorder, hcLight: _platform_theme_common_colorRegistry_js__WEBPACK_IMPORTED_MODULE_2__.contrastBorder }, _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('editorBracketMatchBorder', 'Color for matching brackets boxes'));
const editorOverviewRulerBorder = (0,_platform_theme_common_colorRegistry_js__WEBPACK_IMPORTED_MODULE_2__.registerColor)('editorOverviewRuler.border', { dark: '#7f7f7f4d', light: '#7f7f7f4d', hcDark: '#7f7f7f4d', hcLight: '#666666' }, _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('editorOverviewRulerBorder', 'Color of the overview ruler border.'));
const editorOverviewRulerBackground = (0,_platform_theme_common_colorRegistry_js__WEBPACK_IMPORTED_MODULE_2__.registerColor)('editorOverviewRuler.background', null, _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('editorOverviewRulerBackground', 'Background color of the editor overview ruler.'));
const editorGutter = (0,_platform_theme_common_colorRegistry_js__WEBPACK_IMPORTED_MODULE_2__.registerColor)('editorGutter.background', _platform_theme_common_colorRegistry_js__WEBPACK_IMPORTED_MODULE_2__.editorBackground, _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('editorGutter', 'Background color of the editor gutter. The gutter contains the glyph margins and the line numbers.'));
const editorUnnecessaryCodeBorder = (0,_platform_theme_common_colorRegistry_js__WEBPACK_IMPORTED_MODULE_2__.registerColor)('editorUnnecessaryCode.border', { dark: null, light: null, hcDark: _base_common_color_js__WEBPACK_IMPORTED_MODULE_1__.Color.fromHex('#fff').transparent(0.8), hcLight: _platform_theme_common_colorRegistry_js__WEBPACK_IMPORTED_MODULE_2__.contrastBorder }, _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('unnecessaryCodeBorder', 'Border color of unnecessary (unused) source code in the editor.'));
const editorUnnecessaryCodeOpacity = (0,_platform_theme_common_colorRegistry_js__WEBPACK_IMPORTED_MODULE_2__.registerColor)('editorUnnecessaryCode.opacity', { dark: _base_common_color_js__WEBPACK_IMPORTED_MODULE_1__.Color.fromHex('#000a'), light: _base_common_color_js__WEBPACK_IMPORTED_MODULE_1__.Color.fromHex('#0007'), hcDark: null, hcLight: null }, _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('unnecessaryCodeOpacity', 'Opacity of unnecessary (unused) source code in the editor. For example, "#000000c0" will render the code with 75% opacity. For high contrast themes, use the  \'editorUnnecessaryCode.border\' theme color to underline unnecessary code instead of fading it out.'));
const ghostTextBorder = (0,_platform_theme_common_colorRegistry_js__WEBPACK_IMPORTED_MODULE_2__.registerColor)('editorGhostText.border', { dark: null, light: null, hcDark: _base_common_color_js__WEBPACK_IMPORTED_MODULE_1__.Color.fromHex('#fff').transparent(0.8), hcLight: _base_common_color_js__WEBPACK_IMPORTED_MODULE_1__.Color.fromHex('#292929').transparent(0.8) }, _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('editorGhostTextBorder', 'Border color of ghost text in the editor.'));
const ghostTextForeground = (0,_platform_theme_common_colorRegistry_js__WEBPACK_IMPORTED_MODULE_2__.registerColor)('editorGhostText.foreground', { dark: _base_common_color_js__WEBPACK_IMPORTED_MODULE_1__.Color.fromHex('#ffffff56'), light: _base_common_color_js__WEBPACK_IMPORTED_MODULE_1__.Color.fromHex('#0007'), hcDark: null, hcLight: null }, _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('editorGhostTextForeground', 'Foreground color of the ghost text in the editor.'));
const ghostTextBackground = (0,_platform_theme_common_colorRegistry_js__WEBPACK_IMPORTED_MODULE_2__.registerColor)('editorGhostText.background', null, _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('editorGhostTextBackground', 'Background color of the ghost text in the editor.'));
const rulerRangeDefault = new _base_common_color_js__WEBPACK_IMPORTED_MODULE_1__.Color(new _base_common_color_js__WEBPACK_IMPORTED_MODULE_1__.RGBA(0, 122, 204, 0.6));
const overviewRulerRangeHighlight = (0,_platform_theme_common_colorRegistry_js__WEBPACK_IMPORTED_MODULE_2__.registerColor)('editorOverviewRuler.rangeHighlightForeground', rulerRangeDefault, _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('overviewRulerRangeHighlight', 'Overview ruler marker color for range highlights. The color must not be opaque so as not to hide underlying decorations.'), true);
const overviewRulerError = (0,_platform_theme_common_colorRegistry_js__WEBPACK_IMPORTED_MODULE_2__.registerColor)('editorOverviewRuler.errorForeground', { dark: new _base_common_color_js__WEBPACK_IMPORTED_MODULE_1__.Color(new _base_common_color_js__WEBPACK_IMPORTED_MODULE_1__.RGBA(255, 18, 18, 0.7)), light: new _base_common_color_js__WEBPACK_IMPORTED_MODULE_1__.Color(new _base_common_color_js__WEBPACK_IMPORTED_MODULE_1__.RGBA(255, 18, 18, 0.7)), hcDark: new _base_common_color_js__WEBPACK_IMPORTED_MODULE_1__.Color(new _base_common_color_js__WEBPACK_IMPORTED_MODULE_1__.RGBA(255, 50, 50, 1)), hcLight: '#B5200D' }, _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('overviewRuleError', 'Overview ruler marker color for errors.'));
const overviewRulerWarning = (0,_platform_theme_common_colorRegistry_js__WEBPACK_IMPORTED_MODULE_2__.registerColor)('editorOverviewRuler.warningForeground', { dark: _platform_theme_common_colorRegistry_js__WEBPACK_IMPORTED_MODULE_2__.editorWarningForeground, light: _platform_theme_common_colorRegistry_js__WEBPACK_IMPORTED_MODULE_2__.editorWarningForeground, hcDark: _platform_theme_common_colorRegistry_js__WEBPACK_IMPORTED_MODULE_2__.editorWarningBorder, hcLight: _platform_theme_common_colorRegistry_js__WEBPACK_IMPORTED_MODULE_2__.editorWarningBorder }, _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('overviewRuleWarning', 'Overview ruler marker color for warnings.'));
const overviewRulerInfo = (0,_platform_theme_common_colorRegistry_js__WEBPACK_IMPORTED_MODULE_2__.registerColor)('editorOverviewRuler.infoForeground', { dark: _platform_theme_common_colorRegistry_js__WEBPACK_IMPORTED_MODULE_2__.editorInfoForeground, light: _platform_theme_common_colorRegistry_js__WEBPACK_IMPORTED_MODULE_2__.editorInfoForeground, hcDark: _platform_theme_common_colorRegistry_js__WEBPACK_IMPORTED_MODULE_2__.editorInfoBorder, hcLight: _platform_theme_common_colorRegistry_js__WEBPACK_IMPORTED_MODULE_2__.editorInfoBorder }, _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('overviewRuleInfo', 'Overview ruler marker color for infos.'));
const editorBracketHighlightingForeground1 = (0,_platform_theme_common_colorRegistry_js__WEBPACK_IMPORTED_MODULE_2__.registerColor)('editorBracketHighlight.foreground1', { dark: '#FFD700', light: '#0431FAFF', hcDark: '#FFD700', hcLight: '#0431FAFF' }, _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('editorBracketHighlightForeground1', 'Foreground color of brackets (1). Requires enabling bracket pair colorization.'));
const editorBracketHighlightingForeground2 = (0,_platform_theme_common_colorRegistry_js__WEBPACK_IMPORTED_MODULE_2__.registerColor)('editorBracketHighlight.foreground2', { dark: '#DA70D6', light: '#319331FF', hcDark: '#DA70D6', hcLight: '#319331FF' }, _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('editorBracketHighlightForeground2', 'Foreground color of brackets (2). Requires enabling bracket pair colorization.'));
const editorBracketHighlightingForeground3 = (0,_platform_theme_common_colorRegistry_js__WEBPACK_IMPORTED_MODULE_2__.registerColor)('editorBracketHighlight.foreground3', { dark: '#179FFF', light: '#7B3814FF', hcDark: '#87CEFA', hcLight: '#7B3814FF' }, _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('editorBracketHighlightForeground3', 'Foreground color of brackets (3). Requires enabling bracket pair colorization.'));
const editorBracketHighlightingForeground4 = (0,_platform_theme_common_colorRegistry_js__WEBPACK_IMPORTED_MODULE_2__.registerColor)('editorBracketHighlight.foreground4', '#00000000', _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('editorBracketHighlightForeground4', 'Foreground color of brackets (4). Requires enabling bracket pair colorization.'));
const editorBracketHighlightingForeground5 = (0,_platform_theme_common_colorRegistry_js__WEBPACK_IMPORTED_MODULE_2__.registerColor)('editorBracketHighlight.foreground5', '#00000000', _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('editorBracketHighlightForeground5', 'Foreground color of brackets (5). Requires enabling bracket pair colorization.'));
const editorBracketHighlightingForeground6 = (0,_platform_theme_common_colorRegistry_js__WEBPACK_IMPORTED_MODULE_2__.registerColor)('editorBracketHighlight.foreground6', '#00000000', _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('editorBracketHighlightForeground6', 'Foreground color of brackets (6). Requires enabling bracket pair colorization.'));
const editorBracketHighlightingUnexpectedBracketForeground = (0,_platform_theme_common_colorRegistry_js__WEBPACK_IMPORTED_MODULE_2__.registerColor)('editorBracketHighlight.unexpectedBracket.foreground', { dark: new _base_common_color_js__WEBPACK_IMPORTED_MODULE_1__.Color(new _base_common_color_js__WEBPACK_IMPORTED_MODULE_1__.RGBA(255, 18, 18, 0.8)), light: new _base_common_color_js__WEBPACK_IMPORTED_MODULE_1__.Color(new _base_common_color_js__WEBPACK_IMPORTED_MODULE_1__.RGBA(255, 18, 18, 0.8)), hcDark: 'new Color(new RGBA(255, 50, 50, 1))', hcLight: '#B5200D' }, _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('editorBracketHighlightUnexpectedBracketForeground', 'Foreground color of unexpected brackets.'));
const editorBracketPairGuideBackground1 = (0,_platform_theme_common_colorRegistry_js__WEBPACK_IMPORTED_MODULE_2__.registerColor)('editorBracketPairGuide.background1', '#00000000', _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('editorBracketPairGuide.background1', 'Background color of inactive bracket pair guides (1). Requires enabling bracket pair guides.'));
const editorBracketPairGuideBackground2 = (0,_platform_theme_common_colorRegistry_js__WEBPACK_IMPORTED_MODULE_2__.registerColor)('editorBracketPairGuide.background2', '#00000000', _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('editorBracketPairGuide.background2', 'Background color of inactive bracket pair guides (2). Requires enabling bracket pair guides.'));
const editorBracketPairGuideBackground3 = (0,_platform_theme_common_colorRegistry_js__WEBPACK_IMPORTED_MODULE_2__.registerColor)('editorBracketPairGuide.background3', '#00000000', _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('editorBracketPairGuide.background3', 'Background color of inactive bracket pair guides (3). Requires enabling bracket pair guides.'));
const editorBracketPairGuideBackground4 = (0,_platform_theme_common_colorRegistry_js__WEBPACK_IMPORTED_MODULE_2__.registerColor)('editorBracketPairGuide.background4', '#00000000', _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('editorBracketPairGuide.background4', 'Background color of inactive bracket pair guides (4). Requires enabling bracket pair guides.'));
const editorBracketPairGuideBackground5 = (0,_platform_theme_common_colorRegistry_js__WEBPACK_IMPORTED_MODULE_2__.registerColor)('editorBracketPairGuide.background5', '#00000000', _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('editorBracketPairGuide.background5', 'Background color of inactive bracket pair guides (5). Requires enabling bracket pair guides.'));
const editorBracketPairGuideBackground6 = (0,_platform_theme_common_colorRegistry_js__WEBPACK_IMPORTED_MODULE_2__.registerColor)('editorBracketPairGuide.background6', '#00000000', _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('editorBracketPairGuide.background6', 'Background color of inactive bracket pair guides (6). Requires enabling bracket pair guides.'));
const editorBracketPairGuideActiveBackground1 = (0,_platform_theme_common_colorRegistry_js__WEBPACK_IMPORTED_MODULE_2__.registerColor)('editorBracketPairGuide.activeBackground1', '#00000000', _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('editorBracketPairGuide.activeBackground1', 'Background color of active bracket pair guides (1). Requires enabling bracket pair guides.'));
const editorBracketPairGuideActiveBackground2 = (0,_platform_theme_common_colorRegistry_js__WEBPACK_IMPORTED_MODULE_2__.registerColor)('editorBracketPairGuide.activeBackground2', '#00000000', _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('editorBracketPairGuide.activeBackground2', 'Background color of active bracket pair guides (2). Requires enabling bracket pair guides.'));
const editorBracketPairGuideActiveBackground3 = (0,_platform_theme_common_colorRegistry_js__WEBPACK_IMPORTED_MODULE_2__.registerColor)('editorBracketPairGuide.activeBackground3', '#00000000', _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('editorBracketPairGuide.activeBackground3', 'Background color of active bracket pair guides (3). Requires enabling bracket pair guides.'));
const editorBracketPairGuideActiveBackground4 = (0,_platform_theme_common_colorRegistry_js__WEBPACK_IMPORTED_MODULE_2__.registerColor)('editorBracketPairGuide.activeBackground4', '#00000000', _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('editorBracketPairGuide.activeBackground4', 'Background color of active bracket pair guides (4). Requires enabling bracket pair guides.'));
const editorBracketPairGuideActiveBackground5 = (0,_platform_theme_common_colorRegistry_js__WEBPACK_IMPORTED_MODULE_2__.registerColor)('editorBracketPairGuide.activeBackground5', '#00000000', _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('editorBracketPairGuide.activeBackground5', 'Background color of active bracket pair guides (5). Requires enabling bracket pair guides.'));
const editorBracketPairGuideActiveBackground6 = (0,_platform_theme_common_colorRegistry_js__WEBPACK_IMPORTED_MODULE_2__.registerColor)('editorBracketPairGuide.activeBackground6', '#00000000', _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('editorBracketPairGuide.activeBackground6', 'Background color of active bracket pair guides (6). Requires enabling bracket pair guides.'));
const editorUnicodeHighlightBorder = (0,_platform_theme_common_colorRegistry_js__WEBPACK_IMPORTED_MODULE_2__.registerColor)('editorUnicodeHighlight.border', _platform_theme_common_colorRegistry_js__WEBPACK_IMPORTED_MODULE_2__.editorWarningForeground, _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('editorUnicodeHighlight.border', 'Border color used to highlight unicode characters.'));
const editorUnicodeHighlightBackground = (0,_platform_theme_common_colorRegistry_js__WEBPACK_IMPORTED_MODULE_2__.registerColor)('editorUnicodeHighlight.background', _platform_theme_common_colorRegistry_js__WEBPACK_IMPORTED_MODULE_2__.editorWarningBackground, _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('editorUnicodeHighlight.background', 'Background color used to highlight unicode characters.'));
// contains all color rules that used to defined in editor/browser/widget/editor.css
(0,_platform_theme_common_themeService_js__WEBPACK_IMPORTED_MODULE_3__.registerThemingParticipant)((theme, collector) => {
    const background = theme.getColor(_platform_theme_common_colorRegistry_js__WEBPACK_IMPORTED_MODULE_2__.editorBackground);
    const lineHighlight = theme.getColor(editorLineHighlight);
    const imeBackground = (lineHighlight && !lineHighlight.isTransparent() ? lineHighlight : background);
    if (imeBackground) {
        collector.addRule(`.monaco-editor .inputarea.ime-input { background-color: ${imeBackground}; }`);
    }
});


}),
2805: (function (__unused_webpack_module, __webpack_exports__, __webpack_require__) {
__webpack_require__.r(__webpack_exports__);
__webpack_require__.d(__webpack_exports__, {
  DEFAULT_COLOR_CONFIG_VALUE: () => (/* reexport safe */ _colorUtils_js__WEBPACK_IMPORTED_MODULE_0__.DEFAULT_COLOR_CONFIG_VALUE),
  Extensions: () => (/* reexport safe */ _colorUtils_js__WEBPACK_IMPORTED_MODULE_0__.Extensions),
  _deprecatedQuickInputListFocusBackground: () => (/* reexport safe */ _colors_quickpickColors_js__WEBPACK_IMPORTED_MODULE_9__._deprecatedQuickInputListFocusBackground),
  activeContrastBorder: () => (/* reexport safe */ _colors_baseColors_js__WEBPACK_IMPORTED_MODULE_1__.activeContrastBorder),
  asCssVariable: () => (/* reexport safe */ _colorUtils_js__WEBPACK_IMPORTED_MODULE_0__.asCssVariable),
  asCssVariableName: () => (/* reexport safe */ _colorUtils_js__WEBPACK_IMPORTED_MODULE_0__.asCssVariableName),
  asCssVariableWithDefault: () => (/* reexport safe */ _colorUtils_js__WEBPACK_IMPORTED_MODULE_0__.asCssVariableWithDefault),
  badgeBackground: () => (/* reexport safe */ _colors_miscColors_js__WEBPACK_IMPORTED_MODULE_8__.badgeBackground),
  badgeForeground: () => (/* reexport safe */ _colors_miscColors_js__WEBPACK_IMPORTED_MODULE_8__.badgeForeground),
  breadcrumbsActiveSelectionForeground: () => (/* reexport safe */ _colors_editorColors_js__WEBPACK_IMPORTED_MODULE_3__.breadcrumbsActiveSelectionForeground),
  breadcrumbsBackground: () => (/* reexport safe */ _colors_editorColors_js__WEBPACK_IMPORTED_MODULE_3__.breadcrumbsBackground),
  breadcrumbsFocusForeground: () => (/* reexport safe */ _colors_editorColors_js__WEBPACK_IMPORTED_MODULE_3__.breadcrumbsFocusForeground),
  breadcrumbsForeground: () => (/* reexport safe */ _colors_editorColors_js__WEBPACK_IMPORTED_MODULE_3__.breadcrumbsForeground),
  breadcrumbsPickerBackground: () => (/* reexport safe */ _colors_editorColors_js__WEBPACK_IMPORTED_MODULE_3__.breadcrumbsPickerBackground),
  buttonBackground: () => (/* reexport safe */ _colors_inputColors_js__WEBPACK_IMPORTED_MODULE_4__.buttonBackground),
  buttonBorder: () => (/* reexport safe */ _colors_inputColors_js__WEBPACK_IMPORTED_MODULE_4__.buttonBorder),
  buttonForeground: () => (/* reexport safe */ _colors_inputColors_js__WEBPACK_IMPORTED_MODULE_4__.buttonForeground),
  buttonHoverBackground: () => (/* reexport safe */ _colors_inputColors_js__WEBPACK_IMPORTED_MODULE_4__.buttonHoverBackground),
  buttonSecondaryBackground: () => (/* reexport safe */ _colors_inputColors_js__WEBPACK_IMPORTED_MODULE_4__.buttonSecondaryBackground),
  buttonSecondaryForeground: () => (/* reexport safe */ _colors_inputColors_js__WEBPACK_IMPORTED_MODULE_4__.buttonSecondaryForeground),
  buttonSecondaryHoverBackground: () => (/* reexport safe */ _colors_inputColors_js__WEBPACK_IMPORTED_MODULE_4__.buttonSecondaryHoverBackground),
  buttonSeparator: () => (/* reexport safe */ _colors_inputColors_js__WEBPACK_IMPORTED_MODULE_4__.buttonSeparator),
  chartsBlue: () => (/* reexport safe */ _colors_chartsColors_js__WEBPACK_IMPORTED_MODULE_2__.chartsBlue),
  chartsForeground: () => (/* reexport safe */ _colors_chartsColors_js__WEBPACK_IMPORTED_MODULE_2__.chartsForeground),
  chartsGreen: () => (/* reexport safe */ _colors_chartsColors_js__WEBPACK_IMPORTED_MODULE_2__.chartsGreen),
  chartsLines: () => (/* reexport safe */ _colors_chartsColors_js__WEBPACK_IMPORTED_MODULE_2__.chartsLines),
  chartsOrange: () => (/* reexport safe */ _colors_chartsColors_js__WEBPACK_IMPORTED_MODULE_2__.chartsOrange),
  chartsPurple: () => (/* reexport safe */ _colors_chartsColors_js__WEBPACK_IMPORTED_MODULE_2__.chartsPurple),
  chartsRed: () => (/* reexport safe */ _colors_chartsColors_js__WEBPACK_IMPORTED_MODULE_2__.chartsRed),
  chartsYellow: () => (/* reexport safe */ _colors_chartsColors_js__WEBPACK_IMPORTED_MODULE_2__.chartsYellow),
  checkboxBackground: () => (/* reexport safe */ _colors_inputColors_js__WEBPACK_IMPORTED_MODULE_4__.checkboxBackground),
  checkboxBorder: () => (/* reexport safe */ _colors_inputColors_js__WEBPACK_IMPORTED_MODULE_4__.checkboxBorder),
  checkboxForeground: () => (/* reexport safe */ _colors_inputColors_js__WEBPACK_IMPORTED_MODULE_4__.checkboxForeground),
  checkboxSelectBackground: () => (/* reexport safe */ _colors_inputColors_js__WEBPACK_IMPORTED_MODULE_4__.checkboxSelectBackground),
  checkboxSelectBorder: () => (/* reexport safe */ _colors_inputColors_js__WEBPACK_IMPORTED_MODULE_4__.checkboxSelectBorder),
  contrastBorder: () => (/* reexport safe */ _colors_baseColors_js__WEBPACK_IMPORTED_MODULE_1__.contrastBorder),
  darken: () => (/* reexport safe */ _colorUtils_js__WEBPACK_IMPORTED_MODULE_0__.darken),
  defaultInsertColor: () => (/* reexport safe */ _colors_editorColors_js__WEBPACK_IMPORTED_MODULE_3__.defaultInsertColor),
  defaultRemoveColor: () => (/* reexport safe */ _colors_editorColors_js__WEBPACK_IMPORTED_MODULE_3__.defaultRemoveColor),
  descriptionForeground: () => (/* reexport safe */ _colors_baseColors_js__WEBPACK_IMPORTED_MODULE_1__.descriptionForeground),
  diffBorder: () => (/* reexport safe */ _colors_editorColors_js__WEBPACK_IMPORTED_MODULE_3__.diffBorder),
  diffDiagonalFill: () => (/* reexport safe */ _colors_editorColors_js__WEBPACK_IMPORTED_MODULE_3__.diffDiagonalFill),
  diffInserted: () => (/* reexport safe */ _colors_editorColors_js__WEBPACK_IMPORTED_MODULE_3__.diffInserted),
  diffInsertedLine: () => (/* reexport safe */ _colors_editorColors_js__WEBPACK_IMPORTED_MODULE_3__.diffInsertedLine),
  diffInsertedLineGutter: () => (/* reexport safe */ _colors_editorColors_js__WEBPACK_IMPORTED_MODULE_3__.diffInsertedLineGutter),
  diffInsertedOutline: () => (/* reexport safe */ _colors_editorColors_js__WEBPACK_IMPORTED_MODULE_3__.diffInsertedOutline),
  diffOverviewRulerInserted: () => (/* reexport safe */ _colors_editorColors_js__WEBPACK_IMPORTED_MODULE_3__.diffOverviewRulerInserted),
  diffOverviewRulerRemoved: () => (/* reexport safe */ _colors_editorColors_js__WEBPACK_IMPORTED_MODULE_3__.diffOverviewRulerRemoved),
  diffRemoved: () => (/* reexport safe */ _colors_editorColors_js__WEBPACK_IMPORTED_MODULE_3__.diffRemoved),
  diffRemovedLine: () => (/* reexport safe */ _colors_editorColors_js__WEBPACK_IMPORTED_MODULE_3__.diffRemovedLine),
  diffRemovedLineGutter: () => (/* reexport safe */ _colors_editorColors_js__WEBPACK_IMPORTED_MODULE_3__.diffRemovedLineGutter),
  diffRemovedOutline: () => (/* reexport safe */ _colors_editorColors_js__WEBPACK_IMPORTED_MODULE_3__.diffRemovedOutline),
  diffUnchangedRegionBackground: () => (/* reexport safe */ _colors_editorColors_js__WEBPACK_IMPORTED_MODULE_3__.diffUnchangedRegionBackground),
  diffUnchangedRegionForeground: () => (/* reexport safe */ _colors_editorColors_js__WEBPACK_IMPORTED_MODULE_3__.diffUnchangedRegionForeground),
  diffUnchangedTextBackground: () => (/* reexport safe */ _colors_editorColors_js__WEBPACK_IMPORTED_MODULE_3__.diffUnchangedTextBackground),
  disabledForeground: () => (/* reexport safe */ _colors_baseColors_js__WEBPACK_IMPORTED_MODULE_1__.disabledForeground),
  editorActionListBackground: () => (/* reexport safe */ _colors_listColors_js__WEBPACK_IMPORTED_MODULE_5__.editorActionListBackground),
  editorActionListFocusBackground: () => (/* reexport safe */ _colors_listColors_js__WEBPACK_IMPORTED_MODULE_5__.editorActionListFocusBackground),
  editorActionListFocusForeground: () => (/* reexport safe */ _colors_listColors_js__WEBPACK_IMPORTED_MODULE_5__.editorActionListFocusForeground),
  editorActionListForeground: () => (/* reexport safe */ _colors_listColors_js__WEBPACK_IMPORTED_MODULE_5__.editorActionListForeground),
  editorActiveLinkForeground: () => (/* reexport safe */ _colors_editorColors_js__WEBPACK_IMPORTED_MODULE_3__.editorActiveLinkForeground),
  editorBackground: () => (/* reexport safe */ _colors_editorColors_js__WEBPACK_IMPORTED_MODULE_3__.editorBackground),
  editorErrorBackground: () => (/* reexport safe */ _colors_editorColors_js__WEBPACK_IMPORTED_MODULE_3__.editorErrorBackground),
  editorErrorBorder: () => (/* reexport safe */ _colors_editorColors_js__WEBPACK_IMPORTED_MODULE_3__.editorErrorBorder),
  editorErrorForeground: () => (/* reexport safe */ _colors_editorColors_js__WEBPACK_IMPORTED_MODULE_3__.editorErrorForeground),
  editorFindMatch: () => (/* reexport safe */ _colors_editorColors_js__WEBPACK_IMPORTED_MODULE_3__.editorFindMatch),
  editorFindMatchBorder: () => (/* reexport safe */ _colors_editorColors_js__WEBPACK_IMPORTED_MODULE_3__.editorFindMatchBorder),
  editorFindMatchForeground: () => (/* reexport safe */ _colors_editorColors_js__WEBPACK_IMPORTED_MODULE_3__.editorFindMatchForeground),
  editorFindMatchHighlight: () => (/* reexport safe */ _colors_editorColors_js__WEBPACK_IMPORTED_MODULE_3__.editorFindMatchHighlight),
  editorFindMatchHighlightBorder: () => (/* reexport safe */ _colors_editorColors_js__WEBPACK_IMPORTED_MODULE_3__.editorFindMatchHighlightBorder),
  editorFindMatchHighlightForeground: () => (/* reexport safe */ _colors_editorColors_js__WEBPACK_IMPORTED_MODULE_3__.editorFindMatchHighlightForeground),
  editorFindRangeHighlight: () => (/* reexport safe */ _colors_editorColors_js__WEBPACK_IMPORTED_MODULE_3__.editorFindRangeHighlight),
  editorFindRangeHighlightBorder: () => (/* reexport safe */ _colors_editorColors_js__WEBPACK_IMPORTED_MODULE_3__.editorFindRangeHighlightBorder),
  editorForeground: () => (/* reexport safe */ _colors_editorColors_js__WEBPACK_IMPORTED_MODULE_3__.editorForeground),
  editorHintBorder: () => (/* reexport safe */ _colors_editorColors_js__WEBPACK_IMPORTED_MODULE_3__.editorHintBorder),
  editorHintForeground: () => (/* reexport safe */ _colors_editorColors_js__WEBPACK_IMPORTED_MODULE_3__.editorHintForeground),
  editorHoverBackground: () => (/* reexport safe */ _colors_editorColors_js__WEBPACK_IMPORTED_MODULE_3__.editorHoverBackground),
  editorHoverBorder: () => (/* reexport safe */ _colors_editorColors_js__WEBPACK_IMPORTED_MODULE_3__.editorHoverBorder),
  editorHoverForeground: () => (/* reexport safe */ _colors_editorColors_js__WEBPACK_IMPORTED_MODULE_3__.editorHoverForeground),
  editorHoverHighlight: () => (/* reexport safe */ _colors_editorColors_js__WEBPACK_IMPORTED_MODULE_3__.editorHoverHighlight),
  editorHoverStatusBarBackground: () => (/* reexport safe */ _colors_editorColors_js__WEBPACK_IMPORTED_MODULE_3__.editorHoverStatusBarBackground),
  editorInactiveSelection: () => (/* reexport safe */ _colors_editorColors_js__WEBPACK_IMPORTED_MODULE_3__.editorInactiveSelection),
  editorInfoBackground: () => (/* reexport safe */ _colors_editorColors_js__WEBPACK_IMPORTED_MODULE_3__.editorInfoBackground),
  editorInfoBorder: () => (/* reexport safe */ _colors_editorColors_js__WEBPACK_IMPORTED_MODULE_3__.editorInfoBorder),
  editorInfoForeground: () => (/* reexport safe */ _colors_editorColors_js__WEBPACK_IMPORTED_MODULE_3__.editorInfoForeground),
  editorInlayHintBackground: () => (/* reexport safe */ _colors_editorColors_js__WEBPACK_IMPORTED_MODULE_3__.editorInlayHintBackground),
  editorInlayHintForeground: () => (/* reexport safe */ _colors_editorColors_js__WEBPACK_IMPORTED_MODULE_3__.editorInlayHintForeground),
  editorInlayHintParameterBackground: () => (/* reexport safe */ _colors_editorColors_js__WEBPACK_IMPORTED_MODULE_3__.editorInlayHintParameterBackground),
  editorInlayHintParameterForeground: () => (/* reexport safe */ _colors_editorColors_js__WEBPACK_IMPORTED_MODULE_3__.editorInlayHintParameterForeground),
  editorInlayHintTypeBackground: () => (/* reexport safe */ _colors_editorColors_js__WEBPACK_IMPORTED_MODULE_3__.editorInlayHintTypeBackground),
  editorInlayHintTypeForeground: () => (/* reexport safe */ _colors_editorColors_js__WEBPACK_IMPORTED_MODULE_3__.editorInlayHintTypeForeground),
  editorLightBulbAiForeground: () => (/* reexport safe */ _colors_editorColors_js__WEBPACK_IMPORTED_MODULE_3__.editorLightBulbAiForeground),
  editorLightBulbAutoFixForeground: () => (/* reexport safe */ _colors_editorColors_js__WEBPACK_IMPORTED_MODULE_3__.editorLightBulbAutoFixForeground),
  editorLightBulbForeground: () => (/* reexport safe */ _colors_editorColors_js__WEBPACK_IMPORTED_MODULE_3__.editorLightBulbForeground),
  editorSelectionBackground: () => (/* reexport safe */ _colors_editorColors_js__WEBPACK_IMPORTED_MODULE_3__.editorSelectionBackground),
  editorSelectionForeground: () => (/* reexport safe */ _colors_editorColors_js__WEBPACK_IMPORTED_MODULE_3__.editorSelectionForeground),
  editorSelectionHighlight: () => (/* reexport safe */ _colors_editorColors_js__WEBPACK_IMPORTED_MODULE_3__.editorSelectionHighlight),
  editorSelectionHighlightBorder: () => (/* reexport safe */ _colors_editorColors_js__WEBPACK_IMPORTED_MODULE_3__.editorSelectionHighlightBorder),
  editorStickyScrollBackground: () => (/* reexport safe */ _colors_editorColors_js__WEBPACK_IMPORTED_MODULE_3__.editorStickyScrollBackground),
  editorStickyScrollBorder: () => (/* reexport safe */ _colors_editorColors_js__WEBPACK_IMPORTED_MODULE_3__.editorStickyScrollBorder),
  editorStickyScrollHoverBackground: () => (/* reexport safe */ _colors_editorColors_js__WEBPACK_IMPORTED_MODULE_3__.editorStickyScrollHoverBackground),
  editorStickyScrollShadow: () => (/* reexport safe */ _colors_editorColors_js__WEBPACK_IMPORTED_MODULE_3__.editorStickyScrollShadow),
  editorWarningBackground: () => (/* reexport safe */ _colors_editorColors_js__WEBPACK_IMPORTED_MODULE_3__.editorWarningBackground),
  editorWarningBorder: () => (/* reexport safe */ _colors_editorColors_js__WEBPACK_IMPORTED_MODULE_3__.editorWarningBorder),
  editorWarningForeground: () => (/* reexport safe */ _colors_editorColors_js__WEBPACK_IMPORTED_MODULE_3__.editorWarningForeground),
  editorWidgetBackground: () => (/* reexport safe */ _colors_editorColors_js__WEBPACK_IMPORTED_MODULE_3__.editorWidgetBackground),
  editorWidgetBorder: () => (/* reexport safe */ _colors_editorColors_js__WEBPACK_IMPORTED_MODULE_3__.editorWidgetBorder),
  editorWidgetForeground: () => (/* reexport safe */ _colors_editorColors_js__WEBPACK_IMPORTED_MODULE_3__.editorWidgetForeground),
  editorWidgetResizeBorder: () => (/* reexport safe */ _colors_editorColors_js__WEBPACK_IMPORTED_MODULE_3__.editorWidgetResizeBorder),
  errorForeground: () => (/* reexport safe */ _colors_baseColors_js__WEBPACK_IMPORTED_MODULE_1__.errorForeground),
  executeTransform: () => (/* reexport safe */ _colorUtils_js__WEBPACK_IMPORTED_MODULE_0__.executeTransform),
  focusBorder: () => (/* reexport safe */ _colors_baseColors_js__WEBPACK_IMPORTED_MODULE_1__.focusBorder),
  foreground: () => (/* reexport safe */ _colors_baseColors_js__WEBPACK_IMPORTED_MODULE_1__.foreground),
  iconForeground: () => (/* reexport safe */ _colors_baseColors_js__WEBPACK_IMPORTED_MODULE_1__.iconForeground),
  ifDefinedThenElse: () => (/* reexport safe */ _colorUtils_js__WEBPACK_IMPORTED_MODULE_0__.ifDefinedThenElse),
  inputActiveOptionBackground: () => (/* reexport safe */ _colors_inputColors_js__WEBPACK_IMPORTED_MODULE_4__.inputActiveOptionBackground),
  inputActiveOptionBorder: () => (/* reexport safe */ _colors_inputColors_js__WEBPACK_IMPORTED_MODULE_4__.inputActiveOptionBorder),
  inputActiveOptionForeground: () => (/* reexport safe */ _colors_inputColors_js__WEBPACK_IMPORTED_MODULE_4__.inputActiveOptionForeground),
  inputActiveOptionHoverBackground: () => (/* reexport safe */ _colors_inputColors_js__WEBPACK_IMPORTED_MODULE_4__.inputActiveOptionHoverBackground),
  inputBackground: () => (/* reexport safe */ _colors_inputColors_js__WEBPACK_IMPORTED_MODULE_4__.inputBackground),
  inputBorder: () => (/* reexport safe */ _colors_inputColors_js__WEBPACK_IMPORTED_MODULE_4__.inputBorder),
  inputForeground: () => (/* reexport safe */ _colors_inputColors_js__WEBPACK_IMPORTED_MODULE_4__.inputForeground),
  inputPlaceholderForeground: () => (/* reexport safe */ _colors_inputColors_js__WEBPACK_IMPORTED_MODULE_4__.inputPlaceholderForeground),
  inputValidationErrorBackground: () => (/* reexport safe */ _colors_inputColors_js__WEBPACK_IMPORTED_MODULE_4__.inputValidationErrorBackground),
  inputValidationErrorBorder: () => (/* reexport safe */ _colors_inputColors_js__WEBPACK_IMPORTED_MODULE_4__.inputValidationErrorBorder),
  inputValidationErrorForeground: () => (/* reexport safe */ _colors_inputColors_js__WEBPACK_IMPORTED_MODULE_4__.inputValidationErrorForeground),
  inputValidationInfoBackground: () => (/* reexport safe */ _colors_inputColors_js__WEBPACK_IMPORTED_MODULE_4__.inputValidationInfoBackground),
  inputValidationInfoBorder: () => (/* reexport safe */ _colors_inputColors_js__WEBPACK_IMPORTED_MODULE_4__.inputValidationInfoBorder),
  inputValidationInfoForeground: () => (/* reexport safe */ _colors_inputColors_js__WEBPACK_IMPORTED_MODULE_4__.inputValidationInfoForeground),
  inputValidationWarningBackground: () => (/* reexport safe */ _colors_inputColors_js__WEBPACK_IMPORTED_MODULE_4__.inputValidationWarningBackground),
  inputValidationWarningBorder: () => (/* reexport safe */ _colors_inputColors_js__WEBPACK_IMPORTED_MODULE_4__.inputValidationWarningBorder),
  inputValidationWarningForeground: () => (/* reexport safe */ _colors_inputColors_js__WEBPACK_IMPORTED_MODULE_4__.inputValidationWarningForeground),
  isColorDefaults: () => (/* reexport safe */ _colorUtils_js__WEBPACK_IMPORTED_MODULE_0__.isColorDefaults),
  keybindingLabelBackground: () => (/* reexport safe */ _colors_inputColors_js__WEBPACK_IMPORTED_MODULE_4__.keybindingLabelBackground),
  keybindingLabelBorder: () => (/* reexport safe */ _colors_inputColors_js__WEBPACK_IMPORTED_MODULE_4__.keybindingLabelBorder),
  keybindingLabelBottomBorder: () => (/* reexport safe */ _colors_inputColors_js__WEBPACK_IMPORTED_MODULE_4__.keybindingLabelBottomBorder),
  keybindingLabelForeground: () => (/* reexport safe */ _colors_inputColors_js__WEBPACK_IMPORTED_MODULE_4__.keybindingLabelForeground),
  lessProminent: () => (/* reexport safe */ _colorUtils_js__WEBPACK_IMPORTED_MODULE_0__.lessProminent),
  lighten: () => (/* reexport safe */ _colorUtils_js__WEBPACK_IMPORTED_MODULE_0__.lighten),
  listActiveSelectionBackground: () => (/* reexport safe */ _colors_listColors_js__WEBPACK_IMPORTED_MODULE_5__.listActiveSelectionBackground),
  listActiveSelectionForeground: () => (/* reexport safe */ _colors_listColors_js__WEBPACK_IMPORTED_MODULE_5__.listActiveSelectionForeground),
  listActiveSelectionIconForeground: () => (/* reexport safe */ _colors_listColors_js__WEBPACK_IMPORTED_MODULE_5__.listActiveSelectionIconForeground),
  listDeemphasizedForeground: () => (/* reexport safe */ _colors_listColors_js__WEBPACK_IMPORTED_MODULE_5__.listDeemphasizedForeground),
  listDropBetweenBackground: () => (/* reexport safe */ _colors_listColors_js__WEBPACK_IMPORTED_MODULE_5__.listDropBetweenBackground),
  listDropOverBackground: () => (/* reexport safe */ _colors_listColors_js__WEBPACK_IMPORTED_MODULE_5__.listDropOverBackground),
  listErrorForeground: () => (/* reexport safe */ _colors_listColors_js__WEBPACK_IMPORTED_MODULE_5__.listErrorForeground),
  listFilterMatchHighlight: () => (/* reexport safe */ _colors_listColors_js__WEBPACK_IMPORTED_MODULE_5__.listFilterMatchHighlight),
  listFilterMatchHighlightBorder: () => (/* reexport safe */ _colors_listColors_js__WEBPACK_IMPORTED_MODULE_5__.listFilterMatchHighlightBorder),
  listFilterWidgetBackground: () => (/* reexport safe */ _colors_listColors_js__WEBPACK_IMPORTED_MODULE_5__.listFilterWidgetBackground),
  listFilterWidgetNoMatchesOutline: () => (/* reexport safe */ _colors_listColors_js__WEBPACK_IMPORTED_MODULE_5__.listFilterWidgetNoMatchesOutline),
  listFilterWidgetOutline: () => (/* reexport safe */ _colors_listColors_js__WEBPACK_IMPORTED_MODULE_5__.listFilterWidgetOutline),
  listFilterWidgetShadow: () => (/* reexport safe */ _colors_listColors_js__WEBPACK_IMPORTED_MODULE_5__.listFilterWidgetShadow),
  listFocusAndSelectionOutline: () => (/* reexport safe */ _colors_listColors_js__WEBPACK_IMPORTED_MODULE_5__.listFocusAndSelectionOutline),
  listFocusBackground: () => (/* reexport safe */ _colors_listColors_js__WEBPACK_IMPORTED_MODULE_5__.listFocusBackground),
  listFocusForeground: () => (/* reexport safe */ _colors_listColors_js__WEBPACK_IMPORTED_MODULE_5__.listFocusForeground),
  listFocusHighlightForeground: () => (/* reexport safe */ _colors_listColors_js__WEBPACK_IMPORTED_MODULE_5__.listFocusHighlightForeground),
  listFocusOutline: () => (/* reexport safe */ _colors_listColors_js__WEBPACK_IMPORTED_MODULE_5__.listFocusOutline),
  listHighlightForeground: () => (/* reexport safe */ _colors_listColors_js__WEBPACK_IMPORTED_MODULE_5__.listHighlightForeground),
  listHoverBackground: () => (/* reexport safe */ _colors_listColors_js__WEBPACK_IMPORTED_MODULE_5__.listHoverBackground),
  listHoverForeground: () => (/* reexport safe */ _colors_listColors_js__WEBPACK_IMPORTED_MODULE_5__.listHoverForeground),
  listInactiveFocusBackground: () => (/* reexport safe */ _colors_listColors_js__WEBPACK_IMPORTED_MODULE_5__.listInactiveFocusBackground),
  listInactiveFocusOutline: () => (/* reexport safe */ _colors_listColors_js__WEBPACK_IMPORTED_MODULE_5__.listInactiveFocusOutline),
  listInactiveSelectionBackground: () => (/* reexport safe */ _colors_listColors_js__WEBPACK_IMPORTED_MODULE_5__.listInactiveSelectionBackground),
  listInactiveSelectionForeground: () => (/* reexport safe */ _colors_listColors_js__WEBPACK_IMPORTED_MODULE_5__.listInactiveSelectionForeground),
  listInactiveSelectionIconForeground: () => (/* reexport safe */ _colors_listColors_js__WEBPACK_IMPORTED_MODULE_5__.listInactiveSelectionIconForeground),
  listInvalidItemForeground: () => (/* reexport safe */ _colors_listColors_js__WEBPACK_IMPORTED_MODULE_5__.listInvalidItemForeground),
  listWarningForeground: () => (/* reexport safe */ _colors_listColors_js__WEBPACK_IMPORTED_MODULE_5__.listWarningForeground),
  menuBackground: () => (/* reexport safe */ _colors_menuColors_js__WEBPACK_IMPORTED_MODULE_6__.menuBackground),
  menuBorder: () => (/* reexport safe */ _colors_menuColors_js__WEBPACK_IMPORTED_MODULE_6__.menuBorder),
  menuForeground: () => (/* reexport safe */ _colors_menuColors_js__WEBPACK_IMPORTED_MODULE_6__.menuForeground),
  menuSelectionBackground: () => (/* reexport safe */ _colors_menuColors_js__WEBPACK_IMPORTED_MODULE_6__.menuSelectionBackground),
  menuSelectionBorder: () => (/* reexport safe */ _colors_menuColors_js__WEBPACK_IMPORTED_MODULE_6__.menuSelectionBorder),
  menuSelectionForeground: () => (/* reexport safe */ _colors_menuColors_js__WEBPACK_IMPORTED_MODULE_6__.menuSelectionForeground),
  menuSeparatorBackground: () => (/* reexport safe */ _colors_menuColors_js__WEBPACK_IMPORTED_MODULE_6__.menuSeparatorBackground),
  mergeBorder: () => (/* reexport safe */ _colors_editorColors_js__WEBPACK_IMPORTED_MODULE_3__.mergeBorder),
  mergeCommonContentBackground: () => (/* reexport safe */ _colors_editorColors_js__WEBPACK_IMPORTED_MODULE_3__.mergeCommonContentBackground),
  mergeCommonHeaderBackground: () => (/* reexport safe */ _colors_editorColors_js__WEBPACK_IMPORTED_MODULE_3__.mergeCommonHeaderBackground),
  mergeCurrentContentBackground: () => (/* reexport safe */ _colors_editorColors_js__WEBPACK_IMPORTED_MODULE_3__.mergeCurrentContentBackground),
  mergeCurrentHeaderBackground: () => (/* reexport safe */ _colors_editorColors_js__WEBPACK_IMPORTED_MODULE_3__.mergeCurrentHeaderBackground),
  mergeIncomingContentBackground: () => (/* reexport safe */ _colors_editorColors_js__WEBPACK_IMPORTED_MODULE_3__.mergeIncomingContentBackground),
  mergeIncomingHeaderBackground: () => (/* reexport safe */ _colors_editorColors_js__WEBPACK_IMPORTED_MODULE_3__.mergeIncomingHeaderBackground),
  minimapBackground: () => (/* reexport safe */ _colors_minimapColors_js__WEBPACK_IMPORTED_MODULE_7__.minimapBackground),
  minimapError: () => (/* reexport safe */ _colors_minimapColors_js__WEBPACK_IMPORTED_MODULE_7__.minimapError),
  minimapFindMatch: () => (/* reexport safe */ _colors_minimapColors_js__WEBPACK_IMPORTED_MODULE_7__.minimapFindMatch),
  minimapForegroundOpacity: () => (/* reexport safe */ _colors_minimapColors_js__WEBPACK_IMPORTED_MODULE_7__.minimapForegroundOpacity),
  minimapInfo: () => (/* reexport safe */ _colors_minimapColors_js__WEBPACK_IMPORTED_MODULE_7__.minimapInfo),
  minimapSelection: () => (/* reexport safe */ _colors_minimapColors_js__WEBPACK_IMPORTED_MODULE_7__.minimapSelection),
  minimapSelectionOccurrenceHighlight: () => (/* reexport safe */ _colors_minimapColors_js__WEBPACK_IMPORTED_MODULE_7__.minimapSelectionOccurrenceHighlight),
  minimapSliderActiveBackground: () => (/* reexport safe */ _colors_minimapColors_js__WEBPACK_IMPORTED_MODULE_7__.minimapSliderActiveBackground),
  minimapSliderBackground: () => (/* reexport safe */ _colors_minimapColors_js__WEBPACK_IMPORTED_MODULE_7__.minimapSliderBackground),
  minimapSliderHoverBackground: () => (/* reexport safe */ _colors_minimapColors_js__WEBPACK_IMPORTED_MODULE_7__.minimapSliderHoverBackground),
  minimapWarning: () => (/* reexport safe */ _colors_minimapColors_js__WEBPACK_IMPORTED_MODULE_7__.minimapWarning),
  oneOf: () => (/* reexport safe */ _colorUtils_js__WEBPACK_IMPORTED_MODULE_0__.oneOf),
  overviewRulerCommonContentForeground: () => (/* reexport safe */ _colors_editorColors_js__WEBPACK_IMPORTED_MODULE_3__.overviewRulerCommonContentForeground),
  overviewRulerCurrentContentForeground: () => (/* reexport safe */ _colors_editorColors_js__WEBPACK_IMPORTED_MODULE_3__.overviewRulerCurrentContentForeground),
  overviewRulerFindMatchForeground: () => (/* reexport safe */ _colors_editorColors_js__WEBPACK_IMPORTED_MODULE_3__.overviewRulerFindMatchForeground),
  overviewRulerIncomingContentForeground: () => (/* reexport safe */ _colors_editorColors_js__WEBPACK_IMPORTED_MODULE_3__.overviewRulerIncomingContentForeground),
  overviewRulerSelectionHighlightForeground: () => (/* reexport safe */ _colors_editorColors_js__WEBPACK_IMPORTED_MODULE_3__.overviewRulerSelectionHighlightForeground),
  pickerGroupBorder: () => (/* reexport safe */ _colors_quickpickColors_js__WEBPACK_IMPORTED_MODULE_9__.pickerGroupBorder),
  pickerGroupForeground: () => (/* reexport safe */ _colors_quickpickColors_js__WEBPACK_IMPORTED_MODULE_9__.pickerGroupForeground),
  problemsErrorIconForeground: () => (/* reexport safe */ _colors_editorColors_js__WEBPACK_IMPORTED_MODULE_3__.problemsErrorIconForeground),
  problemsInfoIconForeground: () => (/* reexport safe */ _colors_editorColors_js__WEBPACK_IMPORTED_MODULE_3__.problemsInfoIconForeground),
  problemsWarningIconForeground: () => (/* reexport safe */ _colors_editorColors_js__WEBPACK_IMPORTED_MODULE_3__.problemsWarningIconForeground),
  progressBarBackground: () => (/* reexport safe */ _colors_miscColors_js__WEBPACK_IMPORTED_MODULE_8__.progressBarBackground),
  quickInputBackground: () => (/* reexport safe */ _colors_quickpickColors_js__WEBPACK_IMPORTED_MODULE_9__.quickInputBackground),
  quickInputForeground: () => (/* reexport safe */ _colors_quickpickColors_js__WEBPACK_IMPORTED_MODULE_9__.quickInputForeground),
  quickInputListFocusBackground: () => (/* reexport safe */ _colors_quickpickColors_js__WEBPACK_IMPORTED_MODULE_9__.quickInputListFocusBackground),
  quickInputListFocusForeground: () => (/* reexport safe */ _colors_quickpickColors_js__WEBPACK_IMPORTED_MODULE_9__.quickInputListFocusForeground),
  quickInputListFocusIconForeground: () => (/* reexport safe */ _colors_quickpickColors_js__WEBPACK_IMPORTED_MODULE_9__.quickInputListFocusIconForeground),
  quickInputTitleBackground: () => (/* reexport safe */ _colors_quickpickColors_js__WEBPACK_IMPORTED_MODULE_9__.quickInputTitleBackground),
  radioActiveBackground: () => (/* reexport safe */ _colors_inputColors_js__WEBPACK_IMPORTED_MODULE_4__.radioActiveBackground),
  radioActiveBorder: () => (/* reexport safe */ _colors_inputColors_js__WEBPACK_IMPORTED_MODULE_4__.radioActiveBorder),
  radioActiveForeground: () => (/* reexport safe */ _colors_inputColors_js__WEBPACK_IMPORTED_MODULE_4__.radioActiveForeground),
  radioInactiveBackground: () => (/* reexport safe */ _colors_inputColors_js__WEBPACK_IMPORTED_MODULE_4__.radioInactiveBackground),
  radioInactiveBorder: () => (/* reexport safe */ _colors_inputColors_js__WEBPACK_IMPORTED_MODULE_4__.radioInactiveBorder),
  radioInactiveForeground: () => (/* reexport safe */ _colors_inputColors_js__WEBPACK_IMPORTED_MODULE_4__.radioInactiveForeground),
  radioInactiveHoverBackground: () => (/* reexport safe */ _colors_inputColors_js__WEBPACK_IMPORTED_MODULE_4__.radioInactiveHoverBackground),
  registerColor: () => (/* reexport safe */ _colorUtils_js__WEBPACK_IMPORTED_MODULE_0__.registerColor),
  resolveColorValue: () => (/* reexport safe */ _colorUtils_js__WEBPACK_IMPORTED_MODULE_0__.resolveColorValue),
  sashHoverBorder: () => (/* reexport safe */ _colors_miscColors_js__WEBPACK_IMPORTED_MODULE_8__.sashHoverBorder),
  scrollbarShadow: () => (/* reexport safe */ _colors_miscColors_js__WEBPACK_IMPORTED_MODULE_8__.scrollbarShadow),
  scrollbarSliderActiveBackground: () => (/* reexport safe */ _colors_miscColors_js__WEBPACK_IMPORTED_MODULE_8__.scrollbarSliderActiveBackground),
  scrollbarSliderBackground: () => (/* reexport safe */ _colors_miscColors_js__WEBPACK_IMPORTED_MODULE_8__.scrollbarSliderBackground),
  scrollbarSliderHoverBackground: () => (/* reexport safe */ _colors_miscColors_js__WEBPACK_IMPORTED_MODULE_8__.scrollbarSliderHoverBackground),
  searchEditorFindMatch: () => (/* reexport safe */ _colors_searchColors_js__WEBPACK_IMPORTED_MODULE_10__.searchEditorFindMatch),
  searchEditorFindMatchBorder: () => (/* reexport safe */ _colors_searchColors_js__WEBPACK_IMPORTED_MODULE_10__.searchEditorFindMatchBorder),
  searchResultsInfoForeground: () => (/* reexport safe */ _colors_searchColors_js__WEBPACK_IMPORTED_MODULE_10__.searchResultsInfoForeground),
  selectBackground: () => (/* reexport safe */ _colors_inputColors_js__WEBPACK_IMPORTED_MODULE_4__.selectBackground),
  selectBorder: () => (/* reexport safe */ _colors_inputColors_js__WEBPACK_IMPORTED_MODULE_4__.selectBorder),
  selectForeground: () => (/* reexport safe */ _colors_inputColors_js__WEBPACK_IMPORTED_MODULE_4__.selectForeground),
  selectListBackground: () => (/* reexport safe */ _colors_inputColors_js__WEBPACK_IMPORTED_MODULE_4__.selectListBackground),
  selectionBackground: () => (/* reexport safe */ _colors_baseColors_js__WEBPACK_IMPORTED_MODULE_1__.selectionBackground),
  snippetFinalTabstopHighlightBackground: () => (/* reexport safe */ _colors_editorColors_js__WEBPACK_IMPORTED_MODULE_3__.snippetFinalTabstopHighlightBackground),
  snippetFinalTabstopHighlightBorder: () => (/* reexport safe */ _colors_editorColors_js__WEBPACK_IMPORTED_MODULE_3__.snippetFinalTabstopHighlightBorder),
  snippetTabstopHighlightBackground: () => (/* reexport safe */ _colors_editorColors_js__WEBPACK_IMPORTED_MODULE_3__.snippetTabstopHighlightBackground),
  snippetTabstopHighlightBorder: () => (/* reexport safe */ _colors_editorColors_js__WEBPACK_IMPORTED_MODULE_3__.snippetTabstopHighlightBorder),
  tableColumnsBorder: () => (/* reexport safe */ _colors_listColors_js__WEBPACK_IMPORTED_MODULE_5__.tableColumnsBorder),
  tableOddRowsBackgroundColor: () => (/* reexport safe */ _colors_listColors_js__WEBPACK_IMPORTED_MODULE_5__.tableOddRowsBackgroundColor),
  textBlockQuoteBackground: () => (/* reexport safe */ _colors_baseColors_js__WEBPACK_IMPORTED_MODULE_1__.textBlockQuoteBackground),
  textBlockQuoteBorder: () => (/* reexport safe */ _colors_baseColors_js__WEBPACK_IMPORTED_MODULE_1__.textBlockQuoteBorder),
  textCodeBlockBackground: () => (/* reexport safe */ _colors_baseColors_js__WEBPACK_IMPORTED_MODULE_1__.textCodeBlockBackground),
  textLinkActiveForeground: () => (/* reexport safe */ _colors_baseColors_js__WEBPACK_IMPORTED_MODULE_1__.textLinkActiveForeground),
  textLinkForeground: () => (/* reexport safe */ _colors_baseColors_js__WEBPACK_IMPORTED_MODULE_1__.textLinkForeground),
  textPreformatBackground: () => (/* reexport safe */ _colors_baseColors_js__WEBPACK_IMPORTED_MODULE_1__.textPreformatBackground),
  textPreformatForeground: () => (/* reexport safe */ _colors_baseColors_js__WEBPACK_IMPORTED_MODULE_1__.textPreformatForeground),
  textSeparatorForeground: () => (/* reexport safe */ _colors_baseColors_js__WEBPACK_IMPORTED_MODULE_1__.textSeparatorForeground),
  toolbarActiveBackground: () => (/* reexport safe */ _colors_editorColors_js__WEBPACK_IMPORTED_MODULE_3__.toolbarActiveBackground),
  toolbarHoverBackground: () => (/* reexport safe */ _colors_editorColors_js__WEBPACK_IMPORTED_MODULE_3__.toolbarHoverBackground),
  toolbarHoverOutline: () => (/* reexport safe */ _colors_editorColors_js__WEBPACK_IMPORTED_MODULE_3__.toolbarHoverOutline),
  transparent: () => (/* reexport safe */ _colorUtils_js__WEBPACK_IMPORTED_MODULE_0__.transparent),
  treeInactiveIndentGuidesStroke: () => (/* reexport safe */ _colors_listColors_js__WEBPACK_IMPORTED_MODULE_5__.treeInactiveIndentGuidesStroke),
  treeIndentGuidesStroke: () => (/* reexport safe */ _colors_listColors_js__WEBPACK_IMPORTED_MODULE_5__.treeIndentGuidesStroke),
  widgetBorder: () => (/* reexport safe */ _colors_editorColors_js__WEBPACK_IMPORTED_MODULE_3__.widgetBorder),
  widgetShadow: () => (/* reexport safe */ _colors_editorColors_js__WEBPACK_IMPORTED_MODULE_3__.widgetShadow),
  workbenchColorsSchemaId: () => (/* reexport safe */ _colorUtils_js__WEBPACK_IMPORTED_MODULE_0__.workbenchColorsSchemaId)
});
/* ESM import */var _colorUtils_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(2806);
/* ESM import */var _colors_baseColors_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(2807);
/* ESM import */var _colors_chartsColors_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(2808);
/* ESM import */var _colors_editorColors_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(2809);
/* ESM import */var _colors_inputColors_js__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(2812);
/* ESM import */var _colors_listColors_js__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(2813);
/* ESM import */var _colors_menuColors_js__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(2814);
/* ESM import */var _colors_minimapColors_js__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(2811);
/* ESM import */var _colors_miscColors_js__WEBPACK_IMPORTED_MODULE_8__ = __webpack_require__(2810);
/* ESM import */var _colors_quickpickColors_js__WEBPACK_IMPORTED_MODULE_9__ = __webpack_require__(2815);
/* ESM import */var _colors_searchColors_js__WEBPACK_IMPORTED_MODULE_10__ = __webpack_require__(2816);
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

// Make sure all color files are exported












}),
2806: (function (__unused_webpack_module, __webpack_exports__, __webpack_require__) {
__webpack_require__.r(__webpack_exports__);
__webpack_require__.d(__webpack_exports__, {
  DEFAULT_COLOR_CONFIG_VALUE: () => (DEFAULT_COLOR_CONFIG_VALUE),
  Extensions: () => (Extensions),
  asCssVariable: () => (asCssVariable),
  asCssVariableName: () => (asCssVariableName),
  asCssVariableWithDefault: () => (asCssVariableWithDefault),
  darken: () => (darken),
  executeTransform: () => (executeTransform),
  ifDefinedThenElse: () => (ifDefinedThenElse),
  isColorDefaults: () => (isColorDefaults),
  lessProminent: () => (lessProminent),
  lighten: () => (lighten),
  oneOf: () => (oneOf),
  registerColor: () => (registerColor),
  resolveColorValue: () => (resolveColorValue),
  transparent: () => (transparent),
  workbenchColorsSchemaId: () => (workbenchColorsSchemaId)
});
/* ESM import */var _base_common_assert_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(2708);
/* ESM import */var _base_common_async_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(2684);
/* ESM import */var _base_common_color_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(2769);
/* ESM import */var _base_common_event_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(2652);
/* ESM import */var _jsonschemas_common_jsonContributionRegistry_js__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(2734);
/* ESM import */var _registry_common_platform_js__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(2707);
/* ESM import */var _nls_js__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(2644);
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/







/**
 * Returns the css variable name for the given color identifier. Dots (`.`) are replaced with hyphens (`-`) and
 * everything is prefixed with `--vscode-`.
 *
 * @sample `editorSuggestWidget.background` is `--vscode-editorSuggestWidget-background`.
 */
function asCssVariableName(colorIdent) {
    return `--vscode-${colorIdent.replace(/\./g, '-')}`;
}
function asCssVariable(color) {
    return `var(${asCssVariableName(color)})`;
}
function asCssVariableWithDefault(color, defaultCssValue) {
    return `var(${asCssVariableName(color)}, ${defaultCssValue})`;
}
function isColorDefaults(value) {
    return value !== null && typeof value === 'object' && 'light' in value && 'dark' in value;
}
// color registry
const Extensions = {
    ColorContribution: 'base.contributions.colors'
};
const DEFAULT_COLOR_CONFIG_VALUE = 'default';
class ColorRegistry {
    constructor() {
        this._onDidChangeSchema = new _base_common_event_js__WEBPACK_IMPORTED_MODULE_3__.Emitter();
        this.onDidChangeSchema = this._onDidChangeSchema.event;
        this.colorSchema = { type: 'object', properties: {} };
        this.colorReferenceSchema = { type: 'string', enum: [], enumDescriptions: [] };
        this.colorsById = {};
    }
    registerColor(id, defaults, description, needsTransparency = false, deprecationMessage) {
        const colorContribution = { id, description, defaults, needsTransparency, deprecationMessage };
        this.colorsById[id] = colorContribution;
        const propertySchema = { type: 'string', format: 'color-hex', defaultSnippets: [{ body: '${1:#ff0000}' }] };
        if (deprecationMessage) {
            propertySchema.deprecationMessage = deprecationMessage;
        }
        if (needsTransparency) {
            propertySchema.pattern = '^#(?:(?<rgba>[0-9a-fA-f]{3}[0-9a-eA-E])|(?:[0-9a-fA-F]{6}(?:(?![fF]{2})(?:[0-9a-fA-F]{2}))))?$';
            propertySchema.patternErrorMessage = _nls_js__WEBPACK_IMPORTED_MODULE_6__.localize('transparecyRequired', 'This color must be transparent or it will obscure content');
        }
        this.colorSchema.properties[id] = {
            description,
            oneOf: [
                propertySchema,
                { type: 'string', const: DEFAULT_COLOR_CONFIG_VALUE, description: _nls_js__WEBPACK_IMPORTED_MODULE_6__.localize('useDefault', 'Use the default color.') }
            ]
        };
        this.colorReferenceSchema.enum.push(id);
        this.colorReferenceSchema.enumDescriptions.push(description);
        this._onDidChangeSchema.fire();
        return id;
    }
    getColors() {
        return Object.keys(this.colorsById).map(id => this.colorsById[id]);
    }
    resolveDefaultColor(id, theme) {
        const colorDesc = this.colorsById[id];
        if (colorDesc?.defaults) {
            const colorValue = isColorDefaults(colorDesc.defaults) ? colorDesc.defaults[theme.type] : colorDesc.defaults;
            return resolveColorValue(colorValue, theme);
        }
        return undefined;
    }
    getColorSchema() {
        return this.colorSchema;
    }
    toString() {
        const sorter = (a, b) => {
            const cat1 = a.indexOf('.') === -1 ? 0 : 1;
            const cat2 = b.indexOf('.') === -1 ? 0 : 1;
            if (cat1 !== cat2) {
                return cat1 - cat2;
            }
            return a.localeCompare(b);
        };
        return Object.keys(this.colorsById).sort(sorter).map(k => `- \`${k}\`: ${this.colorsById[k].description}`).join('\n');
    }
}
const colorRegistry = new ColorRegistry();
_registry_common_platform_js__WEBPACK_IMPORTED_MODULE_5__.Registry.add(Extensions.ColorContribution, colorRegistry);
function registerColor(id, defaults, description, needsTransparency, deprecationMessage) {
    return colorRegistry.registerColor(id, defaults, description, needsTransparency, deprecationMessage);
}
// ----- color functions
function executeTransform(transform, theme) {
    switch (transform.op) {
        case 0 /* ColorTransformType.Darken */:
            return resolveColorValue(transform.value, theme)?.darken(transform.factor);
        case 1 /* ColorTransformType.Lighten */:
            return resolveColorValue(transform.value, theme)?.lighten(transform.factor);
        case 2 /* ColorTransformType.Transparent */:
            return resolveColorValue(transform.value, theme)?.transparent(transform.factor);
        case 3 /* ColorTransformType.Opaque */: {
            const backgroundColor = resolveColorValue(transform.background, theme);
            if (!backgroundColor) {
                return resolveColorValue(transform.value, theme);
            }
            return resolveColorValue(transform.value, theme)?.makeOpaque(backgroundColor);
        }
        case 4 /* ColorTransformType.OneOf */:
            for (const candidate of transform.values) {
                const color = resolveColorValue(candidate, theme);
                if (color) {
                    return color;
                }
            }
            return undefined;
        case 6 /* ColorTransformType.IfDefinedThenElse */:
            return resolveColorValue(theme.defines(transform.if) ? transform.then : transform.else, theme);
        case 5 /* ColorTransformType.LessProminent */: {
            const from = resolveColorValue(transform.value, theme);
            if (!from) {
                return undefined;
            }
            const backgroundColor = resolveColorValue(transform.background, theme);
            if (!backgroundColor) {
                return from.transparent(transform.factor * transform.transparency);
            }
            return from.isDarkerThan(backgroundColor)
                ? _base_common_color_js__WEBPACK_IMPORTED_MODULE_2__.Color.getLighterColor(from, backgroundColor, transform.factor).transparent(transform.transparency)
                : _base_common_color_js__WEBPACK_IMPORTED_MODULE_2__.Color.getDarkerColor(from, backgroundColor, transform.factor).transparent(transform.transparency);
        }
        default:
            throw (0,_base_common_assert_js__WEBPACK_IMPORTED_MODULE_0__.assertNever)(transform);
    }
}
function darken(colorValue, factor) {
    return { op: 0 /* ColorTransformType.Darken */, value: colorValue, factor };
}
function lighten(colorValue, factor) {
    return { op: 1 /* ColorTransformType.Lighten */, value: colorValue, factor };
}
function transparent(colorValue, factor) {
    return { op: 2 /* ColorTransformType.Transparent */, value: colorValue, factor };
}
function oneOf(...colorValues) {
    return { op: 4 /* ColorTransformType.OneOf */, values: colorValues };
}
function ifDefinedThenElse(ifArg, thenArg, elseArg) {
    return { op: 6 /* ColorTransformType.IfDefinedThenElse */, if: ifArg, then: thenArg, else: elseArg };
}
function lessProminent(colorValue, backgroundColorValue, factor, transparency) {
    return { op: 5 /* ColorTransformType.LessProminent */, value: colorValue, background: backgroundColorValue, factor, transparency };
}
// ----- implementation
/**
 * @param colorValue Resolve a color value in the context of a theme
 */
function resolveColorValue(colorValue, theme) {
    if (colorValue === null) {
        return undefined;
    }
    else if (typeof colorValue === 'string') {
        if (colorValue[0] === '#') {
            return _base_common_color_js__WEBPACK_IMPORTED_MODULE_2__.Color.fromHex(colorValue);
        }
        return theme.getColor(colorValue);
    }
    else if (colorValue instanceof _base_common_color_js__WEBPACK_IMPORTED_MODULE_2__.Color) {
        return colorValue;
    }
    else if (typeof colorValue === 'object') {
        return executeTransform(colorValue, theme);
    }
    return undefined;
}
const workbenchColorsSchemaId = 'vscode://schemas/workbench-colors';
const schemaRegistry = _registry_common_platform_js__WEBPACK_IMPORTED_MODULE_5__.Registry.as(_jsonschemas_common_jsonContributionRegistry_js__WEBPACK_IMPORTED_MODULE_4__.Extensions.JSONContribution);
schemaRegistry.registerSchema(workbenchColorsSchemaId, colorRegistry.getColorSchema());
const delayer = new _base_common_async_js__WEBPACK_IMPORTED_MODULE_1__.RunOnceScheduler(() => schemaRegistry.notifySchemaChanged(workbenchColorsSchemaId), 200);
colorRegistry.onDidChangeSchema(() => {
    if (!delayer.isScheduled()) {
        delayer.schedule();
    }
});
// setTimeout(_ => console.log(colorRegistry.toString()), 5000);


}),
2807: (function (__unused_webpack_module, __webpack_exports__, __webpack_require__) {
__webpack_require__.r(__webpack_exports__);
__webpack_require__.d(__webpack_exports__, {
  activeContrastBorder: () => (activeContrastBorder),
  contrastBorder: () => (contrastBorder),
  descriptionForeground: () => (descriptionForeground),
  disabledForeground: () => (disabledForeground),
  errorForeground: () => (errorForeground),
  focusBorder: () => (focusBorder),
  foreground: () => (foreground),
  iconForeground: () => (iconForeground),
  selectionBackground: () => (selectionBackground),
  textBlockQuoteBackground: () => (textBlockQuoteBackground),
  textBlockQuoteBorder: () => (textBlockQuoteBorder),
  textCodeBlockBackground: () => (textCodeBlockBackground),
  textLinkActiveForeground: () => (textLinkActiveForeground),
  textLinkForeground: () => (textLinkForeground),
  textPreformatBackground: () => (textPreformatBackground),
  textPreformatForeground: () => (textPreformatForeground),
  textSeparatorForeground: () => (textSeparatorForeground)
});
/* ESM import */var _nls_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(2644);
/* ESM import */var _base_common_color_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(2769);
/* ESM import */var _colorUtils_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(2806);
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

// Import the effects we need


const foreground = (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_2__.registerColor)('foreground', { dark: '#CCCCCC', light: '#616161', hcDark: '#FFFFFF', hcLight: '#292929' }, _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('foreground', "Overall foreground color. This color is only used if not overridden by a component."));
const disabledForeground = (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_2__.registerColor)('disabledForeground', { dark: '#CCCCCC80', light: '#61616180', hcDark: '#A5A5A5', hcLight: '#7F7F7F' }, _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('disabledForeground', "Overall foreground for disabled elements. This color is only used if not overridden by a component."));
const errorForeground = (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_2__.registerColor)('errorForeground', { dark: '#F48771', light: '#A1260D', hcDark: '#F48771', hcLight: '#B5200D' }, _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('errorForeground', "Overall foreground color for error messages. This color is only used if not overridden by a component."));
const descriptionForeground = (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_2__.registerColor)('descriptionForeground', { light: '#717171', dark: (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_2__.transparent)(foreground, 0.7), hcDark: (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_2__.transparent)(foreground, 0.7), hcLight: (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_2__.transparent)(foreground, 0.7) }, _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('descriptionForeground', "Foreground color for description text providing additional information, for example for a label."));
const iconForeground = (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_2__.registerColor)('icon.foreground', { dark: '#C5C5C5', light: '#424242', hcDark: '#FFFFFF', hcLight: '#292929' }, _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('iconForeground', "The default color for icons in the workbench."));
const focusBorder = (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_2__.registerColor)('focusBorder', { dark: '#007FD4', light: '#0090F1', hcDark: '#F38518', hcLight: '#006BBD' }, _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('focusBorder', "Overall border color for focused elements. This color is only used if not overridden by a component."));
const contrastBorder = (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_2__.registerColor)('contrastBorder', { light: null, dark: null, hcDark: '#6FC3DF', hcLight: '#0F4A85' }, _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('contrastBorder', "An extra border around elements to separate them from others for greater contrast."));
const activeContrastBorder = (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_2__.registerColor)('contrastActiveBorder', { light: null, dark: null, hcDark: focusBorder, hcLight: focusBorder }, _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('activeContrastBorder', "An extra border around active elements to separate them from others for greater contrast."));
const selectionBackground = (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_2__.registerColor)('selection.background', null, _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('selectionBackground', "The background color of text selections in the workbench (e.g. for input fields or text areas). Note that this does not apply to selections within the editor."));
// ------ text link
const textLinkForeground = (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_2__.registerColor)('textLink.foreground', { light: '#006AB1', dark: '#3794FF', hcDark: '#21A6FF', hcLight: '#0F4A85' }, _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('textLinkForeground', "Foreground color for links in text."));
const textLinkActiveForeground = (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_2__.registerColor)('textLink.activeForeground', { light: '#006AB1', dark: '#3794FF', hcDark: '#21A6FF', hcLight: '#0F4A85' }, _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('textLinkActiveForeground', "Foreground color for links in text when clicked on and on mouse hover."));
const textSeparatorForeground = (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_2__.registerColor)('textSeparator.foreground', { light: '#0000002e', dark: '#ffffff2e', hcDark: _base_common_color_js__WEBPACK_IMPORTED_MODULE_1__.Color.black, hcLight: '#292929' }, _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('textSeparatorForeground', "Color for text separators."));
// ------ text preformat
const textPreformatForeground = (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_2__.registerColor)('textPreformat.foreground', { light: '#A31515', dark: '#D7BA7D', hcDark: '#000000', hcLight: '#FFFFFF' }, _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('textPreformatForeground', "Foreground color for preformatted text segments."));
const textPreformatBackground = (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_2__.registerColor)('textPreformat.background', { light: '#0000001A', dark: '#FFFFFF1A', hcDark: '#FFFFFF', hcLight: '#09345f' }, _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('textPreformatBackground', "Background color for preformatted text segments."));
// ------ text block quote
const textBlockQuoteBackground = (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_2__.registerColor)('textBlockQuote.background', { light: '#f2f2f2', dark: '#222222', hcDark: null, hcLight: '#F2F2F2' }, _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('textBlockQuoteBackground', "Background color for block quotes in text."));
const textBlockQuoteBorder = (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_2__.registerColor)('textBlockQuote.border', { light: '#007acc80', dark: '#007acc80', hcDark: _base_common_color_js__WEBPACK_IMPORTED_MODULE_1__.Color.white, hcLight: '#292929' }, _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('textBlockQuoteBorder', "Border color for block quotes in text."));
// ------ text code block
const textCodeBlockBackground = (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_2__.registerColor)('textCodeBlock.background', { light: '#dcdcdc66', dark: '#0a0a0a66', hcDark: _base_common_color_js__WEBPACK_IMPORTED_MODULE_1__.Color.black, hcLight: '#F2F2F2' }, _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('textCodeBlockBackground', "Background color for code blocks in text."));


}),
2808: (function (__unused_webpack_module, __webpack_exports__, __webpack_require__) {
__webpack_require__.r(__webpack_exports__);
__webpack_require__.d(__webpack_exports__, {
  chartsBlue: () => (chartsBlue),
  chartsForeground: () => (chartsForeground),
  chartsGreen: () => (chartsGreen),
  chartsLines: () => (chartsLines),
  chartsOrange: () => (chartsOrange),
  chartsPurple: () => (chartsPurple),
  chartsRed: () => (chartsRed),
  chartsYellow: () => (chartsYellow)
});
/* ESM import */var _nls_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(2644);
/* ESM import */var _colorUtils_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(2806);
/* ESM import */var _baseColors_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(2807);
/* ESM import */var _editorColors_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(2809);
/* ESM import */var _minimapColors_js__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(2811);
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/





const chartsForeground = (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_1__.registerColor)('charts.foreground', _baseColors_js__WEBPACK_IMPORTED_MODULE_2__.foreground, _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('chartsForeground', "The foreground color used in charts."));
const chartsLines = (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_1__.registerColor)('charts.lines', (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_1__.transparent)(_baseColors_js__WEBPACK_IMPORTED_MODULE_2__.foreground, .5), _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('chartsLines', "The color used for horizontal lines in charts."));
const chartsRed = (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_1__.registerColor)('charts.red', _editorColors_js__WEBPACK_IMPORTED_MODULE_3__.editorErrorForeground, _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('chartsRed', "The red color used in chart visualizations."));
const chartsBlue = (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_1__.registerColor)('charts.blue', _editorColors_js__WEBPACK_IMPORTED_MODULE_3__.editorInfoForeground, _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('chartsBlue', "The blue color used in chart visualizations."));
const chartsYellow = (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_1__.registerColor)('charts.yellow', _editorColors_js__WEBPACK_IMPORTED_MODULE_3__.editorWarningForeground, _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('chartsYellow', "The yellow color used in chart visualizations."));
const chartsOrange = (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_1__.registerColor)('charts.orange', _minimapColors_js__WEBPACK_IMPORTED_MODULE_4__.minimapFindMatch, _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('chartsOrange', "The orange color used in chart visualizations."));
const chartsGreen = (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_1__.registerColor)('charts.green', { dark: '#89D185', light: '#388A34', hcDark: '#89D185', hcLight: '#374e06' }, _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('chartsGreen', "The green color used in chart visualizations."));
const chartsPurple = (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_1__.registerColor)('charts.purple', { dark: '#B180D7', light: '#652D90', hcDark: '#B180D7', hcLight: '#652D90' }, _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('chartsPurple', "The purple color used in chart visualizations."));


}),
2809: (function (__unused_webpack_module, __webpack_exports__, __webpack_require__) {
__webpack_require__.r(__webpack_exports__);
__webpack_require__.d(__webpack_exports__, {
  breadcrumbsActiveSelectionForeground: () => (breadcrumbsActiveSelectionForeground),
  breadcrumbsBackground: () => (breadcrumbsBackground),
  breadcrumbsFocusForeground: () => (breadcrumbsFocusForeground),
  breadcrumbsForeground: () => (breadcrumbsForeground),
  breadcrumbsPickerBackground: () => (breadcrumbsPickerBackground),
  defaultInsertColor: () => (defaultInsertColor),
  defaultRemoveColor: () => (defaultRemoveColor),
  diffBorder: () => (diffBorder),
  diffDiagonalFill: () => (diffDiagonalFill),
  diffInserted: () => (diffInserted),
  diffInsertedLine: () => (diffInsertedLine),
  diffInsertedLineGutter: () => (diffInsertedLineGutter),
  diffInsertedOutline: () => (diffInsertedOutline),
  diffOverviewRulerInserted: () => (diffOverviewRulerInserted),
  diffOverviewRulerRemoved: () => (diffOverviewRulerRemoved),
  diffRemoved: () => (diffRemoved),
  diffRemovedLine: () => (diffRemovedLine),
  diffRemovedLineGutter: () => (diffRemovedLineGutter),
  diffRemovedOutline: () => (diffRemovedOutline),
  diffUnchangedRegionBackground: () => (diffUnchangedRegionBackground),
  diffUnchangedRegionForeground: () => (diffUnchangedRegionForeground),
  diffUnchangedTextBackground: () => (diffUnchangedTextBackground),
  editorActiveLinkForeground: () => (editorActiveLinkForeground),
  editorBackground: () => (editorBackground),
  editorErrorBackground: () => (editorErrorBackground),
  editorErrorBorder: () => (editorErrorBorder),
  editorErrorForeground: () => (editorErrorForeground),
  editorFindMatch: () => (editorFindMatch),
  editorFindMatchBorder: () => (editorFindMatchBorder),
  editorFindMatchForeground: () => (editorFindMatchForeground),
  editorFindMatchHighlight: () => (editorFindMatchHighlight),
  editorFindMatchHighlightBorder: () => (editorFindMatchHighlightBorder),
  editorFindMatchHighlightForeground: () => (editorFindMatchHighlightForeground),
  editorFindRangeHighlight: () => (editorFindRangeHighlight),
  editorFindRangeHighlightBorder: () => (editorFindRangeHighlightBorder),
  editorForeground: () => (editorForeground),
  editorHintBorder: () => (editorHintBorder),
  editorHintForeground: () => (editorHintForeground),
  editorHoverBackground: () => (editorHoverBackground),
  editorHoverBorder: () => (editorHoverBorder),
  editorHoverForeground: () => (editorHoverForeground),
  editorHoverHighlight: () => (editorHoverHighlight),
  editorHoverStatusBarBackground: () => (editorHoverStatusBarBackground),
  editorInactiveSelection: () => (editorInactiveSelection),
  editorInfoBackground: () => (editorInfoBackground),
  editorInfoBorder: () => (editorInfoBorder),
  editorInfoForeground: () => (editorInfoForeground),
  editorInlayHintBackground: () => (editorInlayHintBackground),
  editorInlayHintForeground: () => (editorInlayHintForeground),
  editorInlayHintParameterBackground: () => (editorInlayHintParameterBackground),
  editorInlayHintParameterForeground: () => (editorInlayHintParameterForeground),
  editorInlayHintTypeBackground: () => (editorInlayHintTypeBackground),
  editorInlayHintTypeForeground: () => (editorInlayHintTypeForeground),
  editorLightBulbAiForeground: () => (editorLightBulbAiForeground),
  editorLightBulbAutoFixForeground: () => (editorLightBulbAutoFixForeground),
  editorLightBulbForeground: () => (editorLightBulbForeground),
  editorSelectionBackground: () => (editorSelectionBackground),
  editorSelectionForeground: () => (editorSelectionForeground),
  editorSelectionHighlight: () => (editorSelectionHighlight),
  editorSelectionHighlightBorder: () => (editorSelectionHighlightBorder),
  editorStickyScrollBackground: () => (editorStickyScrollBackground),
  editorStickyScrollBorder: () => (editorStickyScrollBorder),
  editorStickyScrollHoverBackground: () => (editorStickyScrollHoverBackground),
  editorStickyScrollShadow: () => (editorStickyScrollShadow),
  editorWarningBackground: () => (editorWarningBackground),
  editorWarningBorder: () => (editorWarningBorder),
  editorWarningForeground: () => (editorWarningForeground),
  editorWidgetBackground: () => (editorWidgetBackground),
  editorWidgetBorder: () => (editorWidgetBorder),
  editorWidgetForeground: () => (editorWidgetForeground),
  editorWidgetResizeBorder: () => (editorWidgetResizeBorder),
  mergeBorder: () => (mergeBorder),
  mergeCommonContentBackground: () => (mergeCommonContentBackground),
  mergeCommonHeaderBackground: () => (mergeCommonHeaderBackground),
  mergeCurrentContentBackground: () => (mergeCurrentContentBackground),
  mergeCurrentHeaderBackground: () => (mergeCurrentHeaderBackground),
  mergeIncomingContentBackground: () => (mergeIncomingContentBackground),
  mergeIncomingHeaderBackground: () => (mergeIncomingHeaderBackground),
  overviewRulerCommonContentForeground: () => (overviewRulerCommonContentForeground),
  overviewRulerCurrentContentForeground: () => (overviewRulerCurrentContentForeground),
  overviewRulerFindMatchForeground: () => (overviewRulerFindMatchForeground),
  overviewRulerIncomingContentForeground: () => (overviewRulerIncomingContentForeground),
  overviewRulerSelectionHighlightForeground: () => (overviewRulerSelectionHighlightForeground),
  problemsErrorIconForeground: () => (problemsErrorIconForeground),
  problemsInfoIconForeground: () => (problemsInfoIconForeground),
  problemsWarningIconForeground: () => (problemsWarningIconForeground),
  snippetFinalTabstopHighlightBackground: () => (snippetFinalTabstopHighlightBackground),
  snippetFinalTabstopHighlightBorder: () => (snippetFinalTabstopHighlightBorder),
  snippetTabstopHighlightBackground: () => (snippetTabstopHighlightBackground),
  snippetTabstopHighlightBorder: () => (snippetTabstopHighlightBorder),
  toolbarActiveBackground: () => (toolbarActiveBackground),
  toolbarHoverBackground: () => (toolbarHoverBackground),
  toolbarHoverOutline: () => (toolbarHoverOutline),
  widgetBorder: () => (widgetBorder),
  widgetShadow: () => (widgetShadow)
});
/* ESM import */var _nls_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(2644);
/* ESM import */var _base_common_color_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(2769);
/* ESM import */var _colorUtils_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(2806);
/* ESM import */var _baseColors_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(2807);
/* ESM import */var _miscColors_js__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(2810);
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

// Import the effects we need


// Import the colors we need


// ----- editor
const editorBackground = (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_2__.registerColor)('editor.background', { light: '#ffffff', dark: '#1E1E1E', hcDark: _base_common_color_js__WEBPACK_IMPORTED_MODULE_1__.Color.black, hcLight: _base_common_color_js__WEBPACK_IMPORTED_MODULE_1__.Color.white }, _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('editorBackground', "Editor background color."));
const editorForeground = (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_2__.registerColor)('editor.foreground', { light: '#333333', dark: '#BBBBBB', hcDark: _base_common_color_js__WEBPACK_IMPORTED_MODULE_1__.Color.white, hcLight: _baseColors_js__WEBPACK_IMPORTED_MODULE_3__.foreground }, _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('editorForeground', "Editor default foreground color."));
const editorStickyScrollBackground = (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_2__.registerColor)('editorStickyScroll.background', editorBackground, _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('editorStickyScrollBackground', "Background color of sticky scroll in the editor"));
const editorStickyScrollHoverBackground = (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_2__.registerColor)('editorStickyScrollHover.background', { dark: '#2A2D2E', light: '#F0F0F0', hcDark: null, hcLight: _base_common_color_js__WEBPACK_IMPORTED_MODULE_1__.Color.fromHex('#0F4A85').transparent(0.1) }, _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('editorStickyScrollHoverBackground', "Background color of sticky scroll on hover in the editor"));
const editorStickyScrollBorder = (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_2__.registerColor)('editorStickyScroll.border', { dark: null, light: null, hcDark: _baseColors_js__WEBPACK_IMPORTED_MODULE_3__.contrastBorder, hcLight: _baseColors_js__WEBPACK_IMPORTED_MODULE_3__.contrastBorder }, _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('editorStickyScrollBorder', "Border color of sticky scroll in the editor"));
const editorStickyScrollShadow = (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_2__.registerColor)('editorStickyScroll.shadow', _miscColors_js__WEBPACK_IMPORTED_MODULE_4__.scrollbarShadow, _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('editorStickyScrollShadow', " Shadow color of sticky scroll in the editor"));
const editorWidgetBackground = (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_2__.registerColor)('editorWidget.background', { dark: '#252526', light: '#F3F3F3', hcDark: '#0C141F', hcLight: _base_common_color_js__WEBPACK_IMPORTED_MODULE_1__.Color.white }, _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('editorWidgetBackground', 'Background color of editor widgets, such as find/replace.'));
const editorWidgetForeground = (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_2__.registerColor)('editorWidget.foreground', _baseColors_js__WEBPACK_IMPORTED_MODULE_3__.foreground, _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('editorWidgetForeground', 'Foreground color of editor widgets, such as find/replace.'));
const editorWidgetBorder = (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_2__.registerColor)('editorWidget.border', { dark: '#454545', light: '#C8C8C8', hcDark: _baseColors_js__WEBPACK_IMPORTED_MODULE_3__.contrastBorder, hcLight: _baseColors_js__WEBPACK_IMPORTED_MODULE_3__.contrastBorder }, _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('editorWidgetBorder', 'Border color of editor widgets. The color is only used if the widget chooses to have a border and if the color is not overridden by a widget.'));
const editorWidgetResizeBorder = (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_2__.registerColor)('editorWidget.resizeBorder', null, _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('editorWidgetResizeBorder', "Border color of the resize bar of editor widgets. The color is only used if the widget chooses to have a resize border and if the color is not overridden by a widget."));
const editorErrorBackground = (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_2__.registerColor)('editorError.background', null, _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('editorError.background', 'Background color of error text in the editor. The color must not be opaque so as not to hide underlying decorations.'), true);
const editorErrorForeground = (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_2__.registerColor)('editorError.foreground', { dark: '#F14C4C', light: '#E51400', hcDark: '#F48771', hcLight: '#B5200D' }, _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('editorError.foreground', 'Foreground color of error squigglies in the editor.'));
const editorErrorBorder = (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_2__.registerColor)('editorError.border', { dark: null, light: null, hcDark: _base_common_color_js__WEBPACK_IMPORTED_MODULE_1__.Color.fromHex('#E47777').transparent(0.8), hcLight: '#B5200D' }, _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('errorBorder', 'If set, color of double underlines for errors in the editor.'));
const editorWarningBackground = (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_2__.registerColor)('editorWarning.background', null, _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('editorWarning.background', 'Background color of warning text in the editor. The color must not be opaque so as not to hide underlying decorations.'), true);
const editorWarningForeground = (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_2__.registerColor)('editorWarning.foreground', { dark: '#CCA700', light: '#BF8803', hcDark: '#FFD370', hcLight: '#895503' }, _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('editorWarning.foreground', 'Foreground color of warning squigglies in the editor.'));
const editorWarningBorder = (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_2__.registerColor)('editorWarning.border', { dark: null, light: null, hcDark: _base_common_color_js__WEBPACK_IMPORTED_MODULE_1__.Color.fromHex('#FFCC00').transparent(0.8), hcLight: _base_common_color_js__WEBPACK_IMPORTED_MODULE_1__.Color.fromHex('#FFCC00').transparent(0.8) }, _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('warningBorder', 'If set, color of double underlines for warnings in the editor.'));
const editorInfoBackground = (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_2__.registerColor)('editorInfo.background', null, _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('editorInfo.background', 'Background color of info text in the editor. The color must not be opaque so as not to hide underlying decorations.'), true);
const editorInfoForeground = (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_2__.registerColor)('editorInfo.foreground', { dark: '#3794FF', light: '#1a85ff', hcDark: '#3794FF', hcLight: '#1a85ff' }, _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('editorInfo.foreground', 'Foreground color of info squigglies in the editor.'));
const editorInfoBorder = (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_2__.registerColor)('editorInfo.border', { dark: null, light: null, hcDark: _base_common_color_js__WEBPACK_IMPORTED_MODULE_1__.Color.fromHex('#3794FF').transparent(0.8), hcLight: '#292929' }, _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('infoBorder', 'If set, color of double underlines for infos in the editor.'));
const editorHintForeground = (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_2__.registerColor)('editorHint.foreground', { dark: _base_common_color_js__WEBPACK_IMPORTED_MODULE_1__.Color.fromHex('#eeeeee').transparent(0.7), light: '#6c6c6c', hcDark: null, hcLight: null }, _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('editorHint.foreground', 'Foreground color of hint squigglies in the editor.'));
const editorHintBorder = (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_2__.registerColor)('editorHint.border', { dark: null, light: null, hcDark: _base_common_color_js__WEBPACK_IMPORTED_MODULE_1__.Color.fromHex('#eeeeee').transparent(0.8), hcLight: '#292929' }, _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('hintBorder', 'If set, color of double underlines for hints in the editor.'));
const editorActiveLinkForeground = (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_2__.registerColor)('editorLink.activeForeground', { dark: '#4E94CE', light: _base_common_color_js__WEBPACK_IMPORTED_MODULE_1__.Color.blue, hcDark: _base_common_color_js__WEBPACK_IMPORTED_MODULE_1__.Color.cyan, hcLight: '#292929' }, _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('activeLinkForeground', 'Color of active links.'));
// ----- editor selection
const editorSelectionBackground = (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_2__.registerColor)('editor.selectionBackground', { light: '#ADD6FF', dark: '#264F78', hcDark: '#f3f518', hcLight: '#0F4A85' }, _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('editorSelectionBackground', "Color of the editor selection."));
const editorSelectionForeground = (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_2__.registerColor)('editor.selectionForeground', { light: null, dark: null, hcDark: '#000000', hcLight: _base_common_color_js__WEBPACK_IMPORTED_MODULE_1__.Color.white }, _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('editorSelectionForeground', "Color of the selected text for high contrast."));
const editorInactiveSelection = (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_2__.registerColor)('editor.inactiveSelectionBackground', { light: (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_2__.transparent)(editorSelectionBackground, 0.5), dark: (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_2__.transparent)(editorSelectionBackground, 0.5), hcDark: (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_2__.transparent)(editorSelectionBackground, 0.7), hcLight: (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_2__.transparent)(editorSelectionBackground, 0.5) }, _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('editorInactiveSelection', "Color of the selection in an inactive editor. The color must not be opaque so as not to hide underlying decorations."), true);
const editorSelectionHighlight = (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_2__.registerColor)('editor.selectionHighlightBackground', { light: (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_2__.lessProminent)(editorSelectionBackground, editorBackground, 0.3, 0.6), dark: (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_2__.lessProminent)(editorSelectionBackground, editorBackground, 0.3, 0.6), hcDark: null, hcLight: null }, _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('editorSelectionHighlight', 'Color for regions with the same content as the selection. The color must not be opaque so as not to hide underlying decorations.'), true);
const editorSelectionHighlightBorder = (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_2__.registerColor)('editor.selectionHighlightBorder', { light: null, dark: null, hcDark: _baseColors_js__WEBPACK_IMPORTED_MODULE_3__.activeContrastBorder, hcLight: _baseColors_js__WEBPACK_IMPORTED_MODULE_3__.activeContrastBorder }, _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('editorSelectionHighlightBorder', "Border color for regions with the same content as the selection."));
// ----- editor find
const editorFindMatch = (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_2__.registerColor)('editor.findMatchBackground', { light: '#A8AC94', dark: '#515C6A', hcDark: null, hcLight: null }, _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('editorFindMatch', "Color of the current search match."));
const editorFindMatchForeground = (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_2__.registerColor)('editor.findMatchForeground', null, _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('editorFindMatchForeground', "Text color of the current search match."));
const editorFindMatchHighlight = (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_2__.registerColor)('editor.findMatchHighlightBackground', { light: '#EA5C0055', dark: '#EA5C0055', hcDark: null, hcLight: null }, _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('findMatchHighlight', "Color of the other search matches. The color must not be opaque so as not to hide underlying decorations."), true);
const editorFindMatchHighlightForeground = (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_2__.registerColor)('editor.findMatchHighlightForeground', null, _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('findMatchHighlightForeground', "Foreground color of the other search matches."), true);
const editorFindRangeHighlight = (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_2__.registerColor)('editor.findRangeHighlightBackground', { dark: '#3a3d4166', light: '#b4b4b44d', hcDark: null, hcLight: null }, _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('findRangeHighlight', "Color of the range limiting the search. The color must not be opaque so as not to hide underlying decorations."), true);
const editorFindMatchBorder = (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_2__.registerColor)('editor.findMatchBorder', { light: null, dark: null, hcDark: _baseColors_js__WEBPACK_IMPORTED_MODULE_3__.activeContrastBorder, hcLight: _baseColors_js__WEBPACK_IMPORTED_MODULE_3__.activeContrastBorder }, _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('editorFindMatchBorder', "Border color of the current search match."));
const editorFindMatchHighlightBorder = (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_2__.registerColor)('editor.findMatchHighlightBorder', { light: null, dark: null, hcDark: _baseColors_js__WEBPACK_IMPORTED_MODULE_3__.activeContrastBorder, hcLight: _baseColors_js__WEBPACK_IMPORTED_MODULE_3__.activeContrastBorder }, _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('findMatchHighlightBorder', "Border color of the other search matches."));
const editorFindRangeHighlightBorder = (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_2__.registerColor)('editor.findRangeHighlightBorder', { dark: null, light: null, hcDark: (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_2__.transparent)(_baseColors_js__WEBPACK_IMPORTED_MODULE_3__.activeContrastBorder, 0.4), hcLight: (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_2__.transparent)(_baseColors_js__WEBPACK_IMPORTED_MODULE_3__.activeContrastBorder, 0.4) }, _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('findRangeHighlightBorder', "Border color of the range limiting the search. The color must not be opaque so as not to hide underlying decorations."), true);
// ----- editor hover
const editorHoverHighlight = (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_2__.registerColor)('editor.hoverHighlightBackground', { light: '#ADD6FF26', dark: '#264f7840', hcDark: '#ADD6FF26', hcLight: null }, _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('hoverHighlight', 'Highlight below the word for which a hover is shown. The color must not be opaque so as not to hide underlying decorations.'), true);
const editorHoverBackground = (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_2__.registerColor)('editorHoverWidget.background', editorWidgetBackground, _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('hoverBackground', 'Background color of the editor hover.'));
const editorHoverForeground = (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_2__.registerColor)('editorHoverWidget.foreground', editorWidgetForeground, _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('hoverForeground', 'Foreground color of the editor hover.'));
const editorHoverBorder = (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_2__.registerColor)('editorHoverWidget.border', editorWidgetBorder, _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('hoverBorder', 'Border color of the editor hover.'));
const editorHoverStatusBarBackground = (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_2__.registerColor)('editorHoverWidget.statusBarBackground', { dark: (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_2__.lighten)(editorHoverBackground, 0.2), light: (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_2__.darken)(editorHoverBackground, 0.05), hcDark: editorWidgetBackground, hcLight: editorWidgetBackground }, _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('statusBarBackground', "Background color of the editor hover status bar."));
// ----- editor inlay hint
const editorInlayHintForeground = (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_2__.registerColor)('editorInlayHint.foreground', { dark: '#969696', light: '#969696', hcDark: _base_common_color_js__WEBPACK_IMPORTED_MODULE_1__.Color.white, hcLight: _base_common_color_js__WEBPACK_IMPORTED_MODULE_1__.Color.black }, _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('editorInlayHintForeground', 'Foreground color of inline hints'));
const editorInlayHintBackground = (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_2__.registerColor)('editorInlayHint.background', { dark: (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_2__.transparent)(_miscColors_js__WEBPACK_IMPORTED_MODULE_4__.badgeBackground, .10), light: (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_2__.transparent)(_miscColors_js__WEBPACK_IMPORTED_MODULE_4__.badgeBackground, .10), hcDark: (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_2__.transparent)(_base_common_color_js__WEBPACK_IMPORTED_MODULE_1__.Color.white, .10), hcLight: (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_2__.transparent)(_miscColors_js__WEBPACK_IMPORTED_MODULE_4__.badgeBackground, .10) }, _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('editorInlayHintBackground', 'Background color of inline hints'));
const editorInlayHintTypeForeground = (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_2__.registerColor)('editorInlayHint.typeForeground', editorInlayHintForeground, _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('editorInlayHintForegroundTypes', 'Foreground color of inline hints for types'));
const editorInlayHintTypeBackground = (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_2__.registerColor)('editorInlayHint.typeBackground', editorInlayHintBackground, _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('editorInlayHintBackgroundTypes', 'Background color of inline hints for types'));
const editorInlayHintParameterForeground = (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_2__.registerColor)('editorInlayHint.parameterForeground', editorInlayHintForeground, _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('editorInlayHintForegroundParameter', 'Foreground color of inline hints for parameters'));
const editorInlayHintParameterBackground = (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_2__.registerColor)('editorInlayHint.parameterBackground', editorInlayHintBackground, _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('editorInlayHintBackgroundParameter', 'Background color of inline hints for parameters'));
// ----- editor lightbulb
const editorLightBulbForeground = (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_2__.registerColor)('editorLightBulb.foreground', { dark: '#FFCC00', light: '#DDB100', hcDark: '#FFCC00', hcLight: '#007ACC' }, _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('editorLightBulbForeground', "The color used for the lightbulb actions icon."));
const editorLightBulbAutoFixForeground = (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_2__.registerColor)('editorLightBulbAutoFix.foreground', { dark: '#75BEFF', light: '#007ACC', hcDark: '#75BEFF', hcLight: '#007ACC' }, _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('editorLightBulbAutoFixForeground', "The color used for the lightbulb auto fix actions icon."));
const editorLightBulbAiForeground = (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_2__.registerColor)('editorLightBulbAi.foreground', editorLightBulbForeground, _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('editorLightBulbAiForeground', "The color used for the lightbulb AI icon."));
// ----- editor snippet
const snippetTabstopHighlightBackground = (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_2__.registerColor)('editor.snippetTabstopHighlightBackground', { dark: new _base_common_color_js__WEBPACK_IMPORTED_MODULE_1__.Color(new _base_common_color_js__WEBPACK_IMPORTED_MODULE_1__.RGBA(124, 124, 124, 0.3)), light: new _base_common_color_js__WEBPACK_IMPORTED_MODULE_1__.Color(new _base_common_color_js__WEBPACK_IMPORTED_MODULE_1__.RGBA(10, 50, 100, 0.2)), hcDark: new _base_common_color_js__WEBPACK_IMPORTED_MODULE_1__.Color(new _base_common_color_js__WEBPACK_IMPORTED_MODULE_1__.RGBA(124, 124, 124, 0.3)), hcLight: new _base_common_color_js__WEBPACK_IMPORTED_MODULE_1__.Color(new _base_common_color_js__WEBPACK_IMPORTED_MODULE_1__.RGBA(10, 50, 100, 0.2)) }, _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('snippetTabstopHighlightBackground', "Highlight background color of a snippet tabstop."));
const snippetTabstopHighlightBorder = (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_2__.registerColor)('editor.snippetTabstopHighlightBorder', null, _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('snippetTabstopHighlightBorder', "Highlight border color of a snippet tabstop."));
const snippetFinalTabstopHighlightBackground = (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_2__.registerColor)('editor.snippetFinalTabstopHighlightBackground', null, _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('snippetFinalTabstopHighlightBackground', "Highlight background color of the final tabstop of a snippet."));
const snippetFinalTabstopHighlightBorder = (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_2__.registerColor)('editor.snippetFinalTabstopHighlightBorder', { dark: '#525252', light: new _base_common_color_js__WEBPACK_IMPORTED_MODULE_1__.Color(new _base_common_color_js__WEBPACK_IMPORTED_MODULE_1__.RGBA(10, 50, 100, 0.5)), hcDark: '#525252', hcLight: '#292929' }, _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('snippetFinalTabstopHighlightBorder', "Highlight border color of the final tabstop of a snippet."));
// ----- diff editor
const defaultInsertColor = new _base_common_color_js__WEBPACK_IMPORTED_MODULE_1__.Color(new _base_common_color_js__WEBPACK_IMPORTED_MODULE_1__.RGBA(155, 185, 85, .2));
const defaultRemoveColor = new _base_common_color_js__WEBPACK_IMPORTED_MODULE_1__.Color(new _base_common_color_js__WEBPACK_IMPORTED_MODULE_1__.RGBA(255, 0, 0, .2));
const diffInserted = (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_2__.registerColor)('diffEditor.insertedTextBackground', { dark: '#9ccc2c33', light: '#9ccc2c40', hcDark: null, hcLight: null }, _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('diffEditorInserted', 'Background color for text that got inserted. The color must not be opaque so as not to hide underlying decorations.'), true);
const diffRemoved = (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_2__.registerColor)('diffEditor.removedTextBackground', { dark: '#ff000033', light: '#ff000033', hcDark: null, hcLight: null }, _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('diffEditorRemoved', 'Background color for text that got removed. The color must not be opaque so as not to hide underlying decorations.'), true);
const diffInsertedLine = (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_2__.registerColor)('diffEditor.insertedLineBackground', { dark: defaultInsertColor, light: defaultInsertColor, hcDark: null, hcLight: null }, _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('diffEditorInsertedLines', 'Background color for lines that got inserted. The color must not be opaque so as not to hide underlying decorations.'), true);
const diffRemovedLine = (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_2__.registerColor)('diffEditor.removedLineBackground', { dark: defaultRemoveColor, light: defaultRemoveColor, hcDark: null, hcLight: null }, _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('diffEditorRemovedLines', 'Background color for lines that got removed. The color must not be opaque so as not to hide underlying decorations.'), true);
const diffInsertedLineGutter = (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_2__.registerColor)('diffEditorGutter.insertedLineBackground', null, _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('diffEditorInsertedLineGutter', 'Background color for the margin where lines got inserted.'));
const diffRemovedLineGutter = (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_2__.registerColor)('diffEditorGutter.removedLineBackground', null, _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('diffEditorRemovedLineGutter', 'Background color for the margin where lines got removed.'));
const diffOverviewRulerInserted = (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_2__.registerColor)('diffEditorOverview.insertedForeground', null, _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('diffEditorOverviewInserted', 'Diff overview ruler foreground for inserted content.'));
const diffOverviewRulerRemoved = (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_2__.registerColor)('diffEditorOverview.removedForeground', null, _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('diffEditorOverviewRemoved', 'Diff overview ruler foreground for removed content.'));
const diffInsertedOutline = (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_2__.registerColor)('diffEditor.insertedTextBorder', { dark: null, light: null, hcDark: '#33ff2eff', hcLight: '#374E06' }, _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('diffEditorInsertedOutline', 'Outline color for the text that got inserted.'));
const diffRemovedOutline = (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_2__.registerColor)('diffEditor.removedTextBorder', { dark: null, light: null, hcDark: '#FF008F', hcLight: '#AD0707' }, _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('diffEditorRemovedOutline', 'Outline color for text that got removed.'));
const diffBorder = (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_2__.registerColor)('diffEditor.border', { dark: null, light: null, hcDark: _baseColors_js__WEBPACK_IMPORTED_MODULE_3__.contrastBorder, hcLight: _baseColors_js__WEBPACK_IMPORTED_MODULE_3__.contrastBorder }, _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('diffEditorBorder', 'Border color between the two text editors.'));
const diffDiagonalFill = (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_2__.registerColor)('diffEditor.diagonalFill', { dark: '#cccccc33', light: '#22222233', hcDark: null, hcLight: null }, _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('diffDiagonalFill', "Color of the diff editor's diagonal fill. The diagonal fill is used in side-by-side diff views."));
const diffUnchangedRegionBackground = (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_2__.registerColor)('diffEditor.unchangedRegionBackground', 'sideBar.background', _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('diffEditor.unchangedRegionBackground', "The background color of unchanged blocks in the diff editor."));
const diffUnchangedRegionForeground = (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_2__.registerColor)('diffEditor.unchangedRegionForeground', 'foreground', _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('diffEditor.unchangedRegionForeground', "The foreground color of unchanged blocks in the diff editor."));
const diffUnchangedTextBackground = (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_2__.registerColor)('diffEditor.unchangedCodeBackground', { dark: '#74747429', light: '#b8b8b829', hcDark: null, hcLight: null }, _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('diffEditor.unchangedCodeBackground', "The background color of unchanged code in the diff editor."));
// ----- widget
const widgetShadow = (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_2__.registerColor)('widget.shadow', { dark: (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_2__.transparent)(_base_common_color_js__WEBPACK_IMPORTED_MODULE_1__.Color.black, .36), light: (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_2__.transparent)(_base_common_color_js__WEBPACK_IMPORTED_MODULE_1__.Color.black, .16), hcDark: null, hcLight: null }, _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('widgetShadow', 'Shadow color of widgets such as find/replace inside the editor.'));
const widgetBorder = (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_2__.registerColor)('widget.border', { dark: null, light: null, hcDark: _baseColors_js__WEBPACK_IMPORTED_MODULE_3__.contrastBorder, hcLight: _baseColors_js__WEBPACK_IMPORTED_MODULE_3__.contrastBorder }, _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('widgetBorder', 'Border color of widgets such as find/replace inside the editor.'));
// ----- toolbar
const toolbarHoverBackground = (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_2__.registerColor)('toolbar.hoverBackground', { dark: '#5a5d5e50', light: '#b8b8b850', hcDark: null, hcLight: null }, _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('toolbarHoverBackground', "Toolbar background when hovering over actions using the mouse"));
const toolbarHoverOutline = (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_2__.registerColor)('toolbar.hoverOutline', { dark: null, light: null, hcDark: _baseColors_js__WEBPACK_IMPORTED_MODULE_3__.activeContrastBorder, hcLight: _baseColors_js__WEBPACK_IMPORTED_MODULE_3__.activeContrastBorder }, _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('toolbarHoverOutline', "Toolbar outline when hovering over actions using the mouse"));
const toolbarActiveBackground = (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_2__.registerColor)('toolbar.activeBackground', { dark: (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_2__.lighten)(toolbarHoverBackground, 0.1), light: (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_2__.darken)(toolbarHoverBackground, 0.1), hcDark: null, hcLight: null }, _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('toolbarActiveBackground', "Toolbar background when holding the mouse over actions"));
// ----- breadcumbs
const breadcrumbsForeground = (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_2__.registerColor)('breadcrumb.foreground', (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_2__.transparent)(_baseColors_js__WEBPACK_IMPORTED_MODULE_3__.foreground, 0.8), _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('breadcrumbsFocusForeground', "Color of focused breadcrumb items."));
const breadcrumbsBackground = (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_2__.registerColor)('breadcrumb.background', editorBackground, _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('breadcrumbsBackground', "Background color of breadcrumb items."));
const breadcrumbsFocusForeground = (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_2__.registerColor)('breadcrumb.focusForeground', { light: (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_2__.darken)(_baseColors_js__WEBPACK_IMPORTED_MODULE_3__.foreground, 0.2), dark: (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_2__.lighten)(_baseColors_js__WEBPACK_IMPORTED_MODULE_3__.foreground, 0.1), hcDark: (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_2__.lighten)(_baseColors_js__WEBPACK_IMPORTED_MODULE_3__.foreground, 0.1), hcLight: (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_2__.lighten)(_baseColors_js__WEBPACK_IMPORTED_MODULE_3__.foreground, 0.1) }, _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('breadcrumbsFocusForeground', "Color of focused breadcrumb items."));
const breadcrumbsActiveSelectionForeground = (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_2__.registerColor)('breadcrumb.activeSelectionForeground', { light: (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_2__.darken)(_baseColors_js__WEBPACK_IMPORTED_MODULE_3__.foreground, 0.2), dark: (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_2__.lighten)(_baseColors_js__WEBPACK_IMPORTED_MODULE_3__.foreground, 0.1), hcDark: (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_2__.lighten)(_baseColors_js__WEBPACK_IMPORTED_MODULE_3__.foreground, 0.1), hcLight: (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_2__.lighten)(_baseColors_js__WEBPACK_IMPORTED_MODULE_3__.foreground, 0.1) }, _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('breadcrumbsSelectedForeground', "Color of selected breadcrumb items."));
const breadcrumbsPickerBackground = (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_2__.registerColor)('breadcrumbPicker.background', editorWidgetBackground, _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('breadcrumbsSelectedBackground', "Background color of breadcrumb item picker."));
// ----- merge
const headerTransparency = 0.5;
const currentBaseColor = _base_common_color_js__WEBPACK_IMPORTED_MODULE_1__.Color.fromHex('#40C8AE').transparent(headerTransparency);
const incomingBaseColor = _base_common_color_js__WEBPACK_IMPORTED_MODULE_1__.Color.fromHex('#40A6FF').transparent(headerTransparency);
const commonBaseColor = _base_common_color_js__WEBPACK_IMPORTED_MODULE_1__.Color.fromHex('#606060').transparent(0.4);
const contentTransparency = 0.4;
const rulerTransparency = 1;
const mergeCurrentHeaderBackground = (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_2__.registerColor)('merge.currentHeaderBackground', { dark: currentBaseColor, light: currentBaseColor, hcDark: null, hcLight: null }, _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('mergeCurrentHeaderBackground', 'Current header background in inline merge-conflicts. The color must not be opaque so as not to hide underlying decorations.'), true);
const mergeCurrentContentBackground = (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_2__.registerColor)('merge.currentContentBackground', (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_2__.transparent)(mergeCurrentHeaderBackground, contentTransparency), _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('mergeCurrentContentBackground', 'Current content background in inline merge-conflicts. The color must not be opaque so as not to hide underlying decorations.'), true);
const mergeIncomingHeaderBackground = (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_2__.registerColor)('merge.incomingHeaderBackground', { dark: incomingBaseColor, light: incomingBaseColor, hcDark: null, hcLight: null }, _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('mergeIncomingHeaderBackground', 'Incoming header background in inline merge-conflicts. The color must not be opaque so as not to hide underlying decorations.'), true);
const mergeIncomingContentBackground = (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_2__.registerColor)('merge.incomingContentBackground', (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_2__.transparent)(mergeIncomingHeaderBackground, contentTransparency), _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('mergeIncomingContentBackground', 'Incoming content background in inline merge-conflicts. The color must not be opaque so as not to hide underlying decorations.'), true);
const mergeCommonHeaderBackground = (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_2__.registerColor)('merge.commonHeaderBackground', { dark: commonBaseColor, light: commonBaseColor, hcDark: null, hcLight: null }, _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('mergeCommonHeaderBackground', 'Common ancestor header background in inline merge-conflicts. The color must not be opaque so as not to hide underlying decorations.'), true);
const mergeCommonContentBackground = (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_2__.registerColor)('merge.commonContentBackground', (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_2__.transparent)(mergeCommonHeaderBackground, contentTransparency), _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('mergeCommonContentBackground', 'Common ancestor content background in inline merge-conflicts. The color must not be opaque so as not to hide underlying decorations.'), true);
const mergeBorder = (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_2__.registerColor)('merge.border', { dark: null, light: null, hcDark: '#C3DF6F', hcLight: '#007ACC' }, _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('mergeBorder', 'Border color on headers and the splitter in inline merge-conflicts.'));
const overviewRulerCurrentContentForeground = (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_2__.registerColor)('editorOverviewRuler.currentContentForeground', { dark: (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_2__.transparent)(mergeCurrentHeaderBackground, rulerTransparency), light: (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_2__.transparent)(mergeCurrentHeaderBackground, rulerTransparency), hcDark: mergeBorder, hcLight: mergeBorder }, _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('overviewRulerCurrentContentForeground', 'Current overview ruler foreground for inline merge-conflicts.'));
const overviewRulerIncomingContentForeground = (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_2__.registerColor)('editorOverviewRuler.incomingContentForeground', { dark: (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_2__.transparent)(mergeIncomingHeaderBackground, rulerTransparency), light: (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_2__.transparent)(mergeIncomingHeaderBackground, rulerTransparency), hcDark: mergeBorder, hcLight: mergeBorder }, _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('overviewRulerIncomingContentForeground', 'Incoming overview ruler foreground for inline merge-conflicts.'));
const overviewRulerCommonContentForeground = (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_2__.registerColor)('editorOverviewRuler.commonContentForeground', { dark: (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_2__.transparent)(mergeCommonHeaderBackground, rulerTransparency), light: (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_2__.transparent)(mergeCommonHeaderBackground, rulerTransparency), hcDark: mergeBorder, hcLight: mergeBorder }, _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('overviewRulerCommonContentForeground', 'Common ancestor overview ruler foreground for inline merge-conflicts.'));
const overviewRulerFindMatchForeground = (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_2__.registerColor)('editorOverviewRuler.findMatchForeground', { dark: '#d186167e', light: '#d186167e', hcDark: '#AB5A00', hcLight: '#AB5A00' }, _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('overviewRulerFindMatchForeground', 'Overview ruler marker color for find matches. The color must not be opaque so as not to hide underlying decorations.'), true);
const overviewRulerSelectionHighlightForeground = (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_2__.registerColor)('editorOverviewRuler.selectionHighlightForeground', '#A0A0A0CC', _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('overviewRulerSelectionHighlightForeground', 'Overview ruler marker color for selection highlights. The color must not be opaque so as not to hide underlying decorations.'), true);
// ----- problems
const problemsErrorIconForeground = (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_2__.registerColor)('problemsErrorIcon.foreground', editorErrorForeground, _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('problemsErrorIconForeground', "The color used for the problems error icon."));
const problemsWarningIconForeground = (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_2__.registerColor)('problemsWarningIcon.foreground', editorWarningForeground, _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('problemsWarningIconForeground', "The color used for the problems warning icon."));
const problemsInfoIconForeground = (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_2__.registerColor)('problemsInfoIcon.foreground', editorInfoForeground, _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('problemsInfoIconForeground', "The color used for the problems info icon."));


}),
2812: (function (__unused_webpack_module, __webpack_exports__, __webpack_require__) {
__webpack_require__.r(__webpack_exports__);
__webpack_require__.d(__webpack_exports__, {
  buttonBackground: () => (buttonBackground),
  buttonBorder: () => (buttonBorder),
  buttonForeground: () => (buttonForeground),
  buttonHoverBackground: () => (buttonHoverBackground),
  buttonSecondaryBackground: () => (buttonSecondaryBackground),
  buttonSecondaryForeground: () => (buttonSecondaryForeground),
  buttonSecondaryHoverBackground: () => (buttonSecondaryHoverBackground),
  buttonSeparator: () => (buttonSeparator),
  checkboxBackground: () => (checkboxBackground),
  checkboxBorder: () => (checkboxBorder),
  checkboxForeground: () => (checkboxForeground),
  checkboxSelectBackground: () => (checkboxSelectBackground),
  checkboxSelectBorder: () => (checkboxSelectBorder),
  inputActiveOptionBackground: () => (inputActiveOptionBackground),
  inputActiveOptionBorder: () => (inputActiveOptionBorder),
  inputActiveOptionForeground: () => (inputActiveOptionForeground),
  inputActiveOptionHoverBackground: () => (inputActiveOptionHoverBackground),
  inputBackground: () => (inputBackground),
  inputBorder: () => (inputBorder),
  inputForeground: () => (inputForeground),
  inputPlaceholderForeground: () => (inputPlaceholderForeground),
  inputValidationErrorBackground: () => (inputValidationErrorBackground),
  inputValidationErrorBorder: () => (inputValidationErrorBorder),
  inputValidationErrorForeground: () => (inputValidationErrorForeground),
  inputValidationInfoBackground: () => (inputValidationInfoBackground),
  inputValidationInfoBorder: () => (inputValidationInfoBorder),
  inputValidationInfoForeground: () => (inputValidationInfoForeground),
  inputValidationWarningBackground: () => (inputValidationWarningBackground),
  inputValidationWarningBorder: () => (inputValidationWarningBorder),
  inputValidationWarningForeground: () => (inputValidationWarningForeground),
  keybindingLabelBackground: () => (keybindingLabelBackground),
  keybindingLabelBorder: () => (keybindingLabelBorder),
  keybindingLabelBottomBorder: () => (keybindingLabelBottomBorder),
  keybindingLabelForeground: () => (keybindingLabelForeground),
  radioActiveBackground: () => (radioActiveBackground),
  radioActiveBorder: () => (radioActiveBorder),
  radioActiveForeground: () => (radioActiveForeground),
  radioInactiveBackground: () => (radioInactiveBackground),
  radioInactiveBorder: () => (radioInactiveBorder),
  radioInactiveForeground: () => (radioInactiveForeground),
  radioInactiveHoverBackground: () => (radioInactiveHoverBackground),
  selectBackground: () => (selectBackground),
  selectBorder: () => (selectBorder),
  selectForeground: () => (selectForeground),
  selectListBackground: () => (selectListBackground)
});
/* ESM import */var _nls_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(2644);
/* ESM import */var _base_common_color_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(2769);
/* ESM import */var _colorUtils_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(2806);
/* ESM import */var _baseColors_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(2807);
/* ESM import */var _editorColors_js__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(2809);
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

// Import the effects we need


// Import the colors we need


// ----- input
const inputBackground = (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_2__.registerColor)('input.background', { dark: '#3C3C3C', light: _base_common_color_js__WEBPACK_IMPORTED_MODULE_1__.Color.white, hcDark: _base_common_color_js__WEBPACK_IMPORTED_MODULE_1__.Color.black, hcLight: _base_common_color_js__WEBPACK_IMPORTED_MODULE_1__.Color.white }, _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('inputBoxBackground', "Input box background."));
const inputForeground = (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_2__.registerColor)('input.foreground', _baseColors_js__WEBPACK_IMPORTED_MODULE_3__.foreground, _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('inputBoxForeground', "Input box foreground."));
const inputBorder = (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_2__.registerColor)('input.border', { dark: null, light: null, hcDark: _baseColors_js__WEBPACK_IMPORTED_MODULE_3__.contrastBorder, hcLight: _baseColors_js__WEBPACK_IMPORTED_MODULE_3__.contrastBorder }, _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('inputBoxBorder', "Input box border."));
const inputActiveOptionBorder = (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_2__.registerColor)('inputOption.activeBorder', { dark: '#007ACC', light: '#007ACC', hcDark: _baseColors_js__WEBPACK_IMPORTED_MODULE_3__.contrastBorder, hcLight: _baseColors_js__WEBPACK_IMPORTED_MODULE_3__.contrastBorder }, _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('inputBoxActiveOptionBorder', "Border color of activated options in input fields."));
const inputActiveOptionHoverBackground = (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_2__.registerColor)('inputOption.hoverBackground', { dark: '#5a5d5e80', light: '#b8b8b850', hcDark: null, hcLight: null }, _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('inputOption.hoverBackground', "Background color of activated options in input fields."));
const inputActiveOptionBackground = (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_2__.registerColor)('inputOption.activeBackground', { dark: (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_2__.transparent)(_baseColors_js__WEBPACK_IMPORTED_MODULE_3__.focusBorder, 0.4), light: (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_2__.transparent)(_baseColors_js__WEBPACK_IMPORTED_MODULE_3__.focusBorder, 0.2), hcDark: _base_common_color_js__WEBPACK_IMPORTED_MODULE_1__.Color.transparent, hcLight: _base_common_color_js__WEBPACK_IMPORTED_MODULE_1__.Color.transparent }, _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('inputOption.activeBackground', "Background hover color of options in input fields."));
const inputActiveOptionForeground = (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_2__.registerColor)('inputOption.activeForeground', { dark: _base_common_color_js__WEBPACK_IMPORTED_MODULE_1__.Color.white, light: _base_common_color_js__WEBPACK_IMPORTED_MODULE_1__.Color.black, hcDark: _baseColors_js__WEBPACK_IMPORTED_MODULE_3__.foreground, hcLight: _baseColors_js__WEBPACK_IMPORTED_MODULE_3__.foreground }, _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('inputOption.activeForeground', "Foreground color of activated options in input fields."));
const inputPlaceholderForeground = (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_2__.registerColor)('input.placeholderForeground', { light: (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_2__.transparent)(_baseColors_js__WEBPACK_IMPORTED_MODULE_3__.foreground, 0.5), dark: (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_2__.transparent)(_baseColors_js__WEBPACK_IMPORTED_MODULE_3__.foreground, 0.5), hcDark: (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_2__.transparent)(_baseColors_js__WEBPACK_IMPORTED_MODULE_3__.foreground, 0.7), hcLight: (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_2__.transparent)(_baseColors_js__WEBPACK_IMPORTED_MODULE_3__.foreground, 0.7) }, _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('inputPlaceholderForeground', "Input box foreground color for placeholder text."));
// ----- input validation
const inputValidationInfoBackground = (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_2__.registerColor)('inputValidation.infoBackground', { dark: '#063B49', light: '#D6ECF2', hcDark: _base_common_color_js__WEBPACK_IMPORTED_MODULE_1__.Color.black, hcLight: _base_common_color_js__WEBPACK_IMPORTED_MODULE_1__.Color.white }, _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('inputValidationInfoBackground', "Input validation background color for information severity."));
const inputValidationInfoForeground = (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_2__.registerColor)('inputValidation.infoForeground', { dark: null, light: null, hcDark: null, hcLight: _baseColors_js__WEBPACK_IMPORTED_MODULE_3__.foreground }, _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('inputValidationInfoForeground', "Input validation foreground color for information severity."));
const inputValidationInfoBorder = (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_2__.registerColor)('inputValidation.infoBorder', { dark: '#007acc', light: '#007acc', hcDark: _baseColors_js__WEBPACK_IMPORTED_MODULE_3__.contrastBorder, hcLight: _baseColors_js__WEBPACK_IMPORTED_MODULE_3__.contrastBorder }, _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('inputValidationInfoBorder', "Input validation border color for information severity."));
const inputValidationWarningBackground = (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_2__.registerColor)('inputValidation.warningBackground', { dark: '#352A05', light: '#F6F5D2', hcDark: _base_common_color_js__WEBPACK_IMPORTED_MODULE_1__.Color.black, hcLight: _base_common_color_js__WEBPACK_IMPORTED_MODULE_1__.Color.white }, _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('inputValidationWarningBackground', "Input validation background color for warning severity."));
const inputValidationWarningForeground = (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_2__.registerColor)('inputValidation.warningForeground', { dark: null, light: null, hcDark: null, hcLight: _baseColors_js__WEBPACK_IMPORTED_MODULE_3__.foreground }, _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('inputValidationWarningForeground', "Input validation foreground color for warning severity."));
const inputValidationWarningBorder = (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_2__.registerColor)('inputValidation.warningBorder', { dark: '#B89500', light: '#B89500', hcDark: _baseColors_js__WEBPACK_IMPORTED_MODULE_3__.contrastBorder, hcLight: _baseColors_js__WEBPACK_IMPORTED_MODULE_3__.contrastBorder }, _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('inputValidationWarningBorder', "Input validation border color for warning severity."));
const inputValidationErrorBackground = (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_2__.registerColor)('inputValidation.errorBackground', { dark: '#5A1D1D', light: '#F2DEDE', hcDark: _base_common_color_js__WEBPACK_IMPORTED_MODULE_1__.Color.black, hcLight: _base_common_color_js__WEBPACK_IMPORTED_MODULE_1__.Color.white }, _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('inputValidationErrorBackground', "Input validation background color for error severity."));
const inputValidationErrorForeground = (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_2__.registerColor)('inputValidation.errorForeground', { dark: null, light: null, hcDark: null, hcLight: _baseColors_js__WEBPACK_IMPORTED_MODULE_3__.foreground }, _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('inputValidationErrorForeground', "Input validation foreground color for error severity."));
const inputValidationErrorBorder = (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_2__.registerColor)('inputValidation.errorBorder', { dark: '#BE1100', light: '#BE1100', hcDark: _baseColors_js__WEBPACK_IMPORTED_MODULE_3__.contrastBorder, hcLight: _baseColors_js__WEBPACK_IMPORTED_MODULE_3__.contrastBorder }, _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('inputValidationErrorBorder', "Input validation border color for error severity."));
// ----- select
const selectBackground = (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_2__.registerColor)('dropdown.background', { dark: '#3C3C3C', light: _base_common_color_js__WEBPACK_IMPORTED_MODULE_1__.Color.white, hcDark: _base_common_color_js__WEBPACK_IMPORTED_MODULE_1__.Color.black, hcLight: _base_common_color_js__WEBPACK_IMPORTED_MODULE_1__.Color.white }, _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('dropdownBackground', "Dropdown background."));
const selectListBackground = (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_2__.registerColor)('dropdown.listBackground', { dark: null, light: null, hcDark: _base_common_color_js__WEBPACK_IMPORTED_MODULE_1__.Color.black, hcLight: _base_common_color_js__WEBPACK_IMPORTED_MODULE_1__.Color.white }, _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('dropdownListBackground', "Dropdown list background."));
const selectForeground = (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_2__.registerColor)('dropdown.foreground', { dark: '#F0F0F0', light: _baseColors_js__WEBPACK_IMPORTED_MODULE_3__.foreground, hcDark: _base_common_color_js__WEBPACK_IMPORTED_MODULE_1__.Color.white, hcLight: _baseColors_js__WEBPACK_IMPORTED_MODULE_3__.foreground }, _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('dropdownForeground', "Dropdown foreground."));
const selectBorder = (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_2__.registerColor)('dropdown.border', { dark: selectBackground, light: '#CECECE', hcDark: _baseColors_js__WEBPACK_IMPORTED_MODULE_3__.contrastBorder, hcLight: _baseColors_js__WEBPACK_IMPORTED_MODULE_3__.contrastBorder }, _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('dropdownBorder', "Dropdown border."));
// ------ button
const buttonForeground = (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_2__.registerColor)('button.foreground', _base_common_color_js__WEBPACK_IMPORTED_MODULE_1__.Color.white, _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('buttonForeground', "Button foreground color."));
const buttonSeparator = (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_2__.registerColor)('button.separator', (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_2__.transparent)(buttonForeground, .4), _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('buttonSeparator', "Button separator color."));
const buttonBackground = (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_2__.registerColor)('button.background', { dark: '#0E639C', light: '#007ACC', hcDark: null, hcLight: '#0F4A85' }, _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('buttonBackground', "Button background color."));
const buttonHoverBackground = (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_2__.registerColor)('button.hoverBackground', { dark: (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_2__.lighten)(buttonBackground, 0.2), light: (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_2__.darken)(buttonBackground, 0.2), hcDark: buttonBackground, hcLight: buttonBackground }, _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('buttonHoverBackground', "Button background color when hovering."));
const buttonBorder = (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_2__.registerColor)('button.border', _baseColors_js__WEBPACK_IMPORTED_MODULE_3__.contrastBorder, _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('buttonBorder', "Button border color."));
const buttonSecondaryForeground = (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_2__.registerColor)('button.secondaryForeground', { dark: _base_common_color_js__WEBPACK_IMPORTED_MODULE_1__.Color.white, light: _base_common_color_js__WEBPACK_IMPORTED_MODULE_1__.Color.white, hcDark: _base_common_color_js__WEBPACK_IMPORTED_MODULE_1__.Color.white, hcLight: _baseColors_js__WEBPACK_IMPORTED_MODULE_3__.foreground }, _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('buttonSecondaryForeground', "Secondary button foreground color."));
const buttonSecondaryBackground = (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_2__.registerColor)('button.secondaryBackground', { dark: '#3A3D41', light: '#5F6A79', hcDark: null, hcLight: _base_common_color_js__WEBPACK_IMPORTED_MODULE_1__.Color.white }, _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('buttonSecondaryBackground', "Secondary button background color."));
const buttonSecondaryHoverBackground = (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_2__.registerColor)('button.secondaryHoverBackground', { dark: (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_2__.lighten)(buttonSecondaryBackground, 0.2), light: (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_2__.darken)(buttonSecondaryBackground, 0.2), hcDark: null, hcLight: null }, _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('buttonSecondaryHoverBackground', "Secondary button background color when hovering."));
// ------ radio
const radioActiveForeground = (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_2__.registerColor)('radio.activeForeground', inputActiveOptionForeground, _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('radioActiveForeground', "Foreground color of active radio option."));
const radioActiveBackground = (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_2__.registerColor)('radio.activeBackground', inputActiveOptionBackground, _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('radioBackground', "Background color of active radio option."));
const radioActiveBorder = (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_2__.registerColor)('radio.activeBorder', inputActiveOptionBorder, _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('radioActiveBorder', "Border color of the active radio option."));
const radioInactiveForeground = (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_2__.registerColor)('radio.inactiveForeground', null, _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('radioInactiveForeground', "Foreground color of inactive radio option."));
const radioInactiveBackground = (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_2__.registerColor)('radio.inactiveBackground', null, _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('radioInactiveBackground', "Background color of inactive radio option."));
const radioInactiveBorder = (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_2__.registerColor)('radio.inactiveBorder', { light: (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_2__.transparent)(radioActiveForeground, .2), dark: (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_2__.transparent)(radioActiveForeground, .2), hcDark: (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_2__.transparent)(radioActiveForeground, .4), hcLight: (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_2__.transparent)(radioActiveForeground, .2) }, _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('radioInactiveBorder', "Border color of the inactive radio option."));
const radioInactiveHoverBackground = (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_2__.registerColor)('radio.inactiveHoverBackground', inputActiveOptionHoverBackground, _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('radioHoverBackground', "Background color of inactive active radio option when hovering."));
// ------ checkbox
const checkboxBackground = (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_2__.registerColor)('checkbox.background', selectBackground, _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('checkbox.background', "Background color of checkbox widget."));
const checkboxSelectBackground = (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_2__.registerColor)('checkbox.selectBackground', _editorColors_js__WEBPACK_IMPORTED_MODULE_4__.editorWidgetBackground, _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('checkbox.select.background', "Background color of checkbox widget when the element it's in is selected."));
const checkboxForeground = (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_2__.registerColor)('checkbox.foreground', selectForeground, _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('checkbox.foreground', "Foreground color of checkbox widget."));
const checkboxBorder = (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_2__.registerColor)('checkbox.border', selectBorder, _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('checkbox.border', "Border color of checkbox widget."));
const checkboxSelectBorder = (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_2__.registerColor)('checkbox.selectBorder', _baseColors_js__WEBPACK_IMPORTED_MODULE_3__.iconForeground, _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('checkbox.select.border', "Border color of checkbox widget when the element it's in is selected."));
// ------ keybinding label
const keybindingLabelBackground = (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_2__.registerColor)('keybindingLabel.background', { dark: new _base_common_color_js__WEBPACK_IMPORTED_MODULE_1__.Color(new _base_common_color_js__WEBPACK_IMPORTED_MODULE_1__.RGBA(128, 128, 128, 0.17)), light: new _base_common_color_js__WEBPACK_IMPORTED_MODULE_1__.Color(new _base_common_color_js__WEBPACK_IMPORTED_MODULE_1__.RGBA(221, 221, 221, 0.4)), hcDark: _base_common_color_js__WEBPACK_IMPORTED_MODULE_1__.Color.transparent, hcLight: _base_common_color_js__WEBPACK_IMPORTED_MODULE_1__.Color.transparent }, _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('keybindingLabelBackground', "Keybinding label background color. The keybinding label is used to represent a keyboard shortcut."));
const keybindingLabelForeground = (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_2__.registerColor)('keybindingLabel.foreground', { dark: _base_common_color_js__WEBPACK_IMPORTED_MODULE_1__.Color.fromHex('#CCCCCC'), light: _base_common_color_js__WEBPACK_IMPORTED_MODULE_1__.Color.fromHex('#555555'), hcDark: _base_common_color_js__WEBPACK_IMPORTED_MODULE_1__.Color.white, hcLight: _baseColors_js__WEBPACK_IMPORTED_MODULE_3__.foreground }, _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('keybindingLabelForeground', "Keybinding label foreground color. The keybinding label is used to represent a keyboard shortcut."));
const keybindingLabelBorder = (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_2__.registerColor)('keybindingLabel.border', { dark: new _base_common_color_js__WEBPACK_IMPORTED_MODULE_1__.Color(new _base_common_color_js__WEBPACK_IMPORTED_MODULE_1__.RGBA(51, 51, 51, 0.6)), light: new _base_common_color_js__WEBPACK_IMPORTED_MODULE_1__.Color(new _base_common_color_js__WEBPACK_IMPORTED_MODULE_1__.RGBA(204, 204, 204, 0.4)), hcDark: new _base_common_color_js__WEBPACK_IMPORTED_MODULE_1__.Color(new _base_common_color_js__WEBPACK_IMPORTED_MODULE_1__.RGBA(111, 195, 223)), hcLight: _baseColors_js__WEBPACK_IMPORTED_MODULE_3__.contrastBorder }, _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('keybindingLabelBorder', "Keybinding label border color. The keybinding label is used to represent a keyboard shortcut."));
const keybindingLabelBottomBorder = (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_2__.registerColor)('keybindingLabel.bottomBorder', { dark: new _base_common_color_js__WEBPACK_IMPORTED_MODULE_1__.Color(new _base_common_color_js__WEBPACK_IMPORTED_MODULE_1__.RGBA(68, 68, 68, 0.6)), light: new _base_common_color_js__WEBPACK_IMPORTED_MODULE_1__.Color(new _base_common_color_js__WEBPACK_IMPORTED_MODULE_1__.RGBA(187, 187, 187, 0.4)), hcDark: new _base_common_color_js__WEBPACK_IMPORTED_MODULE_1__.Color(new _base_common_color_js__WEBPACK_IMPORTED_MODULE_1__.RGBA(111, 195, 223)), hcLight: _baseColors_js__WEBPACK_IMPORTED_MODULE_3__.foreground }, _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('keybindingLabelBottomBorder', "Keybinding label border bottom color. The keybinding label is used to represent a keyboard shortcut."));


}),
2813: (function (__unused_webpack_module, __webpack_exports__, __webpack_require__) {
__webpack_require__.r(__webpack_exports__);
__webpack_require__.d(__webpack_exports__, {
  editorActionListBackground: () => (editorActionListBackground),
  editorActionListFocusBackground: () => (editorActionListFocusBackground),
  editorActionListFocusForeground: () => (editorActionListFocusForeground),
  editorActionListForeground: () => (editorActionListForeground),
  listActiveSelectionBackground: () => (listActiveSelectionBackground),
  listActiveSelectionForeground: () => (listActiveSelectionForeground),
  listActiveSelectionIconForeground: () => (listActiveSelectionIconForeground),
  listDeemphasizedForeground: () => (listDeemphasizedForeground),
  listDropBetweenBackground: () => (listDropBetweenBackground),
  listDropOverBackground: () => (listDropOverBackground),
  listErrorForeground: () => (listErrorForeground),
  listFilterMatchHighlight: () => (listFilterMatchHighlight),
  listFilterMatchHighlightBorder: () => (listFilterMatchHighlightBorder),
  listFilterWidgetBackground: () => (listFilterWidgetBackground),
  listFilterWidgetNoMatchesOutline: () => (listFilterWidgetNoMatchesOutline),
  listFilterWidgetOutline: () => (listFilterWidgetOutline),
  listFilterWidgetShadow: () => (listFilterWidgetShadow),
  listFocusAndSelectionOutline: () => (listFocusAndSelectionOutline),
  listFocusBackground: () => (listFocusBackground),
  listFocusForeground: () => (listFocusForeground),
  listFocusHighlightForeground: () => (listFocusHighlightForeground),
  listFocusOutline: () => (listFocusOutline),
  listHighlightForeground: () => (listHighlightForeground),
  listHoverBackground: () => (listHoverBackground),
  listHoverForeground: () => (listHoverForeground),
  listInactiveFocusBackground: () => (listInactiveFocusBackground),
  listInactiveFocusOutline: () => (listInactiveFocusOutline),
  listInactiveSelectionBackground: () => (listInactiveSelectionBackground),
  listInactiveSelectionForeground: () => (listInactiveSelectionForeground),
  listInactiveSelectionIconForeground: () => (listInactiveSelectionIconForeground),
  listInvalidItemForeground: () => (listInvalidItemForeground),
  listWarningForeground: () => (listWarningForeground),
  tableColumnsBorder: () => (tableColumnsBorder),
  tableOddRowsBackgroundColor: () => (tableOddRowsBackgroundColor),
  treeInactiveIndentGuidesStroke: () => (treeInactiveIndentGuidesStroke),
  treeIndentGuidesStroke: () => (treeIndentGuidesStroke)
});
/* ESM import */var _nls_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(2644);
/* ESM import */var _base_common_color_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(2769);
/* ESM import */var _colorUtils_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(2806);
/* ESM import */var _baseColors_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(2807);
/* ESM import */var _editorColors_js__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(2809);
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

// Import the effects we need


// Import the colors we need


const listFocusBackground = (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_2__.registerColor)('list.focusBackground', null, _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('listFocusBackground', "List/Tree background color for the focused item when the list/tree is active. An active list/tree has keyboard focus, an inactive does not."));
const listFocusForeground = (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_2__.registerColor)('list.focusForeground', null, _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('listFocusForeground', "List/Tree foreground color for the focused item when the list/tree is active. An active list/tree has keyboard focus, an inactive does not."));
const listFocusOutline = (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_2__.registerColor)('list.focusOutline', { dark: _baseColors_js__WEBPACK_IMPORTED_MODULE_3__.focusBorder, light: _baseColors_js__WEBPACK_IMPORTED_MODULE_3__.focusBorder, hcDark: _baseColors_js__WEBPACK_IMPORTED_MODULE_3__.activeContrastBorder, hcLight: _baseColors_js__WEBPACK_IMPORTED_MODULE_3__.activeContrastBorder }, _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('listFocusOutline', "List/Tree outline color for the focused item when the list/tree is active. An active list/tree has keyboard focus, an inactive does not."));
const listFocusAndSelectionOutline = (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_2__.registerColor)('list.focusAndSelectionOutline', null, _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('listFocusAndSelectionOutline', "List/Tree outline color for the focused item when the list/tree is active and selected. An active list/tree has keyboard focus, an inactive does not."));
const listActiveSelectionBackground = (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_2__.registerColor)('list.activeSelectionBackground', { dark: '#04395E', light: '#0060C0', hcDark: null, hcLight: _base_common_color_js__WEBPACK_IMPORTED_MODULE_1__.Color.fromHex('#0F4A85').transparent(0.1) }, _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('listActiveSelectionBackground', "List/Tree background color for the selected item when the list/tree is active. An active list/tree has keyboard focus, an inactive does not."));
const listActiveSelectionForeground = (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_2__.registerColor)('list.activeSelectionForeground', { dark: _base_common_color_js__WEBPACK_IMPORTED_MODULE_1__.Color.white, light: _base_common_color_js__WEBPACK_IMPORTED_MODULE_1__.Color.white, hcDark: null, hcLight: null }, _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('listActiveSelectionForeground', "List/Tree foreground color for the selected item when the list/tree is active. An active list/tree has keyboard focus, an inactive does not."));
const listActiveSelectionIconForeground = (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_2__.registerColor)('list.activeSelectionIconForeground', null, _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('listActiveSelectionIconForeground', "List/Tree icon foreground color for the selected item when the list/tree is active. An active list/tree has keyboard focus, an inactive does not."));
const listInactiveSelectionBackground = (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_2__.registerColor)('list.inactiveSelectionBackground', { dark: '#37373D', light: '#E4E6F1', hcDark: null, hcLight: _base_common_color_js__WEBPACK_IMPORTED_MODULE_1__.Color.fromHex('#0F4A85').transparent(0.1) }, _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('listInactiveSelectionBackground', "List/Tree background color for the selected item when the list/tree is inactive. An active list/tree has keyboard focus, an inactive does not."));
const listInactiveSelectionForeground = (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_2__.registerColor)('list.inactiveSelectionForeground', null, _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('listInactiveSelectionForeground', "List/Tree foreground color for the selected item when the list/tree is inactive. An active list/tree has keyboard focus, an inactive does not."));
const listInactiveSelectionIconForeground = (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_2__.registerColor)('list.inactiveSelectionIconForeground', null, _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('listInactiveSelectionIconForeground', "List/Tree icon foreground color for the selected item when the list/tree is inactive. An active list/tree has keyboard focus, an inactive does not."));
const listInactiveFocusBackground = (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_2__.registerColor)('list.inactiveFocusBackground', null, _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('listInactiveFocusBackground', "List/Tree background color for the focused item when the list/tree is inactive. An active list/tree has keyboard focus, an inactive does not."));
const listInactiveFocusOutline = (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_2__.registerColor)('list.inactiveFocusOutline', null, _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('listInactiveFocusOutline', "List/Tree outline color for the focused item when the list/tree is inactive. An active list/tree has keyboard focus, an inactive does not."));
const listHoverBackground = (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_2__.registerColor)('list.hoverBackground', { dark: '#2A2D2E', light: '#F0F0F0', hcDark: _base_common_color_js__WEBPACK_IMPORTED_MODULE_1__.Color.white.transparent(0.1), hcLight: _base_common_color_js__WEBPACK_IMPORTED_MODULE_1__.Color.fromHex('#0F4A85').transparent(0.1) }, _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('listHoverBackground', "List/Tree background when hovering over items using the mouse."));
const listHoverForeground = (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_2__.registerColor)('list.hoverForeground', null, _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('listHoverForeground', "List/Tree foreground when hovering over items using the mouse."));
const listDropOverBackground = (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_2__.registerColor)('list.dropBackground', { dark: '#062F4A', light: '#D6EBFF', hcDark: null, hcLight: null }, _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('listDropBackground', "List/Tree drag and drop background when moving items over other items when using the mouse."));
const listDropBetweenBackground = (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_2__.registerColor)('list.dropBetweenBackground', { dark: _baseColors_js__WEBPACK_IMPORTED_MODULE_3__.iconForeground, light: _baseColors_js__WEBPACK_IMPORTED_MODULE_3__.iconForeground, hcDark: null, hcLight: null }, _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('listDropBetweenBackground', "List/Tree drag and drop border color when moving items between items when using the mouse."));
const listHighlightForeground = (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_2__.registerColor)('list.highlightForeground', { dark: '#2AAAFF', light: '#0066BF', hcDark: _baseColors_js__WEBPACK_IMPORTED_MODULE_3__.focusBorder, hcLight: _baseColors_js__WEBPACK_IMPORTED_MODULE_3__.focusBorder }, _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('highlight', 'List/Tree foreground color of the match highlights when searching inside the list/tree.'));
const listFocusHighlightForeground = (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_2__.registerColor)('list.focusHighlightForeground', { dark: listHighlightForeground, light: (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_2__.ifDefinedThenElse)(listActiveSelectionBackground, listHighlightForeground, '#BBE7FF'), hcDark: listHighlightForeground, hcLight: listHighlightForeground }, _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('listFocusHighlightForeground', 'List/Tree foreground color of the match highlights on actively focused items when searching inside the list/tree.'));
const listInvalidItemForeground = (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_2__.registerColor)('list.invalidItemForeground', { dark: '#B89500', light: '#B89500', hcDark: '#B89500', hcLight: '#B5200D' }, _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('invalidItemForeground', 'List/Tree foreground color for invalid items, for example an unresolved root in explorer.'));
const listErrorForeground = (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_2__.registerColor)('list.errorForeground', { dark: '#F88070', light: '#B01011', hcDark: null, hcLight: null }, _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('listErrorForeground', 'Foreground color of list items containing errors.'));
const listWarningForeground = (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_2__.registerColor)('list.warningForeground', { dark: '#CCA700', light: '#855F00', hcDark: null, hcLight: null }, _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('listWarningForeground', 'Foreground color of list items containing warnings.'));
const listFilterWidgetBackground = (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_2__.registerColor)('listFilterWidget.background', { light: (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_2__.darken)(_editorColors_js__WEBPACK_IMPORTED_MODULE_4__.editorWidgetBackground, 0), dark: (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_2__.lighten)(_editorColors_js__WEBPACK_IMPORTED_MODULE_4__.editorWidgetBackground, 0), hcDark: _editorColors_js__WEBPACK_IMPORTED_MODULE_4__.editorWidgetBackground, hcLight: _editorColors_js__WEBPACK_IMPORTED_MODULE_4__.editorWidgetBackground }, _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('listFilterWidgetBackground', 'Background color of the type filter widget in lists and trees.'));
const listFilterWidgetOutline = (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_2__.registerColor)('listFilterWidget.outline', { dark: _base_common_color_js__WEBPACK_IMPORTED_MODULE_1__.Color.transparent, light: _base_common_color_js__WEBPACK_IMPORTED_MODULE_1__.Color.transparent, hcDark: '#f38518', hcLight: '#007ACC' }, _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('listFilterWidgetOutline', 'Outline color of the type filter widget in lists and trees.'));
const listFilterWidgetNoMatchesOutline = (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_2__.registerColor)('listFilterWidget.noMatchesOutline', { dark: '#BE1100', light: '#BE1100', hcDark: _baseColors_js__WEBPACK_IMPORTED_MODULE_3__.contrastBorder, hcLight: _baseColors_js__WEBPACK_IMPORTED_MODULE_3__.contrastBorder }, _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('listFilterWidgetNoMatchesOutline', 'Outline color of the type filter widget in lists and trees, when there are no matches.'));
const listFilterWidgetShadow = (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_2__.registerColor)('listFilterWidget.shadow', _editorColors_js__WEBPACK_IMPORTED_MODULE_4__.widgetShadow, _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('listFilterWidgetShadow', 'Shadow color of the type filter widget in lists and trees.'));
const listFilterMatchHighlight = (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_2__.registerColor)('list.filterMatchBackground', { dark: _editorColors_js__WEBPACK_IMPORTED_MODULE_4__.editorFindMatchHighlight, light: _editorColors_js__WEBPACK_IMPORTED_MODULE_4__.editorFindMatchHighlight, hcDark: null, hcLight: null }, _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('listFilterMatchHighlight', 'Background color of the filtered match.'));
const listFilterMatchHighlightBorder = (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_2__.registerColor)('list.filterMatchBorder', { dark: _editorColors_js__WEBPACK_IMPORTED_MODULE_4__.editorFindMatchHighlightBorder, light: _editorColors_js__WEBPACK_IMPORTED_MODULE_4__.editorFindMatchHighlightBorder, hcDark: _baseColors_js__WEBPACK_IMPORTED_MODULE_3__.contrastBorder, hcLight: _baseColors_js__WEBPACK_IMPORTED_MODULE_3__.activeContrastBorder }, _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('listFilterMatchHighlightBorder', 'Border color of the filtered match.'));
const listDeemphasizedForeground = (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_2__.registerColor)('list.deemphasizedForeground', { dark: '#8C8C8C', light: '#8E8E90', hcDark: '#A7A8A9', hcLight: '#666666' }, _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('listDeemphasizedForeground', "List/Tree foreground color for items that are deemphasized."));
// ------ tree
const treeIndentGuidesStroke = (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_2__.registerColor)('tree.indentGuidesStroke', { dark: '#585858', light: '#a9a9a9', hcDark: '#a9a9a9', hcLight: '#a5a5a5' }, _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('treeIndentGuidesStroke', "Tree stroke color for the indentation guides."));
const treeInactiveIndentGuidesStroke = (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_2__.registerColor)('tree.inactiveIndentGuidesStroke', (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_2__.transparent)(treeIndentGuidesStroke, 0.4), _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('treeInactiveIndentGuidesStroke', "Tree stroke color for the indentation guides that are not active."));
// ------ table
const tableColumnsBorder = (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_2__.registerColor)('tree.tableColumnsBorder', { dark: '#CCCCCC20', light: '#61616120', hcDark: null, hcLight: null }, _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('tableColumnsBorder', "Table border color between columns."));
const tableOddRowsBackgroundColor = (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_2__.registerColor)('tree.tableOddRowsBackground', { dark: (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_2__.transparent)(_baseColors_js__WEBPACK_IMPORTED_MODULE_3__.foreground, 0.04), light: (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_2__.transparent)(_baseColors_js__WEBPACK_IMPORTED_MODULE_3__.foreground, 0.04), hcDark: null, hcLight: null }, _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('tableOddRowsBackgroundColor', "Background color for odd table rows."));
// ------ action list
const editorActionListBackground = (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_2__.registerColor)('editorActionList.background', _editorColors_js__WEBPACK_IMPORTED_MODULE_4__.editorWidgetBackground, _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('editorActionListBackground', "Action List background color."));
const editorActionListForeground = (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_2__.registerColor)('editorActionList.foreground', _editorColors_js__WEBPACK_IMPORTED_MODULE_4__.editorWidgetForeground, _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('editorActionListForeground', "Action List foreground color."));
const editorActionListFocusForeground = (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_2__.registerColor)('editorActionList.focusForeground', listActiveSelectionForeground, _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('editorActionListFocusForeground', "Action List foreground color for the focused item."));
const editorActionListFocusBackground = (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_2__.registerColor)('editorActionList.focusBackground', listActiveSelectionBackground, _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('editorActionListFocusBackground', "Action List background color for the focused item."));


}),
2814: (function (__unused_webpack_module, __webpack_exports__, __webpack_require__) {
__webpack_require__.r(__webpack_exports__);
__webpack_require__.d(__webpack_exports__, {
  menuBackground: () => (menuBackground),
  menuBorder: () => (menuBorder),
  menuForeground: () => (menuForeground),
  menuSelectionBackground: () => (menuSelectionBackground),
  menuSelectionBorder: () => (menuSelectionBorder),
  menuSelectionForeground: () => (menuSelectionForeground),
  menuSeparatorBackground: () => (menuSeparatorBackground)
});
/* ESM import */var _nls_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(2644);
/* ESM import */var _colorUtils_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(2806);
/* ESM import */var _baseColors_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(2807);
/* ESM import */var _inputColors_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(2812);
/* ESM import */var _listColors_js__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(2813);
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

// Import the effects we need

// Import the colors we need



const menuBorder = (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_1__.registerColor)('menu.border', { dark: null, light: null, hcDark: _baseColors_js__WEBPACK_IMPORTED_MODULE_2__.contrastBorder, hcLight: _baseColors_js__WEBPACK_IMPORTED_MODULE_2__.contrastBorder }, _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('menuBorder', "Border color of menus."));
const menuForeground = (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_1__.registerColor)('menu.foreground', _inputColors_js__WEBPACK_IMPORTED_MODULE_3__.selectForeground, _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('menuForeground', "Foreground color of menu items."));
const menuBackground = (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_1__.registerColor)('menu.background', _inputColors_js__WEBPACK_IMPORTED_MODULE_3__.selectBackground, _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('menuBackground', "Background color of menu items."));
const menuSelectionForeground = (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_1__.registerColor)('menu.selectionForeground', _listColors_js__WEBPACK_IMPORTED_MODULE_4__.listActiveSelectionForeground, _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('menuSelectionForeground', "Foreground color of the selected menu item in menus."));
const menuSelectionBackground = (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_1__.registerColor)('menu.selectionBackground', _listColors_js__WEBPACK_IMPORTED_MODULE_4__.listActiveSelectionBackground, _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('menuSelectionBackground', "Background color of the selected menu item in menus."));
const menuSelectionBorder = (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_1__.registerColor)('menu.selectionBorder', { dark: null, light: null, hcDark: _baseColors_js__WEBPACK_IMPORTED_MODULE_2__.activeContrastBorder, hcLight: _baseColors_js__WEBPACK_IMPORTED_MODULE_2__.activeContrastBorder }, _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('menuSelectionBorder', "Border color of the selected menu item in menus."));
const menuSeparatorBackground = (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_1__.registerColor)('menu.separatorBackground', { dark: '#606060', light: '#D4D4D4', hcDark: _baseColors_js__WEBPACK_IMPORTED_MODULE_2__.contrastBorder, hcLight: _baseColors_js__WEBPACK_IMPORTED_MODULE_2__.contrastBorder }, _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('menuSeparatorBackground', "Color of a separator menu item in menus."));


}),
2811: (function (__unused_webpack_module, __webpack_exports__, __webpack_require__) {
__webpack_require__.r(__webpack_exports__);
__webpack_require__.d(__webpack_exports__, {
  minimapBackground: () => (minimapBackground),
  minimapError: () => (minimapError),
  minimapFindMatch: () => (minimapFindMatch),
  minimapForegroundOpacity: () => (minimapForegroundOpacity),
  minimapInfo: () => (minimapInfo),
  minimapSelection: () => (minimapSelection),
  minimapSelectionOccurrenceHighlight: () => (minimapSelectionOccurrenceHighlight),
  minimapSliderActiveBackground: () => (minimapSliderActiveBackground),
  minimapSliderBackground: () => (minimapSliderBackground),
  minimapSliderHoverBackground: () => (minimapSliderHoverBackground),
  minimapWarning: () => (minimapWarning)
});
/* ESM import */var _nls_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(2644);
/* ESM import */var _base_common_color_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(2769);
/* ESM import */var _colorUtils_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(2806);
/* ESM import */var _editorColors_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(2809);
/* ESM import */var _miscColors_js__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(2810);
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

// Import the effects we need


// Import the colors we need


const minimapFindMatch = (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_2__.registerColor)('minimap.findMatchHighlight', { light: '#d18616', dark: '#d18616', hcDark: '#AB5A00', hcLight: '#0F4A85' }, _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('minimapFindMatchHighlight', 'Minimap marker color for find matches.'), true);
const minimapSelectionOccurrenceHighlight = (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_2__.registerColor)('minimap.selectionOccurrenceHighlight', { light: '#c9c9c9', dark: '#676767', hcDark: '#ffffff', hcLight: '#0F4A85' }, _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('minimapSelectionOccurrenceHighlight', 'Minimap marker color for repeating editor selections.'), true);
const minimapSelection = (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_2__.registerColor)('minimap.selectionHighlight', { light: '#ADD6FF', dark: '#264F78', hcDark: '#ffffff', hcLight: '#0F4A85' }, _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('minimapSelectionHighlight', 'Minimap marker color for the editor selection.'), true);
const minimapInfo = (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_2__.registerColor)('minimap.infoHighlight', { dark: _editorColors_js__WEBPACK_IMPORTED_MODULE_3__.editorInfoForeground, light: _editorColors_js__WEBPACK_IMPORTED_MODULE_3__.editorInfoForeground, hcDark: _editorColors_js__WEBPACK_IMPORTED_MODULE_3__.editorInfoBorder, hcLight: _editorColors_js__WEBPACK_IMPORTED_MODULE_3__.editorInfoBorder }, _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('minimapInfo', 'Minimap marker color for infos.'));
const minimapWarning = (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_2__.registerColor)('minimap.warningHighlight', { dark: _editorColors_js__WEBPACK_IMPORTED_MODULE_3__.editorWarningForeground, light: _editorColors_js__WEBPACK_IMPORTED_MODULE_3__.editorWarningForeground, hcDark: _editorColors_js__WEBPACK_IMPORTED_MODULE_3__.editorWarningBorder, hcLight: _editorColors_js__WEBPACK_IMPORTED_MODULE_3__.editorWarningBorder }, _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('overviewRuleWarning', 'Minimap marker color for warnings.'));
const minimapError = (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_2__.registerColor)('minimap.errorHighlight', { dark: new _base_common_color_js__WEBPACK_IMPORTED_MODULE_1__.Color(new _base_common_color_js__WEBPACK_IMPORTED_MODULE_1__.RGBA(255, 18, 18, 0.7)), light: new _base_common_color_js__WEBPACK_IMPORTED_MODULE_1__.Color(new _base_common_color_js__WEBPACK_IMPORTED_MODULE_1__.RGBA(255, 18, 18, 0.7)), hcDark: new _base_common_color_js__WEBPACK_IMPORTED_MODULE_1__.Color(new _base_common_color_js__WEBPACK_IMPORTED_MODULE_1__.RGBA(255, 50, 50, 1)), hcLight: '#B5200D' }, _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('minimapError', 'Minimap marker color for errors.'));
const minimapBackground = (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_2__.registerColor)('minimap.background', null, _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('minimapBackground', "Minimap background color."));
const minimapForegroundOpacity = (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_2__.registerColor)('minimap.foregroundOpacity', _base_common_color_js__WEBPACK_IMPORTED_MODULE_1__.Color.fromHex('#000f'), _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('minimapForegroundOpacity', 'Opacity of foreground elements rendered in the minimap. For example, "#000000c0" will render the elements with 75% opacity.'));
const minimapSliderBackground = (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_2__.registerColor)('minimapSlider.background', (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_2__.transparent)(_miscColors_js__WEBPACK_IMPORTED_MODULE_4__.scrollbarSliderBackground, 0.5), _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('minimapSliderBackground', "Minimap slider background color."));
const minimapSliderHoverBackground = (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_2__.registerColor)('minimapSlider.hoverBackground', (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_2__.transparent)(_miscColors_js__WEBPACK_IMPORTED_MODULE_4__.scrollbarSliderHoverBackground, 0.5), _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('minimapSliderHoverBackground', "Minimap slider background color when hovering."));
const minimapSliderActiveBackground = (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_2__.registerColor)('minimapSlider.activeBackground', (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_2__.transparent)(_miscColors_js__WEBPACK_IMPORTED_MODULE_4__.scrollbarSliderActiveBackground, 0.5), _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('minimapSliderActiveBackground', "Minimap slider background color when clicked on."));


}),
2810: (function (__unused_webpack_module, __webpack_exports__, __webpack_require__) {
__webpack_require__.r(__webpack_exports__);
__webpack_require__.d(__webpack_exports__, {
  badgeBackground: () => (badgeBackground),
  badgeForeground: () => (badgeForeground),
  progressBarBackground: () => (progressBarBackground),
  sashHoverBorder: () => (sashHoverBorder),
  scrollbarShadow: () => (scrollbarShadow),
  scrollbarSliderActiveBackground: () => (scrollbarSliderActiveBackground),
  scrollbarSliderBackground: () => (scrollbarSliderBackground),
  scrollbarSliderHoverBackground: () => (scrollbarSliderHoverBackground)
});
/* ESM import */var _nls_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(2644);
/* ESM import */var _base_common_color_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(2769);
/* ESM import */var _colorUtils_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(2806);
/* ESM import */var _baseColors_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(2807);
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

// Import the effects we need


// Import the colors we need

// ----- sash
const sashHoverBorder = (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_2__.registerColor)('sash.hoverBorder', _baseColors_js__WEBPACK_IMPORTED_MODULE_3__.focusBorder, _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('sashActiveBorder', "Border color of active sashes."));
// ----- badge
const badgeBackground = (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_2__.registerColor)('badge.background', { dark: '#4D4D4D', light: '#C4C4C4', hcDark: _base_common_color_js__WEBPACK_IMPORTED_MODULE_1__.Color.black, hcLight: '#0F4A85' }, _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('badgeBackground', "Badge background color. Badges are small information labels, e.g. for search results count."));
const badgeForeground = (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_2__.registerColor)('badge.foreground', { dark: _base_common_color_js__WEBPACK_IMPORTED_MODULE_1__.Color.white, light: '#333', hcDark: _base_common_color_js__WEBPACK_IMPORTED_MODULE_1__.Color.white, hcLight: _base_common_color_js__WEBPACK_IMPORTED_MODULE_1__.Color.white }, _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('badgeForeground', "Badge foreground color. Badges are small information labels, e.g. for search results count."));
// ----- scrollbar
const scrollbarShadow = (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_2__.registerColor)('scrollbar.shadow', { dark: '#000000', light: '#DDDDDD', hcDark: null, hcLight: null }, _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('scrollbarShadow', "Scrollbar shadow to indicate that the view is scrolled."));
const scrollbarSliderBackground = (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_2__.registerColor)('scrollbarSlider.background', { dark: _base_common_color_js__WEBPACK_IMPORTED_MODULE_1__.Color.fromHex('#797979').transparent(0.4), light: _base_common_color_js__WEBPACK_IMPORTED_MODULE_1__.Color.fromHex('#646464').transparent(0.4), hcDark: (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_2__.transparent)(_baseColors_js__WEBPACK_IMPORTED_MODULE_3__.contrastBorder, 0.6), hcLight: (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_2__.transparent)(_baseColors_js__WEBPACK_IMPORTED_MODULE_3__.contrastBorder, 0.4) }, _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('scrollbarSliderBackground', "Scrollbar slider background color."));
const scrollbarSliderHoverBackground = (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_2__.registerColor)('scrollbarSlider.hoverBackground', { dark: _base_common_color_js__WEBPACK_IMPORTED_MODULE_1__.Color.fromHex('#646464').transparent(0.7), light: _base_common_color_js__WEBPACK_IMPORTED_MODULE_1__.Color.fromHex('#646464').transparent(0.7), hcDark: (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_2__.transparent)(_baseColors_js__WEBPACK_IMPORTED_MODULE_3__.contrastBorder, 0.8), hcLight: (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_2__.transparent)(_baseColors_js__WEBPACK_IMPORTED_MODULE_3__.contrastBorder, 0.8) }, _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('scrollbarSliderHoverBackground', "Scrollbar slider background color when hovering."));
const scrollbarSliderActiveBackground = (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_2__.registerColor)('scrollbarSlider.activeBackground', { dark: _base_common_color_js__WEBPACK_IMPORTED_MODULE_1__.Color.fromHex('#BFBFBF').transparent(0.4), light: _base_common_color_js__WEBPACK_IMPORTED_MODULE_1__.Color.fromHex('#000000').transparent(0.6), hcDark: _baseColors_js__WEBPACK_IMPORTED_MODULE_3__.contrastBorder, hcLight: _baseColors_js__WEBPACK_IMPORTED_MODULE_3__.contrastBorder }, _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('scrollbarSliderActiveBackground', "Scrollbar slider background color when clicked on."));
// ----- progress bar
const progressBarBackground = (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_2__.registerColor)('progressBar.background', { dark: _base_common_color_js__WEBPACK_IMPORTED_MODULE_1__.Color.fromHex('#0E70C0'), light: _base_common_color_js__WEBPACK_IMPORTED_MODULE_1__.Color.fromHex('#0E70C0'), hcDark: _baseColors_js__WEBPACK_IMPORTED_MODULE_3__.contrastBorder, hcLight: _baseColors_js__WEBPACK_IMPORTED_MODULE_3__.contrastBorder }, _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('progressBarBackground', "Background color of the progress bar that can show for long running operations."));


}),
2815: (function (__unused_webpack_module, __webpack_exports__, __webpack_require__) {
__webpack_require__.r(__webpack_exports__);
__webpack_require__.d(__webpack_exports__, {
  _deprecatedQuickInputListFocusBackground: () => (_deprecatedQuickInputListFocusBackground),
  pickerGroupBorder: () => (pickerGroupBorder),
  pickerGroupForeground: () => (pickerGroupForeground),
  quickInputBackground: () => (quickInputBackground),
  quickInputForeground: () => (quickInputForeground),
  quickInputListFocusBackground: () => (quickInputListFocusBackground),
  quickInputListFocusForeground: () => (quickInputListFocusForeground),
  quickInputListFocusIconForeground: () => (quickInputListFocusIconForeground),
  quickInputTitleBackground: () => (quickInputTitleBackground)
});
/* ESM import */var _nls_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(2644);
/* ESM import */var _base_common_color_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(2769);
/* ESM import */var _colorUtils_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(2806);
/* ESM import */var _editorColors_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(2809);
/* ESM import */var _listColors_js__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(2813);
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

// Import the effects we need


// Import the colors we need


const quickInputBackground = (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_2__.registerColor)('quickInput.background', _editorColors_js__WEBPACK_IMPORTED_MODULE_3__.editorWidgetBackground, _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('pickerBackground', "Quick picker background color. The quick picker widget is the container for pickers like the command palette."));
const quickInputForeground = (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_2__.registerColor)('quickInput.foreground', _editorColors_js__WEBPACK_IMPORTED_MODULE_3__.editorWidgetForeground, _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('pickerForeground', "Quick picker foreground color. The quick picker widget is the container for pickers like the command palette."));
const quickInputTitleBackground = (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_2__.registerColor)('quickInputTitle.background', { dark: new _base_common_color_js__WEBPACK_IMPORTED_MODULE_1__.Color(new _base_common_color_js__WEBPACK_IMPORTED_MODULE_1__.RGBA(255, 255, 255, 0.105)), light: new _base_common_color_js__WEBPACK_IMPORTED_MODULE_1__.Color(new _base_common_color_js__WEBPACK_IMPORTED_MODULE_1__.RGBA(0, 0, 0, 0.06)), hcDark: '#000000', hcLight: _base_common_color_js__WEBPACK_IMPORTED_MODULE_1__.Color.white }, _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('pickerTitleBackground', "Quick picker title background color. The quick picker widget is the container for pickers like the command palette."));
const pickerGroupForeground = (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_2__.registerColor)('pickerGroup.foreground', { dark: '#3794FF', light: '#0066BF', hcDark: _base_common_color_js__WEBPACK_IMPORTED_MODULE_1__.Color.white, hcLight: '#0F4A85' }, _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('pickerGroupForeground', "Quick picker color for grouping labels."));
const pickerGroupBorder = (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_2__.registerColor)('pickerGroup.border', { dark: '#3F3F46', light: '#CCCEDB', hcDark: _base_common_color_js__WEBPACK_IMPORTED_MODULE_1__.Color.white, hcLight: '#0F4A85' }, _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('pickerGroupBorder', "Quick picker color for grouping borders."));
const _deprecatedQuickInputListFocusBackground = (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_2__.registerColor)('quickInput.list.focusBackground', null, '', undefined, _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('quickInput.list.focusBackground deprecation', "Please use quickInputList.focusBackground instead"));
const quickInputListFocusForeground = (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_2__.registerColor)('quickInputList.focusForeground', _listColors_js__WEBPACK_IMPORTED_MODULE_4__.listActiveSelectionForeground, _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('quickInput.listFocusForeground', "Quick picker foreground color for the focused item."));
const quickInputListFocusIconForeground = (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_2__.registerColor)('quickInputList.focusIconForeground', _listColors_js__WEBPACK_IMPORTED_MODULE_4__.listActiveSelectionIconForeground, _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('quickInput.listFocusIconForeground', "Quick picker icon foreground color for the focused item."));
const quickInputListFocusBackground = (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_2__.registerColor)('quickInputList.focusBackground', { dark: (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_2__.oneOf)(_deprecatedQuickInputListFocusBackground, _listColors_js__WEBPACK_IMPORTED_MODULE_4__.listActiveSelectionBackground), light: (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_2__.oneOf)(_deprecatedQuickInputListFocusBackground, _listColors_js__WEBPACK_IMPORTED_MODULE_4__.listActiveSelectionBackground), hcDark: null, hcLight: null }, _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('quickInput.listFocusBackground', "Quick picker background color for the focused item."));


}),
2816: (function (__unused_webpack_module, __webpack_exports__, __webpack_require__) {
__webpack_require__.r(__webpack_exports__);
__webpack_require__.d(__webpack_exports__, {
  searchEditorFindMatch: () => (searchEditorFindMatch),
  searchEditorFindMatchBorder: () => (searchEditorFindMatchBorder),
  searchResultsInfoForeground: () => (searchResultsInfoForeground)
});
/* ESM import */var _nls_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(2644);
/* ESM import */var _colorUtils_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(2806);
/* ESM import */var _baseColors_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(2807);
/* ESM import */var _editorColors_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(2809);
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

// Import the effects we need

// Import the colors we need


const searchResultsInfoForeground = (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_1__.registerColor)('search.resultsInfoForeground', { light: _baseColors_js__WEBPACK_IMPORTED_MODULE_2__.foreground, dark: (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_1__.transparent)(_baseColors_js__WEBPACK_IMPORTED_MODULE_2__.foreground, 0.65), hcDark: _baseColors_js__WEBPACK_IMPORTED_MODULE_2__.foreground, hcLight: _baseColors_js__WEBPACK_IMPORTED_MODULE_2__.foreground }, _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('search.resultsInfoForeground', "Color of the text in the search viewlet's completion message."));
// ----- search editor (Distinct from normal editor find match to allow for better differentiation)
const searchEditorFindMatch = (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_1__.registerColor)('searchEditor.findMatchBackground', { light: (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_1__.transparent)(_editorColors_js__WEBPACK_IMPORTED_MODULE_3__.editorFindMatchHighlight, 0.66), dark: (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_1__.transparent)(_editorColors_js__WEBPACK_IMPORTED_MODULE_3__.editorFindMatchHighlight, 0.66), hcDark: _editorColors_js__WEBPACK_IMPORTED_MODULE_3__.editorFindMatchHighlight, hcLight: _editorColors_js__WEBPACK_IMPORTED_MODULE_3__.editorFindMatchHighlight }, _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('searchEditor.queryMatch', "Color of the Search Editor query matches."));
const searchEditorFindMatchBorder = (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_1__.registerColor)('searchEditor.findMatchBorder', { light: (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_1__.transparent)(_editorColors_js__WEBPACK_IMPORTED_MODULE_3__.editorFindMatchHighlightBorder, 0.66), dark: (0,_colorUtils_js__WEBPACK_IMPORTED_MODULE_1__.transparent)(_editorColors_js__WEBPACK_IMPORTED_MODULE_3__.editorFindMatchHighlightBorder, 0.66), hcDark: _editorColors_js__WEBPACK_IMPORTED_MODULE_3__.editorFindMatchHighlightBorder, hcLight: _editorColors_js__WEBPACK_IMPORTED_MODULE_3__.editorFindMatchHighlightBorder }, _nls_js__WEBPACK_IMPORTED_MODULE_0__.localize('searchEditor.editorFindMatchBorder', "Border color of the Search Editor query matches."));


}),
2782: (function (__unused_webpack_module, __webpack_exports__, __webpack_require__) {
__webpack_require__.r(__webpack_exports__);
__webpack_require__.d(__webpack_exports__, {
  ColorScheme: () => (ColorScheme),
  isDark: () => (isDark),
  isHighContrast: () => (isHighContrast)
});
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
/**
 * Color scheme used by the OS and by color themes.
 */
var ColorScheme;
(function (ColorScheme) {
    ColorScheme["DARK"] = "dark";
    ColorScheme["LIGHT"] = "light";
    ColorScheme["HIGH_CONTRAST_DARK"] = "hcDark";
    ColorScheme["HIGH_CONTRAST_LIGHT"] = "hcLight";
})(ColorScheme || (ColorScheme = {}));
function isHighContrast(scheme) {
    return scheme === ColorScheme.HIGH_CONTRAST_DARK || scheme === ColorScheme.HIGH_CONTRAST_LIGHT;
}
function isDark(scheme) {
    return scheme === ColorScheme.DARK || scheme === ColorScheme.HIGH_CONTRAST_DARK;
}


}),
2781: (function (__unused_webpack_module, __webpack_exports__, __webpack_require__) {
__webpack_require__.r(__webpack_exports__);
__webpack_require__.d(__webpack_exports__, {
  Extensions: () => (Extensions),
  IThemeService: () => (IThemeService),
  Themable: () => (Themable),
  getThemeTypeSelector: () => (getThemeTypeSelector),
  registerThemingParticipant: () => (registerThemingParticipant),
  themeColorFromId: () => (themeColorFromId)
});
/* ESM import */var _base_common_event_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(2652);
/* ESM import */var _base_common_lifecycle_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(2655);
/* ESM import */var _instantiation_common_instantiation_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(2697);
/* ESM import */var _registry_common_platform_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(2707);
/* ESM import */var _theme_js__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(2782);





const IThemeService = (0,_instantiation_common_instantiation_js__WEBPACK_IMPORTED_MODULE_2__.createDecorator)('themeService');
function themeColorFromId(id) {
    return { id };
}
function getThemeTypeSelector(type) {
    switch (type) {
        case _theme_js__WEBPACK_IMPORTED_MODULE_4__.ColorScheme.DARK: return 'vs-dark';
        case _theme_js__WEBPACK_IMPORTED_MODULE_4__.ColorScheme.HIGH_CONTRAST_DARK: return 'hc-black';
        case _theme_js__WEBPACK_IMPORTED_MODULE_4__.ColorScheme.HIGH_CONTRAST_LIGHT: return 'hc-light';
        default: return 'vs';
    }
}
// static theming participant
const Extensions = {
    ThemingContribution: 'base.contributions.theming'
};
class ThemingRegistry {
    constructor() {
        this.themingParticipants = [];
        this.themingParticipants = [];
        this.onThemingParticipantAddedEmitter = new _base_common_event_js__WEBPACK_IMPORTED_MODULE_0__.Emitter();
    }
    onColorThemeChange(participant) {
        this.themingParticipants.push(participant);
        this.onThemingParticipantAddedEmitter.fire(participant);
        return (0,_base_common_lifecycle_js__WEBPACK_IMPORTED_MODULE_1__.toDisposable)(() => {
            const idx = this.themingParticipants.indexOf(participant);
            this.themingParticipants.splice(idx, 1);
        });
    }
    getThemingParticipants() {
        return this.themingParticipants;
    }
}
const themingRegistry = new ThemingRegistry();
_registry_common_platform_js__WEBPACK_IMPORTED_MODULE_3__.Registry.add(Extensions.ThemingContribution, themingRegistry);
function registerThemingParticipant(participant) {
    return themingRegistry.onColorThemeChange(participant);
}
/**
 * Utility base class for all themable components.
 */
class Themable extends _base_common_lifecycle_js__WEBPACK_IMPORTED_MODULE_1__.Disposable {
    constructor(themeService) {
        super();
        this.themeService = themeService;
        this.theme = themeService.getColorTheme();
        // Hook up to theme changes
        this._register(this.themeService.onDidColorThemeChange(theme => this.onThemeChange(theme)));
    }
    onThemeChange(theme) {
        this.theme = theme;
        this.updateStyles();
    }
    updateStyles() {
        // Subclasses to override
    }
}


}),

}]);
//# sourceMappingURL=29.js.map