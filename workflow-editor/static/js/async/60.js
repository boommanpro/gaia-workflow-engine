"use strict";
(self["webpackChunk_flowgram_ai_demo_free_layout"] = self["webpackChunk_flowgram_ai_demo_free_layout"] || []).push([["60"], {
4238: (function (__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) {
__webpack_require__.r(__webpack_exports__);
__webpack_require__.d(__webpack_exports__, {
  VariableTree: () => (VariableTree)
});
/* ESM import */var react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(1);
/* ESM import */var react__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(3);
/* ESM import */var _flowgram_ai_coze_editor_react__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(3743);
/* ESM import */var _douyinfe_semi_ui__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(787);
/* ESM import */var _variable_selector_index_mjs__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(2487);





const DEFAULT_TRIGGER_CHARACTER = [
    '{',
    '{}',
    '@'
];
function VariableTree({ triggerCharacters = DEFAULT_TRIGGER_CHARACTER }) {
    const [posKey, setPosKey] = (0,react__WEBPACK_IMPORTED_MODULE_1__.useState)('');
    const [visible, setVisible] = (0,react__WEBPACK_IMPORTED_MODULE_1__.useState)(false);
    const [position, setPosition] = (0,react__WEBPACK_IMPORTED_MODULE_1__.useState)(-1);
    const editor = (0,_flowgram_ai_coze_editor_react__WEBPACK_IMPORTED_MODULE_2__.useEditor)();
    function insert(variablePath) {
        const range = (0,_flowgram_ai_coze_editor_react__WEBPACK_IMPORTED_MODULE_2__.getCurrentMentionReplaceRange)(editor.$view.state);
        if (!range) return;
        let { from, to } = range;
        while('{' === editor.$view.state.doc.sliceString(from - 1, from))from--;
        while('}' === editor.$view.state.doc.sliceString(to, to + 1))to++;
        editor.replaceText({
            from,
            to,
            text: '{{' + variablePath + '}}'
        });
        setVisible(false);
    }
    function handleOpenChange(e) {
        setPosition(e.state.selection.main.head);
        setVisible(e.value);
    }
    (0,react__WEBPACK_IMPORTED_MODULE_1__.useEffect)(()=>{
        if (!editor) return;
    }, [
        editor,
        visible
    ]);
    const treeData = (0,_variable_selector_index_mjs__WEBPACK_IMPORTED_MODULE_4__.useVariableTree)({});
    return /*#__PURE__*/ (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxs)(react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.Fragment, {
        children: [
            /*#__PURE__*/ (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)(_flowgram_ai_coze_editor_react__WEBPACK_IMPORTED_MODULE_2__.Mention, {
                triggerCharacters: triggerCharacters,
                onOpenChange: handleOpenChange
            }),
            /*#__PURE__*/ (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)(_douyinfe_semi_ui__WEBPACK_IMPORTED_MODULE_3__.Popover, {
                visible: visible,
                trigger: "custom",
                position: "topLeft",
                rePosKey: posKey,
                content: /*#__PURE__*/ (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)("div", {
                    style: {
                        width: 300,
                        maxHeight: 300,
                        overflowY: 'auto'
                    },
                    children: /*#__PURE__*/ (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)(_douyinfe_semi_ui__WEBPACK_IMPORTED_MODULE_3__.Tree, {
                        treeData: treeData,
                        onExpand: (v)=>{
                            setPosKey(String(Math.random()));
                        },
                        onSelect: (v)=>{
                            insert(v);
                        }
                    })
                }),
                children: /*#__PURE__*/ (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)(_flowgram_ai_coze_editor_react__WEBPACK_IMPORTED_MODULE_2__.PositionMirror, {
                    position: position,
                    onChange: ()=>setPosKey(String(Math.random()))
                })
            })
        ]
    });
}



}),

}]);
//# sourceMappingURL=60.js.map