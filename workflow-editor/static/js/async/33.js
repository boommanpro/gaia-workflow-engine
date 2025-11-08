"use strict";
(self["webpackChunk_flowgram_ai_demo_free_layout"] = self["webpackChunk_flowgram_ai_demo_free_layout"] || []).push([["33"], {
3414: (function (__unused_webpack_module, __webpack_exports__, __webpack_require__) {
__webpack_require__.r(__webpack_exports__);
__webpack_require__.d(__webpack_exports__, {
  DraggedTreeItemsIdentifier: () => (DraggedTreeItemsIdentifier),
  TreeViewsDnDService: () => (TreeViewsDnDService)
});
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
class TreeViewsDnDService {
    constructor() {
        this._dragOperations = new Map();
    }
    removeDragOperationTransfer(uuid) {
        if ((uuid && this._dragOperations.has(uuid))) {
            const operation = this._dragOperations.get(uuid);
            this._dragOperations.delete(uuid);
            return operation;
        }
        return undefined;
    }
}
class DraggedTreeItemsIdentifier {
    constructor(identifier) {
        this.identifier = identifier;
    }
}


}),

}]);
//# sourceMappingURL=33.js.map