"use strict";
(self["webpackChunk_flowgram_ai_demo_free_layout"] = self["webpackChunk_flowgram_ai_demo_free_layout"] || []).push([["56"], {
3760: (function (__unused_webpack_module, __webpack_exports__, __webpack_require__) {
__webpack_require__.r(__webpack_exports__);
// extracted by css-extract-rspack-plugin


}),
3742: (function (__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) {
__webpack_require__.r(__webpack_exports__);
__webpack_require__.d(__webpack_exports__, {
  BaseCodeEditor: () => (BaseCodeEditor)
});
/* ESM import */var react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(1);
/* ESM import */var react__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(3);
/* ESM import */var _flowgram_ai_coze_editor_react__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(3743);
/* ESM import */var _flowgram_ai_coze_editor_preset_code__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(2411);
/* ESM import */var _codemirror_view__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(2418);
/* ESM import */var _utils_mjs__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(3759);
/* ESM import */var _styles_css__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(3760);







const OriginCodeEditor = (0,_flowgram_ai_coze_editor_react__WEBPACK_IMPORTED_MODULE_2__.createRenderer)(_flowgram_ai_coze_editor_preset_code__WEBPACK_IMPORTED_MODULE_3__["default"], [
    _codemirror_view__WEBPACK_IMPORTED_MODULE_5__.EditorView.theme({
        '&.cm-focused': {
            outline: 'none'
        }
    })
]);
function BaseCodeEditor({ value, onChange, languageId = 'python', theme = 'light', children, placeholder, activeLinePlaceholder, options, readonly, mini }) {
    const editorRef = (0,react__WEBPACK_IMPORTED_MODULE_1__.useRef)(null);
    const editorValue = String(value || '');
    (0,react__WEBPACK_IMPORTED_MODULE_1__.useEffect)(()=>{
        if (editorRef.current?.getValue() !== editorValue) {
            const editorView = editorRef.current?.$view;
            editorView?.dispatch({
                changes: {
                    from: 0,
                    to: editorView?.state.doc.length,
                    insert: editorValue
                }
            });
        }
    }, [
        editorValue
    ]);
    return /*#__PURE__*/ (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)("div", {
        className: `gedit-m-code-editor-container ${mini ? 'mini' : ''}`,
        children: /*#__PURE__*/ (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)(_flowgram_ai_coze_editor_react__WEBPACK_IMPORTED_MODULE_2__.EditorProvider, {
            children: /*#__PURE__*/ (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxs)(OriginCodeEditor, {
                defaultValue: editorValue,
                options: {
                    uri: `file:///untitled${(0,_utils_mjs__WEBPACK_IMPORTED_MODULE_6__.getSuffixByLanguageId)(languageId)}`,
                    languageId,
                    theme,
                    placeholder,
                    readOnly: readonly,
                    editable: !readonly,
                    ...mini ? {
                        lineNumbersGutter: false,
                        foldGutter: false,
                        minHeight: 24
                    } : {},
                    ...options || {}
                },
                didMount: (editor)=>{
                    editorRef.current = editor;
                },
                onChange: (e)=>onChange?.(e.value),
                children: [
                    activeLinePlaceholder && /*#__PURE__*/ (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)(_flowgram_ai_coze_editor_react__WEBPACK_IMPORTED_MODULE_2__.ActiveLinePlaceholder, {
                        children: activeLinePlaceholder
                    }),
                    children
                ]
            })
        })
    });
}



}),
3759: (function (__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) {
__webpack_require__.r(__webpack_exports__);
__webpack_require__.d(__webpack_exports__, {
  getSuffixByLanguageId: () => (getSuffixByLanguageId)
});
function getSuffixByLanguageId(languageId) {
    if ('python' === languageId) return '.py';
    if ("typescript" === languageId) return '.ts';
    if ('shell' === languageId) return '.sh';
    if ('json' === languageId) return '.json';
    if ('sql' === languageId) return '.sql';
    return '';
}



}),

}]);
//# sourceMappingURL=56.js.map