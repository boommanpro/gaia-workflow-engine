"use strict";
(self["webpackChunk_flowgram_ai_demo_free_layout"] = self["webpackChunk_flowgram_ai_demo_free_layout"] || []).push([["57"], {
3763: (function (__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) {
__webpack_require__.r(__webpack_exports__);
__webpack_require__.d(__webpack_exports__, {
  colors: () => (colors),
  darkTheme: () => (darkTheme)
});
/* ESM import */var _flowgram_ai_coze_editor_preset_code__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(2411);

const colors = {
    background: '#24292e',
    foreground: '#d1d5da',
    selection: '#3392FF44',
    cursor: '#c8e1ff',
    dropdownBackground: '#24292e',
    dropdownBorder: '#1b1f23',
    activeLine: '#4d566022',
    matchingBracket: '#888892',
    keyword: '#9197F1',
    storage: '#f97583',
    variable: '#ffab70',
    variableName: '#D9DCFA',
    parameter: '#e1e4e8',
    function: '#FFCA66',
    string: '#FF9878',
    constant: '#79b8ff',
    type: '#79b8ff',
    class: '#b392f0',
    number: '#2EC7D9',
    comment: '#568B2A',
    heading: '#79b8ff',
    invalid: '#f97583',
    regexp: '#9ecbff',
    propertyName: '#9197F1',
    separator: '#888892',
    gutters: '#888892',
    moduleKeyword: '#CC4FD4'
};
const darkTheme = (0,_flowgram_ai_coze_editor_preset_code__WEBPACK_IMPORTED_MODULE_0__.createTheme)({
    variant: 'dark',
    settings: {
        background: colors.background,
        foreground: colors.foreground,
        caret: colors.cursor,
        selection: colors.selection,
        gutterBackground: colors.background,
        gutterForeground: colors.foreground,
        gutterBorderColor: 'transparent',
        gutterBorderWidth: 0,
        lineHighlight: 'transparent',
        bracketColors: [
            '#FBBF24',
            '#A78BFA',
            '#7DD3FC'
        ],
        tooltip: {
            backgroundColor: '#21262D',
            color: '#E6EDF3',
            border: '1px solid #30363D'
        },
        link: {
            color: '#58A6FF'
        },
        completionItemHover: {
            backgroundColor: '#21262D'
        },
        completionItemSelected: {
            backgroundColor: colors.selection,
            color: colors.foreground
        },
        completionItemIcon: {
            color: '#8B949E'
        },
        completionItemLabel: {
            color: '#E6EDF3'
        },
        completionItemInfo: {
            color: '#8B949E'
        },
        completionItemDetail: {
            color: '#6E7681'
        }
    },
    styles: [
        {
            tag: _flowgram_ai_coze_editor_preset_code__WEBPACK_IMPORTED_MODULE_0__.tags.keyword,
            color: colors.keyword
        },
        {
            tag: _flowgram_ai_coze_editor_preset_code__WEBPACK_IMPORTED_MODULE_0__.tags.variableName,
            color: colors.variableName
        },
        {
            tag: [
                _flowgram_ai_coze_editor_preset_code__WEBPACK_IMPORTED_MODULE_0__.tags.name,
                _flowgram_ai_coze_editor_preset_code__WEBPACK_IMPORTED_MODULE_0__.tags.deleted,
                _flowgram_ai_coze_editor_preset_code__WEBPACK_IMPORTED_MODULE_0__.tags.character,
                _flowgram_ai_coze_editor_preset_code__WEBPACK_IMPORTED_MODULE_0__.tags.macroName
            ],
            color: colors.variable
        },
        {
            tag: [
                _flowgram_ai_coze_editor_preset_code__WEBPACK_IMPORTED_MODULE_0__.tags.propertyName
            ],
            color: colors.propertyName
        },
        {
            tag: [
                _flowgram_ai_coze_editor_preset_code__WEBPACK_IMPORTED_MODULE_0__.tags.processingInstruction,
                _flowgram_ai_coze_editor_preset_code__WEBPACK_IMPORTED_MODULE_0__.tags.string,
                _flowgram_ai_coze_editor_preset_code__WEBPACK_IMPORTED_MODULE_0__.tags.inserted,
                _flowgram_ai_coze_editor_preset_code__WEBPACK_IMPORTED_MODULE_0__.tags.special(_flowgram_ai_coze_editor_preset_code__WEBPACK_IMPORTED_MODULE_0__.tags.string)
            ],
            color: colors.string
        },
        {
            tag: [
                _flowgram_ai_coze_editor_preset_code__WEBPACK_IMPORTED_MODULE_0__.tags["function"](_flowgram_ai_coze_editor_preset_code__WEBPACK_IMPORTED_MODULE_0__.tags.variableName),
                _flowgram_ai_coze_editor_preset_code__WEBPACK_IMPORTED_MODULE_0__.tags["function"](_flowgram_ai_coze_editor_preset_code__WEBPACK_IMPORTED_MODULE_0__.tags.propertyName),
                _flowgram_ai_coze_editor_preset_code__WEBPACK_IMPORTED_MODULE_0__.tags.labelName
            ],
            color: colors.function
        },
        {
            tag: [
                _flowgram_ai_coze_editor_preset_code__WEBPACK_IMPORTED_MODULE_0__.tags.moduleKeyword,
                _flowgram_ai_coze_editor_preset_code__WEBPACK_IMPORTED_MODULE_0__.tags.controlKeyword
            ],
            color: colors.moduleKeyword
        },
        {
            tag: [
                _flowgram_ai_coze_editor_preset_code__WEBPACK_IMPORTED_MODULE_0__.tags.color,
                _flowgram_ai_coze_editor_preset_code__WEBPACK_IMPORTED_MODULE_0__.tags.constant(_flowgram_ai_coze_editor_preset_code__WEBPACK_IMPORTED_MODULE_0__.tags.name),
                _flowgram_ai_coze_editor_preset_code__WEBPACK_IMPORTED_MODULE_0__.tags.standard(_flowgram_ai_coze_editor_preset_code__WEBPACK_IMPORTED_MODULE_0__.tags.name)
            ],
            color: colors.constant
        },
        {
            tag: _flowgram_ai_coze_editor_preset_code__WEBPACK_IMPORTED_MODULE_0__.tags.definition(_flowgram_ai_coze_editor_preset_code__WEBPACK_IMPORTED_MODULE_0__.tags.name),
            color: colors.variable
        },
        {
            tag: [
                _flowgram_ai_coze_editor_preset_code__WEBPACK_IMPORTED_MODULE_0__.tags.className
            ],
            color: colors.class
        },
        {
            tag: [
                _flowgram_ai_coze_editor_preset_code__WEBPACK_IMPORTED_MODULE_0__.tags.number,
                _flowgram_ai_coze_editor_preset_code__WEBPACK_IMPORTED_MODULE_0__.tags.changed,
                _flowgram_ai_coze_editor_preset_code__WEBPACK_IMPORTED_MODULE_0__.tags.annotation,
                _flowgram_ai_coze_editor_preset_code__WEBPACK_IMPORTED_MODULE_0__.tags.modifier,
                _flowgram_ai_coze_editor_preset_code__WEBPACK_IMPORTED_MODULE_0__.tags.self,
                _flowgram_ai_coze_editor_preset_code__WEBPACK_IMPORTED_MODULE_0__.tags.namespace
            ],
            color: colors.number
        },
        {
            tag: [
                _flowgram_ai_coze_editor_preset_code__WEBPACK_IMPORTED_MODULE_0__.tags.typeName
            ],
            color: colors.type,
            fontStyle: colors.type
        },
        {
            tag: [
                _flowgram_ai_coze_editor_preset_code__WEBPACK_IMPORTED_MODULE_0__.tags.operatorKeyword
            ],
            color: colors.keyword
        },
        {
            tag: [
                _flowgram_ai_coze_editor_preset_code__WEBPACK_IMPORTED_MODULE_0__.tags.url,
                _flowgram_ai_coze_editor_preset_code__WEBPACK_IMPORTED_MODULE_0__.tags.escape,
                _flowgram_ai_coze_editor_preset_code__WEBPACK_IMPORTED_MODULE_0__.tags.regexp,
                _flowgram_ai_coze_editor_preset_code__WEBPACK_IMPORTED_MODULE_0__.tags.link
            ],
            color: colors.regexp
        },
        {
            tag: [
                _flowgram_ai_coze_editor_preset_code__WEBPACK_IMPORTED_MODULE_0__.tags.meta,
                _flowgram_ai_coze_editor_preset_code__WEBPACK_IMPORTED_MODULE_0__.tags.comment
            ],
            color: colors.comment
        },
        {
            tag: _flowgram_ai_coze_editor_preset_code__WEBPACK_IMPORTED_MODULE_0__.tags.strong,
            fontWeight: 'bold'
        },
        {
            tag: _flowgram_ai_coze_editor_preset_code__WEBPACK_IMPORTED_MODULE_0__.tags.emphasis,
            fontStyle: 'italic'
        },
        {
            tag: _flowgram_ai_coze_editor_preset_code__WEBPACK_IMPORTED_MODULE_0__.tags.link,
            textDecoration: 'underline'
        },
        {
            tag: _flowgram_ai_coze_editor_preset_code__WEBPACK_IMPORTED_MODULE_0__.tags.heading,
            fontWeight: 'bold',
            color: colors.heading
        },
        {
            tag: [
                _flowgram_ai_coze_editor_preset_code__WEBPACK_IMPORTED_MODULE_0__.tags.atom,
                _flowgram_ai_coze_editor_preset_code__WEBPACK_IMPORTED_MODULE_0__.tags.bool,
                _flowgram_ai_coze_editor_preset_code__WEBPACK_IMPORTED_MODULE_0__.tags.special(_flowgram_ai_coze_editor_preset_code__WEBPACK_IMPORTED_MODULE_0__.tags.variableName)
            ],
            color: colors.variable
        },
        {
            tag: _flowgram_ai_coze_editor_preset_code__WEBPACK_IMPORTED_MODULE_0__.tags.invalid,
            color: colors.invalid
        },
        {
            tag: _flowgram_ai_coze_editor_preset_code__WEBPACK_IMPORTED_MODULE_0__.tags.strikethrough,
            textDecoration: 'line-through'
        },
        {
            tag: _flowgram_ai_coze_editor_preset_code__WEBPACK_IMPORTED_MODULE_0__.tags.separator,
            color: colors.separator
        }
    ]
});



}),
3761: (function (__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) {
__webpack_require__.r(__webpack_exports__);
/* ESM import */var _flowgram_ai_coze_editor_preset_code__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(2411);
/* ESM import */var _light_mjs__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(3762);
/* ESM import */var _dark_mjs__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(3763);



_flowgram_ai_coze_editor_preset_code__WEBPACK_IMPORTED_MODULE_0__.themes.register('dark', _dark_mjs__WEBPACK_IMPORTED_MODULE_1__.darkTheme);
_flowgram_ai_coze_editor_preset_code__WEBPACK_IMPORTED_MODULE_0__.themes.register('light', _light_mjs__WEBPACK_IMPORTED_MODULE_2__.lightTheme);


}),
3762: (function (__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) {
__webpack_require__.r(__webpack_exports__);
__webpack_require__.d(__webpack_exports__, {
  colors: () => (colors),
  lightTheme: () => (lightTheme)
});
/* ESM import */var _flowgram_ai_coze_editor_preset_code__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(2411);

const colors = {
    background: '#f4f5f5',
    foreground: '#444d56',
    selection: '#0366d625',
    cursor: '#044289',
    dropdownBackground: '#fff',
    dropdownBorder: '#e1e4e8',
    activeLine: '#c6c6c622',
    matchingBracket: '#34d05840',
    keyword: '#d73a49',
    storage: '#d73a49',
    variable: '#e36209',
    parameter: '#24292e',
    function: '#005cc5',
    string: '#032f62',
    constant: '#005cc5',
    type: '#005cc5',
    class: '#6f42c1',
    number: '#005cc5',
    comment: '#6a737d',
    heading: '#005cc5',
    invalid: '#cb2431',
    regexp: '#032f62'
};
const lightTheme = (0,_flowgram_ai_coze_editor_preset_code__WEBPACK_IMPORTED_MODULE_0__.createTheme)({
    variant: 'light',
    settings: {
        background: colors.background,
        foreground: colors.foreground,
        caret: colors.cursor,
        selection: colors.selection,
        gutterBackground: colors.background,
        gutterForeground: colors.foreground,
        gutterBorderColor: 'transparent',
        gutterBorderWidth: 0,
        lineHighlight: 'transparent',
        bracketColors: [
            '#F59E0B',
            '#8B5CF6',
            '#06B6D4'
        ],
        tooltip: {
            backgroundColor: colors.dropdownBackground,
            color: colors.foreground,
            border: 'none',
            boxShadow: '0 0 1px rgba(0, 0, 0, .3), 0 4px 14px rgba(0, 0, 0, .1)!important',
            maxWidth: '400px'
        },
        link: {
            color: '#2563EB',
            caret: colors.cursor
        },
        completionItemHover: {
            backgroundColor: '#F3F4F6'
        },
        completionItemSelected: {
            backgroundColor: colors.selection,
            color: colors.foreground
        },
        completionItemIcon: {
            color: '#4B5563'
        },
        completionItemLabel: {
            color: '#1F2937'
        },
        completionItemInfo: {
            color: '#4B5563'
        },
        completionItemDetail: {
            color: '#6B7280'
        }
    },
    styles: [
        {
            tag: _flowgram_ai_coze_editor_preset_code__WEBPACK_IMPORTED_MODULE_0__.tags.keyword,
            color: colors.keyword
        },
        {
            tag: [
                _flowgram_ai_coze_editor_preset_code__WEBPACK_IMPORTED_MODULE_0__.tags.name,
                _flowgram_ai_coze_editor_preset_code__WEBPACK_IMPORTED_MODULE_0__.tags.deleted,
                _flowgram_ai_coze_editor_preset_code__WEBPACK_IMPORTED_MODULE_0__.tags.character,
                _flowgram_ai_coze_editor_preset_code__WEBPACK_IMPORTED_MODULE_0__.tags.macroName
            ],
            color: colors.variable
        },
        {
            tag: [
                _flowgram_ai_coze_editor_preset_code__WEBPACK_IMPORTED_MODULE_0__.tags.propertyName
            ],
            color: colors.function
        },
        {
            tag: [
                _flowgram_ai_coze_editor_preset_code__WEBPACK_IMPORTED_MODULE_0__.tags.processingInstruction,
                _flowgram_ai_coze_editor_preset_code__WEBPACK_IMPORTED_MODULE_0__.tags.string,
                _flowgram_ai_coze_editor_preset_code__WEBPACK_IMPORTED_MODULE_0__.tags.inserted,
                _flowgram_ai_coze_editor_preset_code__WEBPACK_IMPORTED_MODULE_0__.tags.special(_flowgram_ai_coze_editor_preset_code__WEBPACK_IMPORTED_MODULE_0__.tags.string)
            ],
            color: colors.string
        },
        {
            tag: [
                _flowgram_ai_coze_editor_preset_code__WEBPACK_IMPORTED_MODULE_0__.tags["function"](_flowgram_ai_coze_editor_preset_code__WEBPACK_IMPORTED_MODULE_0__.tags.variableName),
                _flowgram_ai_coze_editor_preset_code__WEBPACK_IMPORTED_MODULE_0__.tags.labelName
            ],
            color: colors.function
        },
        {
            tag: [
                _flowgram_ai_coze_editor_preset_code__WEBPACK_IMPORTED_MODULE_0__.tags.color,
                _flowgram_ai_coze_editor_preset_code__WEBPACK_IMPORTED_MODULE_0__.tags.constant(_flowgram_ai_coze_editor_preset_code__WEBPACK_IMPORTED_MODULE_0__.tags.name),
                _flowgram_ai_coze_editor_preset_code__WEBPACK_IMPORTED_MODULE_0__.tags.standard(_flowgram_ai_coze_editor_preset_code__WEBPACK_IMPORTED_MODULE_0__.tags.name)
            ],
            color: colors.constant
        },
        {
            tag: [
                _flowgram_ai_coze_editor_preset_code__WEBPACK_IMPORTED_MODULE_0__.tags.definition(_flowgram_ai_coze_editor_preset_code__WEBPACK_IMPORTED_MODULE_0__.tags.name),
                _flowgram_ai_coze_editor_preset_code__WEBPACK_IMPORTED_MODULE_0__.tags.separator
            ],
            color: colors.variable
        },
        {
            tag: [
                _flowgram_ai_coze_editor_preset_code__WEBPACK_IMPORTED_MODULE_0__.tags.className
            ],
            color: colors.class
        },
        {
            tag: [
                _flowgram_ai_coze_editor_preset_code__WEBPACK_IMPORTED_MODULE_0__.tags.number,
                _flowgram_ai_coze_editor_preset_code__WEBPACK_IMPORTED_MODULE_0__.tags.changed,
                _flowgram_ai_coze_editor_preset_code__WEBPACK_IMPORTED_MODULE_0__.tags.annotation,
                _flowgram_ai_coze_editor_preset_code__WEBPACK_IMPORTED_MODULE_0__.tags.modifier,
                _flowgram_ai_coze_editor_preset_code__WEBPACK_IMPORTED_MODULE_0__.tags.self,
                _flowgram_ai_coze_editor_preset_code__WEBPACK_IMPORTED_MODULE_0__.tags.namespace
            ],
            color: colors.number
        },
        {
            tag: [
                _flowgram_ai_coze_editor_preset_code__WEBPACK_IMPORTED_MODULE_0__.tags.typeName
            ],
            color: colors.type,
            fontStyle: colors.type
        },
        {
            tag: [
                _flowgram_ai_coze_editor_preset_code__WEBPACK_IMPORTED_MODULE_0__.tags.operator,
                _flowgram_ai_coze_editor_preset_code__WEBPACK_IMPORTED_MODULE_0__.tags.operatorKeyword
            ],
            color: colors.keyword
        },
        {
            tag: [
                _flowgram_ai_coze_editor_preset_code__WEBPACK_IMPORTED_MODULE_0__.tags.url,
                _flowgram_ai_coze_editor_preset_code__WEBPACK_IMPORTED_MODULE_0__.tags.escape,
                _flowgram_ai_coze_editor_preset_code__WEBPACK_IMPORTED_MODULE_0__.tags.regexp,
                _flowgram_ai_coze_editor_preset_code__WEBPACK_IMPORTED_MODULE_0__.tags.link
            ],
            color: colors.regexp
        },
        {
            tag: [
                _flowgram_ai_coze_editor_preset_code__WEBPACK_IMPORTED_MODULE_0__.tags.meta,
                _flowgram_ai_coze_editor_preset_code__WEBPACK_IMPORTED_MODULE_0__.tags.comment
            ],
            color: colors.comment
        },
        {
            tag: _flowgram_ai_coze_editor_preset_code__WEBPACK_IMPORTED_MODULE_0__.tags.strong,
            fontWeight: 'bold'
        },
        {
            tag: _flowgram_ai_coze_editor_preset_code__WEBPACK_IMPORTED_MODULE_0__.tags.emphasis,
            fontStyle: 'italic'
        },
        {
            tag: _flowgram_ai_coze_editor_preset_code__WEBPACK_IMPORTED_MODULE_0__.tags.link,
            textDecoration: 'underline'
        },
        {
            tag: _flowgram_ai_coze_editor_preset_code__WEBPACK_IMPORTED_MODULE_0__.tags.heading,
            fontWeight: 'bold',
            color: colors.heading
        },
        {
            tag: [
                _flowgram_ai_coze_editor_preset_code__WEBPACK_IMPORTED_MODULE_0__.tags.atom,
                _flowgram_ai_coze_editor_preset_code__WEBPACK_IMPORTED_MODULE_0__.tags.bool,
                _flowgram_ai_coze_editor_preset_code__WEBPACK_IMPORTED_MODULE_0__.tags.special(_flowgram_ai_coze_editor_preset_code__WEBPACK_IMPORTED_MODULE_0__.tags.variableName)
            ],
            color: colors.variable
        },
        {
            tag: _flowgram_ai_coze_editor_preset_code__WEBPACK_IMPORTED_MODULE_0__.tags.invalid,
            color: colors.invalid
        },
        {
            tag: _flowgram_ai_coze_editor_preset_code__WEBPACK_IMPORTED_MODULE_0__.tags.strikethrough,
            textDecoration: 'line-through'
        }
    ]
});



}),

}]);
//# sourceMappingURL=57.js.map