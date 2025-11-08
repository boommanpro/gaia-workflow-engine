"use strict";
(self["webpackChunk_flowgram_ai_demo_free_layout"] = self["webpackChunk_flowgram_ai_demo_free_layout"] || []).push([["17"], {
2797: (function (__unused_webpack_module, __webpack_exports__, __webpack_require__) {
__webpack_require__.r(__webpack_exports__);
__webpack_require__.d(__webpack_exports__, {
  countEOL: () => (countEOL)
});
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
function countEOL(text) {
    let eolCount = 0;
    let firstLineLength = 0;
    let lastLineStart = 0;
    let eol = 0 /* StringEOL.Unknown */;
    for (let i = 0, len = text.length; i < len; i++) {
        const chr = text.charCodeAt(i);
        if (chr === 13 /* CharCode.CarriageReturn */) {
            if (eolCount === 0) {
                firstLineLength = i;
            }
            eolCount++;
            if (i + 1 < len && text.charCodeAt(i + 1) === 10 /* CharCode.LineFeed */) {
                // \r\n... case
                eol |= 2 /* StringEOL.CRLF */;
                i++; // skip \n
            }
            else {
                // \r... case
                eol |= 3 /* StringEOL.Invalid */;
            }
            lastLineStart = i + 1;
        }
        else if (chr === 10 /* CharCode.LineFeed */) {
            // \n... case
            eol |= 1 /* StringEOL.LF */;
            if (eolCount === 0) {
                firstLineLength = i;
            }
            eolCount++;
            lastLineStart = i + 1;
        }
    }
    if (eolCount === 0) {
        firstLineLength = text.length;
    }
    return [eolCount, firstLineLength, text.length - lastLineStart, eol];
}


}),
2795: (function (__unused_webpack_module, __webpack_exports__, __webpack_require__) {
__webpack_require__.r(__webpack_exports__);
__webpack_require__.d(__webpack_exports__, {
  TokenMetadata: () => (TokenMetadata)
});
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
/**
 */
class TokenMetadata {
    static getLanguageId(metadata) {
        return (metadata & 255 /* MetadataConsts.LANGUAGEID_MASK */) >>> 0 /* MetadataConsts.LANGUAGEID_OFFSET */;
    }
    static getTokenType(metadata) {
        return (metadata & 768 /* MetadataConsts.TOKEN_TYPE_MASK */) >>> 8 /* MetadataConsts.TOKEN_TYPE_OFFSET */;
    }
    static containsBalancedBrackets(metadata) {
        return (metadata & 1024 /* MetadataConsts.BALANCED_BRACKETS_MASK */) !== 0;
    }
    static getFontStyle(metadata) {
        return (metadata & 30720 /* MetadataConsts.FONT_STYLE_MASK */) >>> 11 /* MetadataConsts.FONT_STYLE_OFFSET */;
    }
    static getForeground(metadata) {
        return (metadata & 16744448 /* MetadataConsts.FOREGROUND_MASK */) >>> 15 /* MetadataConsts.FOREGROUND_OFFSET */;
    }
    static getBackground(metadata) {
        return (metadata & 4278190080 /* MetadataConsts.BACKGROUND_MASK */) >>> 24 /* MetadataConsts.BACKGROUND_OFFSET */;
    }
    static getClassNameFromMetadata(metadata) {
        const foreground = this.getForeground(metadata);
        let className = 'mtk' + foreground;
        const fontStyle = this.getFontStyle(metadata);
        if (fontStyle & 1 /* FontStyle.Italic */) {
            className += ' mtki';
        }
        if (fontStyle & 2 /* FontStyle.Bold */) {
            className += ' mtkb';
        }
        if (fontStyle & 4 /* FontStyle.Underline */) {
            className += ' mtku';
        }
        if (fontStyle & 8 /* FontStyle.Strikethrough */) {
            className += ' mtks';
        }
        return className;
    }
    static getInlineStyleFromMetadata(metadata, colorMap) {
        const foreground = this.getForeground(metadata);
        const fontStyle = this.getFontStyle(metadata);
        let result = `color: ${colorMap[foreground]};`;
        if (fontStyle & 1 /* FontStyle.Italic */) {
            result += 'font-style: italic;';
        }
        if (fontStyle & 2 /* FontStyle.Bold */) {
            result += 'font-weight: bold;';
        }
        let textDecoration = '';
        if (fontStyle & 4 /* FontStyle.Underline */) {
            textDecoration += ' underline';
        }
        if (fontStyle & 8 /* FontStyle.Strikethrough */) {
            textDecoration += ' line-through';
        }
        if (textDecoration) {
            result += `text-decoration:${textDecoration};`;
        }
        return result;
    }
    static getPresentationFromMetadata(metadata) {
        const foreground = this.getForeground(metadata);
        const fontStyle = this.getFontStyle(metadata);
        return {
            foreground: foreground,
            italic: Boolean(fontStyle & 1 /* FontStyle.Italic */),
            bold: Boolean(fontStyle & 2 /* FontStyle.Bold */),
            underline: Boolean(fontStyle & 4 /* FontStyle.Underline */),
            strikethrough: Boolean(fontStyle & 8 /* FontStyle.Strikethrough */),
        };
    }
}


}),
2728: (function (__unused_webpack_module, __webpack_exports__, __webpack_require__) {
__webpack_require__.r(__webpack_exports__);
__webpack_require__.d(__webpack_exports__, {
  ILanguageService: () => (ILanguageService)
});
/* ESM import */var _platform_instantiation_common_instantiation_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(2697);
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

const ILanguageService = (0,_platform_instantiation_common_instantiation_js__WEBPACK_IMPORTED_MODULE_0__.createDecorator)('languageService');


}),

}]);
//# sourceMappingURL=17.js.map