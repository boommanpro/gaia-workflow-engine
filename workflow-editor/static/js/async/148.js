"use strict";
(self["webpackChunk_flowgram_ai_demo_free_layout"] = self["webpackChunk_flowgram_ai_demo_free_layout"] || []).push([["148"], {
4334: (function (__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) {
__webpack_require__.r(__webpack_exports__);
__webpack_require__.d(__webpack_exports__, {
  JsonEditorWithVariables: () => (JsonEditorWithVariables)
});
/* ESM import */var react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(1);
/* ESM import */var react__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(3);
/* ESM import */var _flowgram_ai_editor__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(19);
/* ESM import */var _flowgram_ai_coze_editor_preset_code__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(2411);
/* ESM import */var _coze_editor_extensions_index_mjs__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(2623);
/* ESM import */var _code_editor_index_mjs__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(2410);






const TRIGGER_CHARACTERS = [
    '@'
];
function findAllMatches(inputString, regex) {
    const globalRegex = new RegExp(regex, regex.flags.includes('g') ? regex.flags : regex.flags + 'g');
    let match;
    const matches = [];
    while(null !== (match = globalRegex.exec(inputString))){
        if (match.index === globalRegex.lastIndex) globalRegex.lastIndex++;
        matches.push({
            match: match[0],
            range: [
                match.index,
                match.index + match[0].length
            ]
        });
    }
    return matches;
}
const transformer = (0,_flowgram_ai_coze_editor_preset_code__WEBPACK_IMPORTED_MODULE_3__.transformerCreator)((text)=>{
    const originalSource = text.toString();
    const matches = findAllMatches(originalSource, /\{\{([^\}]*)\}\}/g);
    if (matches.length > 0) matches.forEach(({ range })=>{
        text.replaceRange(range[0], range[1], 'null');
    });
    return text;
});
function JsonEditorWithVariables(props) {
    return /*#__PURE__*/ (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxs)(_code_editor_index_mjs__WEBPACK_IMPORTED_MODULE_4__.JsonCodeEditor, {
        activeLinePlaceholder: _flowgram_ai_editor__WEBPACK_IMPORTED_MODULE_2__.I18n.t("Press '@' to Select variable"),
        ...props,
        options: {
            transformer,
            ...props.options || {}
        },
        children: [
            /*#__PURE__*/ (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)(_coze_editor_extensions_index_mjs__WEBPACK_IMPORTED_MODULE_5__.EditorVariableTree, {
                triggerCharacters: TRIGGER_CHARACTERS
            }),
            /*#__PURE__*/ (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)(_coze_editor_extensions_index_mjs__WEBPACK_IMPORTED_MODULE_5__.EditorVariableTagInject, {})
        ]
    });
}



}),

}]);
//# sourceMappingURL=148.js.map