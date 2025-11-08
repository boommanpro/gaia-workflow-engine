"use strict";
(self["webpackChunk_flowgram_ai_demo_free_layout"] = self["webpackChunk_flowgram_ai_demo_free_layout"] || []).push([["61"], {
4240: (function (__unused_webpack_module, __webpack_exports__, __webpack_require__) {
__webpack_require__.r(__webpack_exports__);
// extracted by css-extract-rspack-plugin


}),
4239: (function (__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) {
__webpack_require__.r(__webpack_exports__);
__webpack_require__.d(__webpack_exports__, {
  VariableTagInject: () => (VariableTagInject)
});
/* ESM import */var react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(1);
/* ESM import */var react__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(3);
/* ESM import */var lodash_es__WEBPACK_IMPORTED_MODULE_8__ = __webpack_require__(279);
/* ESM import */var lodash_es__WEBPACK_IMPORTED_MODULE_10__ = __webpack_require__(238);
/* ESM import */var _flowgram_ai_editor__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(19);
/* ESM import */var _flowgram_ai_coze_editor_react__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(3743);
/* ESM import */var _douyinfe_semi_ui__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(787);
/* ESM import */var _douyinfe_semi_icons__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(1484);
/* ESM import */var _codemirror_view__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(2418);
/* ESM import */var _shared_index_mjs__WEBPACK_IMPORTED_MODULE_9__ = __webpack_require__(4241);
/* ESM import */var _styles_css__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(4240);










class VariableTagWidget extends _codemirror_view__WEBPACK_IMPORTED_MODULE_6__.WidgetType {
    constructor({ keyPath, scope }){
        super(), this.toDispose = new _flowgram_ai_editor__WEBPACK_IMPORTED_MODULE_2__.DisposableCollection(), this.renderIcon = (icon)=>{
            if ('string' == typeof icon) return /*#__PURE__*/ (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)("img", {
                style: {
                    marginRight: 8
                },
                width: 12,
                height: 12,
                src: icon
            });
            return icon;
        };
        this.keyPath = keyPath;
        this.scope = scope;
    }
    renderVariable(v) {
        if (!v) return void this.root.render(/*#__PURE__*/ (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxs)(_douyinfe_semi_ui__WEBPACK_IMPORTED_MODULE_4__.Tag, {
            className: "gedit-m-coze-editor-tag",
            color: "amber",
            children: [
                /*#__PURE__*/ (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)(_douyinfe_semi_icons__WEBPACK_IMPORTED_MODULE_7__["default"], {
                    style: {
                        marginRight: '4px'
                    }
                }),
                /*#__PURE__*/ (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)("span", {
                    children: "Unknown"
                })
            ]
        }));
        const rootField = (0,lodash_es__WEBPACK_IMPORTED_MODULE_8__["default"])(v.parentFields) || v;
        const isRoot = v === rootField;
        const rootTitle = /*#__PURE__*/ (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)("span", {
            className: "gedit-m-coze-editor-root-title",
            children: rootField.meta?.title ? `${rootField.meta.title} ${isRoot ? '' : '-'} ` : ''
        });
        const rootIcon = this.renderIcon(rootField?.meta.icon);
        this.root.render(/*#__PURE__*/ (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)(_douyinfe_semi_ui__WEBPACK_IMPORTED_MODULE_4__.Popover, {
            content: /*#__PURE__*/ (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxs)("div", {
                className: "gedit-m-coze-editor-popover-content",
                children: [
                    rootIcon,
                    rootTitle,
                    /*#__PURE__*/ (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)("span", {
                        className: "gedit-m-coze-editor-var-name",
                        children: v?.keyPath.slice(1).join('.')
                    })
                ]
            }),
            children: /*#__PURE__*/ (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxs)(_douyinfe_semi_ui__WEBPACK_IMPORTED_MODULE_4__.Tag, {
                className: "gedit-m-coze-editor-tag",
                style: {
                    display: 'inline-flex',
                    alignItems: 'center'
                },
                children: [
                    rootIcon,
                    rootTitle,
                    !isRoot && /*#__PURE__*/ (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)("span", {
                        className: "gedit-m-coze-editor-var-name",
                        children: v?.key
                    })
                ]
            })
        }));
    }
    toDOM(view) {
        const dom = document.createElement('span');
        this.root = (0,_shared_index_mjs__WEBPACK_IMPORTED_MODULE_9__.polyfillCreateRoot)(dom);
        this.toDispose.push(_flowgram_ai_editor__WEBPACK_IMPORTED_MODULE_2__.Disposable.create(()=>{
            this.root.unmount();
        }));
        const refresh = ()=>{
            this.renderVariable(this.scope.available.getByKeyPath(this.keyPath));
        };
        this.toDispose.push(this.scope.available.trackByKeyPath(this.keyPath, refresh, {
            triggerOnInit: false
        }));
        if (this.keyPath?.[0]) this.toDispose.push(this.scope.available.trackByKeyPath([
            this.keyPath[0]
        ], refresh, {
            selector: (curr)=>({
                    ...curr?.meta
                }),
            triggerOnInit: false
        }));
        refresh();
        return dom;
    }
    eq(other) {
        return (0,lodash_es__WEBPACK_IMPORTED_MODULE_10__["default"])(this.keyPath, other.keyPath);
    }
    ignoreEvent() {
        return false;
    }
    destroy(dom) {
        this.toDispose.dispose();
    }
}
function VariableTagInject() {
    const injector = (0,_flowgram_ai_coze_editor_react__WEBPACK_IMPORTED_MODULE_3__.useInjector)();
    const scope = (0,_flowgram_ai_editor__WEBPACK_IMPORTED_MODULE_2__.useCurrentScope)({
        strict: true
    });
    (0,react__WEBPACK_IMPORTED_MODULE_1__.useLayoutEffect)(()=>{
        const atMatcher = new _codemirror_view__WEBPACK_IMPORTED_MODULE_6__.MatchDecorator({
            regexp: /\{\{([^\}\{]+)\}\}/g,
            decoration: (match)=>_codemirror_view__WEBPACK_IMPORTED_MODULE_6__.Decoration.replace({
                    widget: new VariableTagWidget({
                        keyPath: match[1]?.split('.') ?? [],
                        scope
                    })
                })
        });
        return injector.inject([
            _codemirror_view__WEBPACK_IMPORTED_MODULE_6__.ViewPlugin.fromClass(class {
                constructor(view){
                    this.view = view;
                    this.decorations = atMatcher.createDeco(view);
                }
                update() {
                    this.decorations = atMatcher.createDeco(this.view);
                }
            }, {
                decorations: (p)=>p.decorations,
                provide (p) {
                    return _codemirror_view__WEBPACK_IMPORTED_MODULE_6__.EditorView.atomicRanges.of((view)=>view.plugin(p)?.decorations ?? _codemirror_view__WEBPACK_IMPORTED_MODULE_6__.Decoration.none);
                }
            })
        ]);
    }, [
        injector
    ]);
    return null;
}



}),
4241: (function (__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) {
__webpack_require__.r(__webpack_exports__);
__webpack_require__.d(__webpack_exports__, {
  polyfillCreateRoot: () => (polyfillCreateRoot),
  unstableSetCreateRoot: () => (unstableSetCreateRoot)
});
/* ESM import */var react_dom__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(9);

let unstableCreateRoot = (dom)=>({
        render (children) {
            (0,react_dom__WEBPACK_IMPORTED_MODULE_0__.render)(children, dom);
        },
        unmount () {
            (0,react_dom__WEBPACK_IMPORTED_MODULE_0__.unmountComponentAtNode)(dom);
        }
    });
function polyfillCreateRoot(dom) {
    return unstableCreateRoot(dom);
}
function unstableSetCreateRoot(createRoot) {
    unstableCreateRoot = createRoot;
}



}),

}]);
//# sourceMappingURL=61.js.map