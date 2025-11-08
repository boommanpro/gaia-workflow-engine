"use strict";
(self["webpackChunk_flowgram_ai_demo_free_layout"] = self["webpackChunk_flowgram_ai_demo_free_layout"] || []).push([["20"], {
2798: (function (__unused_webpack_module, __webpack_exports__, __webpack_require__) {
__webpack_require__.r(__webpack_exports__);
__webpack_require__.d(__webpack_exports__, {
  ISemanticTokensStylingService: () => (ISemanticTokensStylingService)
});
/* ESM import */var _platform_instantiation_common_instantiation_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(2697);
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

const ISemanticTokensStylingService = (0,_platform_instantiation_common_instantiation_js__WEBPACK_IMPORTED_MODULE_0__.createDecorator)('semanticTokensStylingService');


}),
2793: (function (__unused_webpack_module, __webpack_exports__, __webpack_require__) {
__webpack_require__.r(__webpack_exports__);
__webpack_require__.d(__webpack_exports__, {
  SemanticTokensStylingService: () => (SemanticTokensStylingService)
});
/* ESM import */var _base_common_lifecycle_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(2655);
/* ESM import */var _languages_language_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(2728);
/* ESM import */var _platform_theme_common_themeService_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(2781);
/* ESM import */var _platform_log_common_log_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(2710);
/* ESM import */var _semanticTokensProviderStyling_js__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(2794);
/* ESM import */var _semanticTokensStyling_js__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(2798);
/* ESM import */var _platform_instantiation_common_extensions_js__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(2729);
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (undefined && undefined.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (undefined && undefined.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};







let SemanticTokensStylingService = class SemanticTokensStylingService extends _base_common_lifecycle_js__WEBPACK_IMPORTED_MODULE_0__.Disposable {
    constructor(_themeService, _logService, _languageService) {
        super();
        this._themeService = _themeService;
        this._logService = _logService;
        this._languageService = _languageService;
        this._caches = new WeakMap();
        this._register(this._themeService.onDidColorThemeChange(() => {
            this._caches = new WeakMap();
        }));
    }
    getStyling(provider) {
        if (!this._caches.has(provider)) {
            this._caches.set(provider, new _semanticTokensProviderStyling_js__WEBPACK_IMPORTED_MODULE_4__.SemanticTokensProviderStyling(provider.getLegend(), this._themeService, this._languageService, this._logService));
        }
        return this._caches.get(provider);
    }
};
SemanticTokensStylingService = __decorate([
    __param(0, _platform_theme_common_themeService_js__WEBPACK_IMPORTED_MODULE_2__.IThemeService),
    __param(1, _platform_log_common_log_js__WEBPACK_IMPORTED_MODULE_3__.ILogService),
    __param(2, _languages_language_js__WEBPACK_IMPORTED_MODULE_1__.ILanguageService)
], SemanticTokensStylingService);

(0,_platform_instantiation_common_extensions_js__WEBPACK_IMPORTED_MODULE_6__.registerSingleton)(_semanticTokensStyling_js__WEBPACK_IMPORTED_MODULE_5__.ISemanticTokensStylingService, SemanticTokensStylingService, 1 /* InstantiationType.Delayed */);


}),
2730: (function (__unused_webpack_module, __webpack_exports__, __webpack_require__) {
__webpack_require__.r(__webpack_exports__);
__webpack_require__.d(__webpack_exports__, {
  SyncDescriptor: () => (SyncDescriptor)
});
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
class SyncDescriptor {
    constructor(ctor, staticArguments = [], supportsDelayedInstantiation = false) {
        this.ctor = ctor;
        this.staticArguments = staticArguments;
        this.supportsDelayedInstantiation = supportsDelayedInstantiation;
    }
}


}),
2729: (function (__unused_webpack_module, __webpack_exports__, __webpack_require__) {
__webpack_require__.r(__webpack_exports__);
__webpack_require__.d(__webpack_exports__, {
  getSingletonServiceDescriptors: () => (getSingletonServiceDescriptors),
  registerSingleton: () => (registerSingleton)
});
/* ESM import */var _descriptors_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(2730);
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

const _registry = [];
function registerSingleton(id, ctorOrDescriptor, supportsDelayedInstantiation) {
    if (!(ctorOrDescriptor instanceof _descriptors_js__WEBPACK_IMPORTED_MODULE_0__.SyncDescriptor)) {
        ctorOrDescriptor = new _descriptors_js__WEBPACK_IMPORTED_MODULE_0__.SyncDescriptor(ctorOrDescriptor, [], Boolean(supportsDelayedInstantiation));
    }
    _registry.push([id, ctorOrDescriptor]);
}
function getSingletonServiceDescriptors() {
    return _registry;
}


}),
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
//# sourceMappingURL=20.js.map