"use strict";
(self["webpackChunk_flowgram_ai_demo_free_layout"] = self["webpackChunk_flowgram_ai_demo_free_layout"] || []).push([["62"], {
4242: (function (__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) {
__webpack_require__.r(__webpack_exports__);
__webpack_require__.d(__webpack_exports__, {
  InputsPicker: () => (InputsPicker),
  InputsTree: () => (InputsTree)
});
/* ESM import */var react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(1);
/* ESM import */var react__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(3);
/* ESM import */var lodash_es__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(279);
/* ESM import */var lodash_es__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(261);
/* ESM import */var _flowgram_ai_editor__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(19);
/* ESM import */var _flowgram_ai_coze_editor_react__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(3743);
/* ESM import */var _douyinfe_semi_ui__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(787);
/* ESM import */var _shared_index_mjs__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(2523);







function InputsPicker({ inputsValues, onSelect }) {
    const scope = (0,_flowgram_ai_editor__WEBPACK_IMPORTED_MODULE_2__.useCurrentScope)();
    const getArrayDrilldown = (type, depth = 1)=>{
        if (_flowgram_ai_editor__WEBPACK_IMPORTED_MODULE_2__.ASTMatch.isArray(type.items)) return getArrayDrilldown(type.items, depth + 1);
        return {
            type: type.items,
            depth: depth
        };
    };
    const renderVariable = (variable, keyPath)=>{
        let type = variable?.type;
        let children;
        if (_flowgram_ai_editor__WEBPACK_IMPORTED_MODULE_2__.ASTMatch.isObject(type)) children = (type.properties || []).map((_property)=>renderVariable(_property, [
                ...keyPath,
                _property.key
            ])).filter(Boolean);
        if (_flowgram_ai_editor__WEBPACK_IMPORTED_MODULE_2__.ASTMatch.isArray(type)) {
            const drilldown = getArrayDrilldown(type);
            if (_flowgram_ai_editor__WEBPACK_IMPORTED_MODULE_2__.ASTMatch.isObject(drilldown.type)) children = (drilldown.type.properties || []).map((_property)=>renderVariable(_property, [
                    ...keyPath,
                    ...new Array(drilldown.depth).fill('[0]'),
                    _property.key
                ])).filter(Boolean);
        }
        const key = keyPath.map((_key, idx)=>'[0]' === _key || 0 === idx ? _key : `.${_key}`).join('');
        return {
            key: key,
            label: (0,lodash_es__WEBPACK_IMPORTED_MODULE_5__["default"])(keyPath),
            value: key,
            children
        };
    };
    const getTreeData = (value, keyPath)=>{
        const currKey = keyPath.join('.');
        if (_shared_index_mjs__WEBPACK_IMPORTED_MODULE_6__.FlowValueUtils.isFlowValue(value)) {
            if (_shared_index_mjs__WEBPACK_IMPORTED_MODULE_6__.FlowValueUtils.isRef(value)) {
                const variable = scope?.available?.getByKeyPath(value.content || []);
                if (variable) return renderVariable(variable, keyPath);
            }
            return {
                key: currKey,
                value: currKey,
                label: (0,lodash_es__WEBPACK_IMPORTED_MODULE_5__["default"])(keyPath)
            };
        }
        if ((0,lodash_es__WEBPACK_IMPORTED_MODULE_7__["default"])(value)) return {
            key: currKey,
            value: currKey,
            label: (0,lodash_es__WEBPACK_IMPORTED_MODULE_5__["default"])(keyPath),
            children: Object.entries(value).map(([key, value])=>getTreeData(value, [
                    ...keyPath,
                    key
                ])).filter(Boolean)
        };
    };
    const treeData = (0,react__WEBPACK_IMPORTED_MODULE_1__.useMemo)(()=>Object.entries(inputsValues).map(([key, value])=>getTreeData(value, [
                key
            ])).filter(Boolean), []);
    return /*#__PURE__*/ (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)(_douyinfe_semi_ui__WEBPACK_IMPORTED_MODULE_4__.Tree, {
        treeData: treeData,
        onSelect: (v)=>onSelect(v)
    });
}
const DEFAULT_TRIGGER_CHARACTERS = [
    '{',
    '{}',
    '@'
];
function InputsTree({ inputsValues, triggerCharacters = DEFAULT_TRIGGER_CHARACTERS }) {
    const [posKey, setPosKey] = (0,react__WEBPACK_IMPORTED_MODULE_1__.useState)('');
    const [visible, setVisible] = (0,react__WEBPACK_IMPORTED_MODULE_1__.useState)(false);
    const [position, setPosition] = (0,react__WEBPACK_IMPORTED_MODULE_1__.useState)(-1);
    const editor = (0,_flowgram_ai_coze_editor_react__WEBPACK_IMPORTED_MODULE_3__.useEditor)();
    function insert(variablePath) {
        const range = (0,_flowgram_ai_coze_editor_react__WEBPACK_IMPORTED_MODULE_3__.getCurrentMentionReplaceRange)(editor.$view.state);
        if (!range) return;
        let { from, to } = range;
        while('{' === editor.$view.state.doc.sliceString(from - 1, from))from--;
        while('}' === editor.$view.state.doc.sliceString(to, to + 1))to++;
        editor.replaceText({
            ...range,
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
    return /*#__PURE__*/ (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxs)(react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.Fragment, {
        children: [
            /*#__PURE__*/ (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)(_flowgram_ai_coze_editor_react__WEBPACK_IMPORTED_MODULE_3__.Mention, {
                triggerCharacters: triggerCharacters,
                onOpenChange: handleOpenChange
            }),
            /*#__PURE__*/ (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)(_douyinfe_semi_ui__WEBPACK_IMPORTED_MODULE_4__.Popover, {
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
                    children: /*#__PURE__*/ (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)(InputsPicker, {
                        inputsValues: inputsValues,
                        onSelect: (v)=>{
                            insert(v);
                        }
                    })
                }),
                children: /*#__PURE__*/ (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)(_flowgram_ai_coze_editor_react__WEBPACK_IMPORTED_MODULE_3__.PositionMirror, {
                    position: position,
                    onChange: ()=>setPosKey(String(Math.random()))
                })
            })
        ]
    });
}



}),

}]);
//# sourceMappingURL=62.js.map