"use strict";
(self["webpackChunk_flowgram_ai_demo_free_layout"] = self["webpackChunk_flowgram_ai_demo_free_layout"] || []).push([["7"], {
2697: (function (__unused_webpack_module, __webpack_exports__, __webpack_require__) {
__webpack_require__.r(__webpack_exports__);
__webpack_require__.d(__webpack_exports__, {
  IInstantiationService: () => (IInstantiationService),
  _util: () => (_util),
  createDecorator: () => (createDecorator)
});
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
// ------ internal util
var _util;
(function (_util) {
    _util.serviceIds = new Map();
    _util.DI_TARGET = '$di$target';
    _util.DI_DEPENDENCIES = '$di$dependencies';
    function getServiceDependencies(ctor) {
        return ctor[_util.DI_DEPENDENCIES] || [];
    }
    _util.getServiceDependencies = getServiceDependencies;
})(_util || (_util = {}));
const IInstantiationService = createDecorator('instantiationService');
function storeServiceDependency(id, target, index) {
    if (target[_util.DI_TARGET] === target) {
        target[_util.DI_DEPENDENCIES].push({ id, index });
    }
    else {
        target[_util.DI_DEPENDENCIES] = [{ id, index }];
        target[_util.DI_TARGET] = target;
    }
}
/**
 * The *only* valid way to create a {{ServiceIdentifier}}.
 */
function createDecorator(serviceId) {
    if (_util.serviceIds.has(serviceId)) {
        return _util.serviceIds.get(serviceId);
    }
    const id = function (target, key, index) {
        if (arguments.length !== 3) {
            throw new Error('@IServiceName-decorator can only be used to decorate a parameter');
        }
        storeServiceDependency(id, target, index);
    };
    id.toString = () => serviceId;
    _util.serviceIds.set(serviceId, id);
    return id;
}


}),
2734: (function (__unused_webpack_module, __webpack_exports__, __webpack_require__) {
__webpack_require__.r(__webpack_exports__);
__webpack_require__.d(__webpack_exports__, {
  Extensions: () => (Extensions)
});
/* ESM import */var _base_common_event_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(2652);
/* ESM import */var _registry_common_platform_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(2707);
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/


const Extensions = {
    JSONContribution: 'base.contributions.json'
};
function normalizeId(id) {
    if (id.length > 0 && id.charAt(id.length - 1) === '#') {
        return id.substring(0, id.length - 1);
    }
    return id;
}
class JSONContributionRegistry {
    constructor() {
        this._onDidChangeSchema = new _base_common_event_js__WEBPACK_IMPORTED_MODULE_0__.Emitter();
        this.schemasById = {};
    }
    registerSchema(uri, unresolvedSchemaContent) {
        this.schemasById[normalizeId(uri)] = unresolvedSchemaContent;
        this._onDidChangeSchema.fire(uri);
    }
    notifySchemaChanged(uri) {
        this._onDidChangeSchema.fire(uri);
    }
}
const jsonContributionRegistry = new JSONContributionRegistry();
_registry_common_platform_js__WEBPACK_IMPORTED_MODULE_1__.Registry.add(Extensions.JSONContribution, jsonContributionRegistry);


}),
2707: (function (__unused_webpack_module, __webpack_exports__, __webpack_require__) {
__webpack_require__.r(__webpack_exports__);
__webpack_require__.d(__webpack_exports__, {
  Registry: () => (Registry)
});
/* ESM import */var _base_common_assert_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(2708);
/* ESM import */var _base_common_types_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(2642);
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/


class RegistryImpl {
    constructor() {
        this.data = new Map();
    }
    add(id, data) {
        _base_common_assert_js__WEBPACK_IMPORTED_MODULE_0__.ok(_base_common_types_js__WEBPACK_IMPORTED_MODULE_1__.isString(id));
        _base_common_assert_js__WEBPACK_IMPORTED_MODULE_0__.ok(_base_common_types_js__WEBPACK_IMPORTED_MODULE_1__.isObject(data));
        _base_common_assert_js__WEBPACK_IMPORTED_MODULE_0__.ok(!this.data.has(id), 'There is already an extension with this id');
        this.data.set(id, data);
    }
    as(id) {
        return this.data.get(id) || null;
    }
}
const Registry = new RegistryImpl();


}),

}]);
//# sourceMappingURL=7.js.map