"use strict";
(self["webpackChunk_flowgram_ai_demo_free_layout"] = self["webpackChunk_flowgram_ai_demo_free_layout"] || []).push([["45"], {
3706: (function (__unused_webpack_module, __webpack_exports__, __webpack_require__) {
__webpack_require__.r(__webpack_exports__);
__webpack_require__.d(__webpack_exports__, {
  DiagnosticSeverity: () => (/* reexport safe */ vscode_json_languageservice__WEBPACK_IMPORTED_MODULE_0__.DiagnosticSeverity),
  JSONLanguageService: () => (JSONLanguageService),
  Text: () => (/* reexport safe */ text_mapping__WEBPACK_IMPORTED_MODULE_1__.Text),
  json: () => (json),
  jsonLanguage: () => (jsonLanguage),
  jsonLanguageService: () => (jsonLanguageService)
});
/* ESM import */var vscode_uri__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(3707);
/* ESM import */var vscode_json_languageservice__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(3708);
/* ESM import */var text_mapping__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(2457);
/* ESM import */var _lukeed_uuid__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(3729);
/* ESM import */var _coze_editor_parser_json__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(3730);
/* ESM import */var _coze_editor_code_language_shared__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(2441);
/* ESM import */var _coze_editor_lezer_parser_json__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(3731);
/* ESM import */var _codemirror_language__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(2424);
// src/index.ts







// src/json.ts


var jsonLanguage = _codemirror_language__WEBPACK_IMPORTED_MODULE_3__.LRLanguage.define({
  name: "json",
  parser: _coze_editor_lezer_parser_json__WEBPACK_IMPORTED_MODULE_4__.parser.configure({
    props: [
      _codemirror_language__WEBPACK_IMPORTED_MODULE_3__.indentNodeProp.add({
        Object: (0,_codemirror_language__WEBPACK_IMPORTED_MODULE_3__.continuedIndent)({ except: /^\s*\}/ }),
        Array: (0,_codemirror_language__WEBPACK_IMPORTED_MODULE_3__.continuedIndent)({ except: /^\s*\]/ })
      }),
      _codemirror_language__WEBPACK_IMPORTED_MODULE_3__.foldNodeProp.add({
        "Object Array": _codemirror_language__WEBPACK_IMPORTED_MODULE_3__.foldInside
      })
    ]
  }),
  languageData: {
    closeBrackets: { brackets: ["[", "{", '"', "'"] },
    indentOnInput: /^\s*[\}\]]$/
  }
});

// src/index.ts
function normalizeId(id) {
  try {
    return vscode_uri__WEBPACK_IMPORTED_MODULE_5__.URI.parse(id).toString(true);
  } catch (e) {
    return id;
  }
}
function isNonNull(value) {
  return Boolean(value);
}
var urlReg = /^(https?:\/\/|www\.)[\w-\.]+\.[\w-\.]+(\/([\S]+)?)?$/i;
var JSONLanguageService = class {
  constructor(options) {
    this.options = options;
    this.languageService = (0,vscode_json_languageservice__WEBPACK_IMPORTED_MODULE_0__.getLanguageService)({});
    this.configure();
  }
  languageService;
  schemasConfigurations = [];
  triggerCharacters = [":", '"', "'"];
  configure() {
    this.languageService.configure({
      allowComments: false,
      schemas: this.schemasConfigurations.map((e) => ({
        fileMatch: e.fileMatch,
        uri: normalizeId(e.uri),
        schema: e.schema
      }))
    });
  }
  parseJSONDocument(textDocument) {
    const text = (0,_coze_editor_parser_json__WEBPACK_IMPORTED_MODULE_6__.parse)(textDocument, { collectComments: true });
    if (!text.ast) {
      return;
    }
    const jsonDocument = this.languageService.newJSONDocument(
      text.ast,
      text.problems
    );
    jsonDocument.comments = text.commentRanges;
    return jsonDocument;
  }
  async validate(source, options) {
    let text = new text_mapping__WEBPACK_IMPORTED_MODULE_1__.Text(source);
    if (typeof (options == null ? void 0 : options.transform) === "function") {
      text = options.transform(text);
    }
    const textDocument = vscode_json_languageservice__WEBPACK_IMPORTED_MODULE_0__.TextDocument.create(
      `file:///anonymous-${(0,_lukeed_uuid__WEBPACK_IMPORTED_MODULE_2__.v4)()}.json`,
      "json",
      0,
      text.toString()
    );
    const jsonDocument = this.parseJSONDocument(textDocument);
    if (!jsonDocument) {
      return [];
    }
    const diagnostics = await this.languageService.doValidation(
      textDocument,
      jsonDocument,
      {},
      options == null ? void 0 : options.schema
    );
    return diagnostics.map((e) => {
      const from = textDocument.offsetAt(e.range.start);
      const to = textDocument.offsetAt(e.range.end);
      return {
        from,
        to,
        severity: e.severity,
        message: e.message
      };
    }).map((e) => {
      const oRange = text.originalRangeFor({
        from: e.from,
        to: e.to
      });
      if (!oRange) {
        return;
      }
      return {
        ...e,
        ...oRange
      };
    }).filter(isNonNull);
  }
  configureSchemas(config) {
    let configs = [];
    configs = configs.concat(config);
    configs.forEach((c) => {
      const match = this.schemasConfigurations.find((e) => e.uri === c.uri);
      if (match) {
        match.schema = c.schema;
        match.fileMatch = c.fileMatch;
      } else {
        this.schemasConfigurations.push(c);
      }
    });
    this.configure();
  }
  deleteSchemas(uri) {
    let allURI = [];
    allURI = allURI.concat(uri);
    this.schemasConfigurations = this.schemasConfigurations.filter(
      (c) => !allURI.includes(c.uri)
    );
    this.configure();
  }
  async doValidation(context) {
    const { textDocument } = context;
    const jsonDocument = this.parseJSONDocument(textDocument);
    if (!jsonDocument) {
      return [];
    }
    const diagnostics = await this.languageService.doValidation(
      textDocument,
      jsonDocument
    );
    return diagnostics.map((e) => {
      const from = textDocument.offsetAt(e.range.start);
      const to = textDocument.offsetAt(e.range.end);
      return {
        from,
        to,
        severity: "error",
        message: e.message
      };
    });
  }
  async format(state, options) {
    const { textDocument, originalRangeFor } = state.field(_coze_editor_code_language_shared__WEBPACK_IMPORTED_MODULE_7__.textDocumentField);
    const edits = this.languageService.format(
      textDocument,
      // @ts-expect-error range can be undefined
      void 0,
      {
        tabSize: (options == null ? void 0 : options.tabSize) ?? 4,
        insertSpaces: true,
        insertFinalNewline: false
      }
    );
    const changes = edits.map((edit) => {
      const range = originalRangeFor({
        from: textDocument.offsetAt(edit.range.start),
        to: textDocument.offsetAt(edit.range.end)
      });
      if (range) {
        return {
          ...range,
          insert: edit.newText
        };
      }
    }).filter((v) => isChangeDesc(v));
    return {
      changes
    };
  }
  async doComplete(context) {
    const { textDocument } = context;
    const { offset } = context;
    const { line, character } = textDocument.positionAt(offset);
    const jsonDocument = this.parseJSONDocument(textDocument);
    if (!jsonDocument) {
      return;
    }
    const completionResult = await this.languageService.doComplete(
      textDocument,
      {
        line,
        character
      },
      jsonDocument
    );
    if (!completionResult || !completionResult.items.length) {
      return;
    }
    return {
      isIncomplete: true,
      items: completionResult.items
    };
  }
  async findLinks(context) {
    const { textDocument } = context;
    const doc = this.parseJSONDocument(textDocument);
    if (!doc) {
      return [];
    }
    const links = [];
    doc.visit((node) => {
      if (node.type === "string" && urlReg.test(node.value)) {
        const range = {
          from: node.offset + 1,
          to: node.offset + node.length - 1
        };
        links.push({
          target: node.value,
          range
        });
      }
      return true;
    });
    return links;
  }
};
function isChangeDesc(v) {
  return Boolean(v);
}
var jsonLanguageService = new JSONLanguageService({
  lintDelay: 0
});
var json = {
  language: jsonLanguage,
  languageService: jsonLanguageService
};

//# sourceMappingURL=index.js.map

}),
3705: (function (__unused_webpack_module, __webpack_exports__, __webpack_require__) {
__webpack_require__.r(__webpack_exports__);
__webpack_require__.d(__webpack_exports__, {
  DiagnosticSeverity: () => (/* reexport safe */ _coze_editor_code_language_json__WEBPACK_IMPORTED_MODULE_0__.DiagnosticSeverity),
  JSONLanguageService: () => (/* reexport safe */ _coze_editor_code_language_json__WEBPACK_IMPORTED_MODULE_0__.JSONLanguageService),
  Text: () => (/* reexport safe */ _coze_editor_code_language_json__WEBPACK_IMPORTED_MODULE_0__.Text),
  json: () => (/* reexport safe */ _coze_editor_code_language_json__WEBPACK_IMPORTED_MODULE_0__.json),
  jsonLanguage: () => (/* reexport safe */ _coze_editor_code_language_json__WEBPACK_IMPORTED_MODULE_0__.jsonLanguage),
  jsonLanguageService: () => (/* reexport safe */ _coze_editor_code_language_json__WEBPACK_IMPORTED_MODULE_0__.jsonLanguageService)
});
/* ESM import */var _coze_editor_code_language_json__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(3706);
// src/language-json.ts

//# sourceMappingURL=language-json.js.map

}),
3732: (function (__unused_webpack_module, __webpack_exports__, __webpack_require__) {
__webpack_require__.r(__webpack_exports__);
__webpack_require__.d(__webpack_exports__, {
  jsonHighlighting: () => (jsonHighlighting)
});
/* ESM import */var _lezer_highlight__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(2425);
//  Copyright (c) 2025 coze-dev
//  SPDX-License-Identifier: MIT



const jsonHighlighting = (0,_lezer_highlight__WEBPACK_IMPORTED_MODULE_0__.styleTags)({
  String: _lezer_highlight__WEBPACK_IMPORTED_MODULE_0__.tags.string,
  Number: _lezer_highlight__WEBPACK_IMPORTED_MODULE_0__.tags.number,
  'True False': _lezer_highlight__WEBPACK_IMPORTED_MODULE_0__.tags.bool,
  PropertyName: _lezer_highlight__WEBPACK_IMPORTED_MODULE_0__.tags.propertyName,
  Null: _lezer_highlight__WEBPACK_IMPORTED_MODULE_0__.tags["null"],
  ', :': _lezer_highlight__WEBPACK_IMPORTED_MODULE_0__.tags.separator,
  '[ ]': _lezer_highlight__WEBPACK_IMPORTED_MODULE_0__.tags.squareBracket,
  '{ }': _lezer_highlight__WEBPACK_IMPORTED_MODULE_0__.tags.brace,
})

}),
3731: (function (__unused_webpack_module, __webpack_exports__, __webpack_require__) {
__webpack_require__.r(__webpack_exports__);
__webpack_require__.d(__webpack_exports__, {
  parser: () => (parser)
});
/* ESM import */var _lezer_lr__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(2427);
/* ESM import */var _highlight__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(3732);
// This file was generated by lezer-generator. You probably shouldn't edit it.


const parser = _lezer_lr__WEBPACK_IMPORTED_MODULE_0__.LRParser.deserialize({
  version: 14,
  states: "$bOVQPOOOOQO'#Cb'#CbOnQPO'#CeOvQPO'#ClOOQO'#Cr'#CrQOQPOOOOQO'#Cg'#CgO}QPO'#CfO!SQPO'#CtOOQO,59P,59PO![QPO,59PO!aQPO'#CuOOQO,59W,59WO!iQPO,59WOVQPO,59QOqQPO'#CmO!nQPO,59`OOQO1G.k1G.kOVQPO'#CnO!vQPO,59aOOQO1G.r1G.rOOQO1G.l1G.lOOQO,59X,59XOOQO-E6k-E6kOOQO,59Y,59YOOQO-E6l-E6l",
  stateData: "#O~OeOS~OQSORSOSSOTSOWQO_ROgPO~OVXOgUO~O^[O~PVO[^O~O]_OVhX~OVaO~O]bO^iX~O^dO~O]_OVha~O]bO^ia~O",
  goto: "!kjPPPPPPkPPkqwPPPPk{!RPPP!XP!e!hXSOR^bQWQRf_TVQ_Q`WRg`QcZRicQTOQZRQe^RhbRYQR]R",
  nodeNames: "⚠ JsonText True False Null Number String } { Object Property PropertyName : , ] [ Array",
  maxTerm: 25,
  nodeProps: [
    ["isolate", -2,6,11,""],
    ["openedBy", 7,"{",14,"["],
    ["closedBy", 8,"}",15,"]"]
  ],
  propSources: [_highlight__WEBPACK_IMPORTED_MODULE_1__.jsonHighlighting],
  skippedNodes: [0],
  repeatNodeCount: 2,
  tokenData: "(|~RaXY!WYZ!W]^!Wpq!Wrs!]|}$u}!O$z!Q!R%T!R![&c![!]&t!}#O&y#P#Q'O#Y#Z'T#b#c'r#h#i(Z#o#p(r#q#r(w~!]Oe~~!`Wpq!]qr!]rs!xs#O!]#O#P!}#P;'S!];'S;=`$o<%lO!]~!}Og~~#QXrs!]!P!Q!]#O#P!]#U#V!]#Y#Z!]#b#c!]#f#g!]#h#i!]#i#j#m~#pR!Q![#y!c!i#y#T#Z#y~#|R!Q![$V!c!i$V#T#Z$V~$YR!Q![$c!c!i$c#T#Z$c~$fR!Q![!]!c!i!]#T#Z!]~$rP;=`<%l!]~$zO]~~$}Q!Q!R%T!R![&c~%YRT~!O!P%c!g!h%w#X#Y%w~%fP!Q![%i~%nRT~!Q![%i!g!h%w#X#Y%w~%zR{|&T}!O&T!Q![&Z~&WP!Q![&Z~&`PT~!Q![&Z~&hST~!O!P%c!Q![&c!g!h%w#X#Y%w~&yO[~~'OO_~~'TO^~~'WP#T#U'Z~'^P#`#a'a~'dP#g#h'g~'jP#X#Y'm~'rOR~~'uP#i#j'x~'{P#`#a(O~(RP#`#a(U~(ZOS~~(^P#f#g(a~(dP#i#j(g~(jP#X#Y(m~(rOQ~~(wOW~~(|OV~",
  tokenizers: [0],
  topRules: {"JsonText":[0,1]},
  tokenPrec: 0
})


}),
3730: (function (__unused_webpack_module, __webpack_exports__, __webpack_require__) {
__webpack_require__.r(__webpack_exports__);
__webpack_require__.d(__webpack_exports__, {
  ErrorCode: () => (ErrorCode),
  findNodeAtOffset: () => (findNodeAtOffset),
  parse: () => (parse)
});
/* ESM import */var vscode_languageserver_types__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(2442);
/* ESM import */var _vscode_l10n__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(3714);
// src/parser.ts



// src/scanner.ts
function createScanner(text, ignoreTrivia = false) {
  const len = text.length;
  let pos = 0, value = "", tokenOffset = 0, token = 16 /* Unknown */, lineNumber = 0, lineStartOffset = 0, tokenLineStartOffset = 0, prevTokenLineStartOffset = 0, scanError = 0 /* None */;
  function scanHexDigits(count, exact) {
    let digits = 0;
    let value2 = 0;
    while (digits < count || !exact) {
      const ch = text.charCodeAt(pos);
      if (ch >= 48 /* _0 */ && ch <= 57 /* _9 */) {
        value2 = value2 * 16 + ch - 48 /* _0 */;
      } else if (ch >= 65 /* A */ && ch <= 70 /* F */) {
        value2 = value2 * 16 + ch - 65 /* A */ + 10;
      } else if (ch >= 97 /* a */ && ch <= 102 /* f */) {
        value2 = value2 * 16 + ch - 97 /* a */ + 10;
      } else {
        break;
      }
      pos++;
      digits++;
    }
    if (digits < count) {
      value2 = -1;
    }
    return value2;
  }
  function setPosition(newPosition) {
    pos = newPosition;
    value = "";
    tokenOffset = 0;
    token = 16 /* Unknown */;
    scanError = 0 /* None */;
  }
  function scanNumber() {
    const start = pos;
    if (text.charCodeAt(pos) === 48 /* _0 */) {
      pos++;
    } else {
      pos++;
      while (pos < text.length && isDigit(text.charCodeAt(pos))) {
        pos++;
      }
    }
    if (pos < text.length && text.charCodeAt(pos) === 46 /* dot */) {
      pos++;
      if (pos < text.length && isDigit(text.charCodeAt(pos))) {
        pos++;
        while (pos < text.length && isDigit(text.charCodeAt(pos))) {
          pos++;
        }
      } else {
        scanError = 3 /* UnexpectedEndOfNumber */;
        return text.substring(start, pos);
      }
    }
    let end = pos;
    if (pos < text.length && (text.charCodeAt(pos) === 69 /* E */ || text.charCodeAt(pos) === 101 /* e */)) {
      pos++;
      if (pos < text.length && text.charCodeAt(pos) === 43 /* plus */ || text.charCodeAt(pos) === 45 /* minus */) {
        pos++;
      }
      if (pos < text.length && isDigit(text.charCodeAt(pos))) {
        pos++;
        while (pos < text.length && isDigit(text.charCodeAt(pos))) {
          pos++;
        }
        end = pos;
      } else {
        scanError = 3 /* UnexpectedEndOfNumber */;
      }
    }
    return text.substring(start, end);
  }
  function scanString(endQuote) {
    let result = "", start = pos;
    while (true) {
      if (pos >= len) {
        result += text.substring(start, pos);
        scanError = 2 /* UnexpectedEndOfString */;
        break;
      }
      const ch = text.charCodeAt(pos);
      if (ch === endQuote) {
        result += text.substring(start, pos);
        pos++;
        break;
      }
      if (ch === 92 /* backslash */) {
        result += text.substring(start, pos);
        pos++;
        if (pos >= len) {
          scanError = 2 /* UnexpectedEndOfString */;
          break;
        }
        const ch2 = text.charCodeAt(pos++);
        switch (ch2) {
          case 34 /* doubleQuote */:
            result += '"';
            break;
          case 39 /* singleQuote */:
            result += `'`;
            break;
          case 92 /* backslash */:
            result += "\\";
            break;
          case 47 /* slash */:
            result += "/";
            break;
          case 98 /* b */:
            result += "\b";
            break;
          case 102 /* f */:
            result += "\f";
            break;
          case 110 /* n */:
            result += "\n";
            break;
          case 114 /* r */:
            result += "\r";
            break;
          case 116 /* t */:
            result += "	";
            break;
          case 117 /* u */:
            const ch3 = scanHexDigits(4, true);
            if (ch3 >= 0) {
              result += String.fromCharCode(ch3);
            } else {
              scanError = 4 /* InvalidUnicode */;
            }
            break;
          default:
            scanError = 5 /* InvalidEscapeCharacter */;
        }
        start = pos;
        continue;
      }
      if (ch >= 0 && ch <= 31) {
        if (isLineBreak(ch)) {
          result += text.substring(start, pos);
          scanError = 2 /* UnexpectedEndOfString */;
          break;
        } else {
          scanError = 6 /* InvalidCharacter */;
        }
      }
      pos++;
    }
    return result;
  }
  function scanNext() {
    value = "";
    scanError = 0 /* None */;
    tokenOffset = pos;
    lineStartOffset = lineNumber;
    prevTokenLineStartOffset = tokenLineStartOffset;
    if (pos >= len) {
      tokenOffset = len;
      return token = 17 /* EOF */;
    }
    let code = text.charCodeAt(pos);
    if (isWhiteSpace(code)) {
      do {
        pos++;
        value += String.fromCharCode(code);
        code = text.charCodeAt(pos);
      } while (isWhiteSpace(code));
      return token = 15 /* Trivia */;
    }
    if (isLineBreak(code)) {
      pos++;
      value += String.fromCharCode(code);
      if (code === 13 /* carriageReturn */ && text.charCodeAt(pos) === 10 /* lineFeed */) {
        pos++;
        value += "\n";
      }
      lineNumber++;
      tokenLineStartOffset = pos;
      return token = 14 /* LineBreakTrivia */;
    }
    switch (code) {
      // tokens: []{}:,
      case 123 /* openBrace */:
        pos++;
        return token = 1 /* OpenBraceToken */;
      case 125 /* closeBrace */:
        pos++;
        return token = 2 /* CloseBraceToken */;
      case 91 /* openBracket */:
        pos++;
        return token = 3 /* OpenBracketToken */;
      case 93 /* closeBracket */:
        pos++;
        return token = 4 /* CloseBracketToken */;
      case 58 /* colon */:
        pos++;
        return token = 6 /* ColonToken */;
      case 44 /* comma */:
        pos++;
        return token = 5 /* CommaToken */;
      // strings
      case 34 /* doubleQuote */:
        pos++;
        value = scanString(34 /* doubleQuote */);
        return token = 19 /* DoubleQuoteStringLiteral */;
      case 39 /* singleQuote */:
        pos++;
        value = scanString(39 /* singleQuote */);
        return token = 18 /* SingleQuoteStringLiteral */;
      // comments
      case 47 /* slash */:
        const start = pos - 1;
        if (text.charCodeAt(pos + 1) === 47 /* slash */) {
          pos += 2;
          while (pos < len) {
            if (isLineBreak(text.charCodeAt(pos))) {
              break;
            }
            pos++;
          }
          value = text.substring(start, pos);
          return token = 12 /* LineCommentTrivia */;
        }
        if (text.charCodeAt(pos + 1) === 42 /* asterisk */) {
          pos += 2;
          const safeLength = len - 1;
          let commentClosed = false;
          while (pos < safeLength) {
            const ch = text.charCodeAt(pos);
            if (ch === 42 /* asterisk */ && text.charCodeAt(pos + 1) === 47 /* slash */) {
              pos += 2;
              commentClosed = true;
              break;
            }
            pos++;
            if (isLineBreak(ch)) {
              if (ch === 13 /* carriageReturn */ && text.charCodeAt(pos) === 10 /* lineFeed */) {
                pos++;
              }
              lineNumber++;
              tokenLineStartOffset = pos;
            }
          }
          if (!commentClosed) {
            pos++;
            scanError = 1 /* UnexpectedEndOfComment */;
          }
          value = text.substring(start, pos);
          return token = 13 /* BlockCommentTrivia */;
        }
        value += String.fromCharCode(code);
        pos++;
        return token = 16 /* Unknown */;
      // numbers
      // @ts-ignore
      case 45 /* minus */:
        value += String.fromCharCode(code);
        pos++;
        if (pos === len || !isDigit(text.charCodeAt(pos))) {
          return token = 16 /* Unknown */;
        }
      // found a minus, followed by a number so
      // we fall through to proceed with scanning
      // numbers
      case 48 /* _0 */:
      case 49 /* _1 */:
      case 50 /* _2 */:
      case 51 /* _3 */:
      case 52 /* _4 */:
      case 53 /* _5 */:
      case 54 /* _6 */:
      case 55 /* _7 */:
      case 56 /* _8 */:
      case 57 /* _9 */:
        value += scanNumber();
        return token = 11 /* NumericLiteral */;
      // literals and unknown symbols
      default:
        while (pos < len && isUnknownContentCharacter(code)) {
          pos++;
          code = text.charCodeAt(pos);
        }
        if (tokenOffset !== pos) {
          value = text.substring(tokenOffset, pos);
          switch (value) {
            case "true":
              return token = 8 /* TrueKeyword */;
            case "false":
              return token = 9 /* FalseKeyword */;
            case "null":
              return token = 7 /* NullKeyword */;
          }
          return token = 16 /* Unknown */;
        }
        value += String.fromCharCode(code);
        pos++;
        return token = 16 /* Unknown */;
    }
  }
  function isUnknownContentCharacter(code) {
    if (isWhiteSpace(code) || isLineBreak(code)) {
      return false;
    }
    switch (code) {
      case 125 /* closeBrace */:
      case 93 /* closeBracket */:
      case 123 /* openBrace */:
      case 91 /* openBracket */:
      case 34 /* doubleQuote */:
      case 58 /* colon */:
      case 44 /* comma */:
      case 47 /* slash */:
        return false;
    }
    return true;
  }
  function scanNextNonTrivia() {
    let result;
    do {
      result = scanNext();
    } while (result >= 12 /* LineCommentTrivia */ && result <= 15 /* Trivia */);
    return result;
  }
  return {
    setPosition,
    getPosition: () => pos,
    scan: ignoreTrivia ? scanNextNonTrivia : scanNext,
    getToken: () => token,
    getTokenValue: () => value,
    getTokenOffset: () => tokenOffset,
    getTokenLength: () => pos - tokenOffset,
    getTokenStartLine: () => lineStartOffset,
    getTokenStartCharacter: () => tokenOffset - prevTokenLineStartOffset,
    getTokenError: () => scanError
  };
}
function isWhiteSpace(ch) {
  return ch === 32 /* space */ || ch === 9 /* tab */;
}
function isLineBreak(ch) {
  return ch === 10 /* lineFeed */ || ch === 13 /* carriageReturn */;
}
function isDigit(ch) {
  return ch >= 48 /* _0 */ && ch <= 57 /* _9 */;
}

// src/is.ts
function isNumber(val) {
  return typeof val === "number";
}
function isObject(val) {
  return typeof val === "object" && val !== null && !Array.isArray(val);
}

// src/types.ts
var ErrorCode = /* @__PURE__ */ ((ErrorCode2) => {
  ErrorCode2[ErrorCode2["Undefined"] = 0] = "Undefined";
  ErrorCode2[ErrorCode2["EnumValueMismatch"] = 1] = "EnumValueMismatch";
  ErrorCode2[ErrorCode2["Deprecated"] = 2] = "Deprecated";
  ErrorCode2[ErrorCode2["UnexpectedEndOfComment"] = 257] = "UnexpectedEndOfComment";
  ErrorCode2[ErrorCode2["UnexpectedEndOfString"] = 258] = "UnexpectedEndOfString";
  ErrorCode2[ErrorCode2["UnexpectedEndOfNumber"] = 259] = "UnexpectedEndOfNumber";
  ErrorCode2[ErrorCode2["InvalidUnicode"] = 260] = "InvalidUnicode";
  ErrorCode2[ErrorCode2["InvalidEscapeCharacter"] = 261] = "InvalidEscapeCharacter";
  ErrorCode2[ErrorCode2["InvalidCharacter"] = 262] = "InvalidCharacter";
  ErrorCode2[ErrorCode2["PropertyExpected"] = 513] = "PropertyExpected";
  ErrorCode2[ErrorCode2["CommaExpected"] = 514] = "CommaExpected";
  ErrorCode2[ErrorCode2["ColonExpected"] = 515] = "ColonExpected";
  ErrorCode2[ErrorCode2["ValueExpected"] = 516] = "ValueExpected";
  ErrorCode2[ErrorCode2["CommaOrCloseBacketExpected"] = 517] = "CommaOrCloseBacketExpected";
  ErrorCode2[ErrorCode2["CommaOrCloseBraceExpected"] = 518] = "CommaOrCloseBraceExpected";
  ErrorCode2[ErrorCode2["TrailingComma"] = 519] = "TrailingComma";
  ErrorCode2[ErrorCode2["DuplicateKey"] = 520] = "DuplicateKey";
  ErrorCode2[ErrorCode2["CommentNotPermitted"] = 521] = "CommentNotPermitted";
  ErrorCode2[ErrorCode2["PropertyKeysMustBeDoublequoted"] = 528] = "PropertyKeysMustBeDoublequoted";
  ErrorCode2[ErrorCode2["StringValueMustBeDoublequoted"] = 529] = "StringValueMustBeDoublequoted";
  ErrorCode2[ErrorCode2["SchemaResolveError"] = 768] = "SchemaResolveError";
  ErrorCode2[ErrorCode2["SchemaUnsupportedFeature"] = 769] = "SchemaUnsupportedFeature";
  return ErrorCode2;
})(ErrorCode || {});

// src/parser.ts
var ASTNodeImpl = class {
  offset;
  length;
  parent;
  constructor(parent, offset, length = 0) {
    this.offset = offset;
    this.length = length;
    this.parent = parent;
  }
  get children() {
    return [];
  }
  toString() {
    return "type: " + this.type + " (" + this.offset + "/" + this.length + ")" + (this.parent ? " parent: {" + this.parent.toString() + "}" : "");
  }
};
var NullASTNodeImpl = class extends ASTNodeImpl {
  type = "null";
  value = null;
  constructor(parent, offset) {
    super(parent, offset);
  }
};
var BooleanASTNodeImpl = class extends ASTNodeImpl {
  type = "boolean";
  value;
  constructor(parent, boolValue, offset) {
    super(parent, offset);
    this.value = boolValue;
  }
};
var ArrayASTNodeImpl = class extends ASTNodeImpl {
  type = "array";
  items;
  constructor(parent, offset) {
    super(parent, offset);
    this.items = [];
  }
  get children() {
    return this.items;
  }
};
var NumberASTNodeImpl = class extends ASTNodeImpl {
  type = "number";
  isInteger;
  value;
  constructor(parent, offset) {
    super(parent, offset);
    this.isInteger = true;
    this.value = Number.NaN;
  }
};
var StringASTNodeImpl = class extends ASTNodeImpl {
  type = "string";
  value;
  constructor(parent, offset, length) {
    super(parent, offset, length);
    this.value = "";
  }
};
var PropertyASTNodeImpl = class extends ASTNodeImpl {
  type = "property";
  keyNode;
  valueNode;
  colonOffset;
  constructor(parent, offset, keyNode) {
    super(parent, offset);
    this.colonOffset = -1;
    this.keyNode = keyNode;
  }
  get children() {
    return this.valueNode ? [this.keyNode, this.valueNode] : [this.keyNode];
  }
};
var ObjectASTNodeImpl = class extends ASTNodeImpl {
  type = "object";
  properties;
  constructor(parent, offset) {
    super(parent, offset);
    this.properties = [];
  }
  get children() {
    return this.properties;
  }
};
function parse(textDocument, config) {
  const problems = [];
  let lastProblemOffset = -1;
  const text = textDocument.getText();
  const scanner = createScanner(text, false);
  const commentRanges = config && config.collectComments ? [] : void 0;
  function _scanNext() {
    while (true) {
      const token2 = scanner.scan();
      _checkScanError();
      switch (token2) {
        case 12 /* LineCommentTrivia */:
        case 13 /* BlockCommentTrivia */:
          if (Array.isArray(commentRanges)) {
            commentRanges.push(vscode_languageserver_types__WEBPACK_IMPORTED_MODULE_0__.Range.create(textDocument.positionAt(scanner.getTokenOffset()), textDocument.positionAt(scanner.getTokenOffset() + scanner.getTokenLength())));
          }
          break;
        case 15 /* Trivia */:
        case 14 /* LineBreakTrivia */:
          break;
        default:
          return token2;
      }
    }
  }
  function _accept(token2) {
    if (scanner.getToken() === token2) {
      _scanNext();
      return true;
    }
    return false;
  }
  function _errorAtRange(message, code, startOffset, endOffset, severity = vscode_languageserver_types__WEBPACK_IMPORTED_MODULE_0__.DiagnosticSeverity.Error) {
    if (problems.length === 0 || startOffset !== lastProblemOffset) {
      const range = vscode_languageserver_types__WEBPACK_IMPORTED_MODULE_0__.Range.create(textDocument.positionAt(startOffset), textDocument.positionAt(endOffset));
      problems.push(vscode_languageserver_types__WEBPACK_IMPORTED_MODULE_0__.Diagnostic.create(range, message, severity, code, textDocument.languageId));
      lastProblemOffset = startOffset;
    }
  }
  function _error(message, code, node = void 0, skipUntilAfter = [], skipUntil = []) {
    let start = scanner.getTokenOffset();
    let end = scanner.getTokenOffset() + scanner.getTokenLength();
    if (start === end && start > 0) {
      start--;
      while (start > 0 && /\s/.test(text.charAt(start))) {
        start--;
      }
      end = start + 1;
    }
    _errorAtRange(message, code, start, end);
    if (node) {
      _finalize(node, false);
    }
    if (skipUntilAfter.length + skipUntil.length > 0) {
      let token2 = scanner.getToken();
      while (token2 !== 17 /* EOF */) {
        if (skipUntilAfter.indexOf(token2) !== -1) {
          _scanNext();
          break;
        } else if (skipUntil.indexOf(token2) !== -1) {
          break;
        }
        token2 = _scanNext();
      }
    }
    return node;
  }
  function _checkScanError() {
    switch (scanner.getTokenError()) {
      case 4 /* InvalidUnicode */:
        _error(_vscode_l10n__WEBPACK_IMPORTED_MODULE_1__.t("Invalid unicode sequence in string."), 260 /* InvalidUnicode */);
        return true;
      case 5 /* InvalidEscapeCharacter */:
        _error(_vscode_l10n__WEBPACK_IMPORTED_MODULE_1__.t("Invalid escape character in string."), 261 /* InvalidEscapeCharacter */);
        return true;
      case 3 /* UnexpectedEndOfNumber */:
        _error(_vscode_l10n__WEBPACK_IMPORTED_MODULE_1__.t("Unexpected end of number."), 259 /* UnexpectedEndOfNumber */);
        return true;
      case 1 /* UnexpectedEndOfComment */:
        _error(_vscode_l10n__WEBPACK_IMPORTED_MODULE_1__.t("Unexpected end of comment."), 257 /* UnexpectedEndOfComment */);
        return true;
      case 2 /* UnexpectedEndOfString */:
        _error(_vscode_l10n__WEBPACK_IMPORTED_MODULE_1__.t("Unexpected end of string."), 258 /* UnexpectedEndOfString */);
        return true;
      case 6 /* InvalidCharacter */:
        _error(_vscode_l10n__WEBPACK_IMPORTED_MODULE_1__.t("Invalid characters in string. Control characters must be escaped."), 262 /* InvalidCharacter */);
        return true;
    }
    return false;
  }
  function _finalize(node, scanNext) {
    node.length = scanner.getTokenOffset() + scanner.getTokenLength() - node.offset;
    if (scanNext) {
      _scanNext();
    }
    return node;
  }
  function _parseArray(parent) {
    if (scanner.getToken() !== 3 /* OpenBracketToken */) {
      return void 0;
    }
    const node = new ArrayASTNodeImpl(parent, scanner.getTokenOffset());
    _scanNext();
    const count = 0;
    let needsComma = false;
    while (scanner.getToken() !== 4 /* CloseBracketToken */ && scanner.getToken() !== 17 /* EOF */) {
      if (scanner.getToken() === 5 /* CommaToken */) {
        if (!needsComma) {
          _error(_vscode_l10n__WEBPACK_IMPORTED_MODULE_1__.t("Value expected"), 516 /* ValueExpected */);
        }
        const commaOffset = scanner.getTokenOffset();
        _scanNext();
        if (scanner.getToken() === 4 /* CloseBracketToken */) {
          if (needsComma) {
            _errorAtRange(_vscode_l10n__WEBPACK_IMPORTED_MODULE_1__.t("Trailing comma"), 519 /* TrailingComma */, commaOffset, commaOffset + 1);
          }
          continue;
        }
      } else if (needsComma) {
        _error(_vscode_l10n__WEBPACK_IMPORTED_MODULE_1__.t("Expected comma"), 514 /* CommaExpected */);
      }
      const item = _parseValue(node);
      if (!item) {
        _error(_vscode_l10n__WEBPACK_IMPORTED_MODULE_1__.t("Value expected"), 516 /* ValueExpected */, void 0, [], [4 /* CloseBracketToken */, 5 /* CommaToken */]);
      } else {
        node.items.push(item);
      }
      needsComma = true;
    }
    if (scanner.getToken() !== 4 /* CloseBracketToken */) {
      return _error(_vscode_l10n__WEBPACK_IMPORTED_MODULE_1__.t("Expected comma or closing bracket"), 517 /* CommaOrCloseBacketExpected */, node);
    }
    return _finalize(node, true);
  }
  const keyPlaceholder = new StringASTNodeImpl(void 0, 0, 0);
  function _parseProperty(parent, keysSeen) {
    const node = new PropertyASTNodeImpl(parent, scanner.getTokenOffset(), keyPlaceholder);
    let key = _parseString(node);
    if (!key) {
      if (scanner.getToken() === 16 /* Unknown */) {
        _error(_vscode_l10n__WEBPACK_IMPORTED_MODULE_1__.t("Property keys must be doublequoted"), 528 /* PropertyKeysMustBeDoublequoted */);
        const keyNode = new StringASTNodeImpl(node, scanner.getTokenOffset(), scanner.getTokenLength());
        keyNode.value = scanner.getTokenValue();
        key = keyNode;
        _scanNext();
      } else {
        return void 0;
      }
    }
    node.keyNode = key;
    if (key.value !== "//") {
      const seen = keysSeen[key.value];
      if (seen) {
        _errorAtRange(_vscode_l10n__WEBPACK_IMPORTED_MODULE_1__.t("Duplicate object key"), 520 /* DuplicateKey */, node.keyNode.offset, node.keyNode.offset + node.keyNode.length, vscode_languageserver_types__WEBPACK_IMPORTED_MODULE_0__.DiagnosticSeverity.Warning);
        if (isObject(seen)) {
          _errorAtRange(_vscode_l10n__WEBPACK_IMPORTED_MODULE_1__.t("Duplicate object key"), 520 /* DuplicateKey */, seen.keyNode.offset, seen.keyNode.offset + seen.keyNode.length, vscode_languageserver_types__WEBPACK_IMPORTED_MODULE_0__.DiagnosticSeverity.Warning);
        }
        keysSeen[key.value] = true;
      } else {
        keysSeen[key.value] = node;
      }
    }
    if (scanner.getToken() === 6 /* ColonToken */) {
      node.colonOffset = scanner.getTokenOffset();
      _scanNext();
    } else {
      _error(_vscode_l10n__WEBPACK_IMPORTED_MODULE_1__.t("Colon expected"), 515 /* ColonExpected */);
      if ((scanner.getToken() === 18 /* SingleQuoteStringLiteral */ || scanner.getToken() === 19 /* DoubleQuoteStringLiteral */) && textDocument.positionAt(key.offset + key.length).line < textDocument.positionAt(scanner.getTokenOffset()).line) {
        node.length = key.length;
        return node;
      }
    }
    const value = _parseValue(node);
    if (!value) {
      return _error(_vscode_l10n__WEBPACK_IMPORTED_MODULE_1__.t("Value expected"), 516 /* ValueExpected */, node, [], [2 /* CloseBraceToken */, 5 /* CommaToken */]);
    }
    node.valueNode = value;
    node.length = value.offset + value.length - node.offset;
    return node;
  }
  function _parseObject(parent) {
    if (scanner.getToken() !== 1 /* OpenBraceToken */) {
      return void 0;
    }
    const node = new ObjectASTNodeImpl(parent, scanner.getTokenOffset());
    const keysSeen = /* @__PURE__ */ Object.create(null);
    _scanNext();
    let needsComma = false;
    while (scanner.getToken() !== 2 /* CloseBraceToken */ && scanner.getToken() !== 17 /* EOF */) {
      if (scanner.getToken() === 5 /* CommaToken */) {
        if (!needsComma) {
          _error(_vscode_l10n__WEBPACK_IMPORTED_MODULE_1__.t("Property expected"), 513 /* PropertyExpected */);
        }
        const commaOffset = scanner.getTokenOffset();
        _scanNext();
        if (scanner.getToken() === 2 /* CloseBraceToken */) {
          if (needsComma) {
            _errorAtRange(_vscode_l10n__WEBPACK_IMPORTED_MODULE_1__.t("Trailing comma"), 519 /* TrailingComma */, commaOffset, commaOffset + 1);
          }
          continue;
        }
      } else if (needsComma) {
        _error(_vscode_l10n__WEBPACK_IMPORTED_MODULE_1__.t("Expected comma"), 514 /* CommaExpected */);
      }
      const property = _parseProperty(node, keysSeen);
      if (!property) {
        _error(_vscode_l10n__WEBPACK_IMPORTED_MODULE_1__.t("Property expected"), 513 /* PropertyExpected */, void 0, [], [2 /* CloseBraceToken */, 5 /* CommaToken */]);
      } else {
        node.properties.push(property);
      }
      needsComma = true;
    }
    if (scanner.getToken() !== 2 /* CloseBraceToken */) {
      return _error(_vscode_l10n__WEBPACK_IMPORTED_MODULE_1__.t("Expected comma or closing brace"), 518 /* CommaOrCloseBraceExpected */, node);
    }
    return _finalize(node, true);
  }
  function _parseString(parent) {
    if (scanner.getToken() !== 18 /* SingleQuoteStringLiteral */ && scanner.getToken() !== 19 /* DoubleQuoteStringLiteral */) {
      return void 0;
    }
    if (scanner.getToken() === 18 /* SingleQuoteStringLiteral */) {
      _error(_vscode_l10n__WEBPACK_IMPORTED_MODULE_1__.t("String value must be doublequoted"), 529 /* StringValueMustBeDoublequoted */);
    }
    const node = new StringASTNodeImpl(parent, scanner.getTokenOffset());
    node.value = scanner.getTokenValue();
    return _finalize(node, true);
  }
  function _parseNumber(parent) {
    if (scanner.getToken() !== 11 /* NumericLiteral */) {
      return void 0;
    }
    const node = new NumberASTNodeImpl(parent, scanner.getTokenOffset());
    if (scanner.getTokenError() === 0 /* None */) {
      const tokenValue = scanner.getTokenValue();
      try {
        const numberValue = JSON.parse(tokenValue);
        if (!isNumber(numberValue)) {
          return _error(_vscode_l10n__WEBPACK_IMPORTED_MODULE_1__.t("Invalid number format."), 0 /* Undefined */, node);
        }
        node.value = numberValue;
      } catch (e) {
        return _error(_vscode_l10n__WEBPACK_IMPORTED_MODULE_1__.t("Invalid number format."), 0 /* Undefined */, node);
      }
      node.isInteger = tokenValue.indexOf(".") === -1;
    }
    return _finalize(node, true);
  }
  function _parseLiteral(parent) {
    let node;
    switch (scanner.getToken()) {
      case 7 /* NullKeyword */:
        return _finalize(new NullASTNodeImpl(parent, scanner.getTokenOffset()), true);
      case 8 /* TrueKeyword */:
        return _finalize(new BooleanASTNodeImpl(parent, true, scanner.getTokenOffset()), true);
      case 9 /* FalseKeyword */:
        return _finalize(new BooleanASTNodeImpl(parent, false, scanner.getTokenOffset()), true);
      default:
        return void 0;
    }
  }
  function _parseValue(parent) {
    return _parseArray(parent) || _parseObject(parent) || _parseString(parent) || _parseNumber(parent) || _parseLiteral(parent);
  }
  let _root = void 0;
  const token = _scanNext();
  if (token !== 17 /* EOF */) {
    _root = _parseValue(_root);
    if (!_root) {
      _error(_vscode_l10n__WEBPACK_IMPORTED_MODULE_1__.t("Expected a JSON object, array or literal."), 0 /* Undefined */);
    } else if (scanner.getToken() !== 17 /* EOF */) {
      _error(_vscode_l10n__WEBPACK_IMPORTED_MODULE_1__.t("End of file expected."), 0 /* Undefined */);
    }
  }
  return {
    // _root is undefined is source is empty string
    ast: _root,
    problems,
    commentRanges
  };
}

// src/helpers.ts
function contains(node, offset, includeRightBound = false) {
  return offset >= node.offset && offset < node.offset + node.length || includeRightBound && offset === node.offset + node.length;
}
function findNodeAtOffset(node, offset, includeRightBound = false) {
  if (contains(node, offset, includeRightBound)) {
    const { children } = node;
    if (Array.isArray(children)) {
      for (let i = 0; i < children.length && children[i].offset <= offset; i++) {
        const item = findNodeAtOffset(children[i], offset, includeRightBound);
        if (item) {
          return item;
        }
      }
    }
    return node;
  }
  return void 0;
}

//# sourceMappingURL=index.js.map

}),
3714: (function (__unused_webpack_module, __webpack_exports__, __webpack_require__) {
__webpack_require__.r(__webpack_exports__);
__webpack_require__.d(__webpack_exports__, {
  config: () => (config),
  t: () => (t)
});
// src/browser/reader.ts
async function readFileFromUri(uri) {
  if (uri.protocol === "http:" || uri.protocol === "https:") {
    const res = await fetch(uri);
    return await res.text();
  }
  throw new Error("Unsupported protocol");
}
function readFileFromFsPath(_) {
  throw new Error("Unsupported in browser");
}

// src/main.ts
var bundle;
function config(config2) {
  if ("contents" in config2) {
    if (typeof config2.contents === "string") {
      bundle = JSON.parse(config2.contents);
    } else {
      bundle = config2.contents;
    }
    return;
  }
  if ("fsPath" in config2) {
    const fileContent = readFileFromFsPath(config2.fsPath);
    const content = JSON.parse(fileContent);
    bundle = isBuiltinExtension(content) ? content.contents.bundle : content;
    return;
  }
  if (config2.uri) {
    let uri = config2.uri;
    if (typeof config2.uri === "string") {
      uri = new URL(config2.uri);
    }
    return new Promise((resolve, reject) => {
      readFileFromUri(uri).then((uriContent) => {
        try {
          const content = JSON.parse(uriContent);
          bundle = isBuiltinExtension(content) ? content.contents.bundle : content;
          resolve();
        } catch (err) {
          reject(err);
        }
      }).catch((err) => {
        reject(err);
      });
    });
  }
}
function t(...args) {
  const firstArg = args[0];
  let key;
  let message;
  let formatArgs;
  if (typeof firstArg === "string") {
    key = firstArg;
    message = firstArg;
    args.splice(0, 1);
    formatArgs = !args || typeof args[0] !== "object" ? args : args[0];
  } else if (firstArg instanceof Array) {
    const replacements = args.slice(1);
    if (firstArg.length !== replacements.length + 1) {
      throw new Error("expected a string as the first argument to l10n.t");
    }
    let str = firstArg[0];
    for (let i = 1; i < firstArg.length; i++) {
      str += `{${i - 1}}` + firstArg[i];
    }
    return t(str, ...replacements);
  } else {
    message = firstArg.message;
    key = message;
    if (firstArg.comment && firstArg.comment.length > 0) {
      key += `/${Array.isArray(firstArg.comment) ? firstArg.comment.join("") : firstArg.comment}`;
    }
    formatArgs = firstArg.args ?? {};
  }
  const messageFromBundle = bundle?.[key];
  if (!messageFromBundle) {
    return format(message, formatArgs);
  }
  if (typeof messageFromBundle === "string") {
    return format(messageFromBundle, formatArgs);
  }
  if (messageFromBundle.comment) {
    return format(messageFromBundle.message, formatArgs);
  }
  return format(message, formatArgs);
}
var _format2Regexp = /{([^}]+)}/g;
function format(template, values) {
  if (Object.keys(values).length === 0) {
    return template;
  }
  return template.replace(_format2Regexp, (match, group) => values[group] ?? match);
}
function isBuiltinExtension(json) {
  return !!(typeof json?.contents?.bundle === "object" && typeof json?.version === "string");
}



}),
3708: (function (__unused_webpack_module, __webpack_exports__, __webpack_require__) {
__webpack_require__.r(__webpack_exports__);
__webpack_require__.d(__webpack_exports__, {
  ClientCapabilities: () => (/* reexport safe */ _jsonLanguageTypes__WEBPACK_IMPORTED_MODULE_12__.ClientCapabilities),
  CodeAction: () => (/* reexport safe */ _jsonLanguageTypes__WEBPACK_IMPORTED_MODULE_12__.CodeAction),
  CodeActionContext: () => (/* reexport safe */ _jsonLanguageTypes__WEBPACK_IMPORTED_MODULE_12__.CodeActionContext),
  CodeActionKind: () => (/* reexport safe */ _jsonLanguageTypes__WEBPACK_IMPORTED_MODULE_12__.CodeActionKind),
  Color: () => (/* reexport safe */ _jsonLanguageTypes__WEBPACK_IMPORTED_MODULE_12__.Color),
  ColorInformation: () => (/* reexport safe */ _jsonLanguageTypes__WEBPACK_IMPORTED_MODULE_12__.ColorInformation),
  ColorPresentation: () => (/* reexport safe */ _jsonLanguageTypes__WEBPACK_IMPORTED_MODULE_12__.ColorPresentation),
  Command: () => (/* reexport safe */ _jsonLanguageTypes__WEBPACK_IMPORTED_MODULE_12__.Command),
  CompletionItem: () => (/* reexport safe */ _jsonLanguageTypes__WEBPACK_IMPORTED_MODULE_12__.CompletionItem),
  CompletionItemKind: () => (/* reexport safe */ _jsonLanguageTypes__WEBPACK_IMPORTED_MODULE_12__.CompletionItemKind),
  CompletionItemTag: () => (/* reexport safe */ _jsonLanguageTypes__WEBPACK_IMPORTED_MODULE_12__.CompletionItemTag),
  CompletionList: () => (/* reexport safe */ _jsonLanguageTypes__WEBPACK_IMPORTED_MODULE_12__.CompletionList),
  Diagnostic: () => (/* reexport safe */ _jsonLanguageTypes__WEBPACK_IMPORTED_MODULE_12__.Diagnostic),
  DiagnosticSeverity: () => (/* reexport safe */ _jsonLanguageTypes__WEBPACK_IMPORTED_MODULE_12__.DiagnosticSeverity),
  DocumentHighlight: () => (/* reexport safe */ _jsonLanguageTypes__WEBPACK_IMPORTED_MODULE_12__.DocumentHighlight),
  DocumentHighlightKind: () => (/* reexport safe */ _jsonLanguageTypes__WEBPACK_IMPORTED_MODULE_12__.DocumentHighlightKind),
  DocumentLink: () => (/* reexport safe */ _jsonLanguageTypes__WEBPACK_IMPORTED_MODULE_12__.DocumentLink),
  DocumentSymbol: () => (/* reexport safe */ _jsonLanguageTypes__WEBPACK_IMPORTED_MODULE_12__.DocumentSymbol),
  DocumentUri: () => (/* reexport safe */ _jsonLanguageTypes__WEBPACK_IMPORTED_MODULE_12__.DocumentUri),
  ErrorCode: () => (/* reexport safe */ _jsonLanguageTypes__WEBPACK_IMPORTED_MODULE_12__.ErrorCode),
  FoldingRange: () => (/* reexport safe */ _jsonLanguageTypes__WEBPACK_IMPORTED_MODULE_12__.FoldingRange),
  FoldingRangeKind: () => (/* reexport safe */ _jsonLanguageTypes__WEBPACK_IMPORTED_MODULE_12__.FoldingRangeKind),
  Hover: () => (/* reexport safe */ _jsonLanguageTypes__WEBPACK_IMPORTED_MODULE_12__.Hover),
  InsertTextFormat: () => (/* reexport safe */ _jsonLanguageTypes__WEBPACK_IMPORTED_MODULE_12__.InsertTextFormat),
  Location: () => (/* reexport safe */ _jsonLanguageTypes__WEBPACK_IMPORTED_MODULE_12__.Location),
  MarkedString: () => (/* reexport safe */ _jsonLanguageTypes__WEBPACK_IMPORTED_MODULE_12__.MarkedString),
  MarkupContent: () => (/* reexport safe */ _jsonLanguageTypes__WEBPACK_IMPORTED_MODULE_12__.MarkupContent),
  MarkupKind: () => (/* reexport safe */ _jsonLanguageTypes__WEBPACK_IMPORTED_MODULE_12__.MarkupKind),
  Position: () => (/* reexport safe */ _jsonLanguageTypes__WEBPACK_IMPORTED_MODULE_12__.Position),
  Range: () => (/* reexport safe */ _jsonLanguageTypes__WEBPACK_IMPORTED_MODULE_12__.Range),
  SchemaDraft: () => (/* reexport safe */ _jsonLanguageTypes__WEBPACK_IMPORTED_MODULE_12__.SchemaDraft),
  SelectionRange: () => (/* reexport safe */ _jsonLanguageTypes__WEBPACK_IMPORTED_MODULE_12__.SelectionRange),
  SymbolInformation: () => (/* reexport safe */ _jsonLanguageTypes__WEBPACK_IMPORTED_MODULE_12__.SymbolInformation),
  SymbolKind: () => (/* reexport safe */ _jsonLanguageTypes__WEBPACK_IMPORTED_MODULE_12__.SymbolKind),
  TextDocument: () => (/* reexport safe */ _jsonLanguageTypes__WEBPACK_IMPORTED_MODULE_12__.TextDocument),
  TextDocumentEdit: () => (/* reexport safe */ _jsonLanguageTypes__WEBPACK_IMPORTED_MODULE_12__.TextDocumentEdit),
  TextEdit: () => (/* reexport safe */ _jsonLanguageTypes__WEBPACK_IMPORTED_MODULE_12__.TextEdit),
  VersionedTextDocumentIdentifier: () => (/* reexport safe */ _jsonLanguageTypes__WEBPACK_IMPORTED_MODULE_12__.VersionedTextDocumentIdentifier),
  WorkspaceEdit: () => (/* reexport safe */ _jsonLanguageTypes__WEBPACK_IMPORTED_MODULE_12__.WorkspaceEdit),
  getLanguageService: () => (getLanguageService)
});
/* ESM import */var _services_jsonCompletion__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(3709);
/* ESM import */var _services_jsonHover__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(3716);
/* ESM import */var _services_jsonValidation__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(3717);
/* ESM import */var _services_jsonDocumentSymbols__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(3718);
/* ESM import */var _parser_jsonParser__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(3710);
/* ESM import */var _services_configuration__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(3720);
/* ESM import */var _services_jsonSchemaService__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(3721);
/* ESM import */var _services_jsonFolding__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(3723);
/* ESM import */var _services_jsonSelectionRanges__WEBPACK_IMPORTED_MODULE_8__ = __webpack_require__(3724);
/* ESM import */var _utils_sort__WEBPACK_IMPORTED_MODULE_9__ = __webpack_require__(3725);
/* ESM import */var _utils_format__WEBPACK_IMPORTED_MODULE_10__ = __webpack_require__(3726);
/* ESM import */var _services_jsonLinks__WEBPACK_IMPORTED_MODULE_11__ = __webpack_require__(3728);
/* ESM import */var _jsonLanguageTypes__WEBPACK_IMPORTED_MODULE_12__ = __webpack_require__(3713);
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/













function getLanguageService(params) {
    const promise = params.promiseConstructor || Promise;
    const jsonSchemaService = new _services_jsonSchemaService__WEBPACK_IMPORTED_MODULE_6__.JSONSchemaService(params.schemaRequestService, params.workspaceContext, promise);
    jsonSchemaService.setSchemaContributions(_services_configuration__WEBPACK_IMPORTED_MODULE_5__.schemaContributions);
    const jsonCompletion = new _services_jsonCompletion__WEBPACK_IMPORTED_MODULE_0__.JSONCompletion(jsonSchemaService, params.contributions, promise, params.clientCapabilities);
    const jsonHover = new _services_jsonHover__WEBPACK_IMPORTED_MODULE_1__.JSONHover(jsonSchemaService, params.contributions, promise);
    const jsonDocumentSymbols = new _services_jsonDocumentSymbols__WEBPACK_IMPORTED_MODULE_3__.JSONDocumentSymbols(jsonSchemaService);
    const jsonValidation = new _services_jsonValidation__WEBPACK_IMPORTED_MODULE_2__.JSONValidation(jsonSchemaService, promise);
    return {
        configure: (settings) => {
            jsonSchemaService.clearExternalSchemas();
            settings.schemas?.forEach(jsonSchemaService.registerExternalSchema.bind(jsonSchemaService));
            jsonValidation.configure(settings);
        },
        resetSchema: (uri) => jsonSchemaService.onResourceChange(uri),
        doValidation: jsonValidation.doValidation.bind(jsonValidation),
        getLanguageStatus: jsonValidation.getLanguageStatus.bind(jsonValidation),
        parseJSONDocument: (document) => (0,_parser_jsonParser__WEBPACK_IMPORTED_MODULE_4__.parse)(document, { collectComments: true }),
        newJSONDocument: (root, diagnostics, comments) => (0,_parser_jsonParser__WEBPACK_IMPORTED_MODULE_4__.newJSONDocument)(root, diagnostics, comments),
        getMatchingSchemas: jsonSchemaService.getMatchingSchemas.bind(jsonSchemaService),
        doResolve: jsonCompletion.doResolve.bind(jsonCompletion),
        doComplete: jsonCompletion.doComplete.bind(jsonCompletion),
        findDocumentSymbols: jsonDocumentSymbols.findDocumentSymbols.bind(jsonDocumentSymbols),
        findDocumentSymbols2: jsonDocumentSymbols.findDocumentSymbols2.bind(jsonDocumentSymbols),
        findDocumentColors: jsonDocumentSymbols.findDocumentColors.bind(jsonDocumentSymbols),
        getColorPresentations: jsonDocumentSymbols.getColorPresentations.bind(jsonDocumentSymbols),
        doHover: jsonHover.doHover.bind(jsonHover),
        getFoldingRanges: _services_jsonFolding__WEBPACK_IMPORTED_MODULE_7__.getFoldingRanges,
        getSelectionRanges: _services_jsonSelectionRanges__WEBPACK_IMPORTED_MODULE_8__.getSelectionRanges,
        findDefinition: () => Promise.resolve([]),
        findLinks: _services_jsonLinks__WEBPACK_IMPORTED_MODULE_11__.findLinks,
        format: (document, range, options) => (0,_utils_format__WEBPACK_IMPORTED_MODULE_10__.format)(document, options, range),
        sort: (document, options) => (0,_utils_sort__WEBPACK_IMPORTED_MODULE_9__.sort)(document, options)
    };
}


}),
3713: (function (__unused_webpack_module, __webpack_exports__, __webpack_require__) {
__webpack_require__.r(__webpack_exports__);
__webpack_require__.d(__webpack_exports__, {
  ClientCapabilities: () => (ClientCapabilities),
  CodeAction: () => (/* reexport safe */ vscode_languageserver_types__WEBPACK_IMPORTED_MODULE_0__.CodeAction),
  CodeActionContext: () => (/* reexport safe */ vscode_languageserver_types__WEBPACK_IMPORTED_MODULE_0__.CodeActionContext),
  CodeActionKind: () => (/* reexport safe */ vscode_languageserver_types__WEBPACK_IMPORTED_MODULE_0__.CodeActionKind),
  Color: () => (/* reexport safe */ vscode_languageserver_types__WEBPACK_IMPORTED_MODULE_0__.Color),
  ColorInformation: () => (/* reexport safe */ vscode_languageserver_types__WEBPACK_IMPORTED_MODULE_0__.ColorInformation),
  ColorPresentation: () => (/* reexport safe */ vscode_languageserver_types__WEBPACK_IMPORTED_MODULE_0__.ColorPresentation),
  Command: () => (/* reexport safe */ vscode_languageserver_types__WEBPACK_IMPORTED_MODULE_0__.Command),
  CompletionItem: () => (/* reexport safe */ vscode_languageserver_types__WEBPACK_IMPORTED_MODULE_0__.CompletionItem),
  CompletionItemKind: () => (/* reexport safe */ vscode_languageserver_types__WEBPACK_IMPORTED_MODULE_0__.CompletionItemKind),
  CompletionItemTag: () => (/* reexport safe */ vscode_languageserver_types__WEBPACK_IMPORTED_MODULE_0__.CompletionItemTag),
  CompletionList: () => (/* reexport safe */ vscode_languageserver_types__WEBPACK_IMPORTED_MODULE_0__.CompletionList),
  Diagnostic: () => (/* reexport safe */ vscode_languageserver_types__WEBPACK_IMPORTED_MODULE_0__.Diagnostic),
  DiagnosticSeverity: () => (/* reexport safe */ vscode_languageserver_types__WEBPACK_IMPORTED_MODULE_0__.DiagnosticSeverity),
  DocumentHighlight: () => (/* reexport safe */ vscode_languageserver_types__WEBPACK_IMPORTED_MODULE_0__.DocumentHighlight),
  DocumentHighlightKind: () => (/* reexport safe */ vscode_languageserver_types__WEBPACK_IMPORTED_MODULE_0__.DocumentHighlightKind),
  DocumentLink: () => (/* reexport safe */ vscode_languageserver_types__WEBPACK_IMPORTED_MODULE_0__.DocumentLink),
  DocumentSymbol: () => (/* reexport safe */ vscode_languageserver_types__WEBPACK_IMPORTED_MODULE_0__.DocumentSymbol),
  DocumentUri: () => (/* reexport safe */ vscode_languageserver_types__WEBPACK_IMPORTED_MODULE_0__.DocumentUri),
  ErrorCode: () => (ErrorCode),
  FoldingRange: () => (/* reexport safe */ vscode_languageserver_types__WEBPACK_IMPORTED_MODULE_0__.FoldingRange),
  FoldingRangeKind: () => (/* reexport safe */ vscode_languageserver_types__WEBPACK_IMPORTED_MODULE_0__.FoldingRangeKind),
  Hover: () => (/* reexport safe */ vscode_languageserver_types__WEBPACK_IMPORTED_MODULE_0__.Hover),
  InsertTextFormat: () => (/* reexport safe */ vscode_languageserver_types__WEBPACK_IMPORTED_MODULE_0__.InsertTextFormat),
  Location: () => (/* reexport safe */ vscode_languageserver_types__WEBPACK_IMPORTED_MODULE_0__.Location),
  MarkedString: () => (/* reexport safe */ vscode_languageserver_types__WEBPACK_IMPORTED_MODULE_0__.MarkedString),
  MarkupContent: () => (/* reexport safe */ vscode_languageserver_types__WEBPACK_IMPORTED_MODULE_0__.MarkupContent),
  MarkupKind: () => (/* reexport safe */ vscode_languageserver_types__WEBPACK_IMPORTED_MODULE_0__.MarkupKind),
  Position: () => (/* reexport safe */ vscode_languageserver_types__WEBPACK_IMPORTED_MODULE_0__.Position),
  Range: () => (/* reexport safe */ vscode_languageserver_types__WEBPACK_IMPORTED_MODULE_0__.Range),
  SchemaDraft: () => (SchemaDraft),
  SelectionRange: () => (/* reexport safe */ vscode_languageserver_types__WEBPACK_IMPORTED_MODULE_0__.SelectionRange),
  SymbolInformation: () => (/* reexport safe */ vscode_languageserver_types__WEBPACK_IMPORTED_MODULE_0__.SymbolInformation),
  SymbolKind: () => (/* reexport safe */ vscode_languageserver_types__WEBPACK_IMPORTED_MODULE_0__.SymbolKind),
  TextDocument: () => (/* reexport safe */ vscode_languageserver_textdocument__WEBPACK_IMPORTED_MODULE_1__.TextDocument),
  TextDocumentEdit: () => (/* reexport safe */ vscode_languageserver_types__WEBPACK_IMPORTED_MODULE_0__.TextDocumentEdit),
  TextEdit: () => (/* reexport safe */ vscode_languageserver_types__WEBPACK_IMPORTED_MODULE_0__.TextEdit),
  VersionedTextDocumentIdentifier: () => (/* reexport safe */ vscode_languageserver_types__WEBPACK_IMPORTED_MODULE_0__.VersionedTextDocumentIdentifier),
  WorkspaceEdit: () => (/* reexport safe */ vscode_languageserver_types__WEBPACK_IMPORTED_MODULE_0__.WorkspaceEdit)
});
/* ESM import */var vscode_languageserver_types__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(2442);
/* ESM import */var vscode_languageserver_textdocument__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(2443);
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/



/**
 * Error codes used by diagnostics
 */
var ErrorCode;
(function (ErrorCode) {
    ErrorCode[ErrorCode["Undefined"] = 0] = "Undefined";
    ErrorCode[ErrorCode["EnumValueMismatch"] = 1] = "EnumValueMismatch";
    ErrorCode[ErrorCode["Deprecated"] = 2] = "Deprecated";
    ErrorCode[ErrorCode["UnexpectedEndOfComment"] = 257] = "UnexpectedEndOfComment";
    ErrorCode[ErrorCode["UnexpectedEndOfString"] = 258] = "UnexpectedEndOfString";
    ErrorCode[ErrorCode["UnexpectedEndOfNumber"] = 259] = "UnexpectedEndOfNumber";
    ErrorCode[ErrorCode["InvalidUnicode"] = 260] = "InvalidUnicode";
    ErrorCode[ErrorCode["InvalidEscapeCharacter"] = 261] = "InvalidEscapeCharacter";
    ErrorCode[ErrorCode["InvalidCharacter"] = 262] = "InvalidCharacter";
    ErrorCode[ErrorCode["PropertyExpected"] = 513] = "PropertyExpected";
    ErrorCode[ErrorCode["CommaExpected"] = 514] = "CommaExpected";
    ErrorCode[ErrorCode["ColonExpected"] = 515] = "ColonExpected";
    ErrorCode[ErrorCode["ValueExpected"] = 516] = "ValueExpected";
    ErrorCode[ErrorCode["CommaOrCloseBacketExpected"] = 517] = "CommaOrCloseBacketExpected";
    ErrorCode[ErrorCode["CommaOrCloseBraceExpected"] = 518] = "CommaOrCloseBraceExpected";
    ErrorCode[ErrorCode["TrailingComma"] = 519] = "TrailingComma";
    ErrorCode[ErrorCode["DuplicateKey"] = 520] = "DuplicateKey";
    ErrorCode[ErrorCode["CommentNotPermitted"] = 521] = "CommentNotPermitted";
    ErrorCode[ErrorCode["PropertyKeysMustBeDoublequoted"] = 528] = "PropertyKeysMustBeDoublequoted";
    ErrorCode[ErrorCode["SchemaResolveError"] = 768] = "SchemaResolveError";
    ErrorCode[ErrorCode["SchemaUnsupportedFeature"] = 769] = "SchemaUnsupportedFeature";
})(ErrorCode || (ErrorCode = {}));
var SchemaDraft;
(function (SchemaDraft) {
    SchemaDraft[SchemaDraft["v3"] = 3] = "v3";
    SchemaDraft[SchemaDraft["v4"] = 4] = "v4";
    SchemaDraft[SchemaDraft["v6"] = 6] = "v6";
    SchemaDraft[SchemaDraft["v7"] = 7] = "v7";
    SchemaDraft[SchemaDraft["v2019_09"] = 19] = "v2019_09";
    SchemaDraft[SchemaDraft["v2020_12"] = 20] = "v2020_12";
})(SchemaDraft || (SchemaDraft = {}));
var ClientCapabilities;
(function (ClientCapabilities) {
    ClientCapabilities.LATEST = {
        textDocument: {
            completion: {
                completionItem: {
                    documentationFormat: [vscode_languageserver_types__WEBPACK_IMPORTED_MODULE_0__.MarkupKind.Markdown, vscode_languageserver_types__WEBPACK_IMPORTED_MODULE_0__.MarkupKind.PlainText],
                    commitCharactersSupport: true,
                    labelDetailsSupport: true
                }
            }
        }
    };
})(ClientCapabilities || (ClientCapabilities = {}));


}),
3710: (function (__unused_webpack_module, __webpack_exports__, __webpack_require__) {
__webpack_require__.r(__webpack_exports__);
__webpack_require__.d(__webpack_exports__, {
  ASTNodeImpl: () => (ASTNodeImpl),
  ArrayASTNodeImpl: () => (ArrayASTNodeImpl),
  BooleanASTNodeImpl: () => (BooleanASTNodeImpl),
  EnumMatch: () => (EnumMatch),
  JSONDocument: () => (JSONDocument),
  NullASTNodeImpl: () => (NullASTNodeImpl),
  NumberASTNodeImpl: () => (NumberASTNodeImpl),
  ObjectASTNodeImpl: () => (ObjectASTNodeImpl),
  PropertyASTNodeImpl: () => (PropertyASTNodeImpl),
  StringASTNodeImpl: () => (StringASTNodeImpl),
  ValidationResult: () => (ValidationResult),
  asSchema: () => (asSchema),
  contains: () => (contains),
  getNodePath: () => (getNodePath),
  getNodeValue: () => (getNodeValue),
  getSchemaDraftFromId: () => (getSchemaDraftFromId),
  newJSONDocument: () => (newJSONDocument),
  normalizeId: () => (normalizeId),
  parse: () => (parse)
});
/* ESM import */var jsonc_parser__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(2330);
/* ESM import */var _utils_objects__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(3711);
/* ESM import */var _utils_strings__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(3712);
/* ESM import */var _jsonLanguageTypes__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(3713);
/* ESM import */var vscode_uri__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(3707);
/* ESM import */var _vscode_l10n__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(3714);
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/






const formats = {
    'color-hex': { errorMessage: _vscode_l10n__WEBPACK_IMPORTED_MODULE_4__.t('Invalid color format. Use #RGB, #RGBA, #RRGGBB or #RRGGBBAA.'), pattern: /^#([0-9A-Fa-f]{3,4}|([0-9A-Fa-f]{2}){3,4})$/ },
    'date-time': { errorMessage: _vscode_l10n__WEBPACK_IMPORTED_MODULE_4__.t('String is not a RFC3339 date-time.'), pattern: /^(\d{4})-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):([0-5][0-9]):([0-5][0-9]|60)(\.[0-9]+)?(Z|(\+|-)([01][0-9]|2[0-3]):([0-5][0-9]))$/i },
    'date': { errorMessage: _vscode_l10n__WEBPACK_IMPORTED_MODULE_4__.t('String is not a RFC3339 date.'), pattern: /^(\d{4})-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$/i },
    'time': { errorMessage: _vscode_l10n__WEBPACK_IMPORTED_MODULE_4__.t('String is not a RFC3339 time.'), pattern: /^([01][0-9]|2[0-3]):([0-5][0-9]):([0-5][0-9]|60)(\.[0-9]+)?(Z|(\+|-)([01][0-9]|2[0-3]):([0-5][0-9]))$/i },
    'email': { errorMessage: _vscode_l10n__WEBPACK_IMPORTED_MODULE_4__.t('String is not an e-mail address.'), pattern: /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}))$/ },
    'hostname': { errorMessage: _vscode_l10n__WEBPACK_IMPORTED_MODULE_4__.t('String is not a hostname.'), pattern: /^(?=.{1,253}\.?$)[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[-0-9a-z]{0,61}[0-9a-z])?)*\.?$/i },
    'ipv4': { errorMessage: _vscode_l10n__WEBPACK_IMPORTED_MODULE_4__.t('String is not an IPv4 address.'), pattern: /^(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\.){3}(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)$/ },
    'ipv6': { errorMessage: _vscode_l10n__WEBPACK_IMPORTED_MODULE_4__.t('String is not an IPv6 address.'), pattern: /^((([0-9a-f]{1,4}:){7}([0-9a-f]{1,4}|:))|(([0-9a-f]{1,4}:){6}(:[0-9a-f]{1,4}|((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3})|:))|(([0-9a-f]{1,4}:){5}(((:[0-9a-f]{1,4}){1,2})|:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3})|:))|(([0-9a-f]{1,4}:){4}(((:[0-9a-f]{1,4}){1,3})|((:[0-9a-f]{1,4})?:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9a-f]{1,4}:){3}(((:[0-9a-f]{1,4}){1,4})|((:[0-9a-f]{1,4}){0,2}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9a-f]{1,4}:){2}(((:[0-9a-f]{1,4}){1,5})|((:[0-9a-f]{1,4}){0,3}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9a-f]{1,4}:){1}(((:[0-9a-f]{1,4}){1,6})|((:[0-9a-f]{1,4}){0,4}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(:(((:[0-9a-f]{1,4}){1,7})|((:[0-9a-f]{1,4}){0,5}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:)))$/i },
};
class ASTNodeImpl {
    constructor(parent, offset, length = 0) {
        this.offset = offset;
        this.length = length;
        this.parent = parent;
    }
    get children() {
        return [];
    }
    toString() {
        return 'type: ' + this.type + ' (' + this.offset + '/' + this.length + ')' + (this.parent ? ' parent: {' + this.parent.toString() + '}' : '');
    }
}
class NullASTNodeImpl extends ASTNodeImpl {
    constructor(parent, offset) {
        super(parent, offset);
        this.type = 'null';
        this.value = null;
    }
}
class BooleanASTNodeImpl extends ASTNodeImpl {
    constructor(parent, boolValue, offset) {
        super(parent, offset);
        this.type = 'boolean';
        this.value = boolValue;
    }
}
class ArrayASTNodeImpl extends ASTNodeImpl {
    constructor(parent, offset) {
        super(parent, offset);
        this.type = 'array';
        this.items = [];
    }
    get children() {
        return this.items;
    }
}
class NumberASTNodeImpl extends ASTNodeImpl {
    constructor(parent, offset) {
        super(parent, offset);
        this.type = 'number';
        this.isInteger = true;
        this.value = Number.NaN;
    }
}
class StringASTNodeImpl extends ASTNodeImpl {
    constructor(parent, offset, length) {
        super(parent, offset, length);
        this.type = 'string';
        this.value = '';
    }
}
class PropertyASTNodeImpl extends ASTNodeImpl {
    constructor(parent, offset, keyNode) {
        super(parent, offset);
        this.type = 'property';
        this.colonOffset = -1;
        this.keyNode = keyNode;
    }
    get children() {
        return this.valueNode ? [this.keyNode, this.valueNode] : [this.keyNode];
    }
}
class ObjectASTNodeImpl extends ASTNodeImpl {
    constructor(parent, offset) {
        super(parent, offset);
        this.type = 'object';
        this.properties = [];
    }
    get children() {
        return this.properties;
    }
}
function asSchema(schema) {
    if ((0,_utils_objects__WEBPACK_IMPORTED_MODULE_1__.isBoolean)(schema)) {
        return schema ? {} : { "not": {} };
    }
    return schema;
}
var EnumMatch;
(function (EnumMatch) {
    EnumMatch[EnumMatch["Key"] = 0] = "Key";
    EnumMatch[EnumMatch["Enum"] = 1] = "Enum";
})(EnumMatch || (EnumMatch = {}));
const httpPrefix = `http://json-schema.org/`;
const httpsPrefix = `https://json-schema.org/`;
function normalizeId(id) {
    // use the https prefix for the old json-schema.org meta schemas
    // See https://github.com/microsoft/vscode/issues/195189
    if (id.startsWith(httpPrefix)) {
        id = httpsPrefix + id.substring(httpPrefix.length);
    }
    // remove trailing '#', normalize drive capitalization
    try {
        return vscode_uri__WEBPACK_IMPORTED_MODULE_5__.URI.parse(id).toString(true);
    }
    catch (e) {
        return id;
    }
}
function getSchemaDraftFromId(schemaId) {
    return schemaDraftFromId[normalizeId(schemaId)] ?? undefined;
}
const schemaDraftFromId = {
    'https://json-schema.org/draft-03/schema': _jsonLanguageTypes__WEBPACK_IMPORTED_MODULE_3__.SchemaDraft.v3,
    'https://json-schema.org/draft-04/schema': _jsonLanguageTypes__WEBPACK_IMPORTED_MODULE_3__.SchemaDraft.v4,
    'https://json-schema.org/draft-06/schema': _jsonLanguageTypes__WEBPACK_IMPORTED_MODULE_3__.SchemaDraft.v6,
    'https://json-schema.org/draft-07/schema': _jsonLanguageTypes__WEBPACK_IMPORTED_MODULE_3__.SchemaDraft.v7,
    'https://json-schema.org/draft/2019-09/schema': _jsonLanguageTypes__WEBPACK_IMPORTED_MODULE_3__.SchemaDraft.v2019_09,
    'https://json-schema.org/draft/2020-12/schema': _jsonLanguageTypes__WEBPACK_IMPORTED_MODULE_3__.SchemaDraft.v2020_12
};
class EvaluationContext {
    constructor(schemaDraft) {
        this.schemaDraft = schemaDraft;
    }
}
class SchemaCollector {
    constructor(focusOffset = -1, exclude) {
        this.focusOffset = focusOffset;
        this.exclude = exclude;
        this.schemas = [];
    }
    add(schema) {
        this.schemas.push(schema);
    }
    merge(other) {
        Array.prototype.push.apply(this.schemas, other.schemas);
    }
    include(node) {
        return (this.focusOffset === -1 || contains(node, this.focusOffset)) && (node !== this.exclude);
    }
    newSub() {
        return new SchemaCollector(-1, this.exclude);
    }
}
class NoOpSchemaCollector {
    constructor() { }
    get schemas() { return []; }
    add(_schema) { }
    merge(_other) { }
    include(_node) { return true; }
    newSub() { return this; }
}
NoOpSchemaCollector.instance = new NoOpSchemaCollector();
class ValidationResult {
    constructor() {
        this.problems = [];
        this.propertiesMatches = 0;
        this.processedProperties = new Set();
        this.propertiesValueMatches = 0;
        this.primaryValueMatches = 0;
        this.enumValueMatch = false;
        this.enumValues = undefined;
    }
    hasProblems() {
        return !!this.problems.length;
    }
    merge(validationResult) {
        this.problems = this.problems.concat(validationResult.problems);
        this.propertiesMatches += validationResult.propertiesMatches;
        this.propertiesValueMatches += validationResult.propertiesValueMatches;
        this.mergeProcessedProperties(validationResult);
    }
    mergeEnumValues(validationResult) {
        if (!this.enumValueMatch && !validationResult.enumValueMatch && this.enumValues && validationResult.enumValues) {
            this.enumValues = this.enumValues.concat(validationResult.enumValues);
        }
    }
    updateEnumMismatchProblemMessages() {
        if (!this.enumValueMatch && this.enumValues) {
            for (const error of this.problems) {
                if (error.code === _jsonLanguageTypes__WEBPACK_IMPORTED_MODULE_3__.ErrorCode.EnumValueMismatch) {
                    error.message = _vscode_l10n__WEBPACK_IMPORTED_MODULE_4__.t('Value is not accepted. Valid values: {0}.', this.enumValues.map(v => JSON.stringify(v)).join(', '));
                }
            }
        }
    }
    mergePropertyMatch(propertyValidationResult) {
        this.problems = this.problems.concat(propertyValidationResult.problems);
        this.propertiesMatches++;
        if (propertyValidationResult.enumValueMatch || !propertyValidationResult.hasProblems() && propertyValidationResult.propertiesMatches) {
            this.propertiesValueMatches++;
        }
        if (propertyValidationResult.enumValueMatch && propertyValidationResult.enumValues && propertyValidationResult.enumValues.length === 1) {
            this.primaryValueMatches++;
        }
    }
    mergeProcessedProperties(validationResult) {
        validationResult.processedProperties.forEach(p => this.processedProperties.add(p));
    }
    compare(other) {
        const hasProblems = this.hasProblems();
        if (hasProblems !== other.hasProblems()) {
            return hasProblems ? -1 : 1;
        }
        if (this.enumValueMatch !== other.enumValueMatch) {
            return other.enumValueMatch ? -1 : 1;
        }
        if (this.primaryValueMatches !== other.primaryValueMatches) {
            return this.primaryValueMatches - other.primaryValueMatches;
        }
        if (this.propertiesValueMatches !== other.propertiesValueMatches) {
            return this.propertiesValueMatches - other.propertiesValueMatches;
        }
        return this.propertiesMatches - other.propertiesMatches;
    }
}
function newJSONDocument(root, diagnostics = [], comments = []) {
    return new JSONDocument(root, diagnostics, comments);
}
function getNodeValue(node) {
    return jsonc_parser__WEBPACK_IMPORTED_MODULE_0__.getNodeValue(node);
}
function getNodePath(node) {
    return jsonc_parser__WEBPACK_IMPORTED_MODULE_0__.getNodePath(node);
}
function contains(node, offset, includeRightBound = false) {
    return offset >= node.offset && offset < (node.offset + node.length) || includeRightBound && offset === (node.offset + node.length);
}
class JSONDocument {
    constructor(root, syntaxErrors = [], comments = []) {
        this.root = root;
        this.syntaxErrors = syntaxErrors;
        this.comments = comments;
    }
    getNodeFromOffset(offset, includeRightBound = false) {
        if (this.root) {
            return jsonc_parser__WEBPACK_IMPORTED_MODULE_0__.findNodeAtOffset(this.root, offset, includeRightBound);
        }
        return undefined;
    }
    visit(visitor) {
        if (this.root) {
            const doVisit = (node) => {
                let ctn = visitor(node);
                const children = node.children;
                if (Array.isArray(children)) {
                    for (let i = 0; i < children.length && ctn; i++) {
                        ctn = doVisit(children[i]);
                    }
                }
                return ctn;
            };
            doVisit(this.root);
        }
    }
    validate(textDocument, schema, severity = _jsonLanguageTypes__WEBPACK_IMPORTED_MODULE_3__.DiagnosticSeverity.Warning, schemaDraft) {
        if (this.root && schema) {
            const validationResult = new ValidationResult();
            validate(this.root, schema, validationResult, NoOpSchemaCollector.instance, new EvaluationContext(schemaDraft ?? getSchemaDraft(schema)));
            return validationResult.problems.map(p => {
                const range = _jsonLanguageTypes__WEBPACK_IMPORTED_MODULE_3__.Range.create(textDocument.positionAt(p.location.offset), textDocument.positionAt(p.location.offset + p.location.length));
                return _jsonLanguageTypes__WEBPACK_IMPORTED_MODULE_3__.Diagnostic.create(range, p.message, p.severity ?? severity, p.code);
            });
        }
        return undefined;
    }
    getMatchingSchemas(schema, focusOffset = -1, exclude) {
        if (this.root && schema) {
            const matchingSchemas = new SchemaCollector(focusOffset, exclude);
            const schemaDraft = getSchemaDraft(schema);
            const context = new EvaluationContext(schemaDraft);
            validate(this.root, schema, new ValidationResult(), matchingSchemas, context);
            return matchingSchemas.schemas;
        }
        return [];
    }
}
function getSchemaDraft(schema, fallBack = _jsonLanguageTypes__WEBPACK_IMPORTED_MODULE_3__.SchemaDraft.v2020_12) {
    let schemaId = schema.$schema;
    if (schemaId) {
        return getSchemaDraftFromId(schemaId) ?? fallBack;
    }
    return fallBack;
}
function validate(n, schema, validationResult, matchingSchemas, context) {
    if (!n || !matchingSchemas.include(n)) {
        return;
    }
    if (n.type === 'property') {
        return validate(n.valueNode, schema, validationResult, matchingSchemas, context);
    }
    const node = n;
    _validateNode();
    switch (node.type) {
        case 'object':
            _validateObjectNode(node);
            break;
        case 'array':
            _validateArrayNode(node);
            break;
        case 'string':
            _validateStringNode(node);
            break;
        case 'number':
            _validateNumberNode(node);
            break;
    }
    matchingSchemas.add({ node: node, schema: schema });
    function _validateNode() {
        function matchesType(type) {
            return node.type === type || (type === 'integer' && node.type === 'number' && node.isInteger);
        }
        if (Array.isArray(schema.type)) {
            if (!schema.type.some(matchesType)) {
                validationResult.problems.push({
                    location: { offset: node.offset, length: node.length },
                    message: schema.errorMessage || _vscode_l10n__WEBPACK_IMPORTED_MODULE_4__.t('Incorrect type. Expected one of {0}.', schema.type.join(', '))
                });
            }
        }
        else if (schema.type) {
            if (!matchesType(schema.type)) {
                validationResult.problems.push({
                    location: { offset: node.offset, length: node.length },
                    message: schema.errorMessage || _vscode_l10n__WEBPACK_IMPORTED_MODULE_4__.t('Incorrect type. Expected "{0}".', schema.type)
                });
            }
        }
        if (Array.isArray(schema.allOf)) {
            for (const subSchemaRef of schema.allOf) {
                const subValidationResult = new ValidationResult();
                const subMatchingSchemas = matchingSchemas.newSub();
                validate(node, asSchema(subSchemaRef), subValidationResult, subMatchingSchemas, context);
                validationResult.merge(subValidationResult);
                matchingSchemas.merge(subMatchingSchemas);
            }
        }
        const notSchema = asSchema(schema.not);
        if (notSchema) {
            const subValidationResult = new ValidationResult();
            const subMatchingSchemas = matchingSchemas.newSub();
            validate(node, notSchema, subValidationResult, subMatchingSchemas, context);
            if (!subValidationResult.hasProblems()) {
                validationResult.problems.push({
                    location: { offset: node.offset, length: node.length },
                    message: schema.errorMessage || _vscode_l10n__WEBPACK_IMPORTED_MODULE_4__.t("Matches a schema that is not allowed.")
                });
            }
            for (const ms of subMatchingSchemas.schemas) {
                ms.inverted = !ms.inverted;
                matchingSchemas.add(ms);
            }
        }
        const testAlternatives = (alternatives, maxOneMatch) => {
            const matches = [];
            // remember the best match that is used for error messages
            let bestMatch = undefined;
            for (const subSchemaRef of alternatives) {
                const subSchema = asSchema(subSchemaRef);
                const subValidationResult = new ValidationResult();
                const subMatchingSchemas = matchingSchemas.newSub();
                validate(node, subSchema, subValidationResult, subMatchingSchemas, context);
                if (!subValidationResult.hasProblems()) {
                    matches.push(subSchema);
                }
                if (!bestMatch) {
                    bestMatch = { schema: subSchema, validationResult: subValidationResult, matchingSchemas: subMatchingSchemas };
                }
                else {
                    if (!maxOneMatch && !subValidationResult.hasProblems() && !bestMatch.validationResult.hasProblems()) {
                        // no errors, both are equally good matches
                        bestMatch.matchingSchemas.merge(subMatchingSchemas);
                        bestMatch.validationResult.propertiesMatches += subValidationResult.propertiesMatches;
                        bestMatch.validationResult.propertiesValueMatches += subValidationResult.propertiesValueMatches;
                        bestMatch.validationResult.mergeProcessedProperties(subValidationResult);
                    }
                    else {
                        const compareResult = subValidationResult.compare(bestMatch.validationResult);
                        if (compareResult > 0) {
                            // our node is the best matching so far
                            bestMatch = { schema: subSchema, validationResult: subValidationResult, matchingSchemas: subMatchingSchemas };
                        }
                        else if (compareResult === 0) {
                            // there's already a best matching but we are as good
                            bestMatch.matchingSchemas.merge(subMatchingSchemas);
                            bestMatch.validationResult.mergeEnumValues(subValidationResult);
                        }
                    }
                }
            }
            if (matches.length > 1 && maxOneMatch) {
                validationResult.problems.push({
                    location: { offset: node.offset, length: 1 },
                    message: _vscode_l10n__WEBPACK_IMPORTED_MODULE_4__.t("Matches multiple schemas when only one must validate.")
                });
            }
            if (bestMatch) {
                bestMatch.validationResult.updateEnumMismatchProblemMessages();
                validationResult.merge(bestMatch.validationResult);
                matchingSchemas.merge(bestMatch.matchingSchemas);
            }
            return matches.length;
        };
        if (Array.isArray(schema.anyOf)) {
            testAlternatives(schema.anyOf, false);
        }
        if (Array.isArray(schema.oneOf)) {
            testAlternatives(schema.oneOf, true);
        }
        const testBranch = (schema) => {
            const subValidationResult = new ValidationResult();
            const subMatchingSchemas = matchingSchemas.newSub();
            validate(node, asSchema(schema), subValidationResult, subMatchingSchemas, context);
            validationResult.merge(subValidationResult);
            matchingSchemas.merge(subMatchingSchemas);
        };
        const testCondition = (ifSchema, thenSchema, elseSchema) => {
            const subSchema = asSchema(ifSchema);
            const subValidationResult = new ValidationResult();
            const subMatchingSchemas = matchingSchemas.newSub();
            validate(node, subSchema, subValidationResult, subMatchingSchemas, context);
            matchingSchemas.merge(subMatchingSchemas);
            validationResult.mergeProcessedProperties(subValidationResult);
            if (!subValidationResult.hasProblems()) {
                if (thenSchema) {
                    testBranch(thenSchema);
                }
            }
            else if (elseSchema) {
                testBranch(elseSchema);
            }
        };
        const ifSchema = asSchema(schema.if);
        if (ifSchema) {
            testCondition(ifSchema, asSchema(schema.then), asSchema(schema.else));
        }
        if (Array.isArray(schema.enum)) {
            const val = getNodeValue(node);
            let enumValueMatch = false;
            for (const e of schema.enum) {
                if ((0,_utils_objects__WEBPACK_IMPORTED_MODULE_1__.equals)(val, e)) {
                    enumValueMatch = true;
                    break;
                }
            }
            validationResult.enumValues = schema.enum;
            validationResult.enumValueMatch = enumValueMatch;
            if (!enumValueMatch) {
                validationResult.problems.push({
                    location: { offset: node.offset, length: node.length },
                    code: _jsonLanguageTypes__WEBPACK_IMPORTED_MODULE_3__.ErrorCode.EnumValueMismatch,
                    message: schema.errorMessage || _vscode_l10n__WEBPACK_IMPORTED_MODULE_4__.t('Value is not accepted. Valid values: {0}.', schema.enum.map(v => JSON.stringify(v)).join(', '))
                });
            }
        }
        if ((0,_utils_objects__WEBPACK_IMPORTED_MODULE_1__.isDefined)(schema.const)) {
            const val = getNodeValue(node);
            if (!(0,_utils_objects__WEBPACK_IMPORTED_MODULE_1__.equals)(val, schema.const)) {
                validationResult.problems.push({
                    location: { offset: node.offset, length: node.length },
                    code: _jsonLanguageTypes__WEBPACK_IMPORTED_MODULE_3__.ErrorCode.EnumValueMismatch,
                    message: schema.errorMessage || _vscode_l10n__WEBPACK_IMPORTED_MODULE_4__.t('Value must be {0}.', JSON.stringify(schema.const))
                });
                validationResult.enumValueMatch = false;
            }
            else {
                validationResult.enumValueMatch = true;
            }
            validationResult.enumValues = [schema.const];
        }
        let deprecationMessage = schema.deprecationMessage;
        if (deprecationMessage || schema.deprecated) {
            deprecationMessage = deprecationMessage || _vscode_l10n__WEBPACK_IMPORTED_MODULE_4__.t('Value is deprecated');
            let targetNode = node.parent?.type === 'property' ? node.parent : node;
            validationResult.problems.push({
                location: { offset: targetNode.offset, length: targetNode.length },
                severity: _jsonLanguageTypes__WEBPACK_IMPORTED_MODULE_3__.DiagnosticSeverity.Warning,
                message: deprecationMessage,
                code: _jsonLanguageTypes__WEBPACK_IMPORTED_MODULE_3__.ErrorCode.Deprecated
            });
        }
    }
    function _validateNumberNode(node) {
        const val = node.value;
        function normalizeFloats(float) {
            const parts = /^(-?\d+)(?:\.(\d+))?(?:e([-+]\d+))?$/.exec(float.toString());
            return parts && {
                value: Number(parts[1] + (parts[2] || '')),
                multiplier: (parts[2]?.length || 0) - (parseInt(parts[3]) || 0)
            };
        }
        ;
        if ((0,_utils_objects__WEBPACK_IMPORTED_MODULE_1__.isNumber)(schema.multipleOf)) {
            let remainder = -1;
            if (Number.isInteger(schema.multipleOf)) {
                remainder = val % schema.multipleOf;
            }
            else {
                let normMultipleOf = normalizeFloats(schema.multipleOf);
                let normValue = normalizeFloats(val);
                if (normMultipleOf && normValue) {
                    const multiplier = 10 ** Math.abs(normValue.multiplier - normMultipleOf.multiplier);
                    if (normValue.multiplier < normMultipleOf.multiplier) {
                        normValue.value *= multiplier;
                    }
                    else {
                        normMultipleOf.value *= multiplier;
                    }
                    remainder = normValue.value % normMultipleOf.value;
                }
            }
            if (remainder !== 0) {
                validationResult.problems.push({
                    location: { offset: node.offset, length: node.length },
                    message: _vscode_l10n__WEBPACK_IMPORTED_MODULE_4__.t('Value is not divisible by {0}.', schema.multipleOf)
                });
            }
        }
        function getExclusiveLimit(limit, exclusive) {
            if ((0,_utils_objects__WEBPACK_IMPORTED_MODULE_1__.isNumber)(exclusive)) {
                return exclusive;
            }
            if ((0,_utils_objects__WEBPACK_IMPORTED_MODULE_1__.isBoolean)(exclusive) && exclusive) {
                return limit;
            }
            return undefined;
        }
        function getLimit(limit, exclusive) {
            if (!(0,_utils_objects__WEBPACK_IMPORTED_MODULE_1__.isBoolean)(exclusive) || !exclusive) {
                return limit;
            }
            return undefined;
        }
        const exclusiveMinimum = getExclusiveLimit(schema.minimum, schema.exclusiveMinimum);
        if ((0,_utils_objects__WEBPACK_IMPORTED_MODULE_1__.isNumber)(exclusiveMinimum) && val <= exclusiveMinimum) {
            validationResult.problems.push({
                location: { offset: node.offset, length: node.length },
                message: _vscode_l10n__WEBPACK_IMPORTED_MODULE_4__.t('Value is below the exclusive minimum of {0}.', exclusiveMinimum)
            });
        }
        const exclusiveMaximum = getExclusiveLimit(schema.maximum, schema.exclusiveMaximum);
        if ((0,_utils_objects__WEBPACK_IMPORTED_MODULE_1__.isNumber)(exclusiveMaximum) && val >= exclusiveMaximum) {
            validationResult.problems.push({
                location: { offset: node.offset, length: node.length },
                message: _vscode_l10n__WEBPACK_IMPORTED_MODULE_4__.t('Value is above the exclusive maximum of {0}.', exclusiveMaximum)
            });
        }
        const minimum = getLimit(schema.minimum, schema.exclusiveMinimum);
        if ((0,_utils_objects__WEBPACK_IMPORTED_MODULE_1__.isNumber)(minimum) && val < minimum) {
            validationResult.problems.push({
                location: { offset: node.offset, length: node.length },
                message: _vscode_l10n__WEBPACK_IMPORTED_MODULE_4__.t('Value is below the minimum of {0}.', minimum)
            });
        }
        const maximum = getLimit(schema.maximum, schema.exclusiveMaximum);
        if ((0,_utils_objects__WEBPACK_IMPORTED_MODULE_1__.isNumber)(maximum) && val > maximum) {
            validationResult.problems.push({
                location: { offset: node.offset, length: node.length },
                message: _vscode_l10n__WEBPACK_IMPORTED_MODULE_4__.t('Value is above the maximum of {0}.', maximum)
            });
        }
    }
    function _validateStringNode(node) {
        if ((0,_utils_objects__WEBPACK_IMPORTED_MODULE_1__.isNumber)(schema.minLength) && (0,_utils_strings__WEBPACK_IMPORTED_MODULE_2__.stringLength)(node.value) < schema.minLength) {
            validationResult.problems.push({
                location: { offset: node.offset, length: node.length },
                message: _vscode_l10n__WEBPACK_IMPORTED_MODULE_4__.t('String is shorter than the minimum length of {0}.', schema.minLength)
            });
        }
        if ((0,_utils_objects__WEBPACK_IMPORTED_MODULE_1__.isNumber)(schema.maxLength) && (0,_utils_strings__WEBPACK_IMPORTED_MODULE_2__.stringLength)(node.value) > schema.maxLength) {
            validationResult.problems.push({
                location: { offset: node.offset, length: node.length },
                message: _vscode_l10n__WEBPACK_IMPORTED_MODULE_4__.t('String is longer than the maximum length of {0}.', schema.maxLength)
            });
        }
        if ((0,_utils_objects__WEBPACK_IMPORTED_MODULE_1__.isString)(schema.pattern)) {
            const regex = (0,_utils_strings__WEBPACK_IMPORTED_MODULE_2__.extendedRegExp)(schema.pattern);
            if (regex && !(regex.test(node.value))) {
                validationResult.problems.push({
                    location: { offset: node.offset, length: node.length },
                    message: schema.patternErrorMessage || schema.errorMessage || _vscode_l10n__WEBPACK_IMPORTED_MODULE_4__.t('String does not match the pattern of "{0}".', schema.pattern)
                });
            }
        }
        if (schema.format) {
            switch (schema.format) {
                case 'uri':
                case 'uri-reference':
                    {
                        let errorMessage;
                        if (!node.value) {
                            errorMessage = _vscode_l10n__WEBPACK_IMPORTED_MODULE_4__.t('URI expected.');
                        }
                        else {
                            const match = /^(([^:/?#]+?):)?(\/\/([^/?#]*))?([^?#]*)(\?([^#]*))?(#(.*))?/.exec(node.value);
                            if (!match) {
                                errorMessage = _vscode_l10n__WEBPACK_IMPORTED_MODULE_4__.t('URI is expected.');
                            }
                            else if (!match[2] && schema.format === 'uri') {
                                errorMessage = _vscode_l10n__WEBPACK_IMPORTED_MODULE_4__.t('URI with a scheme is expected.');
                            }
                        }
                        if (errorMessage) {
                            validationResult.problems.push({
                                location: { offset: node.offset, length: node.length },
                                message: schema.patternErrorMessage || schema.errorMessage || _vscode_l10n__WEBPACK_IMPORTED_MODULE_4__.t('String is not a URI: {0}', errorMessage)
                            });
                        }
                    }
                    break;
                case 'color-hex':
                case 'date-time':
                case 'date':
                case 'time':
                case 'email':
                case 'hostname':
                case 'ipv4':
                case 'ipv6':
                    const format = formats[schema.format];
                    if (!node.value || !format.pattern.exec(node.value)) {
                        validationResult.problems.push({
                            location: { offset: node.offset, length: node.length },
                            message: schema.patternErrorMessage || schema.errorMessage || format.errorMessage
                        });
                    }
                default:
            }
        }
    }
    function _validateArrayNode(node) {
        let prefixItemsSchemas;
        let additionalItemSchema;
        if (context.schemaDraft >= _jsonLanguageTypes__WEBPACK_IMPORTED_MODULE_3__.SchemaDraft.v2020_12) {
            prefixItemsSchemas = schema.prefixItems;
            additionalItemSchema = !Array.isArray(schema.items) ? schema.items : undefined;
        }
        else {
            prefixItemsSchemas = Array.isArray(schema.items) ? schema.items : undefined;
            additionalItemSchema = !Array.isArray(schema.items) ? schema.items : schema.additionalItems;
        }
        let index = 0;
        if (prefixItemsSchemas !== undefined) {
            const max = Math.min(prefixItemsSchemas.length, node.items.length);
            for (; index < max; index++) {
                const subSchemaRef = prefixItemsSchemas[index];
                const subSchema = asSchema(subSchemaRef);
                const itemValidationResult = new ValidationResult();
                const item = node.items[index];
                if (item) {
                    validate(item, subSchema, itemValidationResult, matchingSchemas, context);
                    validationResult.mergePropertyMatch(itemValidationResult);
                }
                validationResult.processedProperties.add(String(index));
            }
        }
        if (additionalItemSchema !== undefined && index < node.items.length) {
            if (typeof additionalItemSchema === 'boolean') {
                if (additionalItemSchema === false) {
                    validationResult.problems.push({
                        location: { offset: node.offset, length: node.length },
                        message: _vscode_l10n__WEBPACK_IMPORTED_MODULE_4__.t('Array has too many items according to schema. Expected {0} or fewer.', index)
                    });
                }
                for (; index < node.items.length; index++) {
                    validationResult.processedProperties.add(String(index));
                    validationResult.propertiesValueMatches++;
                }
            }
            else {
                for (; index < node.items.length; index++) {
                    const itemValidationResult = new ValidationResult();
                    validate(node.items[index], additionalItemSchema, itemValidationResult, matchingSchemas, context);
                    validationResult.mergePropertyMatch(itemValidationResult);
                    validationResult.processedProperties.add(String(index));
                }
            }
        }
        const containsSchema = asSchema(schema.contains);
        if (containsSchema) {
            let containsCount = 0;
            for (let index = 0; index < node.items.length; index++) {
                const item = node.items[index];
                const itemValidationResult = new ValidationResult();
                validate(item, containsSchema, itemValidationResult, NoOpSchemaCollector.instance, context);
                if (!itemValidationResult.hasProblems()) {
                    containsCount++;
                    if (context.schemaDraft >= _jsonLanguageTypes__WEBPACK_IMPORTED_MODULE_3__.SchemaDraft.v2020_12) {
                        validationResult.processedProperties.add(String(index));
                    }
                }
            }
            if (containsCount === 0 && !(0,_utils_objects__WEBPACK_IMPORTED_MODULE_1__.isNumber)(schema.minContains)) {
                validationResult.problems.push({
                    location: { offset: node.offset, length: node.length },
                    message: schema.errorMessage || _vscode_l10n__WEBPACK_IMPORTED_MODULE_4__.t('Array does not contain required item.')
                });
            }
            if ((0,_utils_objects__WEBPACK_IMPORTED_MODULE_1__.isNumber)(schema.minContains) && containsCount < schema.minContains) {
                validationResult.problems.push({
                    location: { offset: node.offset, length: node.length },
                    message: schema.errorMessage || _vscode_l10n__WEBPACK_IMPORTED_MODULE_4__.t('Array has too few items that match the contains contraint. Expected {0} or more.', schema.minContains)
                });
            }
            if ((0,_utils_objects__WEBPACK_IMPORTED_MODULE_1__.isNumber)(schema.maxContains) && containsCount > schema.maxContains) {
                validationResult.problems.push({
                    location: { offset: node.offset, length: node.length },
                    message: schema.errorMessage || _vscode_l10n__WEBPACK_IMPORTED_MODULE_4__.t('Array has too many items that match the contains contraint. Expected {0} or less.', schema.maxContains)
                });
            }
        }
        const unevaluatedItems = schema.unevaluatedItems;
        if (unevaluatedItems !== undefined) {
            for (let i = 0; i < node.items.length; i++) {
                if (!validationResult.processedProperties.has(String(i))) {
                    if (unevaluatedItems === false) {
                        validationResult.problems.push({
                            location: { offset: node.offset, length: node.length },
                            message: _vscode_l10n__WEBPACK_IMPORTED_MODULE_4__.t('Item does not match any validation rule from the array.')
                        });
                    }
                    else {
                        const itemValidationResult = new ValidationResult();
                        validate(node.items[i], schema.unevaluatedItems, itemValidationResult, matchingSchemas, context);
                        validationResult.mergePropertyMatch(itemValidationResult);
                    }
                }
                validationResult.processedProperties.add(String(i));
                validationResult.propertiesValueMatches++;
            }
        }
        if ((0,_utils_objects__WEBPACK_IMPORTED_MODULE_1__.isNumber)(schema.minItems) && node.items.length < schema.minItems) {
            validationResult.problems.push({
                location: { offset: node.offset, length: node.length },
                message: _vscode_l10n__WEBPACK_IMPORTED_MODULE_4__.t('Array has too few items. Expected {0} or more.', schema.minItems)
            });
        }
        if ((0,_utils_objects__WEBPACK_IMPORTED_MODULE_1__.isNumber)(schema.maxItems) && node.items.length > schema.maxItems) {
            validationResult.problems.push({
                location: { offset: node.offset, length: node.length },
                message: _vscode_l10n__WEBPACK_IMPORTED_MODULE_4__.t('Array has too many items. Expected {0} or fewer.', schema.maxItems)
            });
        }
        if (schema.uniqueItems === true) {
            const values = getNodeValue(node);
            function hasDuplicates() {
                for (let i = 0; i < values.length - 1; i++) {
                    const value = values[i];
                    for (let j = i + 1; j < values.length; j++) {
                        if ((0,_utils_objects__WEBPACK_IMPORTED_MODULE_1__.equals)(value, values[j])) {
                            return true;
                        }
                    }
                }
                return false;
            }
            if (hasDuplicates()) {
                validationResult.problems.push({
                    location: { offset: node.offset, length: node.length },
                    message: _vscode_l10n__WEBPACK_IMPORTED_MODULE_4__.t('Array has duplicate items.')
                });
            }
        }
    }
    function _validateObjectNode(node) {
        const seenKeys = Object.create(null);
        const unprocessedProperties = new Set();
        for (const propertyNode of node.properties) {
            const key = propertyNode.keyNode.value;
            seenKeys[key] = propertyNode.valueNode;
            unprocessedProperties.add(key);
        }
        if (Array.isArray(schema.required)) {
            for (const propertyName of schema.required) {
                if (!seenKeys[propertyName]) {
                    const keyNode = node.parent && node.parent.type === 'property' && node.parent.keyNode;
                    const location = keyNode ? { offset: keyNode.offset, length: keyNode.length } : { offset: node.offset, length: 1 };
                    validationResult.problems.push({
                        location: location,
                        message: _vscode_l10n__WEBPACK_IMPORTED_MODULE_4__.t('Missing property "{0}".', propertyName)
                    });
                }
            }
        }
        const propertyProcessed = (prop) => {
            unprocessedProperties.delete(prop);
            validationResult.processedProperties.add(prop);
        };
        if (schema.properties) {
            for (const propertyName of Object.keys(schema.properties)) {
                propertyProcessed(propertyName);
                const propertySchema = schema.properties[propertyName];
                const child = seenKeys[propertyName];
                if (child) {
                    if ((0,_utils_objects__WEBPACK_IMPORTED_MODULE_1__.isBoolean)(propertySchema)) {
                        if (!propertySchema) {
                            const propertyNode = child.parent;
                            validationResult.problems.push({
                                location: { offset: propertyNode.keyNode.offset, length: propertyNode.keyNode.length },
                                message: schema.errorMessage || _vscode_l10n__WEBPACK_IMPORTED_MODULE_4__.t('Property {0} is not allowed.', propertyName)
                            });
                        }
                        else {
                            validationResult.propertiesMatches++;
                            validationResult.propertiesValueMatches++;
                        }
                    }
                    else {
                        const propertyValidationResult = new ValidationResult();
                        validate(child, propertySchema, propertyValidationResult, matchingSchemas, context);
                        validationResult.mergePropertyMatch(propertyValidationResult);
                    }
                }
            }
        }
        if (schema.patternProperties) {
            for (const propertyPattern of Object.keys(schema.patternProperties)) {
                const regex = (0,_utils_strings__WEBPACK_IMPORTED_MODULE_2__.extendedRegExp)(propertyPattern);
                if (regex) {
                    const processed = [];
                    for (const propertyName of unprocessedProperties) {
                        if (regex.test(propertyName)) {
                            processed.push(propertyName);
                            const child = seenKeys[propertyName];
                            if (child) {
                                const propertySchema = schema.patternProperties[propertyPattern];
                                if ((0,_utils_objects__WEBPACK_IMPORTED_MODULE_1__.isBoolean)(propertySchema)) {
                                    if (!propertySchema) {
                                        const propertyNode = child.parent;
                                        validationResult.problems.push({
                                            location: { offset: propertyNode.keyNode.offset, length: propertyNode.keyNode.length },
                                            message: schema.errorMessage || _vscode_l10n__WEBPACK_IMPORTED_MODULE_4__.t('Property {0} is not allowed.', propertyName)
                                        });
                                    }
                                    else {
                                        validationResult.propertiesMatches++;
                                        validationResult.propertiesValueMatches++;
                                    }
                                }
                                else {
                                    const propertyValidationResult = new ValidationResult();
                                    validate(child, propertySchema, propertyValidationResult, matchingSchemas, context);
                                    validationResult.mergePropertyMatch(propertyValidationResult);
                                }
                            }
                        }
                    }
                    processed.forEach(propertyProcessed);
                }
            }
        }
        const additionalProperties = schema.additionalProperties;
        if (additionalProperties !== undefined) {
            for (const propertyName of unprocessedProperties) {
                propertyProcessed(propertyName);
                const child = seenKeys[propertyName];
                if (child) {
                    if (additionalProperties === false) {
                        const propertyNode = child.parent;
                        validationResult.problems.push({
                            location: { offset: propertyNode.keyNode.offset, length: propertyNode.keyNode.length },
                            message: schema.errorMessage || _vscode_l10n__WEBPACK_IMPORTED_MODULE_4__.t('Property {0} is not allowed.', propertyName)
                        });
                    }
                    else if (additionalProperties !== true) {
                        const propertyValidationResult = new ValidationResult();
                        validate(child, additionalProperties, propertyValidationResult, matchingSchemas, context);
                        validationResult.mergePropertyMatch(propertyValidationResult);
                    }
                }
            }
        }
        const unevaluatedProperties = schema.unevaluatedProperties;
        if (unevaluatedProperties !== undefined) {
            const processed = [];
            for (const propertyName of unprocessedProperties) {
                if (!validationResult.processedProperties.has(propertyName)) {
                    processed.push(propertyName);
                    const child = seenKeys[propertyName];
                    if (child) {
                        if (unevaluatedProperties === false) {
                            const propertyNode = child.parent;
                            validationResult.problems.push({
                                location: { offset: propertyNode.keyNode.offset, length: propertyNode.keyNode.length },
                                message: schema.errorMessage || _vscode_l10n__WEBPACK_IMPORTED_MODULE_4__.t('Property {0} is not allowed.', propertyName)
                            });
                        }
                        else if (unevaluatedProperties !== true) {
                            const propertyValidationResult = new ValidationResult();
                            validate(child, unevaluatedProperties, propertyValidationResult, matchingSchemas, context);
                            validationResult.mergePropertyMatch(propertyValidationResult);
                        }
                    }
                }
            }
            processed.forEach(propertyProcessed);
        }
        if ((0,_utils_objects__WEBPACK_IMPORTED_MODULE_1__.isNumber)(schema.maxProperties)) {
            if (node.properties.length > schema.maxProperties) {
                validationResult.problems.push({
                    location: { offset: node.offset, length: node.length },
                    message: _vscode_l10n__WEBPACK_IMPORTED_MODULE_4__.t('Object has more properties than limit of {0}.', schema.maxProperties)
                });
            }
        }
        if ((0,_utils_objects__WEBPACK_IMPORTED_MODULE_1__.isNumber)(schema.minProperties)) {
            if (node.properties.length < schema.minProperties) {
                validationResult.problems.push({
                    location: { offset: node.offset, length: node.length },
                    message: _vscode_l10n__WEBPACK_IMPORTED_MODULE_4__.t('Object has fewer properties than the required number of {0}', schema.minProperties)
                });
            }
        }
        if (schema.dependentRequired) {
            for (const key in schema.dependentRequired) {
                const prop = seenKeys[key];
                const propertyDeps = schema.dependentRequired[key];
                if (prop && Array.isArray(propertyDeps)) {
                    _validatePropertyDependencies(key, propertyDeps);
                }
            }
        }
        if (schema.dependentSchemas) {
            for (const key in schema.dependentSchemas) {
                const prop = seenKeys[key];
                const propertyDeps = schema.dependentSchemas[key];
                if (prop && (0,_utils_objects__WEBPACK_IMPORTED_MODULE_1__.isObject)(propertyDeps)) {
                    _validatePropertyDependencies(key, propertyDeps);
                }
            }
        }
        if (schema.dependencies) {
            for (const key in schema.dependencies) {
                const prop = seenKeys[key];
                if (prop) {
                    _validatePropertyDependencies(key, schema.dependencies[key]);
                }
            }
        }
        const propertyNames = asSchema(schema.propertyNames);
        if (propertyNames) {
            for (const f of node.properties) {
                const key = f.keyNode;
                if (key) {
                    validate(key, propertyNames, validationResult, NoOpSchemaCollector.instance, context);
                }
            }
        }
        function _validatePropertyDependencies(key, propertyDep) {
            if (Array.isArray(propertyDep)) {
                for (const requiredProp of propertyDep) {
                    if (!seenKeys[requiredProp]) {
                        validationResult.problems.push({
                            location: { offset: node.offset, length: node.length },
                            message: _vscode_l10n__WEBPACK_IMPORTED_MODULE_4__.t('Object is missing property {0} required by property {1}.', requiredProp, key)
                        });
                    }
                    else {
                        validationResult.propertiesValueMatches++;
                    }
                }
            }
            else {
                const propertySchema = asSchema(propertyDep);
                if (propertySchema) {
                    const propertyValidationResult = new ValidationResult();
                    validate(node, propertySchema, propertyValidationResult, matchingSchemas, context);
                    validationResult.mergePropertyMatch(propertyValidationResult);
                }
            }
        }
    }
}
function parse(textDocument, config) {
    const problems = [];
    let lastProblemOffset = -1;
    const text = textDocument.getText();
    const scanner = jsonc_parser__WEBPACK_IMPORTED_MODULE_0__.createScanner(text, false);
    const commentRanges = config && config.collectComments ? [] : undefined;
    function _scanNext() {
        while (true) {
            const token = scanner.scan();
            _checkScanError();
            switch (token) {
                case 12 /* Json.SyntaxKind.LineCommentTrivia */:
                case 13 /* Json.SyntaxKind.BlockCommentTrivia */:
                    if (Array.isArray(commentRanges)) {
                        commentRanges.push(_jsonLanguageTypes__WEBPACK_IMPORTED_MODULE_3__.Range.create(textDocument.positionAt(scanner.getTokenOffset()), textDocument.positionAt(scanner.getTokenOffset() + scanner.getTokenLength())));
                    }
                    break;
                case 15 /* Json.SyntaxKind.Trivia */:
                case 14 /* Json.SyntaxKind.LineBreakTrivia */:
                    break;
                default:
                    return token;
            }
        }
    }
    function _accept(token) {
        if (scanner.getToken() === token) {
            _scanNext();
            return true;
        }
        return false;
    }
    function _errorAtRange(message, code, startOffset, endOffset, severity = _jsonLanguageTypes__WEBPACK_IMPORTED_MODULE_3__.DiagnosticSeverity.Error) {
        if (problems.length === 0 || startOffset !== lastProblemOffset) {
            const range = _jsonLanguageTypes__WEBPACK_IMPORTED_MODULE_3__.Range.create(textDocument.positionAt(startOffset), textDocument.positionAt(endOffset));
            problems.push(_jsonLanguageTypes__WEBPACK_IMPORTED_MODULE_3__.Diagnostic.create(range, message, severity, code, textDocument.languageId));
            lastProblemOffset = startOffset;
        }
    }
    function _error(message, code, node = undefined, skipUntilAfter = [], skipUntil = []) {
        let start = scanner.getTokenOffset();
        let end = scanner.getTokenOffset() + scanner.getTokenLength();
        if (start === end && start > 0) {
            start--;
            while (start > 0 && /\s/.test(text.charAt(start))) {
                start--;
            }
            end = start + 1;
        }
        _errorAtRange(message, code, start, end);
        if (node) {
            _finalize(node, false);
        }
        if (skipUntilAfter.length + skipUntil.length > 0) {
            let token = scanner.getToken();
            while (token !== 17 /* Json.SyntaxKind.EOF */) {
                if (skipUntilAfter.indexOf(token) !== -1) {
                    _scanNext();
                    break;
                }
                else if (skipUntil.indexOf(token) !== -1) {
                    break;
                }
                token = _scanNext();
            }
        }
        return node;
    }
    function _checkScanError() {
        switch (scanner.getTokenError()) {
            case 4 /* Json.ScanError.InvalidUnicode */:
                _error(_vscode_l10n__WEBPACK_IMPORTED_MODULE_4__.t('Invalid unicode sequence in string.'), _jsonLanguageTypes__WEBPACK_IMPORTED_MODULE_3__.ErrorCode.InvalidUnicode);
                return true;
            case 5 /* Json.ScanError.InvalidEscapeCharacter */:
                _error(_vscode_l10n__WEBPACK_IMPORTED_MODULE_4__.t('Invalid escape character in string.'), _jsonLanguageTypes__WEBPACK_IMPORTED_MODULE_3__.ErrorCode.InvalidEscapeCharacter);
                return true;
            case 3 /* Json.ScanError.UnexpectedEndOfNumber */:
                _error(_vscode_l10n__WEBPACK_IMPORTED_MODULE_4__.t('Unexpected end of number.'), _jsonLanguageTypes__WEBPACK_IMPORTED_MODULE_3__.ErrorCode.UnexpectedEndOfNumber);
                return true;
            case 1 /* Json.ScanError.UnexpectedEndOfComment */:
                _error(_vscode_l10n__WEBPACK_IMPORTED_MODULE_4__.t('Unexpected end of comment.'), _jsonLanguageTypes__WEBPACK_IMPORTED_MODULE_3__.ErrorCode.UnexpectedEndOfComment);
                return true;
            case 2 /* Json.ScanError.UnexpectedEndOfString */:
                _error(_vscode_l10n__WEBPACK_IMPORTED_MODULE_4__.t('Unexpected end of string.'), _jsonLanguageTypes__WEBPACK_IMPORTED_MODULE_3__.ErrorCode.UnexpectedEndOfString);
                return true;
            case 6 /* Json.ScanError.InvalidCharacter */:
                _error(_vscode_l10n__WEBPACK_IMPORTED_MODULE_4__.t('Invalid characters in string. Control characters must be escaped.'), _jsonLanguageTypes__WEBPACK_IMPORTED_MODULE_3__.ErrorCode.InvalidCharacter);
                return true;
        }
        return false;
    }
    function _finalize(node, scanNext) {
        node.length = scanner.getTokenOffset() + scanner.getTokenLength() - node.offset;
        if (scanNext) {
            _scanNext();
        }
        return node;
    }
    function _parseArray(parent) {
        if (scanner.getToken() !== 3 /* Json.SyntaxKind.OpenBracketToken */) {
            return undefined;
        }
        const node = new ArrayASTNodeImpl(parent, scanner.getTokenOffset());
        _scanNext(); // consume OpenBracketToken
        const count = 0;
        let needsComma = false;
        while (scanner.getToken() !== 4 /* Json.SyntaxKind.CloseBracketToken */ && scanner.getToken() !== 17 /* Json.SyntaxKind.EOF */) {
            if (scanner.getToken() === 5 /* Json.SyntaxKind.CommaToken */) {
                if (!needsComma) {
                    _error(_vscode_l10n__WEBPACK_IMPORTED_MODULE_4__.t('Value expected'), _jsonLanguageTypes__WEBPACK_IMPORTED_MODULE_3__.ErrorCode.ValueExpected);
                }
                const commaOffset = scanner.getTokenOffset();
                _scanNext(); // consume comma
                if (scanner.getToken() === 4 /* Json.SyntaxKind.CloseBracketToken */) {
                    if (needsComma) {
                        _errorAtRange(_vscode_l10n__WEBPACK_IMPORTED_MODULE_4__.t('Trailing comma'), _jsonLanguageTypes__WEBPACK_IMPORTED_MODULE_3__.ErrorCode.TrailingComma, commaOffset, commaOffset + 1);
                    }
                    continue;
                }
            }
            else if (needsComma) {
                _error(_vscode_l10n__WEBPACK_IMPORTED_MODULE_4__.t('Expected comma'), _jsonLanguageTypes__WEBPACK_IMPORTED_MODULE_3__.ErrorCode.CommaExpected);
            }
            const item = _parseValue(node);
            if (!item) {
                _error(_vscode_l10n__WEBPACK_IMPORTED_MODULE_4__.t('Value expected'), _jsonLanguageTypes__WEBPACK_IMPORTED_MODULE_3__.ErrorCode.ValueExpected, undefined, [], [4 /* Json.SyntaxKind.CloseBracketToken */, 5 /* Json.SyntaxKind.CommaToken */]);
            }
            else {
                node.items.push(item);
            }
            needsComma = true;
        }
        if (scanner.getToken() !== 4 /* Json.SyntaxKind.CloseBracketToken */) {
            return _error(_vscode_l10n__WEBPACK_IMPORTED_MODULE_4__.t('Expected comma or closing bracket'), _jsonLanguageTypes__WEBPACK_IMPORTED_MODULE_3__.ErrorCode.CommaOrCloseBacketExpected, node);
        }
        return _finalize(node, true);
    }
    const keyPlaceholder = new StringASTNodeImpl(undefined, 0, 0);
    function _parseProperty(parent, keysSeen) {
        const node = new PropertyASTNodeImpl(parent, scanner.getTokenOffset(), keyPlaceholder);
        let key = _parseString(node);
        if (!key) {
            if (scanner.getToken() === 16 /* Json.SyntaxKind.Unknown */) {
                // give a more helpful error message
                _error(_vscode_l10n__WEBPACK_IMPORTED_MODULE_4__.t('Property keys must be doublequoted'), _jsonLanguageTypes__WEBPACK_IMPORTED_MODULE_3__.ErrorCode.PropertyKeysMustBeDoublequoted);
                const keyNode = new StringASTNodeImpl(node, scanner.getTokenOffset(), scanner.getTokenLength());
                keyNode.value = scanner.getTokenValue();
                key = keyNode;
                _scanNext(); // consume Unknown
            }
            else {
                return undefined;
            }
        }
        node.keyNode = key;
        // For JSON files that forbid code comments, there is a convention to use the key name "//" to add comments.
        // Multiple instances of "//" are okay.
        if (key.value !== "//") {
            const seen = keysSeen[key.value];
            if (seen) {
                _errorAtRange(_vscode_l10n__WEBPACK_IMPORTED_MODULE_4__.t("Duplicate object key"), _jsonLanguageTypes__WEBPACK_IMPORTED_MODULE_3__.ErrorCode.DuplicateKey, node.keyNode.offset, node.keyNode.offset + node.keyNode.length, _jsonLanguageTypes__WEBPACK_IMPORTED_MODULE_3__.DiagnosticSeverity.Warning);
                if ((0,_utils_objects__WEBPACK_IMPORTED_MODULE_1__.isObject)(seen)) {
                    _errorAtRange(_vscode_l10n__WEBPACK_IMPORTED_MODULE_4__.t("Duplicate object key"), _jsonLanguageTypes__WEBPACK_IMPORTED_MODULE_3__.ErrorCode.DuplicateKey, seen.keyNode.offset, seen.keyNode.offset + seen.keyNode.length, _jsonLanguageTypes__WEBPACK_IMPORTED_MODULE_3__.DiagnosticSeverity.Warning);
                }
                keysSeen[key.value] = true; // if the same key is duplicate again, avoid duplicate error reporting
            }
            else {
                keysSeen[key.value] = node;
            }
        }
        if (scanner.getToken() === 6 /* Json.SyntaxKind.ColonToken */) {
            node.colonOffset = scanner.getTokenOffset();
            _scanNext(); // consume ColonToken
        }
        else {
            _error(_vscode_l10n__WEBPACK_IMPORTED_MODULE_4__.t('Colon expected'), _jsonLanguageTypes__WEBPACK_IMPORTED_MODULE_3__.ErrorCode.ColonExpected);
            if (scanner.getToken() === 10 /* Json.SyntaxKind.StringLiteral */ && textDocument.positionAt(key.offset + key.length).line < textDocument.positionAt(scanner.getTokenOffset()).line) {
                node.length = key.length;
                return node;
            }
        }
        const value = _parseValue(node);
        if (!value) {
            return _error(_vscode_l10n__WEBPACK_IMPORTED_MODULE_4__.t('Value expected'), _jsonLanguageTypes__WEBPACK_IMPORTED_MODULE_3__.ErrorCode.ValueExpected, node, [], [2 /* Json.SyntaxKind.CloseBraceToken */, 5 /* Json.SyntaxKind.CommaToken */]);
        }
        node.valueNode = value;
        node.length = value.offset + value.length - node.offset;
        return node;
    }
    function _parseObject(parent) {
        if (scanner.getToken() !== 1 /* Json.SyntaxKind.OpenBraceToken */) {
            return undefined;
        }
        const node = new ObjectASTNodeImpl(parent, scanner.getTokenOffset());
        const keysSeen = Object.create(null);
        _scanNext(); // consume OpenBraceToken
        let needsComma = false;
        while (scanner.getToken() !== 2 /* Json.SyntaxKind.CloseBraceToken */ && scanner.getToken() !== 17 /* Json.SyntaxKind.EOF */) {
            if (scanner.getToken() === 5 /* Json.SyntaxKind.CommaToken */) {
                if (!needsComma) {
                    _error(_vscode_l10n__WEBPACK_IMPORTED_MODULE_4__.t('Property expected'), _jsonLanguageTypes__WEBPACK_IMPORTED_MODULE_3__.ErrorCode.PropertyExpected);
                }
                const commaOffset = scanner.getTokenOffset();
                _scanNext(); // consume comma
                if (scanner.getToken() === 2 /* Json.SyntaxKind.CloseBraceToken */) {
                    if (needsComma) {
                        _errorAtRange(_vscode_l10n__WEBPACK_IMPORTED_MODULE_4__.t('Trailing comma'), _jsonLanguageTypes__WEBPACK_IMPORTED_MODULE_3__.ErrorCode.TrailingComma, commaOffset, commaOffset + 1);
                    }
                    continue;
                }
            }
            else if (needsComma) {
                _error(_vscode_l10n__WEBPACK_IMPORTED_MODULE_4__.t('Expected comma'), _jsonLanguageTypes__WEBPACK_IMPORTED_MODULE_3__.ErrorCode.CommaExpected);
            }
            const property = _parseProperty(node, keysSeen);
            if (!property) {
                _error(_vscode_l10n__WEBPACK_IMPORTED_MODULE_4__.t('Property expected'), _jsonLanguageTypes__WEBPACK_IMPORTED_MODULE_3__.ErrorCode.PropertyExpected, undefined, [], [2 /* Json.SyntaxKind.CloseBraceToken */, 5 /* Json.SyntaxKind.CommaToken */]);
            }
            else {
                node.properties.push(property);
            }
            needsComma = true;
        }
        if (scanner.getToken() !== 2 /* Json.SyntaxKind.CloseBraceToken */) {
            return _error(_vscode_l10n__WEBPACK_IMPORTED_MODULE_4__.t('Expected comma or closing brace'), _jsonLanguageTypes__WEBPACK_IMPORTED_MODULE_3__.ErrorCode.CommaOrCloseBraceExpected, node);
        }
        return _finalize(node, true);
    }
    function _parseString(parent) {
        if (scanner.getToken() !== 10 /* Json.SyntaxKind.StringLiteral */) {
            return undefined;
        }
        const node = new StringASTNodeImpl(parent, scanner.getTokenOffset());
        node.value = scanner.getTokenValue();
        return _finalize(node, true);
    }
    function _parseNumber(parent) {
        if (scanner.getToken() !== 11 /* Json.SyntaxKind.NumericLiteral */) {
            return undefined;
        }
        const node = new NumberASTNodeImpl(parent, scanner.getTokenOffset());
        if (scanner.getTokenError() === 0 /* Json.ScanError.None */) {
            const tokenValue = scanner.getTokenValue();
            try {
                const numberValue = JSON.parse(tokenValue);
                if (!(0,_utils_objects__WEBPACK_IMPORTED_MODULE_1__.isNumber)(numberValue)) {
                    return _error(_vscode_l10n__WEBPACK_IMPORTED_MODULE_4__.t('Invalid number format.'), _jsonLanguageTypes__WEBPACK_IMPORTED_MODULE_3__.ErrorCode.Undefined, node);
                }
                node.value = numberValue;
            }
            catch (e) {
                return _error(_vscode_l10n__WEBPACK_IMPORTED_MODULE_4__.t('Invalid number format.'), _jsonLanguageTypes__WEBPACK_IMPORTED_MODULE_3__.ErrorCode.Undefined, node);
            }
            node.isInteger = tokenValue.indexOf('.') === -1;
        }
        return _finalize(node, true);
    }
    function _parseLiteral(parent) {
        let node;
        switch (scanner.getToken()) {
            case 7 /* Json.SyntaxKind.NullKeyword */:
                return _finalize(new NullASTNodeImpl(parent, scanner.getTokenOffset()), true);
            case 8 /* Json.SyntaxKind.TrueKeyword */:
                return _finalize(new BooleanASTNodeImpl(parent, true, scanner.getTokenOffset()), true);
            case 9 /* Json.SyntaxKind.FalseKeyword */:
                return _finalize(new BooleanASTNodeImpl(parent, false, scanner.getTokenOffset()), true);
            default:
                return undefined;
        }
    }
    function _parseValue(parent) {
        return _parseArray(parent) || _parseObject(parent) || _parseString(parent) || _parseNumber(parent) || _parseLiteral(parent);
    }
    let _root = undefined;
    const token = _scanNext();
    if (token !== 17 /* Json.SyntaxKind.EOF */) {
        _root = _parseValue(_root);
        if (!_root) {
            _error(_vscode_l10n__WEBPACK_IMPORTED_MODULE_4__.t('Expected a JSON object, array or literal.'), _jsonLanguageTypes__WEBPACK_IMPORTED_MODULE_3__.ErrorCode.Undefined);
        }
        else if (scanner.getToken() !== 17 /* Json.SyntaxKind.EOF */) {
            _error(_vscode_l10n__WEBPACK_IMPORTED_MODULE_4__.t('End of file expected.'), _jsonLanguageTypes__WEBPACK_IMPORTED_MODULE_3__.ErrorCode.Undefined);
        }
    }
    return new JSONDocument(_root, problems, commentRanges);
}


}),
3720: (function (__unused_webpack_module, __webpack_exports__, __webpack_require__) {
__webpack_require__.r(__webpack_exports__);
__webpack_require__.d(__webpack_exports__, {
  schemaContributions: () => (schemaContributions)
});
/* ESM import */var _vscode_l10n__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(3714);
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

const schemaContributions = {
    schemaAssociations: [],
    schemas: {
        // bundle the schema-schema to include (localized) descriptions
        'https://json-schema.org/draft-04/schema': {
            'definitions': {
                'schemaArray': {
                    'type': 'array',
                    'minItems': 1,
                    'items': {
                        '$ref': '#'
                    }
                },
                'positiveInteger': {
                    'type': 'integer',
                    'minimum': 0
                },
                'positiveIntegerDefault0': {
                    'allOf': [
                        {
                            '$ref': '#/definitions/positiveInteger'
                        },
                        {
                            'default': 0
                        }
                    ]
                },
                'simpleTypes': {
                    'type': 'string',
                    'enum': [
                        'array',
                        'boolean',
                        'integer',
                        'null',
                        'number',
                        'object',
                        'string'
                    ]
                },
                'stringArray': {
                    'type': 'array',
                    'items': {
                        'type': 'string'
                    },
                    'minItems': 1,
                    'uniqueItems': true
                }
            },
            'type': 'object',
            'properties': {
                'id': {
                    'type': 'string',
                    'format': 'uri'
                },
                '$schema': {
                    'type': 'string',
                    'format': 'uri'
                },
                'title': {
                    'type': 'string'
                },
                'description': {
                    'type': 'string'
                },
                'default': {},
                'multipleOf': {
                    'type': 'number',
                    'minimum': 0,
                    'exclusiveMinimum': true
                },
                'maximum': {
                    'type': 'number'
                },
                'exclusiveMaximum': {
                    'type': 'boolean',
                    'default': false
                },
                'minimum': {
                    'type': 'number'
                },
                'exclusiveMinimum': {
                    'type': 'boolean',
                    'default': false
                },
                'maxLength': {
                    'allOf': [
                        {
                            '$ref': '#/definitions/positiveInteger'
                        }
                    ]
                },
                'minLength': {
                    'allOf': [
                        {
                            '$ref': '#/definitions/positiveIntegerDefault0'
                        }
                    ]
                },
                'pattern': {
                    'type': 'string',
                    'format': 'regex'
                },
                'additionalItems': {
                    'anyOf': [
                        {
                            'type': 'boolean'
                        },
                        {
                            '$ref': '#'
                        }
                    ],
                    'default': {}
                },
                'items': {
                    'anyOf': [
                        {
                            '$ref': '#'
                        },
                        {
                            '$ref': '#/definitions/schemaArray'
                        }
                    ],
                    'default': {}
                },
                'maxItems': {
                    'allOf': [
                        {
                            '$ref': '#/definitions/positiveInteger'
                        }
                    ]
                },
                'minItems': {
                    'allOf': [
                        {
                            '$ref': '#/definitions/positiveIntegerDefault0'
                        }
                    ]
                },
                'uniqueItems': {
                    'type': 'boolean',
                    'default': false
                },
                'maxProperties': {
                    'allOf': [
                        {
                            '$ref': '#/definitions/positiveInteger'
                        }
                    ]
                },
                'minProperties': {
                    'allOf': [
                        {
                            '$ref': '#/definitions/positiveIntegerDefault0'
                        }
                    ]
                },
                'required': {
                    'allOf': [
                        {
                            '$ref': '#/definitions/stringArray'
                        }
                    ]
                },
                'additionalProperties': {
                    'anyOf': [
                        {
                            'type': 'boolean'
                        },
                        {
                            '$ref': '#'
                        }
                    ],
                    'default': {}
                },
                'definitions': {
                    'type': 'object',
                    'additionalProperties': {
                        '$ref': '#'
                    },
                    'default': {}
                },
                'properties': {
                    'type': 'object',
                    'additionalProperties': {
                        '$ref': '#'
                    },
                    'default': {}
                },
                'patternProperties': {
                    'type': 'object',
                    'additionalProperties': {
                        '$ref': '#'
                    },
                    'default': {}
                },
                'dependencies': {
                    'type': 'object',
                    'additionalProperties': {
                        'anyOf': [
                            {
                                '$ref': '#'
                            },
                            {
                                '$ref': '#/definitions/stringArray'
                            }
                        ]
                    }
                },
                'enum': {
                    'type': 'array',
                    'minItems': 1,
                    'uniqueItems': true
                },
                'type': {
                    'anyOf': [
                        {
                            '$ref': '#/definitions/simpleTypes'
                        },
                        {
                            'type': 'array',
                            'items': {
                                '$ref': '#/definitions/simpleTypes'
                            },
                            'minItems': 1,
                            'uniqueItems': true
                        }
                    ]
                },
                'format': {
                    'anyOf': [
                        {
                            'type': 'string',
                            'enum': [
                                'date-time',
                                'uri',
                                'email',
                                'hostname',
                                'ipv4',
                                'ipv6',
                                'regex'
                            ]
                        },
                        {
                            'type': 'string'
                        }
                    ]
                },
                'allOf': {
                    'allOf': [
                        {
                            '$ref': '#/definitions/schemaArray'
                        }
                    ]
                },
                'anyOf': {
                    'allOf': [
                        {
                            '$ref': '#/definitions/schemaArray'
                        }
                    ]
                },
                'oneOf': {
                    'allOf': [
                        {
                            '$ref': '#/definitions/schemaArray'
                        }
                    ]
                },
                'not': {
                    'allOf': [
                        {
                            '$ref': '#'
                        }
                    ]
                }
            },
            'dependencies': {
                'exclusiveMaximum': [
                    'maximum'
                ],
                'exclusiveMinimum': [
                    'minimum'
                ]
            },
            'default': {}
        },
        'https://json-schema.org/draft-07/schema': {
            'definitions': {
                'schemaArray': {
                    'type': 'array',
                    'minItems': 1,
                    'items': { '$ref': '#' }
                },
                'nonNegativeInteger': {
                    'type': 'integer',
                    'minimum': 0
                },
                'nonNegativeIntegerDefault0': {
                    'allOf': [
                        { '$ref': '#/definitions/nonNegativeInteger' },
                        { 'default': 0 }
                    ]
                },
                'simpleTypes': {
                    'enum': [
                        'array',
                        'boolean',
                        'integer',
                        'null',
                        'number',
                        'object',
                        'string'
                    ]
                },
                'stringArray': {
                    'type': 'array',
                    'items': { 'type': 'string' },
                    'uniqueItems': true,
                    'default': []
                }
            },
            'type': ['object', 'boolean'],
            'properties': {
                '$id': {
                    'type': 'string',
                    'format': 'uri-reference'
                },
                '$schema': {
                    'type': 'string',
                    'format': 'uri'
                },
                '$ref': {
                    'type': 'string',
                    'format': 'uri-reference'
                },
                '$comment': {
                    'type': 'string'
                },
                'title': {
                    'type': 'string'
                },
                'description': {
                    'type': 'string'
                },
                'default': true,
                'readOnly': {
                    'type': 'boolean',
                    'default': false
                },
                'examples': {
                    'type': 'array',
                    'items': true
                },
                'multipleOf': {
                    'type': 'number',
                    'exclusiveMinimum': 0
                },
                'maximum': {
                    'type': 'number'
                },
                'exclusiveMaximum': {
                    'type': 'number'
                },
                'minimum': {
                    'type': 'number'
                },
                'exclusiveMinimum': {
                    'type': 'number'
                },
                'maxLength': { '$ref': '#/definitions/nonNegativeInteger' },
                'minLength': { '$ref': '#/definitions/nonNegativeIntegerDefault0' },
                'pattern': {
                    'type': 'string',
                    'format': 'regex'
                },
                'additionalItems': { '$ref': '#' },
                'items': {
                    'anyOf': [
                        { '$ref': '#' },
                        { '$ref': '#/definitions/schemaArray' }
                    ],
                    'default': true
                },
                'maxItems': { '$ref': '#/definitions/nonNegativeInteger' },
                'minItems': { '$ref': '#/definitions/nonNegativeIntegerDefault0' },
                'uniqueItems': {
                    'type': 'boolean',
                    'default': false
                },
                'contains': { '$ref': '#' },
                'maxProperties': { '$ref': '#/definitions/nonNegativeInteger' },
                'minProperties': { '$ref': '#/definitions/nonNegativeIntegerDefault0' },
                'required': { '$ref': '#/definitions/stringArray' },
                'additionalProperties': { '$ref': '#' },
                'definitions': {
                    'type': 'object',
                    'additionalProperties': { '$ref': '#' },
                    'default': {}
                },
                'properties': {
                    'type': 'object',
                    'additionalProperties': { '$ref': '#' },
                    'default': {}
                },
                'patternProperties': {
                    'type': 'object',
                    'additionalProperties': { '$ref': '#' },
                    'propertyNames': { 'format': 'regex' },
                    'default': {}
                },
                'dependencies': {
                    'type': 'object',
                    'additionalProperties': {
                        'anyOf': [
                            { '$ref': '#' },
                            { '$ref': '#/definitions/stringArray' }
                        ]
                    }
                },
                'propertyNames': { '$ref': '#' },
                'const': true,
                'enum': {
                    'type': 'array',
                    'items': true,
                    'minItems': 1,
                    'uniqueItems': true
                },
                'type': {
                    'anyOf': [
                        { '$ref': '#/definitions/simpleTypes' },
                        {
                            'type': 'array',
                            'items': { '$ref': '#/definitions/simpleTypes' },
                            'minItems': 1,
                            'uniqueItems': true
                        }
                    ]
                },
                'format': { 'type': 'string' },
                'contentMediaType': { 'type': 'string' },
                'contentEncoding': { 'type': 'string' },
                'if': { '$ref': '#' },
                'then': { '$ref': '#' },
                'else': { '$ref': '#' },
                'allOf': { '$ref': '#/definitions/schemaArray' },
                'anyOf': { '$ref': '#/definitions/schemaArray' },
                'oneOf': { '$ref': '#/definitions/schemaArray' },
                'not': { '$ref': '#' }
            },
            'default': true
        }
    }
};
const descriptions = {
    id: _vscode_l10n__WEBPACK_IMPORTED_MODULE_0__.t("A unique identifier for the schema."),
    $schema: _vscode_l10n__WEBPACK_IMPORTED_MODULE_0__.t("The schema to verify this document against."),
    title: _vscode_l10n__WEBPACK_IMPORTED_MODULE_0__.t("A descriptive title of the schema."),
    description: _vscode_l10n__WEBPACK_IMPORTED_MODULE_0__.t("A long description of the schema. Used in hover menus and suggestions."),
    default: _vscode_l10n__WEBPACK_IMPORTED_MODULE_0__.t("A default value. Used by suggestions."),
    multipleOf: _vscode_l10n__WEBPACK_IMPORTED_MODULE_0__.t("A number that should cleanly divide the current value (i.e. have no remainder)."),
    maximum: _vscode_l10n__WEBPACK_IMPORTED_MODULE_0__.t("The maximum numerical value, inclusive by default."),
    exclusiveMaximum: _vscode_l10n__WEBPACK_IMPORTED_MODULE_0__.t("Makes the maximum property exclusive."),
    minimum: _vscode_l10n__WEBPACK_IMPORTED_MODULE_0__.t("The minimum numerical value, inclusive by default."),
    exclusiveMinimum: _vscode_l10n__WEBPACK_IMPORTED_MODULE_0__.t("Makes the minimum property exclusive."),
    maxLength: _vscode_l10n__WEBPACK_IMPORTED_MODULE_0__.t("The maximum length of a string."),
    minLength: _vscode_l10n__WEBPACK_IMPORTED_MODULE_0__.t("The minimum length of a string."),
    pattern: _vscode_l10n__WEBPACK_IMPORTED_MODULE_0__.t("A regular expression to match the string against. It is not implicitly anchored."),
    additionalItems: _vscode_l10n__WEBPACK_IMPORTED_MODULE_0__.t("For arrays, only when items is set as an array. If items are a schema, this schema validates items after the ones specified by the items schema. If false, additional items will cause validation to fail."),
    items: _vscode_l10n__WEBPACK_IMPORTED_MODULE_0__.t("For arrays. Can either be a schema to validate every element against or an array of schemas to validate each item against in order (the first schema will validate the first element, the second schema will validate the second element, and so on."),
    maxItems: _vscode_l10n__WEBPACK_IMPORTED_MODULE_0__.t("The maximum number of items that can be inside an array. Inclusive."),
    minItems: _vscode_l10n__WEBPACK_IMPORTED_MODULE_0__.t("The minimum number of items that can be inside an array. Inclusive."),
    uniqueItems: _vscode_l10n__WEBPACK_IMPORTED_MODULE_0__.t("If all of the items in the array must be unique. Defaults to false."),
    maxProperties: _vscode_l10n__WEBPACK_IMPORTED_MODULE_0__.t("The maximum number of properties an object can have. Inclusive."),
    minProperties: _vscode_l10n__WEBPACK_IMPORTED_MODULE_0__.t("The minimum number of properties an object can have. Inclusive."),
    required: _vscode_l10n__WEBPACK_IMPORTED_MODULE_0__.t("An array of strings that lists the names of all properties required on this object."),
    additionalProperties: _vscode_l10n__WEBPACK_IMPORTED_MODULE_0__.t("Either a schema or a boolean. If a schema, used to validate all properties not matched by 'properties', 'propertyNames', or 'patternProperties'. If false, any properties not defined by the adajacent keywords will cause this schema to fail."),
    definitions: _vscode_l10n__WEBPACK_IMPORTED_MODULE_0__.t("Not used for validation. Place subschemas here that you wish to reference inline with $ref."),
    properties: _vscode_l10n__WEBPACK_IMPORTED_MODULE_0__.t("A map of property names to schemas for each property."),
    patternProperties: _vscode_l10n__WEBPACK_IMPORTED_MODULE_0__.t("A map of regular expressions on property names to schemas for matching properties."),
    dependencies: _vscode_l10n__WEBPACK_IMPORTED_MODULE_0__.t("A map of property names to either an array of property names or a schema. An array of property names means the property named in the key depends on the properties in the array being present in the object in order to be valid. If the value is a schema, then the schema is only applied to the object if the property in the key exists on the object."),
    enum: _vscode_l10n__WEBPACK_IMPORTED_MODULE_0__.t("The set of literal values that are valid."),
    type: _vscode_l10n__WEBPACK_IMPORTED_MODULE_0__.t("Either a string of one of the basic schema types (number, integer, null, array, object, boolean, string) or an array of strings specifying a subset of those types."),
    format: _vscode_l10n__WEBPACK_IMPORTED_MODULE_0__.t("Describes the format expected for the value. By default, not used for validation"),
    allOf: _vscode_l10n__WEBPACK_IMPORTED_MODULE_0__.t("An array of schemas, all of which must match."),
    anyOf: _vscode_l10n__WEBPACK_IMPORTED_MODULE_0__.t("An array of schemas, where at least one must match."),
    oneOf: _vscode_l10n__WEBPACK_IMPORTED_MODULE_0__.t("An array of schemas, exactly one of which must match."),
    not: _vscode_l10n__WEBPACK_IMPORTED_MODULE_0__.t("A schema which must not match."),
    $id: _vscode_l10n__WEBPACK_IMPORTED_MODULE_0__.t("A unique identifier for the schema."),
    $ref: _vscode_l10n__WEBPACK_IMPORTED_MODULE_0__.t("Reference a definition hosted on any location."),
    $comment: _vscode_l10n__WEBPACK_IMPORTED_MODULE_0__.t("Comments from schema authors to readers or maintainers of the schema."),
    readOnly: _vscode_l10n__WEBPACK_IMPORTED_MODULE_0__.t("Indicates that the value of the instance is managed exclusively by the owning authority."),
    examples: _vscode_l10n__WEBPACK_IMPORTED_MODULE_0__.t("Sample JSON values associated with a particular schema, for the purpose of illustrating usage."),
    contains: _vscode_l10n__WEBPACK_IMPORTED_MODULE_0__.t("An array instance is valid against \"contains\" if at least one of its elements is valid against the given schema."),
    propertyNames: _vscode_l10n__WEBPACK_IMPORTED_MODULE_0__.t("If the instance is an object, this keyword validates if every property name in the instance validates against the provided schema."),
    const: _vscode_l10n__WEBPACK_IMPORTED_MODULE_0__.t("An instance validates successfully against this keyword if its value is equal to the value of the keyword."),
    contentMediaType: _vscode_l10n__WEBPACK_IMPORTED_MODULE_0__.t("Describes the media type of a string property."),
    contentEncoding: _vscode_l10n__WEBPACK_IMPORTED_MODULE_0__.t("Describes the content encoding of a string property."),
    if: _vscode_l10n__WEBPACK_IMPORTED_MODULE_0__.t("The validation outcome of the \"if\" subschema controls which of the \"then\" or \"else\" keywords are evaluated."),
    then: _vscode_l10n__WEBPACK_IMPORTED_MODULE_0__.t("The \"then\" subschema is used for validation when the \"if\" subschema succeeds."),
    else: _vscode_l10n__WEBPACK_IMPORTED_MODULE_0__.t("The \"else\" subschema is used for validation when the \"if\" subschema fails.")
};
for (const schemaName in schemaContributions.schemas) {
    const schema = schemaContributions.schemas[schemaName];
    for (const property in schema.properties) {
        let propertyObject = schema.properties[property];
        if (typeof propertyObject === 'boolean') {
            propertyObject = schema.properties[property] = {};
        }
        const description = descriptions[property];
        if (description) {
            propertyObject['description'] = description;
        }
    }
}


}),
3709: (function (__unused_webpack_module, __webpack_exports__, __webpack_require__) {
__webpack_require__.r(__webpack_exports__);
__webpack_require__.d(__webpack_exports__, {
  JSONCompletion: () => (JSONCompletion)
});
/* ESM import */var _parser_jsonParser__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(3710);
/* ESM import */var jsonc_parser__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(2330);
/* ESM import */var _utils_json__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(3715);
/* ESM import */var _utils_strings__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(3712);
/* ESM import */var _utils_objects__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(3711);
/* ESM import */var _jsonLanguageTypes__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(3713);
/* ESM import */var _vscode_l10n__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(3714);
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/







const valueCommitCharacters = [',', '}', ']'];
const propertyCommitCharacters = [':'];
class JSONCompletion {
    constructor(schemaService, contributions = [], promiseConstructor = Promise, clientCapabilities = {}) {
        this.schemaService = schemaService;
        this.contributions = contributions;
        this.promiseConstructor = promiseConstructor;
        this.clientCapabilities = clientCapabilities;
    }
    doResolve(item) {
        for (let i = this.contributions.length - 1; i >= 0; i--) {
            const resolveCompletion = this.contributions[i].resolveCompletion;
            if (resolveCompletion) {
                const resolver = resolveCompletion(item);
                if (resolver) {
                    return resolver;
                }
            }
        }
        return this.promiseConstructor.resolve(item);
    }
    doComplete(document, position, doc) {
        const result = {
            items: [],
            isIncomplete: false
        };
        const text = document.getText();
        const offset = document.offsetAt(position);
        let node = doc.getNodeFromOffset(offset, true);
        if (this.isInComment(document, node ? node.offset : 0, offset)) {
            return Promise.resolve(result);
        }
        if (node && (offset === node.offset + node.length) && offset > 0) {
            const ch = text[offset - 1];
            if (node.type === 'object' && ch === '}' || node.type === 'array' && ch === ']') {
                // after ] or }
                node = node.parent;
            }
        }
        const currentWord = this.getCurrentWord(document, offset);
        let overwriteRange;
        if (node && (node.type === 'string' || node.type === 'number' || node.type === 'boolean' || node.type === 'null')) {
            overwriteRange = _jsonLanguageTypes__WEBPACK_IMPORTED_MODULE_5__.Range.create(document.positionAt(node.offset), document.positionAt(node.offset + node.length));
        }
        else {
            let overwriteStart = offset - currentWord.length;
            if (overwriteStart > 0 && text[overwriteStart - 1] === '"') {
                overwriteStart--;
            }
            overwriteRange = _jsonLanguageTypes__WEBPACK_IMPORTED_MODULE_5__.Range.create(document.positionAt(overwriteStart), position);
        }
        const supportsCommitCharacters = false; //this.doesSupportsCommitCharacters(); disabled for now, waiting for new API: https://github.com/microsoft/vscode/issues/42544
        const proposed = new Map();
        const collector = {
            add: (suggestion) => {
                let label = suggestion.label;
                const existing = proposed.get(label);
                if (!existing) {
                    label = label.replace(/[\n]/g, '↵');
                    if (label.length > 60) {
                        const shortendedLabel = label.substr(0, 57).trim() + '...';
                        if (!proposed.has(shortendedLabel)) {
                            label = shortendedLabel;
                        }
                    }
                    suggestion.textEdit = _jsonLanguageTypes__WEBPACK_IMPORTED_MODULE_5__.TextEdit.replace(overwriteRange, suggestion.insertText);
                    if (supportsCommitCharacters) {
                        suggestion.commitCharacters = suggestion.kind === _jsonLanguageTypes__WEBPACK_IMPORTED_MODULE_5__.CompletionItemKind.Property ? propertyCommitCharacters : valueCommitCharacters;
                    }
                    suggestion.label = label;
                    proposed.set(label, suggestion);
                    result.items.push(suggestion);
                }
                else {
                    if (!existing.documentation) {
                        existing.documentation = suggestion.documentation;
                    }
                    if (!existing.detail) {
                        existing.detail = suggestion.detail;
                    }
                    if (!existing.labelDetails) {
                        existing.labelDetails = suggestion.labelDetails;
                    }
                }
            },
            setAsIncomplete: () => {
                result.isIncomplete = true;
            },
            error: (message) => {
                console.error(message);
            },
            getNumberOfProposals: () => {
                return result.items.length;
            }
        };
        return this.schemaService.getSchemaForResource(document.uri, doc).then((schema) => {
            const collectionPromises = [];
            let addValue = true;
            let currentKey = '';
            let currentProperty = undefined;
            if (node) {
                if (node.type === 'string') {
                    const parent = node.parent;
                    if (parent && parent.type === 'property' && parent.keyNode === node) {
                        addValue = !parent.valueNode;
                        currentProperty = parent;
                        currentKey = text.substr(node.offset + 1, node.length - 2);
                        if (parent) {
                            node = parent.parent;
                        }
                    }
                }
            }
            // proposals for properties
            if (node && node.type === 'object') {
                // don't suggest keys when the cursor is just before the opening curly brace
                if (node.offset === offset) {
                    return result;
                }
                // don't suggest properties that are already present
                const properties = node.properties;
                properties.forEach(p => {
                    if (!currentProperty || currentProperty !== p) {
                        proposed.set(p.keyNode.value, _jsonLanguageTypes__WEBPACK_IMPORTED_MODULE_5__.CompletionItem.create('__'));
                    }
                });
                let separatorAfter = '';
                if (addValue) {
                    separatorAfter = this.evaluateSeparatorAfter(document, document.offsetAt(overwriteRange.end));
                }
                if (schema) {
                    // property proposals with schema
                    this.getPropertyCompletions(schema, doc, node, addValue, separatorAfter, collector);
                }
                else {
                    // property proposals without schema
                    this.getSchemaLessPropertyCompletions(doc, node, currentKey, collector);
                }
                const location = _parser_jsonParser__WEBPACK_IMPORTED_MODULE_0__.getNodePath(node);
                this.contributions.forEach((contribution) => {
                    const collectPromise = contribution.collectPropertyCompletions(document.uri, location, currentWord, addValue, separatorAfter === '', collector);
                    if (collectPromise) {
                        collectionPromises.push(collectPromise);
                    }
                });
                if ((!schema && currentWord.length > 0 && text.charAt(offset - currentWord.length - 1) !== '"')) {
                    collector.add({
                        kind: _jsonLanguageTypes__WEBPACK_IMPORTED_MODULE_5__.CompletionItemKind.Property,
                        label: this.getLabelForValue(currentWord),
                        insertText: this.getInsertTextForProperty(currentWord, undefined, false, separatorAfter),
                        insertTextFormat: _jsonLanguageTypes__WEBPACK_IMPORTED_MODULE_5__.InsertTextFormat.Snippet, documentation: '',
                    });
                    collector.setAsIncomplete();
                }
            }
            // proposals for values
            const types = {};
            if (schema) {
                // value proposals with schema
                this.getValueCompletions(schema, doc, node, offset, document, collector, types);
            }
            else {
                // value proposals without schema
                this.getSchemaLessValueCompletions(doc, node, offset, document, collector);
            }
            if (this.contributions.length > 0) {
                this.getContributedValueCompletions(doc, node, offset, document, collector, collectionPromises);
            }
            return this.promiseConstructor.all(collectionPromises).then(() => {
                if (collector.getNumberOfProposals() === 0) {
                    let offsetForSeparator = offset;
                    if (node && (node.type === 'string' || node.type === 'number' || node.type === 'boolean' || node.type === 'null')) {
                        offsetForSeparator = node.offset + node.length;
                    }
                    const separatorAfter = this.evaluateSeparatorAfter(document, offsetForSeparator);
                    this.addFillerValueCompletions(types, separatorAfter, collector);
                }
                return result;
            });
        });
    }
    getPropertyCompletions(schema, doc, node, addValue, separatorAfter, collector) {
        const matchingSchemas = doc.getMatchingSchemas(schema.schema, node.offset);
        matchingSchemas.forEach((s) => {
            if (s.node === node && !s.inverted) {
                const schemaProperties = s.schema.properties;
                if (schemaProperties) {
                    Object.keys(schemaProperties).forEach((key) => {
                        const propertySchema = schemaProperties[key];
                        if (typeof propertySchema === 'object' && !propertySchema.deprecationMessage && !propertySchema.doNotSuggest) {
                            const proposal = {
                                kind: _jsonLanguageTypes__WEBPACK_IMPORTED_MODULE_5__.CompletionItemKind.Property,
                                label: key,
                                insertText: this.getInsertTextForProperty(key, propertySchema, addValue, separatorAfter),
                                insertTextFormat: _jsonLanguageTypes__WEBPACK_IMPORTED_MODULE_5__.InsertTextFormat.Snippet,
                                filterText: this.getFilterTextForValue(key),
                                documentation: this.fromMarkup(propertySchema.markdownDescription) || propertySchema.description || ''
                            };
                            if (propertySchema.completionDetail !== undefined) {
                                proposal.detail = propertySchema.completionDetail;
                            }
                            if (propertySchema.suggestSortText !== undefined) {
                                proposal.sortText = propertySchema.suggestSortText;
                            }
                            if (proposal.insertText && (0,_utils_strings__WEBPACK_IMPORTED_MODULE_3__.endsWith)(proposal.insertText, `$1${separatorAfter}`)) {
                                proposal.command = {
                                    title: 'Suggest',
                                    command: 'editor.action.triggerSuggest'
                                };
                            }
                            collector.add(proposal);
                        }
                    });
                }
                const schemaPropertyNames = s.schema.propertyNames;
                if (typeof schemaPropertyNames === 'object' && !schemaPropertyNames.deprecationMessage && !schemaPropertyNames.doNotSuggest) {
                    const propertyNameCompletionItem = (name, documentation, detail, sortText) => {
                        const proposal = {
                            kind: _jsonLanguageTypes__WEBPACK_IMPORTED_MODULE_5__.CompletionItemKind.Property,
                            label: name,
                            insertText: this.getInsertTextForProperty(name, undefined, addValue, separatorAfter),
                            insertTextFormat: _jsonLanguageTypes__WEBPACK_IMPORTED_MODULE_5__.InsertTextFormat.Snippet,
                            filterText: this.getFilterTextForValue(name),
                            documentation: documentation || this.fromMarkup(schemaPropertyNames.markdownDescription) || schemaPropertyNames.description || '',
                            sortText,
                            detail
                        };
                        if (proposal.insertText && (0,_utils_strings__WEBPACK_IMPORTED_MODULE_3__.endsWith)(proposal.insertText, `$1${separatorAfter}`)) {
                            proposal.command = {
                                title: 'Suggest',
                                command: 'editor.action.triggerSuggest'
                            };
                        }
                        collector.add(proposal);
                    };
                    if (schemaPropertyNames.enum) {
                        for (let i = 0; i < schemaPropertyNames.enum.length; i++) {
                            let enumDescription = undefined;
                            if (schemaPropertyNames.markdownEnumDescriptions && i < schemaPropertyNames.markdownEnumDescriptions.length) {
                                enumDescription = this.fromMarkup(schemaPropertyNames.markdownEnumDescriptions[i]);
                            }
                            else if (schemaPropertyNames.enumDescriptions && i < schemaPropertyNames.enumDescriptions.length) {
                                enumDescription = schemaPropertyNames.enumDescriptions[i];
                            }
                            const enumSortText = schemaPropertyNames.enumSortTexts?.[i];
                            const enumDetails = schemaPropertyNames.enumDetails?.[i];
                            propertyNameCompletionItem(schemaPropertyNames.enum[i], enumDescription, enumDetails, enumSortText);
                        }
                    }
                    if (schemaPropertyNames.const) {
                        propertyNameCompletionItem(schemaPropertyNames.const, undefined, schemaPropertyNames.completionDetail, schemaPropertyNames.suggestSortText);
                    }
                }
            }
        });
    }
    getSchemaLessPropertyCompletions(doc, node, currentKey, collector) {
        const collectCompletionsForSimilarObject = (obj) => {
            obj.properties.forEach((p) => {
                const key = p.keyNode.value;
                collector.add({
                    kind: _jsonLanguageTypes__WEBPACK_IMPORTED_MODULE_5__.CompletionItemKind.Property,
                    label: key,
                    insertText: this.getInsertTextForValue(key, ''),
                    insertTextFormat: _jsonLanguageTypes__WEBPACK_IMPORTED_MODULE_5__.InsertTextFormat.Snippet,
                    filterText: this.getFilterTextForValue(key),
                    documentation: ''
                });
            });
        };
        if (node.parent) {
            if (node.parent.type === 'property') {
                // if the object is a property value, check the tree for other objects that hang under a property of the same name
                const parentKey = node.parent.keyNode.value;
                doc.visit(n => {
                    if (n.type === 'property' && n !== node.parent && n.keyNode.value === parentKey && n.valueNode && n.valueNode.type === 'object') {
                        collectCompletionsForSimilarObject(n.valueNode);
                    }
                    return true;
                });
            }
            else if (node.parent.type === 'array') {
                // if the object is in an array, use all other array elements as similar objects
                node.parent.items.forEach(n => {
                    if (n.type === 'object' && n !== node) {
                        collectCompletionsForSimilarObject(n);
                    }
                });
            }
        }
        else if (node.type === 'object') {
            collector.add({
                kind: _jsonLanguageTypes__WEBPACK_IMPORTED_MODULE_5__.CompletionItemKind.Property,
                label: '$schema',
                insertText: this.getInsertTextForProperty('$schema', undefined, true, ''),
                insertTextFormat: _jsonLanguageTypes__WEBPACK_IMPORTED_MODULE_5__.InsertTextFormat.Snippet, documentation: '',
                filterText: this.getFilterTextForValue("$schema")
            });
        }
    }
    getSchemaLessValueCompletions(doc, node, offset, document, collector) {
        let offsetForSeparator = offset;
        if (node && (node.type === 'string' || node.type === 'number' || node.type === 'boolean' || node.type === 'null')) {
            offsetForSeparator = node.offset + node.length;
            node = node.parent;
        }
        if (!node) {
            collector.add({
                kind: this.getSuggestionKind('object'),
                label: 'Empty object',
                insertText: this.getInsertTextForValue({}, ''),
                insertTextFormat: _jsonLanguageTypes__WEBPACK_IMPORTED_MODULE_5__.InsertTextFormat.Snippet,
                documentation: ''
            });
            collector.add({
                kind: this.getSuggestionKind('array'),
                label: 'Empty array',
                insertText: this.getInsertTextForValue([], ''),
                insertTextFormat: _jsonLanguageTypes__WEBPACK_IMPORTED_MODULE_5__.InsertTextFormat.Snippet,
                documentation: ''
            });
            return;
        }
        const separatorAfter = this.evaluateSeparatorAfter(document, offsetForSeparator);
        const collectSuggestionsForValues = (value) => {
            if (value.parent && !_parser_jsonParser__WEBPACK_IMPORTED_MODULE_0__.contains(value.parent, offset, true)) {
                collector.add({
                    kind: this.getSuggestionKind(value.type),
                    label: this.getLabelTextForMatchingNode(value, document),
                    insertText: this.getInsertTextForMatchingNode(value, document, separatorAfter),
                    insertTextFormat: _jsonLanguageTypes__WEBPACK_IMPORTED_MODULE_5__.InsertTextFormat.Snippet, documentation: ''
                });
            }
            if (value.type === 'boolean') {
                this.addBooleanValueCompletion(!value.value, separatorAfter, collector);
            }
        };
        if (node.type === 'property') {
            if (offset > (node.colonOffset || 0)) {
                const valueNode = node.valueNode;
                if (valueNode && (offset > (valueNode.offset + valueNode.length) || valueNode.type === 'object' || valueNode.type === 'array')) {
                    return;
                }
                // suggest values at the same key
                const parentKey = node.keyNode.value;
                doc.visit(n => {
                    if (n.type === 'property' && n.keyNode.value === parentKey && n.valueNode) {
                        collectSuggestionsForValues(n.valueNode);
                    }
                    return true;
                });
                if (parentKey === '$schema' && node.parent && !node.parent.parent) {
                    this.addDollarSchemaCompletions(separatorAfter, collector);
                }
            }
        }
        if (node.type === 'array') {
            if (node.parent && node.parent.type === 'property') {
                // suggest items of an array at the same key
                const parentKey = node.parent.keyNode.value;
                doc.visit((n) => {
                    if (n.type === 'property' && n.keyNode.value === parentKey && n.valueNode && n.valueNode.type === 'array') {
                        n.valueNode.items.forEach(collectSuggestionsForValues);
                    }
                    return true;
                });
            }
            else {
                // suggest items in the same array
                node.items.forEach(collectSuggestionsForValues);
            }
        }
    }
    getValueCompletions(schema, doc, node, offset, document, collector, types) {
        let offsetForSeparator = offset;
        let parentKey = undefined;
        let valueNode = undefined;
        if (node && (node.type === 'string' || node.type === 'number' || node.type === 'boolean' || node.type === 'null')) {
            offsetForSeparator = node.offset + node.length;
            valueNode = node;
            node = node.parent;
        }
        if (!node) {
            this.addSchemaValueCompletions(schema.schema, '', collector, types);
            return;
        }
        if ((node.type === 'property') && offset > (node.colonOffset || 0)) {
            const valueNode = node.valueNode;
            if (valueNode && offset > (valueNode.offset + valueNode.length)) {
                return; // we are past the value node
            }
            parentKey = node.keyNode.value;
            node = node.parent;
        }
        if (node && (parentKey !== undefined || node.type === 'array')) {
            const separatorAfter = this.evaluateSeparatorAfter(document, offsetForSeparator);
            const matchingSchemas = doc.getMatchingSchemas(schema.schema, node.offset, valueNode);
            for (const s of matchingSchemas) {
                if (s.node === node && !s.inverted && s.schema) {
                    if (node.type === 'array' && s.schema.items) {
                        let c = collector;
                        if (s.schema.uniqueItems) {
                            const existingValues = new Set();
                            node.children.forEach(n => {
                                if (n.type !== 'array' && n.type !== 'object') {
                                    existingValues.add(this.getLabelForValue(_parser_jsonParser__WEBPACK_IMPORTED_MODULE_0__.getNodeValue(n)));
                                }
                            });
                            c = {
                                ...collector,
                                add(suggestion) {
                                    if (!existingValues.has(suggestion.label)) {
                                        collector.add(suggestion);
                                    }
                                }
                            };
                        }
                        if (Array.isArray(s.schema.items)) {
                            const index = this.findItemAtOffset(node, document, offset);
                            if (index < s.schema.items.length) {
                                this.addSchemaValueCompletions(s.schema.items[index], separatorAfter, c, types);
                            }
                        }
                        else {
                            this.addSchemaValueCompletions(s.schema.items, separatorAfter, c, types);
                        }
                    }
                    if (parentKey !== undefined) {
                        let propertyMatched = false;
                        if (s.schema.properties) {
                            const propertySchema = s.schema.properties[parentKey];
                            if (propertySchema) {
                                propertyMatched = true;
                                this.addSchemaValueCompletions(propertySchema, separatorAfter, collector, types);
                            }
                        }
                        if (s.schema.patternProperties && !propertyMatched) {
                            for (const pattern of Object.keys(s.schema.patternProperties)) {
                                const regex = (0,_utils_strings__WEBPACK_IMPORTED_MODULE_3__.extendedRegExp)(pattern);
                                if (regex?.test(parentKey)) {
                                    propertyMatched = true;
                                    const propertySchema = s.schema.patternProperties[pattern];
                                    this.addSchemaValueCompletions(propertySchema, separatorAfter, collector, types);
                                }
                            }
                        }
                        if (s.schema.additionalProperties && !propertyMatched) {
                            const propertySchema = s.schema.additionalProperties;
                            this.addSchemaValueCompletions(propertySchema, separatorAfter, collector, types);
                        }
                    }
                }
            }
            if (parentKey === '$schema' && !node.parent) {
                this.addDollarSchemaCompletions(separatorAfter, collector);
            }
            if (types['boolean']) {
                this.addBooleanValueCompletion(true, separatorAfter, collector);
                this.addBooleanValueCompletion(false, separatorAfter, collector);
            }
            if (types['null']) {
                this.addNullValueCompletion(separatorAfter, collector);
            }
        }
    }
    getContributedValueCompletions(doc, node, offset, document, collector, collectionPromises) {
        if (!node) {
            this.contributions.forEach((contribution) => {
                const collectPromise = contribution.collectDefaultCompletions(document.uri, collector);
                if (collectPromise) {
                    collectionPromises.push(collectPromise);
                }
            });
        }
        else {
            if (node.type === 'string' || node.type === 'number' || node.type === 'boolean' || node.type === 'null') {
                node = node.parent;
            }
            if (node && (node.type === 'property') && offset > (node.colonOffset || 0)) {
                const parentKey = node.keyNode.value;
                const valueNode = node.valueNode;
                if ((!valueNode || offset <= (valueNode.offset + valueNode.length)) && node.parent) {
                    const location = _parser_jsonParser__WEBPACK_IMPORTED_MODULE_0__.getNodePath(node.parent);
                    this.contributions.forEach((contribution) => {
                        const collectPromise = contribution.collectValueCompletions(document.uri, location, parentKey, collector);
                        if (collectPromise) {
                            collectionPromises.push(collectPromise);
                        }
                    });
                }
            }
        }
    }
    addSchemaValueCompletions(schema, separatorAfter, collector, types) {
        if (typeof schema === 'object') {
            this.addEnumValueCompletions(schema, separatorAfter, collector);
            this.addDefaultValueCompletions(schema, separatorAfter, collector);
            this.collectTypes(schema, types);
            if (Array.isArray(schema.allOf)) {
                schema.allOf.forEach(s => this.addSchemaValueCompletions(s, separatorAfter, collector, types));
            }
            if (Array.isArray(schema.anyOf)) {
                schema.anyOf.forEach(s => this.addSchemaValueCompletions(s, separatorAfter, collector, types));
            }
            if (Array.isArray(schema.oneOf)) {
                schema.oneOf.forEach(s => this.addSchemaValueCompletions(s, separatorAfter, collector, types));
            }
        }
    }
    addDefaultValueCompletions(schema, separatorAfter, collector, arrayDepth = 0) {
        let hasProposals = false;
        if ((0,_utils_objects__WEBPACK_IMPORTED_MODULE_4__.isDefined)(schema.default)) {
            let type = schema.type;
            let value = schema.default;
            for (let i = arrayDepth; i > 0; i--) {
                value = [value];
                type = 'array';
            }
            const completionItem = {
                kind: this.getSuggestionKind(type),
                label: this.getLabelForValue(value),
                insertText: this.getInsertTextForValue(value, separatorAfter),
                insertTextFormat: _jsonLanguageTypes__WEBPACK_IMPORTED_MODULE_5__.InsertTextFormat.Snippet
            };
            if (this.doesSupportsLabelDetails()) {
                completionItem.labelDetails = { description: _vscode_l10n__WEBPACK_IMPORTED_MODULE_6__.t('Default value') };
            }
            else {
                completionItem.detail = _vscode_l10n__WEBPACK_IMPORTED_MODULE_6__.t('Default value');
            }
            collector.add(completionItem);
            hasProposals = true;
        }
        if (Array.isArray(schema.examples)) {
            schema.examples.forEach(example => {
                let type = schema.type;
                let value = example;
                for (let i = arrayDepth; i > 0; i--) {
                    value = [value];
                    type = 'array';
                }
                collector.add({
                    kind: this.getSuggestionKind(type),
                    label: this.getLabelForValue(value),
                    insertText: this.getInsertTextForValue(value, separatorAfter),
                    insertTextFormat: _jsonLanguageTypes__WEBPACK_IMPORTED_MODULE_5__.InsertTextFormat.Snippet
                });
                hasProposals = true;
            });
        }
        if (Array.isArray(schema.defaultSnippets)) {
            schema.defaultSnippets.forEach(s => {
                let type = schema.type;
                let value = s.body;
                let label = s.label;
                let insertText;
                let filterText;
                if ((0,_utils_objects__WEBPACK_IMPORTED_MODULE_4__.isDefined)(value)) {
                    let type = schema.type;
                    for (let i = arrayDepth; i > 0; i--) {
                        value = [value];
                        type = 'array';
                    }
                    insertText = this.getInsertTextForSnippetValue(value, separatorAfter);
                    filterText = this.getFilterTextForSnippetValue(value);
                    label = label || this.getLabelForSnippetValue(value);
                }
                else if (typeof s.bodyText === 'string') {
                    let prefix = '', suffix = '', indent = '';
                    for (let i = arrayDepth; i > 0; i--) {
                        prefix = prefix + indent + '[\n';
                        suffix = suffix + '\n' + indent + ']';
                        indent += '\t';
                        type = 'array';
                    }
                    insertText = prefix + indent + s.bodyText.split('\n').join('\n' + indent) + suffix + separatorAfter;
                    label = label || insertText,
                        filterText = insertText.replace(/[\n]/g, ''); // remove new lines
                }
                else {
                    return;
                }
                collector.add({
                    kind: this.getSuggestionKind(type),
                    label,
                    documentation: this.fromMarkup(s.markdownDescription) || s.description,
                    insertText,
                    insertTextFormat: _jsonLanguageTypes__WEBPACK_IMPORTED_MODULE_5__.InsertTextFormat.Snippet,
                    filterText
                });
                hasProposals = true;
            });
        }
        if (!hasProposals && typeof schema.items === 'object' && !Array.isArray(schema.items) && arrayDepth < 5 /* beware of recursion */) {
            this.addDefaultValueCompletions(schema.items, separatorAfter, collector, arrayDepth + 1);
        }
    }
    addEnumValueCompletions(schema, separatorAfter, collector) {
        if ((0,_utils_objects__WEBPACK_IMPORTED_MODULE_4__.isDefined)(schema.const)) {
            collector.add({
                kind: this.getSuggestionKind(schema.type),
                label: this.getLabelForValue(schema.const),
                insertText: this.getInsertTextForValue(schema.const, separatorAfter),
                insertTextFormat: _jsonLanguageTypes__WEBPACK_IMPORTED_MODULE_5__.InsertTextFormat.Snippet,
                documentation: this.fromMarkup(schema.markdownDescription) || schema.description
            });
        }
        if (Array.isArray(schema.enum)) {
            for (let i = 0, length = schema.enum.length; i < length; i++) {
                const enm = schema.enum[i];
                let documentation = this.fromMarkup(schema.markdownDescription) || schema.description;
                if (schema.markdownEnumDescriptions && i < schema.markdownEnumDescriptions.length && this.doesSupportMarkdown()) {
                    documentation = this.fromMarkup(schema.markdownEnumDescriptions[i]);
                }
                else if (schema.enumDescriptions && i < schema.enumDescriptions.length) {
                    documentation = schema.enumDescriptions[i];
                }
                collector.add({
                    kind: this.getSuggestionKind(schema.type),
                    label: this.getLabelForValue(enm),
                    insertText: this.getInsertTextForValue(enm, separatorAfter),
                    insertTextFormat: _jsonLanguageTypes__WEBPACK_IMPORTED_MODULE_5__.InsertTextFormat.Snippet,
                    sortText: schema.enumSortTexts?.[i],
                    detail: schema.enumDetails?.[i],
                    documentation
                });
            }
        }
    }
    collectTypes(schema, types) {
        if (Array.isArray(schema.enum) || (0,_utils_objects__WEBPACK_IMPORTED_MODULE_4__.isDefined)(schema.const)) {
            return;
        }
        const type = schema.type;
        if (Array.isArray(type)) {
            type.forEach(t => types[t] = true);
        }
        else if (type) {
            types[type] = true;
        }
    }
    addFillerValueCompletions(types, separatorAfter, collector) {
        if (types['object']) {
            collector.add({
                kind: this.getSuggestionKind('object'),
                label: '{}',
                insertText: this.getInsertTextForGuessedValue({}, separatorAfter),
                insertTextFormat: _jsonLanguageTypes__WEBPACK_IMPORTED_MODULE_5__.InsertTextFormat.Snippet,
                detail: _vscode_l10n__WEBPACK_IMPORTED_MODULE_6__.t('New object'),
                documentation: ''
            });
        }
        if (types['array']) {
            collector.add({
                kind: this.getSuggestionKind('array'),
                label: '[]',
                insertText: this.getInsertTextForGuessedValue([], separatorAfter),
                insertTextFormat: _jsonLanguageTypes__WEBPACK_IMPORTED_MODULE_5__.InsertTextFormat.Snippet,
                detail: _vscode_l10n__WEBPACK_IMPORTED_MODULE_6__.t('New array'),
                documentation: ''
            });
        }
    }
    addBooleanValueCompletion(value, separatorAfter, collector) {
        collector.add({
            kind: this.getSuggestionKind('boolean'),
            label: value ? 'true' : 'false',
            insertText: this.getInsertTextForValue(value, separatorAfter),
            insertTextFormat: _jsonLanguageTypes__WEBPACK_IMPORTED_MODULE_5__.InsertTextFormat.Snippet,
            documentation: ''
        });
    }
    addNullValueCompletion(separatorAfter, collector) {
        collector.add({
            kind: this.getSuggestionKind('null'),
            label: 'null',
            insertText: 'null' + separatorAfter,
            insertTextFormat: _jsonLanguageTypes__WEBPACK_IMPORTED_MODULE_5__.InsertTextFormat.Snippet,
            documentation: ''
        });
    }
    addDollarSchemaCompletions(separatorAfter, collector) {
        const schemaIds = this.schemaService.getRegisteredSchemaIds(schema => schema === 'http' || schema === 'https');
        schemaIds.forEach(schemaId => {
            if (schemaId.startsWith('https://json-schema.org/draft-')) {
                schemaId = schemaId + '#';
            }
            collector.add({
                kind: _jsonLanguageTypes__WEBPACK_IMPORTED_MODULE_5__.CompletionItemKind.Module,
                label: this.getLabelForValue(schemaId),
                filterText: this.getFilterTextForValue(schemaId),
                insertText: this.getInsertTextForValue(schemaId, separatorAfter),
                insertTextFormat: _jsonLanguageTypes__WEBPACK_IMPORTED_MODULE_5__.InsertTextFormat.Snippet, documentation: ''
            });
        });
    }
    getLabelForValue(value) {
        return JSON.stringify(value);
    }
    getValueFromLabel(value) {
        return JSON.parse(value);
    }
    getFilterTextForValue(value) {
        return JSON.stringify(value);
    }
    getFilterTextForSnippetValue(value) {
        return JSON.stringify(value).replace(/\$\{\d+:([^}]+)\}|\$\d+/g, '$1');
    }
    getLabelForSnippetValue(value) {
        const label = JSON.stringify(value);
        return label.replace(/\$\{\d+:([^}]+)\}|\$\d+/g, '$1');
    }
    getInsertTextForPlainText(text) {
        return text.replace(/[\\\$\}]/g, '\\$&'); // escape $, \ and }
    }
    getInsertTextForValue(value, separatorAfter) {
        const text = JSON.stringify(value, null, '\t');
        if (text === '{}') {
            return '{$1}' + separatorAfter;
        }
        else if (text === '[]') {
            return '[$1]' + separatorAfter;
        }
        return this.getInsertTextForPlainText(text + separatorAfter);
    }
    getInsertTextForSnippetValue(value, separatorAfter) {
        const replacer = (value) => {
            if (typeof value === 'string') {
                if (value[0] === '^') {
                    return value.substr(1);
                }
            }
            return JSON.stringify(value);
        };
        return (0,_utils_json__WEBPACK_IMPORTED_MODULE_2__.stringifyObject)(value, '', replacer) + separatorAfter;
    }
    getInsertTextForGuessedValue(value, separatorAfter) {
        switch (typeof value) {
            case 'object':
                if (value === null) {
                    return '${1:null}' + separatorAfter;
                }
                return this.getInsertTextForValue(value, separatorAfter);
            case 'string':
                let snippetValue = JSON.stringify(value);
                snippetValue = snippetValue.substr(1, snippetValue.length - 2); // remove quotes
                snippetValue = this.getInsertTextForPlainText(snippetValue); // escape \ and }
                return '"${1:' + snippetValue + '}"' + separatorAfter;
            case 'number':
            case 'boolean':
                return '${1:' + JSON.stringify(value) + '}' + separatorAfter;
        }
        return this.getInsertTextForValue(value, separatorAfter);
    }
    getSuggestionKind(type) {
        if (Array.isArray(type)) {
            const array = type;
            type = array.length > 0 ? array[0] : undefined;
        }
        if (!type) {
            return _jsonLanguageTypes__WEBPACK_IMPORTED_MODULE_5__.CompletionItemKind.Value;
        }
        switch (type) {
            case 'string': return _jsonLanguageTypes__WEBPACK_IMPORTED_MODULE_5__.CompletionItemKind.Value;
            case 'object': return _jsonLanguageTypes__WEBPACK_IMPORTED_MODULE_5__.CompletionItemKind.Module;
            case 'property': return _jsonLanguageTypes__WEBPACK_IMPORTED_MODULE_5__.CompletionItemKind.Property;
            default: return _jsonLanguageTypes__WEBPACK_IMPORTED_MODULE_5__.CompletionItemKind.Value;
        }
    }
    getLabelTextForMatchingNode(node, document) {
        switch (node.type) {
            case 'array':
                return '[]';
            case 'object':
                return '{}';
            default:
                const content = document.getText().substr(node.offset, node.length);
                return content;
        }
    }
    getInsertTextForMatchingNode(node, document, separatorAfter) {
        switch (node.type) {
            case 'array':
                return this.getInsertTextForValue([], separatorAfter);
            case 'object':
                return this.getInsertTextForValue({}, separatorAfter);
            default:
                const content = document.getText().substr(node.offset, node.length) + separatorAfter;
                return this.getInsertTextForPlainText(content);
        }
    }
    getInsertTextForProperty(key, propertySchema, addValue, separatorAfter) {
        const propertyText = this.getInsertTextForValue(key, '');
        if (!addValue) {
            return propertyText;
        }
        const resultText = propertyText + ': ';
        let value;
        let nValueProposals = 0;
        if (propertySchema) {
            if (Array.isArray(propertySchema.defaultSnippets)) {
                if (propertySchema.defaultSnippets.length === 1) {
                    const body = propertySchema.defaultSnippets[0].body;
                    if ((0,_utils_objects__WEBPACK_IMPORTED_MODULE_4__.isDefined)(body)) {
                        value = this.getInsertTextForSnippetValue(body, '');
                    }
                }
                nValueProposals += propertySchema.defaultSnippets.length;
            }
            if (propertySchema.enum) {
                if (!value && propertySchema.enum.length === 1) {
                    value = this.getInsertTextForGuessedValue(propertySchema.enum[0], '');
                }
                nValueProposals += propertySchema.enum.length;
            }
            if ((0,_utils_objects__WEBPACK_IMPORTED_MODULE_4__.isDefined)(propertySchema.const)) {
                if (!value) {
                    value = this.getInsertTextForGuessedValue(propertySchema.const, '');
                }
                nValueProposals++;
            }
            if ((0,_utils_objects__WEBPACK_IMPORTED_MODULE_4__.isDefined)(propertySchema.default)) {
                if (!value) {
                    value = this.getInsertTextForGuessedValue(propertySchema.default, '');
                }
                nValueProposals++;
            }
            if (Array.isArray(propertySchema.examples) && propertySchema.examples.length) {
                if (!value) {
                    value = this.getInsertTextForGuessedValue(propertySchema.examples[0], '');
                }
                nValueProposals += propertySchema.examples.length;
            }
            if (nValueProposals === 0) {
                let type = Array.isArray(propertySchema.type) ? propertySchema.type[0] : propertySchema.type;
                if (!type) {
                    if (propertySchema.properties) {
                        type = 'object';
                    }
                    else if (propertySchema.items) {
                        type = 'array';
                    }
                }
                switch (type) {
                    case 'boolean':
                        value = '$1';
                        break;
                    case 'string':
                        value = '"$1"';
                        break;
                    case 'object':
                        value = '{$1}';
                        break;
                    case 'array':
                        value = '[$1]';
                        break;
                    case 'number':
                    case 'integer':
                        value = '${1:0}';
                        break;
                    case 'null':
                        value = '${1:null}';
                        break;
                    default:
                        return propertyText;
                }
            }
        }
        if (!value || nValueProposals > 1) {
            value = '$1';
        }
        return resultText + value + separatorAfter;
    }
    getCurrentWord(document, offset) {
        let i = offset - 1;
        const text = document.getText();
        while (i >= 0 && ' \t\n\r\v":{[,]}'.indexOf(text.charAt(i)) === -1) {
            i--;
        }
        return text.substring(i + 1, offset);
    }
    evaluateSeparatorAfter(document, offset) {
        const scanner = jsonc_parser__WEBPACK_IMPORTED_MODULE_1__.createScanner(document.getText(), true);
        scanner.setPosition(offset);
        const token = scanner.scan();
        switch (token) {
            case 5 /* Json.SyntaxKind.CommaToken */:
            case 2 /* Json.SyntaxKind.CloseBraceToken */:
            case 4 /* Json.SyntaxKind.CloseBracketToken */:
            case 17 /* Json.SyntaxKind.EOF */:
                return '';
            default:
                return ',';
        }
    }
    findItemAtOffset(node, document, offset) {
        const scanner = jsonc_parser__WEBPACK_IMPORTED_MODULE_1__.createScanner(document.getText(), true);
        const children = node.items;
        for (let i = children.length - 1; i >= 0; i--) {
            const child = children[i];
            if (offset > child.offset + child.length) {
                scanner.setPosition(child.offset + child.length);
                const token = scanner.scan();
                if (token === 5 /* Json.SyntaxKind.CommaToken */ && offset >= scanner.getTokenOffset() + scanner.getTokenLength()) {
                    return i + 1;
                }
                return i;
            }
            else if (offset >= child.offset) {
                return i;
            }
        }
        return 0;
    }
    isInComment(document, start, offset) {
        const scanner = jsonc_parser__WEBPACK_IMPORTED_MODULE_1__.createScanner(document.getText(), false);
        scanner.setPosition(start);
        let token = scanner.scan();
        while (token !== 17 /* Json.SyntaxKind.EOF */ && (scanner.getTokenOffset() + scanner.getTokenLength() < offset)) {
            token = scanner.scan();
        }
        return (token === 12 /* Json.SyntaxKind.LineCommentTrivia */ || token === 13 /* Json.SyntaxKind.BlockCommentTrivia */) && scanner.getTokenOffset() <= offset;
    }
    fromMarkup(markupString) {
        if (markupString && this.doesSupportMarkdown()) {
            return {
                kind: _jsonLanguageTypes__WEBPACK_IMPORTED_MODULE_5__.MarkupKind.Markdown,
                value: markupString
            };
        }
        return undefined;
    }
    doesSupportMarkdown() {
        if (!(0,_utils_objects__WEBPACK_IMPORTED_MODULE_4__.isDefined)(this.supportsMarkdown)) {
            const documentationFormat = this.clientCapabilities.textDocument?.completion?.completionItem?.documentationFormat;
            this.supportsMarkdown = Array.isArray(documentationFormat) && documentationFormat.indexOf(_jsonLanguageTypes__WEBPACK_IMPORTED_MODULE_5__.MarkupKind.Markdown) !== -1;
        }
        return this.supportsMarkdown;
    }
    doesSupportsCommitCharacters() {
        if (!(0,_utils_objects__WEBPACK_IMPORTED_MODULE_4__.isDefined)(this.supportsCommitCharacters)) {
            this.labelDetailsSupport = this.clientCapabilities.textDocument?.completion?.completionItem?.commitCharactersSupport;
        }
        return this.supportsCommitCharacters;
    }
    doesSupportsLabelDetails() {
        if (!(0,_utils_objects__WEBPACK_IMPORTED_MODULE_4__.isDefined)(this.labelDetailsSupport)) {
            this.labelDetailsSupport = this.clientCapabilities.textDocument?.completion?.completionItem?.labelDetailsSupport;
        }
        return this.labelDetailsSupport;
    }
}


}),
3718: (function (__unused_webpack_module, __webpack_exports__, __webpack_require__) {
__webpack_require__.r(__webpack_exports__);
__webpack_require__.d(__webpack_exports__, {
  JSONDocumentSymbols: () => (JSONDocumentSymbols)
});
/* ESM import */var _parser_jsonParser__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(3710);
/* ESM import */var _utils_strings__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(3712);
/* ESM import */var _utils_colors__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(3719);
/* ESM import */var _vscode_l10n__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(3714);
/* ESM import */var _jsonLanguageTypes__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(3713);
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/





class JSONDocumentSymbols {
    constructor(schemaService) {
        this.schemaService = schemaService;
    }
    findDocumentSymbols(document, doc, context = { resultLimit: Number.MAX_VALUE }) {
        const root = doc.root;
        if (!root) {
            return [];
        }
        let limit = context.resultLimit || Number.MAX_VALUE;
        // special handling for key bindings
        const resourceString = document.uri;
        if ((resourceString === 'vscode://defaultsettings/keybindings.json') || _utils_strings__WEBPACK_IMPORTED_MODULE_1__.endsWith(resourceString.toLowerCase(), '/user/keybindings.json')) {
            if (root.type === 'array') {
                const result = [];
                for (const item of root.items) {
                    if (item.type === 'object') {
                        for (const property of item.properties) {
                            if (property.keyNode.value === 'key' && property.valueNode) {
                                const location = _jsonLanguageTypes__WEBPACK_IMPORTED_MODULE_3__.Location.create(document.uri, getRange(document, item));
                                result.push({ name: getName(property.valueNode), kind: _jsonLanguageTypes__WEBPACK_IMPORTED_MODULE_3__.SymbolKind.Function, location: location });
                                limit--;
                                if (limit <= 0) {
                                    if (context && context.onResultLimitExceeded) {
                                        context.onResultLimitExceeded(resourceString);
                                    }
                                    return result;
                                }
                            }
                        }
                    }
                }
                return result;
            }
        }
        const toVisit = [
            { node: root, containerName: '' }
        ];
        let nextToVisit = 0;
        let limitExceeded = false;
        const result = [];
        const collectOutlineEntries = (node, containerName) => {
            if (node.type === 'array') {
                node.items.forEach(node => {
                    if (node) {
                        toVisit.push({ node, containerName });
                    }
                });
            }
            else if (node.type === 'object') {
                node.properties.forEach((property) => {
                    const valueNode = property.valueNode;
                    if (valueNode) {
                        if (limit > 0) {
                            limit--;
                            const location = _jsonLanguageTypes__WEBPACK_IMPORTED_MODULE_3__.Location.create(document.uri, getRange(document, property));
                            const childContainerName = containerName ? containerName + '.' + property.keyNode.value : property.keyNode.value;
                            result.push({ name: this.getKeyLabel(property), kind: this.getSymbolKind(valueNode.type), location: location, containerName: containerName });
                            toVisit.push({ node: valueNode, containerName: childContainerName });
                        }
                        else {
                            limitExceeded = true;
                        }
                    }
                });
            }
        };
        // breath first traversal
        while (nextToVisit < toVisit.length) {
            const next = toVisit[nextToVisit++];
            collectOutlineEntries(next.node, next.containerName);
        }
        if (limitExceeded && context && context.onResultLimitExceeded) {
            context.onResultLimitExceeded(resourceString);
        }
        return result;
    }
    findDocumentSymbols2(document, doc, context = { resultLimit: Number.MAX_VALUE }) {
        const root = doc.root;
        if (!root) {
            return [];
        }
        let limit = context.resultLimit || Number.MAX_VALUE;
        // special handling for key bindings
        const resourceString = document.uri;
        if ((resourceString === 'vscode://defaultsettings/keybindings.json') || _utils_strings__WEBPACK_IMPORTED_MODULE_1__.endsWith(resourceString.toLowerCase(), '/user/keybindings.json')) {
            if (root.type === 'array') {
                const result = [];
                for (const item of root.items) {
                    if (item.type === 'object') {
                        for (const property of item.properties) {
                            if (property.keyNode.value === 'key' && property.valueNode) {
                                const range = getRange(document, item);
                                const selectionRange = getRange(document, property.keyNode);
                                result.push({ name: getName(property.valueNode), kind: _jsonLanguageTypes__WEBPACK_IMPORTED_MODULE_3__.SymbolKind.Function, range, selectionRange });
                                limit--;
                                if (limit <= 0) {
                                    if (context && context.onResultLimitExceeded) {
                                        context.onResultLimitExceeded(resourceString);
                                    }
                                    return result;
                                }
                            }
                        }
                    }
                }
                return result;
            }
        }
        const result = [];
        const toVisit = [
            { node: root, result }
        ];
        let nextToVisit = 0;
        let limitExceeded = false;
        const collectOutlineEntries = (node, result) => {
            if (node.type === 'array') {
                node.items.forEach((node, index) => {
                    if (node) {
                        if (limit > 0) {
                            limit--;
                            const range = getRange(document, node);
                            const selectionRange = range;
                            const name = String(index);
                            const symbol = { name, kind: this.getSymbolKind(node.type), range, selectionRange, children: [] };
                            result.push(symbol);
                            toVisit.push({ result: symbol.children, node });
                        }
                        else {
                            limitExceeded = true;
                        }
                    }
                });
            }
            else if (node.type === 'object') {
                node.properties.forEach((property) => {
                    const valueNode = property.valueNode;
                    if (valueNode) {
                        if (limit > 0) {
                            limit--;
                            const range = getRange(document, property);
                            const selectionRange = getRange(document, property.keyNode);
                            const children = [];
                            const symbol = { name: this.getKeyLabel(property), kind: this.getSymbolKind(valueNode.type), range, selectionRange, children, detail: this.getDetail(valueNode) };
                            result.push(symbol);
                            toVisit.push({ result: children, node: valueNode });
                        }
                        else {
                            limitExceeded = true;
                        }
                    }
                });
            }
        };
        // breath first traversal
        while (nextToVisit < toVisit.length) {
            const next = toVisit[nextToVisit++];
            collectOutlineEntries(next.node, next.result);
        }
        if (limitExceeded && context && context.onResultLimitExceeded) {
            context.onResultLimitExceeded(resourceString);
        }
        return result;
    }
    getSymbolKind(nodeType) {
        switch (nodeType) {
            case 'object':
                return _jsonLanguageTypes__WEBPACK_IMPORTED_MODULE_3__.SymbolKind.Module;
            case 'string':
                return _jsonLanguageTypes__WEBPACK_IMPORTED_MODULE_3__.SymbolKind.String;
            case 'number':
                return _jsonLanguageTypes__WEBPACK_IMPORTED_MODULE_3__.SymbolKind.Number;
            case 'array':
                return _jsonLanguageTypes__WEBPACK_IMPORTED_MODULE_3__.SymbolKind.Array;
            case 'boolean':
                return _jsonLanguageTypes__WEBPACK_IMPORTED_MODULE_3__.SymbolKind.Boolean;
            default: // 'null'
                return _jsonLanguageTypes__WEBPACK_IMPORTED_MODULE_3__.SymbolKind.Variable;
        }
    }
    getKeyLabel(property) {
        let name = property.keyNode.value;
        if (name) {
            name = name.replace(/[\n]/g, '↵');
        }
        if (name && name.trim()) {
            return name;
        }
        return `"${name}"`;
    }
    getDetail(node) {
        if (!node) {
            return undefined;
        }
        if (node.type === 'boolean' || node.type === 'number' || node.type === 'null' || node.type === 'string') {
            return String(node.value);
        }
        else {
            if (node.type === 'array') {
                return node.children.length ? undefined : '[]';
            }
            else if (node.type === 'object') {
                return node.children.length ? undefined : '{}';
            }
        }
        return undefined;
    }
    findDocumentColors(document, doc, context) {
        return this.schemaService.getSchemaForResource(document.uri, doc).then(schema => {
            const result = [];
            if (schema) {
                let limit = context && typeof context.resultLimit === 'number' ? context.resultLimit : Number.MAX_VALUE;
                const matchingSchemas = doc.getMatchingSchemas(schema.schema);
                const visitedNode = {};
                for (const s of matchingSchemas) {
                    if (!s.inverted && s.schema && (s.schema.format === 'color' || s.schema.format === 'color-hex') && s.node && s.node.type === 'string') {
                        const nodeId = String(s.node.offset);
                        if (!visitedNode[nodeId]) {
                            const color = (0,_utils_colors__WEBPACK_IMPORTED_MODULE_2__.colorFromHex)(_parser_jsonParser__WEBPACK_IMPORTED_MODULE_0__.getNodeValue(s.node));
                            if (color) {
                                const range = getRange(document, s.node);
                                result.push({ color, range });
                            }
                            visitedNode[nodeId] = true;
                            limit--;
                            if (limit <= 0) {
                                if (context && context.onResultLimitExceeded) {
                                    context.onResultLimitExceeded(document.uri);
                                }
                                return result;
                            }
                        }
                    }
                }
            }
            return result;
        });
    }
    getColorPresentations(document, doc, color, range) {
        const result = [];
        const red256 = Math.round(color.red * 255), green256 = Math.round(color.green * 255), blue256 = Math.round(color.blue * 255);
        function toTwoDigitHex(n) {
            const r = n.toString(16);
            return r.length !== 2 ? '0' + r : r;
        }
        let label;
        if (color.alpha === 1) {
            label = `#${toTwoDigitHex(red256)}${toTwoDigitHex(green256)}${toTwoDigitHex(blue256)}`;
        }
        else {
            label = `#${toTwoDigitHex(red256)}${toTwoDigitHex(green256)}${toTwoDigitHex(blue256)}${toTwoDigitHex(Math.round(color.alpha * 255))}`;
        }
        result.push({ label: label, textEdit: _jsonLanguageTypes__WEBPACK_IMPORTED_MODULE_3__.TextEdit.replace(range, JSON.stringify(label)) });
        return result;
    }
}
function getRange(document, node) {
    return _jsonLanguageTypes__WEBPACK_IMPORTED_MODULE_3__.Range.create(document.positionAt(node.offset), document.positionAt(node.offset + node.length));
}
function getName(node) {
    return _parser_jsonParser__WEBPACK_IMPORTED_MODULE_0__.getNodeValue(node) || _vscode_l10n__WEBPACK_IMPORTED_MODULE_4__.t('<empty>');
}


}),
3723: (function (__unused_webpack_module, __webpack_exports__, __webpack_require__) {
__webpack_require__.r(__webpack_exports__);
__webpack_require__.d(__webpack_exports__, {
  getFoldingRanges: () => (getFoldingRanges)
});
/* ESM import */var jsonc_parser__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(2330);
/* ESM import */var _jsonLanguageTypes__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(3713);
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/


function getFoldingRanges(document, context) {
    const ranges = [];
    const nestingLevels = [];
    const stack = [];
    let prevStart = -1;
    const scanner = (0,jsonc_parser__WEBPACK_IMPORTED_MODULE_0__.createScanner)(document.getText(), false);
    let token = scanner.scan();
    function addRange(range) {
        ranges.push(range);
        nestingLevels.push(stack.length);
    }
    while (token !== 17 /* SyntaxKind.EOF */) {
        switch (token) {
            case 1 /* SyntaxKind.OpenBraceToken */:
            case 3 /* SyntaxKind.OpenBracketToken */: {
                const startLine = document.positionAt(scanner.getTokenOffset()).line;
                const range = { startLine, endLine: startLine, kind: token === 1 /* SyntaxKind.OpenBraceToken */ ? 'object' : 'array' };
                stack.push(range);
                break;
            }
            case 2 /* SyntaxKind.CloseBraceToken */:
            case 4 /* SyntaxKind.CloseBracketToken */: {
                const kind = token === 2 /* SyntaxKind.CloseBraceToken */ ? 'object' : 'array';
                if (stack.length > 0 && stack[stack.length - 1].kind === kind) {
                    const range = stack.pop();
                    const line = document.positionAt(scanner.getTokenOffset()).line;
                    if (range && line > range.startLine + 1 && prevStart !== range.startLine) {
                        range.endLine = line - 1;
                        addRange(range);
                        prevStart = range.startLine;
                    }
                }
                break;
            }
            case 13 /* SyntaxKind.BlockCommentTrivia */: {
                const startLine = document.positionAt(scanner.getTokenOffset()).line;
                const endLine = document.positionAt(scanner.getTokenOffset() + scanner.getTokenLength()).line;
                if (scanner.getTokenError() === 1 /* ScanError.UnexpectedEndOfComment */ && startLine + 1 < document.lineCount) {
                    scanner.setPosition(document.offsetAt(_jsonLanguageTypes__WEBPACK_IMPORTED_MODULE_1__.Position.create(startLine + 1, 0)));
                }
                else {
                    if (startLine < endLine) {
                        addRange({ startLine, endLine, kind: _jsonLanguageTypes__WEBPACK_IMPORTED_MODULE_1__.FoldingRangeKind.Comment });
                        prevStart = startLine;
                    }
                }
                break;
            }
            case 12 /* SyntaxKind.LineCommentTrivia */: {
                const text = document.getText().substr(scanner.getTokenOffset(), scanner.getTokenLength());
                const m = text.match(/^\/\/\s*#(region\b)|(endregion\b)/);
                if (m) {
                    const line = document.positionAt(scanner.getTokenOffset()).line;
                    if (m[1]) { // start pattern match
                        const range = { startLine: line, endLine: line, kind: _jsonLanguageTypes__WEBPACK_IMPORTED_MODULE_1__.FoldingRangeKind.Region };
                        stack.push(range);
                    }
                    else {
                        let i = stack.length - 1;
                        while (i >= 0 && stack[i].kind !== _jsonLanguageTypes__WEBPACK_IMPORTED_MODULE_1__.FoldingRangeKind.Region) {
                            i--;
                        }
                        if (i >= 0) {
                            const range = stack[i];
                            stack.length = i;
                            if (line > range.startLine && prevStart !== range.startLine) {
                                range.endLine = line;
                                addRange(range);
                                prevStart = range.startLine;
                            }
                        }
                    }
                }
                break;
            }
        }
        token = scanner.scan();
    }
    const rangeLimit = context && context.rangeLimit;
    if (typeof rangeLimit !== 'number' || ranges.length <= rangeLimit) {
        return ranges;
    }
    if (context && context.onRangeLimitExceeded) {
        context.onRangeLimitExceeded(document.uri);
    }
    const counts = [];
    for (let level of nestingLevels) {
        if (level < 30) {
            counts[level] = (counts[level] || 0) + 1;
        }
    }
    let entries = 0;
    let maxLevel = 0;
    for (let i = 0; i < counts.length; i++) {
        const n = counts[i];
        if (n) {
            if (n + entries > rangeLimit) {
                maxLevel = i;
                break;
            }
            entries += n;
        }
    }
    const result = [];
    for (let i = 0; i < ranges.length; i++) {
        const level = nestingLevels[i];
        if (typeof level === 'number') {
            if (level < maxLevel || (level === maxLevel && entries++ < rangeLimit)) {
                result.push(ranges[i]);
            }
        }
    }
    return result;
}


}),
3716: (function (__unused_webpack_module, __webpack_exports__, __webpack_require__) {
__webpack_require__.r(__webpack_exports__);
__webpack_require__.d(__webpack_exports__, {
  JSONHover: () => (JSONHover)
});
/* ESM import */var _parser_jsonParser__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(3710);
/* ESM import */var _jsonLanguageTypes__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(3713);
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/


class JSONHover {
    constructor(schemaService, contributions = [], promiseConstructor) {
        this.schemaService = schemaService;
        this.contributions = contributions;
        this.promise = promiseConstructor || Promise;
    }
    doHover(document, position, doc) {
        const offset = document.offsetAt(position);
        let node = doc.getNodeFromOffset(offset);
        if (!node || (node.type === 'object' || node.type === 'array') && offset > node.offset + 1 && offset < node.offset + node.length - 1) {
            return this.promise.resolve(null);
        }
        const hoverRangeNode = node;
        // use the property description when hovering over an object key
        if (node.type === 'string') {
            const parent = node.parent;
            if (parent && parent.type === 'property' && parent.keyNode === node) {
                node = parent.valueNode;
                if (!node) {
                    return this.promise.resolve(null);
                }
            }
        }
        const hoverRange = _jsonLanguageTypes__WEBPACK_IMPORTED_MODULE_1__.Range.create(document.positionAt(hoverRangeNode.offset), document.positionAt(hoverRangeNode.offset + hoverRangeNode.length));
        const createHover = (contents) => {
            const result = {
                contents: contents,
                range: hoverRange
            };
            return result;
        };
        const location = _parser_jsonParser__WEBPACK_IMPORTED_MODULE_0__.getNodePath(node);
        for (let i = this.contributions.length - 1; i >= 0; i--) {
            const contribution = this.contributions[i];
            const promise = contribution.getInfoContribution(document.uri, location);
            if (promise) {
                return promise.then(htmlContent => createHover(htmlContent));
            }
        }
        return this.schemaService.getSchemaForResource(document.uri, doc).then((schema) => {
            if (schema && node) {
                const matchingSchemas = doc.getMatchingSchemas(schema.schema, node.offset);
                let title = undefined;
                let markdownDescription = undefined;
                let markdownEnumValueDescription = undefined, enumValue = undefined;
                matchingSchemas.every((s) => {
                    if (s.node === node && !s.inverted && s.schema) {
                        title = title || s.schema.title;
                        markdownDescription = markdownDescription || s.schema.markdownDescription || toMarkdown(s.schema.description);
                        if (s.schema.enum) {
                            const idx = s.schema.enum.indexOf(_parser_jsonParser__WEBPACK_IMPORTED_MODULE_0__.getNodeValue(node));
                            if (s.schema.markdownEnumDescriptions) {
                                markdownEnumValueDescription = s.schema.markdownEnumDescriptions[idx];
                            }
                            else if (s.schema.enumDescriptions) {
                                markdownEnumValueDescription = toMarkdown(s.schema.enumDescriptions[idx]);
                            }
                            if (markdownEnumValueDescription) {
                                enumValue = s.schema.enum[idx];
                                if (typeof enumValue !== 'string') {
                                    enumValue = JSON.stringify(enumValue);
                                }
                            }
                        }
                    }
                    return true;
                });
                let result = '';
                if (title) {
                    result = toMarkdown(title);
                }
                if (markdownDescription) {
                    if (result.length > 0) {
                        result += "\n\n";
                    }
                    result += markdownDescription;
                }
                if (markdownEnumValueDescription) {
                    if (result.length > 0) {
                        result += "\n\n";
                    }
                    result += `\`${toMarkdownCodeBlock(enumValue)}\`: ${markdownEnumValueDescription}`;
                }
                return createHover([result]);
            }
            return null;
        });
    }
}
function toMarkdown(plain) {
    if (plain) {
        const res = plain.replace(/([^\n\r])(\r?\n)([^\n\r])/gm, '$1\n\n$3'); // single new lines to \n\n (Markdown paragraph)
        return res.replace(/[\\`*_{}[\]()#+\-.!]/g, "\\$&"); // escape markdown syntax tokens: http://daringfireball.net/projects/markdown/syntax#backslash
    }
    return undefined;
}
function toMarkdownCodeBlock(content) {
    // see https://daringfireball.net/projects/markdown/syntax#precode
    if (content.indexOf('`') !== -1) {
        return '`` ' + content + ' ``';
    }
    return content;
}


}),
3728: (function (__unused_webpack_module, __webpack_exports__, __webpack_require__) {
__webpack_require__.r(__webpack_exports__);
__webpack_require__.d(__webpack_exports__, {
  findLinks: () => (findLinks)
});
/* ESM import */var _jsonLanguageTypes__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(3713);
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

function findLinks(document, doc) {
    const links = [];
    doc.visit(node => {
        if (node.type === "property" && node.keyNode.value === "$ref" && node.valueNode?.type === 'string') {
            const path = node.valueNode.value;
            const targetNode = findTargetNode(doc, path);
            if (targetNode) {
                const targetPos = document.positionAt(targetNode.offset);
                links.push({
                    target: `${document.uri}#${targetPos.line + 1},${targetPos.character + 1}`,
                    range: createRange(document, node.valueNode)
                });
            }
        }
        return true;
    });
    return Promise.resolve(links);
}
function createRange(document, node) {
    return _jsonLanguageTypes__WEBPACK_IMPORTED_MODULE_0__.Range.create(document.positionAt(node.offset + 1), document.positionAt(node.offset + node.length - 1));
}
function findTargetNode(doc, path) {
    const tokens = parseJSONPointer(path);
    if (!tokens) {
        return null;
    }
    return findNode(tokens, doc.root);
}
function findNode(pointer, node) {
    if (!node) {
        return null;
    }
    if (pointer.length === 0) {
        return node;
    }
    const token = pointer.shift();
    if (node && node.type === 'object') {
        const propertyNode = node.properties.find((propertyNode) => propertyNode.keyNode.value === token);
        if (!propertyNode) {
            return null;
        }
        return findNode(pointer, propertyNode.valueNode);
    }
    else if (node && node.type === 'array') {
        if (token.match(/^(0|[1-9][0-9]*)$/)) {
            const index = Number.parseInt(token);
            const arrayItem = node.items[index];
            if (!arrayItem) {
                return null;
            }
            return findNode(pointer, arrayItem);
        }
    }
    return null;
}
function parseJSONPointer(path) {
    if (path === "#") {
        return [];
    }
    if (path[0] !== '#' || path[1] !== '/') {
        return null;
    }
    return path.substring(2).split(/\//).map(unescape);
}
function unescape(str) {
    return str.replace(/~1/g, '/').replace(/~0/g, '~');
}


}),
3721: (function (__unused_webpack_module, __webpack_exports__, __webpack_require__) {
__webpack_require__.r(__webpack_exports__);
__webpack_require__.d(__webpack_exports__, {
  JSONSchemaService: () => (JSONSchemaService),
  ResolvedSchema: () => (ResolvedSchema),
  UnresolvedSchema: () => (UnresolvedSchema)
});
/* ESM import */var jsonc_parser__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(2330);
/* ESM import */var vscode_uri__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(3707);
/* ESM import */var _utils_strings__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(3712);
/* ESM import */var _parser_jsonParser__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(3710);
/* ESM import */var _jsonLanguageTypes__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(3713);
/* ESM import */var _vscode_l10n__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(3714);
/* ESM import */var _utils_glob__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(3722);
/* ESM import */var _utils_objects__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(3711);
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/








const BANG = '!';
const PATH_SEP = '/';
class FilePatternAssociation {
    constructor(pattern, folderUri, uris) {
        this.folderUri = folderUri;
        this.uris = uris;
        this.globWrappers = [];
        try {
            for (let patternString of pattern) {
                const include = patternString[0] !== BANG;
                if (!include) {
                    patternString = patternString.substring(1);
                }
                if (patternString.length > 0) {
                    if (patternString[0] === PATH_SEP) {
                        patternString = patternString.substring(1);
                    }
                    this.globWrappers.push({
                        regexp: (0,_utils_glob__WEBPACK_IMPORTED_MODULE_4__.createRegex)('**/' + patternString, { extended: true, globstar: true }),
                        include: include,
                    });
                }
            }
            ;
            if (folderUri) {
                folderUri = normalizeResourceForMatching(folderUri);
                if (!folderUri.endsWith('/')) {
                    folderUri = folderUri + '/';
                }
                this.folderUri = folderUri;
            }
        }
        catch (e) {
            this.globWrappers.length = 0;
            this.uris = [];
        }
    }
    matchesPattern(fileName) {
        if (this.folderUri && !fileName.startsWith(this.folderUri)) {
            return false;
        }
        let match = false;
        for (const { regexp, include } of this.globWrappers) {
            if (regexp.test(fileName)) {
                match = include;
            }
        }
        return match;
    }
    getURIs() {
        return this.uris;
    }
}
class SchemaHandle {
    constructor(service, uri, unresolvedSchemaContent) {
        this.service = service;
        this.uri = uri;
        this.dependencies = new Set();
        this.anchors = undefined;
        if (unresolvedSchemaContent) {
            this.unresolvedSchema = this.service.promise.resolve(new UnresolvedSchema(unresolvedSchemaContent));
        }
    }
    getUnresolvedSchema() {
        if (!this.unresolvedSchema) {
            this.unresolvedSchema = this.service.loadSchema(this.uri);
        }
        return this.unresolvedSchema;
    }
    getResolvedSchema() {
        if (!this.resolvedSchema) {
            this.resolvedSchema = this.getUnresolvedSchema().then(unresolved => {
                return this.service.resolveSchemaContent(unresolved, this);
            });
        }
        return this.resolvedSchema;
    }
    clearSchema() {
        const hasChanges = !!this.unresolvedSchema;
        this.resolvedSchema = undefined;
        this.unresolvedSchema = undefined;
        this.dependencies.clear();
        this.anchors = undefined;
        return hasChanges;
    }
}
class UnresolvedSchema {
    constructor(schema, errors = []) {
        this.schema = schema;
        this.errors = errors;
    }
}
class ResolvedSchema {
    constructor(schema, errors = [], warnings = [], schemaDraft) {
        this.schema = schema;
        this.errors = errors;
        this.warnings = warnings;
        this.schemaDraft = schemaDraft;
    }
    getSection(path) {
        const schemaRef = this.getSectionRecursive(path, this.schema);
        if (schemaRef) {
            return (0,_parser_jsonParser__WEBPACK_IMPORTED_MODULE_2__.asSchema)(schemaRef);
        }
        return undefined;
    }
    getSectionRecursive(path, schema) {
        if (!schema || typeof schema === 'boolean' || path.length === 0) {
            return schema;
        }
        const next = path.shift();
        if (schema.properties && typeof schema.properties[next]) {
            return this.getSectionRecursive(path, schema.properties[next]);
        }
        else if (schema.patternProperties) {
            for (const pattern of Object.keys(schema.patternProperties)) {
                const regex = _utils_strings__WEBPACK_IMPORTED_MODULE_1__.extendedRegExp(pattern);
                if (regex?.test(next)) {
                    return this.getSectionRecursive(path, schema.patternProperties[pattern]);
                }
            }
        }
        else if (typeof schema.additionalProperties === 'object') {
            return this.getSectionRecursive(path, schema.additionalProperties);
        }
        else if (next.match('[0-9]+')) {
            if (Array.isArray(schema.items)) {
                const index = parseInt(next, 10);
                if (!isNaN(index) && schema.items[index]) {
                    return this.getSectionRecursive(path, schema.items[index]);
                }
            }
            else if (schema.items) {
                return this.getSectionRecursive(path, schema.items);
            }
        }
        return undefined;
    }
}
class JSONSchemaService {
    constructor(requestService, contextService, promiseConstructor) {
        this.contextService = contextService;
        this.requestService = requestService;
        this.promiseConstructor = promiseConstructor || Promise;
        this.callOnDispose = [];
        this.contributionSchemas = {};
        this.contributionAssociations = [];
        this.schemasById = {};
        this.filePatternAssociations = [];
        this.registeredSchemasIds = {};
    }
    getRegisteredSchemaIds(filter) {
        return Object.keys(this.registeredSchemasIds).filter(id => {
            const scheme = vscode_uri__WEBPACK_IMPORTED_MODULE_6__.URI.parse(id).scheme;
            return scheme !== 'schemaservice' && (!filter || filter(scheme));
        });
    }
    get promise() {
        return this.promiseConstructor;
    }
    dispose() {
        while (this.callOnDispose.length > 0) {
            this.callOnDispose.pop()();
        }
    }
    onResourceChange(uri) {
        // always clear this local cache when a resource changes
        this.cachedSchemaForResource = undefined;
        let hasChanges = false;
        uri = (0,_parser_jsonParser__WEBPACK_IMPORTED_MODULE_2__.normalizeId)(uri);
        const toWalk = [uri];
        const all = Object.keys(this.schemasById).map(key => this.schemasById[key]);
        while (toWalk.length) {
            const curr = toWalk.pop();
            for (let i = 0; i < all.length; i++) {
                const handle = all[i];
                if (handle && (handle.uri === curr || handle.dependencies.has(curr))) {
                    if (handle.uri !== curr) {
                        toWalk.push(handle.uri);
                    }
                    if (handle.clearSchema()) {
                        hasChanges = true;
                    }
                    all[i] = undefined;
                }
            }
        }
        return hasChanges;
    }
    setSchemaContributions(schemaContributions) {
        if (schemaContributions.schemas) {
            const schemas = schemaContributions.schemas;
            for (const id in schemas) {
                const normalizedId = (0,_parser_jsonParser__WEBPACK_IMPORTED_MODULE_2__.normalizeId)(id);
                this.contributionSchemas[normalizedId] = this.addSchemaHandle(normalizedId, schemas[id]);
            }
        }
        if (Array.isArray(schemaContributions.schemaAssociations)) {
            const schemaAssociations = schemaContributions.schemaAssociations;
            for (let schemaAssociation of schemaAssociations) {
                const uris = schemaAssociation.uris.map(_parser_jsonParser__WEBPACK_IMPORTED_MODULE_2__.normalizeId);
                const association = this.addFilePatternAssociation(schemaAssociation.pattern, schemaAssociation.folderUri, uris);
                this.contributionAssociations.push(association);
            }
        }
    }
    addSchemaHandle(id, unresolvedSchemaContent) {
        const schemaHandle = new SchemaHandle(this, id, unresolvedSchemaContent);
        this.schemasById[id] = schemaHandle;
        return schemaHandle;
    }
    getOrAddSchemaHandle(id, unresolvedSchemaContent) {
        return this.schemasById[id] || this.addSchemaHandle(id, unresolvedSchemaContent);
    }
    addFilePatternAssociation(pattern, folderUri, uris) {
        const fpa = new FilePatternAssociation(pattern, folderUri, uris);
        this.filePatternAssociations.push(fpa);
        return fpa;
    }
    registerExternalSchema(config) {
        const id = (0,_parser_jsonParser__WEBPACK_IMPORTED_MODULE_2__.normalizeId)(config.uri);
        this.registeredSchemasIds[id] = true;
        this.cachedSchemaForResource = undefined;
        if (config.fileMatch && config.fileMatch.length) {
            this.addFilePatternAssociation(config.fileMatch, config.folderUri, [id]);
        }
        return config.schema ? this.addSchemaHandle(id, config.schema) : this.getOrAddSchemaHandle(id);
    }
    clearExternalSchemas() {
        this.schemasById = {};
        this.filePatternAssociations = [];
        this.registeredSchemasIds = {};
        this.cachedSchemaForResource = undefined;
        for (const id in this.contributionSchemas) {
            this.schemasById[id] = this.contributionSchemas[id];
            this.registeredSchemasIds[id] = true;
        }
        for (const contributionAssociation of this.contributionAssociations) {
            this.filePatternAssociations.push(contributionAssociation);
        }
    }
    getResolvedSchema(schemaId) {
        const id = (0,_parser_jsonParser__WEBPACK_IMPORTED_MODULE_2__.normalizeId)(schemaId);
        const schemaHandle = this.schemasById[id];
        if (schemaHandle) {
            return schemaHandle.getResolvedSchema();
        }
        return this.promise.resolve(undefined);
    }
    loadSchema(url) {
        if (!this.requestService) {
            const errorMessage = _vscode_l10n__WEBPACK_IMPORTED_MODULE_7__.t('Unable to load schema from \'{0}\'. No schema request service available', toDisplayString(url));
            return this.promise.resolve(new UnresolvedSchema({}, [errorMessage]));
        }
        return this.requestService(url).then(content => {
            if (!content) {
                const errorMessage = _vscode_l10n__WEBPACK_IMPORTED_MODULE_7__.t('Unable to load schema from \'{0}\': No content.', toDisplayString(url));
                return new UnresolvedSchema({}, [errorMessage]);
            }
            const errors = [];
            if (content.charCodeAt(0) === 65279) {
                errors.push(_vscode_l10n__WEBPACK_IMPORTED_MODULE_7__.t('Problem reading content from \'{0}\': UTF-8 with BOM detected, only UTF 8 is allowed.', toDisplayString(url)));
                content = content.trimStart();
            }
            let schemaContent = {};
            const jsonErrors = [];
            schemaContent = jsonc_parser__WEBPACK_IMPORTED_MODULE_0__.parse(content, jsonErrors);
            if (jsonErrors.length) {
                errors.push(_vscode_l10n__WEBPACK_IMPORTED_MODULE_7__.t('Unable to parse content from \'{0}\': Parse error at offset {1}.', toDisplayString(url), jsonErrors[0].offset));
            }
            return new UnresolvedSchema(schemaContent, errors);
        }, (error) => {
            let errorMessage = error.toString();
            const errorSplit = error.toString().split('Error: ');
            if (errorSplit.length > 1) {
                // more concise error message, URL and context are attached by caller anyways
                errorMessage = errorSplit[1];
            }
            if (_utils_strings__WEBPACK_IMPORTED_MODULE_1__.endsWith(errorMessage, '.')) {
                errorMessage = errorMessage.substr(0, errorMessage.length - 1);
            }
            return new UnresolvedSchema({}, [_vscode_l10n__WEBPACK_IMPORTED_MODULE_7__.t('Unable to load schema from \'{0}\': {1}.', toDisplayString(url), errorMessage)]);
        });
    }
    resolveSchemaContent(schemaToResolve, handle) {
        const resolveErrors = schemaToResolve.errors.slice(0);
        const schema = schemaToResolve.schema;
        const schemaDraft = schema.$schema ? (0,_parser_jsonParser__WEBPACK_IMPORTED_MODULE_2__.getSchemaDraftFromId)(schema.$schema) : undefined;
        if (schemaDraft === _jsonLanguageTypes__WEBPACK_IMPORTED_MODULE_3__.SchemaDraft.v3) {
            return this.promise.resolve(new ResolvedSchema({}, [_vscode_l10n__WEBPACK_IMPORTED_MODULE_7__.t("Draft-03 schemas are not supported.")], [], schemaDraft));
        }
        let usesUnsupportedFeatures = new Set();
        const contextService = this.contextService;
        const findSectionByJSONPointer = (schema, path) => {
            path = decodeURIComponent(path);
            let current = schema;
            if (path[0] === '/') {
                path = path.substring(1);
            }
            path.split('/').some((part) => {
                part = part.replace(/~1/g, '/').replace(/~0/g, '~');
                current = current[part];
                return !current;
            });
            return current;
        };
        const findSchemaById = (schema, handle, id) => {
            if (!handle.anchors) {
                handle.anchors = collectAnchors(schema);
            }
            return handle.anchors.get(id);
        };
        const merge = (target, section) => {
            for (const key in section) {
                if (section.hasOwnProperty(key) && key !== 'id' && key !== '$id') {
                    target[key] = section[key];
                }
            }
        };
        const mergeRef = (target, sourceRoot, sourceHandle, refSegment) => {
            let section;
            if (refSegment === undefined || refSegment.length === 0) {
                section = sourceRoot;
            }
            else if (refSegment.charAt(0) === '/') {
                // A $ref to a JSON Pointer (i.e #/definitions/foo)
                section = findSectionByJSONPointer(sourceRoot, refSegment);
            }
            else {
                // A $ref to a sub-schema with an $id (i.e #hello)
                section = findSchemaById(sourceRoot, sourceHandle, refSegment);
            }
            if (section) {
                merge(target, section);
            }
            else {
                resolveErrors.push(_vscode_l10n__WEBPACK_IMPORTED_MODULE_7__.t('$ref \'{0}\' in \'{1}\' can not be resolved.', refSegment || '', sourceHandle.uri));
            }
        };
        const resolveExternalLink = (node, uri, refSegment, parentHandle) => {
            if (contextService && !/^[A-Za-z][A-Za-z0-9+\-.+]*:\/.*/.test(uri)) {
                uri = contextService.resolveRelativePath(uri, parentHandle.uri);
            }
            uri = (0,_parser_jsonParser__WEBPACK_IMPORTED_MODULE_2__.normalizeId)(uri);
            const referencedHandle = this.getOrAddSchemaHandle(uri);
            return referencedHandle.getUnresolvedSchema().then(unresolvedSchema => {
                parentHandle.dependencies.add(uri);
                if (unresolvedSchema.errors.length) {
                    const loc = refSegment ? uri + '#' + refSegment : uri;
                    resolveErrors.push(_vscode_l10n__WEBPACK_IMPORTED_MODULE_7__.t('Problems loading reference \'{0}\': {1}', loc, unresolvedSchema.errors[0]));
                }
                mergeRef(node, unresolvedSchema.schema, referencedHandle, refSegment);
                return resolveRefs(node, unresolvedSchema.schema, referencedHandle);
            });
        };
        const resolveRefs = (node, parentSchema, parentHandle) => {
            const openPromises = [];
            this.traverseNodes(node, next => {
                const seenRefs = new Set();
                while (next.$ref) {
                    const ref = next.$ref;
                    const segments = ref.split('#', 2);
                    delete next.$ref;
                    if (segments[0].length > 0) {
                        // This is a reference to an external schema
                        openPromises.push(resolveExternalLink(next, segments[0], segments[1], parentHandle));
                        return;
                    }
                    else {
                        // This is a reference inside the current schema
                        if (!seenRefs.has(ref)) {
                            const id = segments[1];
                            mergeRef(next, parentSchema, parentHandle, id);
                            seenRefs.add(ref);
                        }
                    }
                }
                if (next.$recursiveRef) {
                    usesUnsupportedFeatures.add('$recursiveRef');
                }
                if (next.$dynamicRef) {
                    usesUnsupportedFeatures.add('$dynamicRef');
                }
            });
            return this.promise.all(openPromises);
        };
        const collectAnchors = (root) => {
            const result = new Map();
            this.traverseNodes(root, next => {
                const id = next.$id || next.id;
                const anchor = (0,_utils_objects__WEBPACK_IMPORTED_MODULE_5__.isString)(id) && id.charAt(0) === '#' ? id.substring(1) : next.$anchor;
                if (anchor) {
                    if (result.has(anchor)) {
                        resolveErrors.push(_vscode_l10n__WEBPACK_IMPORTED_MODULE_7__.t('Duplicate anchor declaration: \'{0}\'', anchor));
                    }
                    else {
                        result.set(anchor, next);
                    }
                }
                if (next.$recursiveAnchor) {
                    usesUnsupportedFeatures.add('$recursiveAnchor');
                }
                if (next.$dynamicAnchor) {
                    usesUnsupportedFeatures.add('$dynamicAnchor');
                }
            });
            return result;
        };
        return resolveRefs(schema, schema, handle).then(_ => {
            let resolveWarnings = [];
            if (usesUnsupportedFeatures.size) {
                resolveWarnings.push(_vscode_l10n__WEBPACK_IMPORTED_MODULE_7__.t('The schema uses meta-schema features ({0}) that are not yet supported by the validator.', Array.from(usesUnsupportedFeatures.keys()).join(', ')));
            }
            return new ResolvedSchema(schema, resolveErrors, resolveWarnings, schemaDraft);
        });
    }
    traverseNodes(root, handle) {
        if (!root || typeof root !== 'object') {
            return Promise.resolve(null);
        }
        const seen = new Set();
        const collectEntries = (...entries) => {
            for (const entry of entries) {
                if ((0,_utils_objects__WEBPACK_IMPORTED_MODULE_5__.isObject)(entry)) {
                    toWalk.push(entry);
                }
            }
        };
        const collectMapEntries = (...maps) => {
            for (const map of maps) {
                if ((0,_utils_objects__WEBPACK_IMPORTED_MODULE_5__.isObject)(map)) {
                    for (const k in map) {
                        const key = k;
                        const entry = map[key];
                        if ((0,_utils_objects__WEBPACK_IMPORTED_MODULE_5__.isObject)(entry)) {
                            toWalk.push(entry);
                        }
                    }
                }
            }
        };
        const collectArrayEntries = (...arrays) => {
            for (const array of arrays) {
                if (Array.isArray(array)) {
                    for (const entry of array) {
                        if ((0,_utils_objects__WEBPACK_IMPORTED_MODULE_5__.isObject)(entry)) {
                            toWalk.push(entry);
                        }
                    }
                }
            }
        };
        const collectEntryOrArrayEntries = (items) => {
            if (Array.isArray(items)) {
                for (const entry of items) {
                    if ((0,_utils_objects__WEBPACK_IMPORTED_MODULE_5__.isObject)(entry)) {
                        toWalk.push(entry);
                    }
                }
            }
            else if ((0,_utils_objects__WEBPACK_IMPORTED_MODULE_5__.isObject)(items)) {
                toWalk.push(items);
            }
        };
        const toWalk = [root];
        let next = toWalk.pop();
        while (next) {
            if (!seen.has(next)) {
                seen.add(next);
                handle(next);
                collectEntries(next.additionalItems, next.additionalProperties, next.not, next.contains, next.propertyNames, next.if, next.then, next.else, next.unevaluatedItems, next.unevaluatedProperties);
                collectMapEntries(next.definitions, next.$defs, next.properties, next.patternProperties, next.dependencies, next.dependentSchemas);
                collectArrayEntries(next.anyOf, next.allOf, next.oneOf, next.prefixItems);
                collectEntryOrArrayEntries(next.items);
            }
            next = toWalk.pop();
        }
    }
    ;
    getSchemaFromProperty(resource, document) {
        if (document.root?.type === 'object') {
            for (const p of document.root.properties) {
                if (p.keyNode.value === '$schema' && p.valueNode?.type === 'string') {
                    let schemaId = p.valueNode.value;
                    if (this.contextService && !/^\w[\w\d+.-]*:/.test(schemaId)) { // has scheme
                        schemaId = this.contextService.resolveRelativePath(schemaId, resource);
                    }
                    return schemaId;
                }
            }
        }
        return undefined;
    }
    getAssociatedSchemas(resource) {
        const seen = Object.create(null);
        const schemas = [];
        const normalizedResource = normalizeResourceForMatching(resource);
        for (const entry of this.filePatternAssociations) {
            if (entry.matchesPattern(normalizedResource)) {
                for (const schemaId of entry.getURIs()) {
                    if (!seen[schemaId]) {
                        schemas.push(schemaId);
                        seen[schemaId] = true;
                    }
                }
            }
        }
        return schemas;
    }
    getSchemaURIsForResource(resource, document) {
        let schemeId = document && this.getSchemaFromProperty(resource, document);
        if (schemeId) {
            return [schemeId];
        }
        return this.getAssociatedSchemas(resource);
    }
    getSchemaForResource(resource, document) {
        if (document) {
            // first use $schema if present
            let schemeId = this.getSchemaFromProperty(resource, document);
            if (schemeId) {
                const id = (0,_parser_jsonParser__WEBPACK_IMPORTED_MODULE_2__.normalizeId)(schemeId);
                return this.getOrAddSchemaHandle(id).getResolvedSchema();
            }
        }
        if (this.cachedSchemaForResource && this.cachedSchemaForResource.resource === resource) {
            return this.cachedSchemaForResource.resolvedSchema;
        }
        const schemas = this.getAssociatedSchemas(resource);
        const resolvedSchema = schemas.length > 0 ? this.createCombinedSchema(resource, schemas).getResolvedSchema() : this.promise.resolve(undefined);
        this.cachedSchemaForResource = { resource, resolvedSchema };
        return resolvedSchema;
    }
    createCombinedSchema(resource, schemaIds) {
        if (schemaIds.length === 1) {
            return this.getOrAddSchemaHandle(schemaIds[0]);
        }
        else {
            const combinedSchemaId = 'schemaservice://combinedSchema/' + encodeURIComponent(resource);
            const combinedSchema = {
                allOf: schemaIds.map(schemaId => ({ $ref: schemaId }))
            };
            return this.addSchemaHandle(combinedSchemaId, combinedSchema);
        }
    }
    getMatchingSchemas(document, jsonDocument, schema) {
        if (schema) {
            const id = schema.id || ('schemaservice://untitled/matchingSchemas/' + idCounter++);
            const handle = this.addSchemaHandle(id, schema);
            return handle.getResolvedSchema().then(resolvedSchema => {
                return jsonDocument.getMatchingSchemas(resolvedSchema.schema).filter(s => !s.inverted);
            });
        }
        return this.getSchemaForResource(document.uri, jsonDocument).then(schema => {
            if (schema) {
                return jsonDocument.getMatchingSchemas(schema.schema).filter(s => !s.inverted);
            }
            return [];
        });
    }
}
let idCounter = 0;
function normalizeResourceForMatching(resource) {
    // remove queries and fragments, normalize drive capitalization
    try {
        return vscode_uri__WEBPACK_IMPORTED_MODULE_6__.URI.parse(resource).with({ fragment: null, query: null }).toString(true);
    }
    catch (e) {
        return resource;
    }
}
function toDisplayString(url) {
    try {
        const uri = vscode_uri__WEBPACK_IMPORTED_MODULE_6__.URI.parse(url);
        if (uri.scheme === 'file') {
            return uri.fsPath;
        }
    }
    catch (e) {
        // ignore
    }
    return url;
}


}),
3724: (function (__unused_webpack_module, __webpack_exports__, __webpack_require__) {
__webpack_require__.r(__webpack_exports__);
__webpack_require__.d(__webpack_exports__, {
  getSelectionRanges: () => (getSelectionRanges)
});
/* ESM import */var _jsonLanguageTypes__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(3713);
/* ESM import */var jsonc_parser__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(2330);
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/


function getSelectionRanges(document, positions, doc) {
    function getSelectionRange(position) {
        let offset = document.offsetAt(position);
        let node = doc.getNodeFromOffset(offset, true);
        const result = [];
        while (node) {
            switch (node.type) {
                case 'string':
                case 'object':
                case 'array':
                    // range without ", [ or {
                    const cStart = node.offset + 1, cEnd = node.offset + node.length - 1;
                    if (cStart < cEnd && offset >= cStart && offset <= cEnd) {
                        result.push(newRange(cStart, cEnd));
                    }
                    result.push(newRange(node.offset, node.offset + node.length));
                    break;
                case 'number':
                case 'boolean':
                case 'null':
                case 'property':
                    result.push(newRange(node.offset, node.offset + node.length));
                    break;
            }
            if (node.type === 'property' || node.parent && node.parent.type === 'array') {
                const afterCommaOffset = getOffsetAfterNextToken(node.offset + node.length, 5 /* SyntaxKind.CommaToken */);
                if (afterCommaOffset !== -1) {
                    result.push(newRange(node.offset, afterCommaOffset));
                }
            }
            node = node.parent;
        }
        let current = undefined;
        for (let index = result.length - 1; index >= 0; index--) {
            current = _jsonLanguageTypes__WEBPACK_IMPORTED_MODULE_0__.SelectionRange.create(result[index], current);
        }
        if (!current) {
            current = _jsonLanguageTypes__WEBPACK_IMPORTED_MODULE_0__.SelectionRange.create(_jsonLanguageTypes__WEBPACK_IMPORTED_MODULE_0__.Range.create(position, position));
        }
        return current;
    }
    function newRange(start, end) {
        return _jsonLanguageTypes__WEBPACK_IMPORTED_MODULE_0__.Range.create(document.positionAt(start), document.positionAt(end));
    }
    const scanner = (0,jsonc_parser__WEBPACK_IMPORTED_MODULE_1__.createScanner)(document.getText(), true);
    function getOffsetAfterNextToken(offset, expectedToken) {
        scanner.setPosition(offset);
        let token = scanner.scan();
        if (token === expectedToken) {
            return scanner.getTokenOffset() + scanner.getTokenLength();
        }
        return -1;
    }
    return positions.map(getSelectionRange);
}


}),
3717: (function (__unused_webpack_module, __webpack_exports__, __webpack_require__) {
__webpack_require__.r(__webpack_exports__);
__webpack_require__.d(__webpack_exports__, {
  JSONValidation: () => (JSONValidation)
});
/* ESM import */var _jsonLanguageTypes__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(3713);
/* ESM import */var _vscode_l10n__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(3714);
/* ESM import */var _utils_objects__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(3711);
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/



class JSONValidation {
    constructor(jsonSchemaService, promiseConstructor) {
        this.jsonSchemaService = jsonSchemaService;
        this.promise = promiseConstructor;
        this.validationEnabled = true;
    }
    configure(raw) {
        if (raw) {
            this.validationEnabled = raw.validate !== false;
            this.commentSeverity = raw.allowComments ? undefined : _jsonLanguageTypes__WEBPACK_IMPORTED_MODULE_0__.DiagnosticSeverity.Error;
        }
    }
    doValidation(textDocument, jsonDocument, documentSettings, schema) {
        if (!this.validationEnabled) {
            return this.promise.resolve([]);
        }
        const diagnostics = [];
        const added = {};
        const addProblem = (problem) => {
            // remove duplicated messages
            const signature = problem.range.start.line + ' ' + problem.range.start.character + ' ' + problem.message;
            if (!added[signature]) {
                added[signature] = true;
                diagnostics.push(problem);
            }
        };
        const getDiagnostics = (schema) => {
            let trailingCommaSeverity = documentSettings?.trailingCommas ? toDiagnosticSeverity(documentSettings.trailingCommas) : _jsonLanguageTypes__WEBPACK_IMPORTED_MODULE_0__.DiagnosticSeverity.Error;
            let commentSeverity = documentSettings?.comments ? toDiagnosticSeverity(documentSettings.comments) : this.commentSeverity;
            let schemaValidation = documentSettings?.schemaValidation ? toDiagnosticSeverity(documentSettings.schemaValidation) : _jsonLanguageTypes__WEBPACK_IMPORTED_MODULE_0__.DiagnosticSeverity.Warning;
            let schemaRequest = documentSettings?.schemaRequest ? toDiagnosticSeverity(documentSettings.schemaRequest) : _jsonLanguageTypes__WEBPACK_IMPORTED_MODULE_0__.DiagnosticSeverity.Warning;
            if (schema) {
                const addSchemaProblem = (errorMessage, errorCode) => {
                    if (jsonDocument.root && schemaRequest) {
                        const astRoot = jsonDocument.root;
                        const property = astRoot.type === 'object' ? astRoot.properties[0] : undefined;
                        if (property && property.keyNode.value === '$schema') {
                            const node = property.valueNode || property;
                            const range = _jsonLanguageTypes__WEBPACK_IMPORTED_MODULE_0__.Range.create(textDocument.positionAt(node.offset), textDocument.positionAt(node.offset + node.length));
                            addProblem(_jsonLanguageTypes__WEBPACK_IMPORTED_MODULE_0__.Diagnostic.create(range, errorMessage, schemaRequest, errorCode));
                        }
                        else {
                            const range = _jsonLanguageTypes__WEBPACK_IMPORTED_MODULE_0__.Range.create(textDocument.positionAt(astRoot.offset), textDocument.positionAt(astRoot.offset + 1));
                            addProblem(_jsonLanguageTypes__WEBPACK_IMPORTED_MODULE_0__.Diagnostic.create(range, errorMessage, schemaRequest, errorCode));
                        }
                    }
                };
                if (schema.errors.length) {
                    addSchemaProblem(schema.errors[0], _jsonLanguageTypes__WEBPACK_IMPORTED_MODULE_0__.ErrorCode.SchemaResolveError);
                }
                else if (schemaValidation) {
                    for (const warning of schema.warnings) {
                        addSchemaProblem(warning, _jsonLanguageTypes__WEBPACK_IMPORTED_MODULE_0__.ErrorCode.SchemaUnsupportedFeature);
                    }
                    const semanticErrors = jsonDocument.validate(textDocument, schema.schema, schemaValidation, documentSettings?.schemaDraft);
                    if (semanticErrors) {
                        semanticErrors.forEach(addProblem);
                    }
                }
                if (schemaAllowsComments(schema.schema)) {
                    commentSeverity = undefined;
                }
                if (schemaAllowsTrailingCommas(schema.schema)) {
                    trailingCommaSeverity = undefined;
                }
            }
            for (const p of jsonDocument.syntaxErrors) {
                if (p.code === _jsonLanguageTypes__WEBPACK_IMPORTED_MODULE_0__.ErrorCode.TrailingComma) {
                    if (typeof trailingCommaSeverity !== 'number') {
                        continue;
                    }
                    p.severity = trailingCommaSeverity;
                }
                addProblem(p);
            }
            if (typeof commentSeverity === 'number') {
                const message = _vscode_l10n__WEBPACK_IMPORTED_MODULE_2__.t('Comments are not permitted in JSON.');
                jsonDocument.comments.forEach(c => {
                    addProblem(_jsonLanguageTypes__WEBPACK_IMPORTED_MODULE_0__.Diagnostic.create(c, message, commentSeverity, _jsonLanguageTypes__WEBPACK_IMPORTED_MODULE_0__.ErrorCode.CommentNotPermitted));
                });
            }
            return diagnostics;
        };
        if (schema) {
            const uri = schema.id || ('schemaservice://untitled/' + idCounter++);
            const handle = this.jsonSchemaService.registerExternalSchema({ uri, schema });
            return handle.getResolvedSchema().then(resolvedSchema => {
                return getDiagnostics(resolvedSchema);
            });
        }
        return this.jsonSchemaService.getSchemaForResource(textDocument.uri, jsonDocument).then(schema => {
            return getDiagnostics(schema);
        });
    }
    getLanguageStatus(textDocument, jsonDocument) {
        return { schemas: this.jsonSchemaService.getSchemaURIsForResource(textDocument.uri, jsonDocument) };
    }
}
let idCounter = 0;
function schemaAllowsComments(schemaRef) {
    if (schemaRef && typeof schemaRef === 'object') {
        if ((0,_utils_objects__WEBPACK_IMPORTED_MODULE_1__.isBoolean)(schemaRef.allowComments)) {
            return schemaRef.allowComments;
        }
        if (schemaRef.allOf) {
            for (const schema of schemaRef.allOf) {
                const allow = schemaAllowsComments(schema);
                if ((0,_utils_objects__WEBPACK_IMPORTED_MODULE_1__.isBoolean)(allow)) {
                    return allow;
                }
            }
        }
    }
    return undefined;
}
function schemaAllowsTrailingCommas(schemaRef) {
    if (schemaRef && typeof schemaRef === 'object') {
        if ((0,_utils_objects__WEBPACK_IMPORTED_MODULE_1__.isBoolean)(schemaRef.allowTrailingCommas)) {
            return schemaRef.allowTrailingCommas;
        }
        const deprSchemaRef = schemaRef;
        if ((0,_utils_objects__WEBPACK_IMPORTED_MODULE_1__.isBoolean)(deprSchemaRef['allowsTrailingCommas'])) { // deprecated
            return deprSchemaRef['allowsTrailingCommas'];
        }
        if (schemaRef.allOf) {
            for (const schema of schemaRef.allOf) {
                const allow = schemaAllowsTrailingCommas(schema);
                if ((0,_utils_objects__WEBPACK_IMPORTED_MODULE_1__.isBoolean)(allow)) {
                    return allow;
                }
            }
        }
    }
    return undefined;
}
function toDiagnosticSeverity(severityLevel) {
    switch (severityLevel) {
        case 'error': return _jsonLanguageTypes__WEBPACK_IMPORTED_MODULE_0__.DiagnosticSeverity.Error;
        case 'warning': return _jsonLanguageTypes__WEBPACK_IMPORTED_MODULE_0__.DiagnosticSeverity.Warning;
        case 'ignore': return undefined;
    }
    return undefined;
}


}),
3719: (function (__unused_webpack_module, __webpack_exports__, __webpack_require__) {
__webpack_require__.r(__webpack_exports__);
__webpack_require__.d(__webpack_exports__, {
  colorFrom256RGB: () => (colorFrom256RGB),
  colorFromHex: () => (colorFromHex),
  hexDigit: () => (hexDigit)
});
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
const Digit0 = 48;
const Digit9 = 57;
const A = 65;
const a = 97;
const f = 102;
function hexDigit(charCode) {
    if (charCode < Digit0) {
        return 0;
    }
    if (charCode <= Digit9) {
        return charCode - Digit0;
    }
    if (charCode < a) {
        charCode += (a - A);
    }
    if (charCode >= a && charCode <= f) {
        return charCode - a + 10;
    }
    return 0;
}
function colorFromHex(text) {
    if (text[0] !== '#') {
        return undefined;
    }
    switch (text.length) {
        case 4:
            return {
                red: (hexDigit(text.charCodeAt(1)) * 0x11) / 255.0,
                green: (hexDigit(text.charCodeAt(2)) * 0x11) / 255.0,
                blue: (hexDigit(text.charCodeAt(3)) * 0x11) / 255.0,
                alpha: 1
            };
        case 5:
            return {
                red: (hexDigit(text.charCodeAt(1)) * 0x11) / 255.0,
                green: (hexDigit(text.charCodeAt(2)) * 0x11) / 255.0,
                blue: (hexDigit(text.charCodeAt(3)) * 0x11) / 255.0,
                alpha: (hexDigit(text.charCodeAt(4)) * 0x11) / 255.0,
            };
        case 7:
            return {
                red: (hexDigit(text.charCodeAt(1)) * 0x10 + hexDigit(text.charCodeAt(2))) / 255.0,
                green: (hexDigit(text.charCodeAt(3)) * 0x10 + hexDigit(text.charCodeAt(4))) / 255.0,
                blue: (hexDigit(text.charCodeAt(5)) * 0x10 + hexDigit(text.charCodeAt(6))) / 255.0,
                alpha: 1
            };
        case 9:
            return {
                red: (hexDigit(text.charCodeAt(1)) * 0x10 + hexDigit(text.charCodeAt(2))) / 255.0,
                green: (hexDigit(text.charCodeAt(3)) * 0x10 + hexDigit(text.charCodeAt(4))) / 255.0,
                blue: (hexDigit(text.charCodeAt(5)) * 0x10 + hexDigit(text.charCodeAt(6))) / 255.0,
                alpha: (hexDigit(text.charCodeAt(7)) * 0x10 + hexDigit(text.charCodeAt(8))) / 255.0
            };
    }
    return undefined;
}
function colorFrom256RGB(red, green, blue, alpha = 1.0) {
    return {
        red: red / 255.0,
        green: green / 255.0,
        blue: blue / 255.0,
        alpha
    };
}


}),
3726: (function (__unused_webpack_module, __webpack_exports__, __webpack_require__) {
__webpack_require__.r(__webpack_exports__);
__webpack_require__.d(__webpack_exports__, {
  format: () => (format)
});
/* ESM import */var jsonc_parser__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(2330);
/* ESM import */var _jsonLanguageTypes__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(3713);


function format(documentToFormat, formattingOptions, formattingRange) {
    let range = undefined;
    if (formattingRange) {
        const offset = documentToFormat.offsetAt(formattingRange.start);
        const length = documentToFormat.offsetAt(formattingRange.end) - offset;
        range = { offset, length };
    }
    const options = {
        tabSize: formattingOptions ? formattingOptions.tabSize : 4,
        insertSpaces: formattingOptions?.insertSpaces === true,
        insertFinalNewline: formattingOptions?.insertFinalNewline === true,
        eol: '\n',
        keepLines: formattingOptions?.keepLines === true
    };
    return (0,jsonc_parser__WEBPACK_IMPORTED_MODULE_0__.format)(documentToFormat.getText(), range, options).map(edit => {
        return _jsonLanguageTypes__WEBPACK_IMPORTED_MODULE_1__.TextEdit.replace(_jsonLanguageTypes__WEBPACK_IMPORTED_MODULE_1__.Range.create(documentToFormat.positionAt(edit.offset), documentToFormat.positionAt(edit.offset + edit.length)), edit.content);
    });
}


}),
3722: (function (__unused_webpack_module, __webpack_exports__, __webpack_require__) {
__webpack_require__.r(__webpack_exports__);
__webpack_require__.d(__webpack_exports__, {
  createRegex: () => (createRegex)
});
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Copyright (c) 2013, Nick Fitzgerald
 *  Licensed under the MIT License. See LICENCE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
function createRegex(glob, opts) {
    if (typeof glob !== 'string') {
        throw new TypeError('Expected a string');
    }
    const str = String(glob);
    // The regexp we are building, as a string.
    let reStr = "";
    // Whether we are matching so called "extended" globs (like bash) and should
    // support single character matching, matching ranges of characters, group
    // matching, etc.
    const extended = opts ? !!opts.extended : false;
    // When globstar is _false_ (default), '/foo/*' is translated a regexp like
    // '^\/foo\/.*$' which will match any string beginning with '/foo/'
    // When globstar is _true_, '/foo/*' is translated to regexp like
    // '^\/foo\/[^/]*$' which will match any string beginning with '/foo/' BUT
    // which does not have a '/' to the right of it.
    // E.g. with '/foo/*' these will match: '/foo/bar', '/foo/bar.txt' but
    // these will not '/foo/bar/baz', '/foo/bar/baz.txt'
    // Lastely, when globstar is _true_, '/foo/**' is equivelant to '/foo/*' when
    // globstar is _false_
    const globstar = opts ? !!opts.globstar : false;
    // If we are doing extended matching, this boolean is true when we are inside
    // a group (eg {*.html,*.js}), and false otherwise.
    let inGroup = false;
    // RegExp flags (eg "i" ) to pass in to RegExp constructor.
    const flags = opts && typeof (opts.flags) === "string" ? opts.flags : "";
    let c;
    for (let i = 0, len = str.length; i < len; i++) {
        c = str[i];
        switch (c) {
            case "/":
            case "$":
            case "^":
            case "+":
            case ".":
            case "(":
            case ")":
            case "=":
            case "!":
            case "|":
                reStr += "\\" + c;
                break;
            case "?":
                if (extended) {
                    reStr += ".";
                    break;
                }
            case "[":
            case "]":
                if (extended) {
                    reStr += c;
                    break;
                }
            case "{":
                if (extended) {
                    inGroup = true;
                    reStr += "(";
                    break;
                }
            case "}":
                if (extended) {
                    inGroup = false;
                    reStr += ")";
                    break;
                }
            case ",":
                if (inGroup) {
                    reStr += "|";
                    break;
                }
                reStr += "\\" + c;
                break;
            case "*":
                // Move over all consecutive "*"'s.
                // Also store the previous and next characters
                const prevChar = str[i - 1];
                let starCount = 1;
                while (str[i + 1] === "*") {
                    starCount++;
                    i++;
                }
                const nextChar = str[i + 1];
                if (!globstar) {
                    // globstar is disabled, so treat any number of "*" as one
                    reStr += ".*";
                }
                else {
                    // globstar is enabled, so determine if this is a globstar segment
                    const isGlobstar = starCount > 1 // multiple "*"'s
                        && (prevChar === "/" || prevChar === undefined || prevChar === '{' || prevChar === ',') // from the start of the segment
                        && (nextChar === "/" || nextChar === undefined || nextChar === ',' || nextChar === '}'); // to the end of the segment
                    if (isGlobstar) {
                        if (nextChar === "/") {
                            i++; // move over the "/"
                        }
                        else if (prevChar === '/' && reStr.endsWith('\\/')) {
                            reStr = reStr.substr(0, reStr.length - 2);
                        }
                        // it's a globstar, so match zero or more path segments
                        reStr += "((?:[^/]*(?:\/|$))*)";
                    }
                    else {
                        // it's not a globstar, so only match one path segment
                        reStr += "([^/]*)";
                    }
                }
                break;
            default:
                reStr += c;
        }
    }
    // When regexp 'g' flag is specified don't
    // constrain the regular expression with ^ & $
    if (!flags || !~flags.indexOf('g')) {
        reStr = "^" + reStr + "$";
    }
    return new RegExp(reStr, flags);
}
;


}),
3715: (function (__unused_webpack_module, __webpack_exports__, __webpack_require__) {
__webpack_require__.r(__webpack_exports__);
__webpack_require__.d(__webpack_exports__, {
  stringifyObject: () => (stringifyObject)
});
/*---------------------------------------------------------------------------------------------
*  Copyright (c) Microsoft Corporation. All rights reserved.
*  Licensed under the MIT License. See License.txt in the project root for license information.
*--------------------------------------------------------------------------------------------*/
function stringifyObject(obj, indent, stringifyLiteral) {
    if (obj !== null && typeof obj === 'object') {
        const newIndent = indent + '\t';
        if (Array.isArray(obj)) {
            if (obj.length === 0) {
                return '[]';
            }
            let result = '[\n';
            for (let i = 0; i < obj.length; i++) {
                result += newIndent + stringifyObject(obj[i], newIndent, stringifyLiteral);
                if (i < obj.length - 1) {
                    result += ',';
                }
                result += '\n';
            }
            result += indent + ']';
            return result;
        }
        else {
            const keys = Object.keys(obj);
            if (keys.length === 0) {
                return '{}';
            }
            let result = '{\n';
            for (let i = 0; i < keys.length; i++) {
                const key = keys[i];
                result += newIndent + JSON.stringify(key) + ': ' + stringifyObject(obj[key], newIndent, stringifyLiteral);
                if (i < keys.length - 1) {
                    result += ',';
                }
                result += '\n';
            }
            result += indent + '}';
            return result;
        }
    }
    return stringifyLiteral(obj);
}


}),
3711: (function (__unused_webpack_module, __webpack_exports__, __webpack_require__) {
__webpack_require__.r(__webpack_exports__);
__webpack_require__.d(__webpack_exports__, {
  equals: () => (equals),
  isBoolean: () => (isBoolean),
  isDefined: () => (isDefined),
  isNumber: () => (isNumber),
  isObject: () => (isObject),
  isString: () => (isString)
});
/*---------------------------------------------------------------------------------------------
*  Copyright (c) Microsoft Corporation. All rights reserved.
*  Licensed under the MIT License. See License.txt in the project root for license information.
*--------------------------------------------------------------------------------------------*/
function equals(one, other) {
    if (one === other) {
        return true;
    }
    if (one === null || one === undefined || other === null || other === undefined) {
        return false;
    }
    if (typeof one !== typeof other) {
        return false;
    }
    if (typeof one !== 'object') {
        return false;
    }
    if ((Array.isArray(one)) !== (Array.isArray(other))) {
        return false;
    }
    let i, key;
    if (Array.isArray(one)) {
        if (one.length !== other.length) {
            return false;
        }
        for (i = 0; i < one.length; i++) {
            if (!equals(one[i], other[i])) {
                return false;
            }
        }
    }
    else {
        const oneKeys = [];
        for (key in one) {
            oneKeys.push(key);
        }
        oneKeys.sort();
        const otherKeys = [];
        for (key in other) {
            otherKeys.push(key);
        }
        otherKeys.sort();
        if (!equals(oneKeys, otherKeys)) {
            return false;
        }
        for (i = 0; i < oneKeys.length; i++) {
            if (!equals(one[oneKeys[i]], other[oneKeys[i]])) {
                return false;
            }
        }
    }
    return true;
}
function isNumber(val) {
    return typeof val === 'number';
}
function isDefined(val) {
    return typeof val !== 'undefined';
}
function isBoolean(val) {
    return typeof val === 'boolean';
}
function isString(val) {
    return typeof val === 'string';
}
function isObject(val) {
    return typeof val === 'object' && val !== null && !Array.isArray(val);
}


}),
3727: (function (__unused_webpack_module, __webpack_exports__, __webpack_require__) {
__webpack_require__.r(__webpack_exports__);
__webpack_require__.d(__webpack_exports__, {
  Container: () => (Container),
  PropertyTree: () => (PropertyTree)
});
/*---------------------------------------------------------------------------------------------
*  Copyright (c) Microsoft Corporation. All rights reserved.
*  Licensed under the MIT License. See License.txt in the project root for license information.
*--------------------------------------------------------------------------------------------*/
var Container;
(function (Container) {
    Container[Container["Object"] = 0] = "Object";
    Container[Container["Array"] = 1] = "Array";
})(Container || (Container = {}));
class PropertyTree {
    constructor(propertyName, beginningLineNumber) {
        this.propertyName = propertyName ?? '';
        this.beginningLineNumber = beginningLineNumber;
        this.childrenProperties = [];
        this.lastProperty = false;
        this.noKeyName = false;
    }
    addChildProperty(childProperty) {
        childProperty.parent = this;
        if (this.childrenProperties.length > 0) {
            let insertionIndex = 0;
            if (childProperty.noKeyName) {
                insertionIndex = this.childrenProperties.length;
            }
            else {
                insertionIndex = binarySearchOnPropertyArray(this.childrenProperties, childProperty, compareProperties);
            }
            if (insertionIndex < 0) {
                insertionIndex = (insertionIndex * -1) - 1;
            }
            this.childrenProperties.splice(insertionIndex, 0, childProperty);
        }
        else {
            this.childrenProperties.push(childProperty);
        }
        return childProperty;
    }
}
function compareProperties(propertyTree1, propertyTree2) {
    const propertyName1 = propertyTree1.propertyName.toLowerCase();
    const propertyName2 = propertyTree2.propertyName.toLowerCase();
    if (propertyName1 < propertyName2) {
        return -1;
    }
    else if (propertyName1 > propertyName2) {
        return 1;
    }
    return 0;
}
function binarySearchOnPropertyArray(propertyTreeArray, propertyTree, compare_fn) {
    const propertyName = propertyTree.propertyName.toLowerCase();
    const firstPropertyInArrayName = propertyTreeArray[0].propertyName.toLowerCase();
    const lastPropertyInArrayName = propertyTreeArray[propertyTreeArray.length - 1].propertyName.toLowerCase();
    if (propertyName < firstPropertyInArrayName) {
        return 0;
    }
    if (propertyName > lastPropertyInArrayName) {
        return propertyTreeArray.length;
    }
    let m = 0;
    let n = propertyTreeArray.length - 1;
    while (m <= n) {
        let k = (n + m) >> 1;
        let cmp = compare_fn(propertyTree, propertyTreeArray[k]);
        if (cmp > 0) {
            m = k + 1;
        }
        else if (cmp < 0) {
            n = k - 1;
        }
        else {
            return k;
        }
    }
    return -m - 1;
}


}),
3725: (function (__unused_webpack_module, __webpack_exports__, __webpack_require__) {
__webpack_require__.r(__webpack_exports__);
__webpack_require__.d(__webpack_exports__, {
  sort: () => (sort)
});
/* ESM import */var jsonc_parser__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(2330);
/* ESM import */var _jsonLanguageTypes__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(3713);
/* ESM import */var _format__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(3726);
/* ESM import */var _propertyTree__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(3727);
/*---------------------------------------------------------------------------------------------
*  Copyright (c) Microsoft Corporation. All rights reserved.
*  Licensed under the MIT License. See License.txt in the project root for license information.
*--------------------------------------------------------------------------------------------*/




function sort(documentToSort, formattingOptions) {
    const options = {
        ...formattingOptions,
        keepLines: false, // keepLines must be false so that the properties are on separate lines for the sorting
    };
    const formattedJsonString = _jsonLanguageTypes__WEBPACK_IMPORTED_MODULE_1__.TextDocument.applyEdits(documentToSort, (0,_format__WEBPACK_IMPORTED_MODULE_2__.format)(documentToSort, options, undefined));
    const formattedJsonDocument = _jsonLanguageTypes__WEBPACK_IMPORTED_MODULE_1__.TextDocument.create('test://test.json', 'json', 0, formattedJsonString);
    const jsonPropertyTree = findJsoncPropertyTree(formattedJsonDocument);
    const sortedJsonDocument = sortJsoncDocument(formattedJsonDocument, jsonPropertyTree);
    const edits = (0,_format__WEBPACK_IMPORTED_MODULE_2__.format)(sortedJsonDocument, options, undefined);
    const sortedAndFormattedJsonDocument = _jsonLanguageTypes__WEBPACK_IMPORTED_MODULE_1__.TextDocument.applyEdits(sortedJsonDocument, edits);
    return [_jsonLanguageTypes__WEBPACK_IMPORTED_MODULE_1__.TextEdit.replace(_jsonLanguageTypes__WEBPACK_IMPORTED_MODULE_1__.Range.create(_jsonLanguageTypes__WEBPACK_IMPORTED_MODULE_1__.Position.create(0, 0), documentToSort.positionAt(documentToSort.getText().length)), sortedAndFormattedJsonDocument)];
}
function findJsoncPropertyTree(formattedDocument) {
    const formattedString = formattedDocument.getText();
    const scanner = (0,jsonc_parser__WEBPACK_IMPORTED_MODULE_0__.createScanner)(formattedString, false);
    // The tree that will be returned
    let rootTree = new _propertyTree__WEBPACK_IMPORTED_MODULE_3__.PropertyTree();
    // The tree where the current properties can be added as children
    let currentTree = rootTree;
    // The tree representing the current property analyzed
    let currentProperty = rootTree;
    // The tree representing the previous property analyzed
    let lastProperty = rootTree;
    // The current scanned token
    let token = undefined;
    // Line number of the last token found
    let lastTokenLine = 0;
    // Total number of characters on the lines prior to current line 
    let numberOfCharactersOnPreviousLines = 0;
    // The last token scanned that is not trivial, nor a comment
    let lastNonTriviaNonCommentToken = undefined;
    // The second to last token scanned that is not trivial, nor a comment
    let secondToLastNonTriviaNonCommentToken = undefined;
    // Line number of last token that is not trivial, nor a comment
    let lineOfLastNonTriviaNonCommentToken = -1;
    // End index on its line of last token that is not trivial, nor a comment
    let endIndexOfLastNonTriviaNonCommentToken = -1;
    // Line number of the start of the range of current/next property
    let beginningLineNumber = 0;
    // Line number of the end of the range of current/next property
    let endLineNumber = 0;
    // Stack indicating whether we are inside of an object or an array
    let currentContainerStack = [];
    // Boolean indicating that the current property end line number needs to be updated. Used only when block comments are encountered.
    let updateLastPropertyEndLineNumber = false;
    // Boolean indicating that the beginning line number should be updated. Used only when block comments are encountered. 
    let updateBeginningLineNumber = false;
    while ((token = scanner.scan()) !== 17 /* SyntaxKind.EOF */) {
        // In the case when a block comment has been encountered that starts on the same line as the comma ending a property, update the end line of that
        // property so that it covers the block comment. For example, if we have: 
        // 1. "key" : {}, /* some block
        // 2. comment */
        // Then, the end line of the property "key" should be line 2 not line 1
        if (updateLastPropertyEndLineNumber === true
            && token !== 14 /* SyntaxKind.LineBreakTrivia */
            && token !== 15 /* SyntaxKind.Trivia */
            && token !== 12 /* SyntaxKind.LineCommentTrivia */
            && token !== 13 /* SyntaxKind.BlockCommentTrivia */
            && currentProperty.endLineNumber === undefined) {
            let endLineNumber = scanner.getTokenStartLine();
            // Update the end line number in the case when the last property visited is a container (object or array)
            if (secondToLastNonTriviaNonCommentToken === 2 /* SyntaxKind.CloseBraceToken */
                || secondToLastNonTriviaNonCommentToken === 4 /* SyntaxKind.CloseBracketToken */) {
                lastProperty.endLineNumber = endLineNumber - 1;
            }
            // Update the end line number in the case when the last property visited is a simple property 
            else {
                currentProperty.endLineNumber = endLineNumber - 1;
            }
            beginningLineNumber = endLineNumber;
            updateLastPropertyEndLineNumber = false;
        }
        // When a block comment follows an open brace or an open bracket, that block comment should be associated to that brace or bracket, not the property below it. For example, for:
        // 1. { /*
        // 2. ... */
        // 3. "key" : {}
        // 4. }
        // Instead of associating the block comment to the property on line 3, it is associate to the property on line 1
        if (updateBeginningLineNumber === true
            && token !== 14 /* SyntaxKind.LineBreakTrivia */
            && token !== 15 /* SyntaxKind.Trivia */
            && token !== 12 /* SyntaxKind.LineCommentTrivia */
            && token !== 13 /* SyntaxKind.BlockCommentTrivia */) {
            beginningLineNumber = scanner.getTokenStartLine();
            updateBeginningLineNumber = false;
        }
        // Update the number of characters on all the previous lines each time the new token is on a different line to the previous token
        if (scanner.getTokenStartLine() !== lastTokenLine) {
            for (let i = lastTokenLine; i < scanner.getTokenStartLine(); i++) {
                const lengthOfLine = formattedDocument.getText(_jsonLanguageTypes__WEBPACK_IMPORTED_MODULE_1__.Range.create(_jsonLanguageTypes__WEBPACK_IMPORTED_MODULE_1__.Position.create(i, 0), _jsonLanguageTypes__WEBPACK_IMPORTED_MODULE_1__.Position.create(i + 1, 0))).length;
                numberOfCharactersOnPreviousLines = numberOfCharactersOnPreviousLines + lengthOfLine;
            }
            lastTokenLine = scanner.getTokenStartLine();
        }
        switch (token) {
            // When a string is found, if it follows an open brace or a comma token and it is within an object, then it corresponds to a key name, not a simple string
            case 10 /* SyntaxKind.StringLiteral */: {
                if ((lastNonTriviaNonCommentToken === undefined
                    || lastNonTriviaNonCommentToken === 1 /* SyntaxKind.OpenBraceToken */
                    || (lastNonTriviaNonCommentToken === 5 /* SyntaxKind.CommaToken */
                        && currentContainerStack[currentContainerStack.length - 1] === _propertyTree__WEBPACK_IMPORTED_MODULE_3__.Container.Object))) {
                    // In that case create the child property which starts at beginningLineNumber, add it to the current tree
                    const childProperty = new _propertyTree__WEBPACK_IMPORTED_MODULE_3__.PropertyTree(scanner.getTokenValue(), beginningLineNumber);
                    lastProperty = currentProperty;
                    currentProperty = currentTree.addChildProperty(childProperty);
                }
                break;
            }
            // When the token is an open bracket, then we enter into an array
            case 3 /* SyntaxKind.OpenBracketToken */: {
                // If the root tree beginning line number is not defined, then this open bracket is the first open bracket in the document
                if (rootTree.beginningLineNumber === undefined) {
                    rootTree.beginningLineNumber = scanner.getTokenStartLine();
                }
                // Suppose we are inside of an object, then the current array is associated to a key, and has already been created
                // We have the following configuration: {"a": "val", "array": [...], "b": "val"}
                // In that case navigate down to the child property
                if (currentContainerStack[currentContainerStack.length - 1] === _propertyTree__WEBPACK_IMPORTED_MODULE_3__.Container.Object) {
                    currentTree = currentProperty;
                }
                // Suppose we are inside of an array, then since the current array is not associated to a key, it has not been created yet
                // We have the following configuration: ["a", [...], "b"]
                // In that case create the property and navigate down
                else if (currentContainerStack[currentContainerStack.length - 1] === _propertyTree__WEBPACK_IMPORTED_MODULE_3__.Container.Array) {
                    const childProperty = new _propertyTree__WEBPACK_IMPORTED_MODULE_3__.PropertyTree(scanner.getTokenValue(), beginningLineNumber);
                    childProperty.noKeyName = true;
                    lastProperty = currentProperty;
                    currentProperty = currentTree.addChildProperty(childProperty);
                    currentTree = currentProperty;
                }
                currentContainerStack.push(_propertyTree__WEBPACK_IMPORTED_MODULE_3__.Container.Array);
                currentProperty.type = _propertyTree__WEBPACK_IMPORTED_MODULE_3__.Container.Array;
                beginningLineNumber = scanner.getTokenStartLine();
                beginningLineNumber++;
                break;
            }
            // When the token is an open brace, then we enter into an object
            case 1 /* SyntaxKind.OpenBraceToken */: {
                // If the root tree beginning line number is not defined, then this open brace is the first open brace in the document
                if (rootTree.beginningLineNumber === undefined) {
                    rootTree.beginningLineNumber = scanner.getTokenStartLine();
                }
                // 1. If we are inside of an objet, the current object is associated to a key and has already been created
                // We have the following configuration: {"a": "val", "object": {...}, "b": "val"}
                // 2. Otherwise the current object property is inside of an array, not associated to a key name and the property has not yet been created
                // We have the following configuration: ["a", {...}, "b"]
                else if (currentContainerStack[currentContainerStack.length - 1] === _propertyTree__WEBPACK_IMPORTED_MODULE_3__.Container.Array) {
                    const childProperty = new _propertyTree__WEBPACK_IMPORTED_MODULE_3__.PropertyTree(scanner.getTokenValue(), beginningLineNumber);
                    childProperty.noKeyName = true;
                    lastProperty = currentProperty;
                    currentProperty = currentTree.addChildProperty(childProperty);
                }
                currentProperty.type = _propertyTree__WEBPACK_IMPORTED_MODULE_3__.Container.Object;
                currentContainerStack.push(_propertyTree__WEBPACK_IMPORTED_MODULE_3__.Container.Object);
                currentTree = currentProperty;
                beginningLineNumber = scanner.getTokenStartLine();
                beginningLineNumber++;
                break;
            }
            case 4 /* SyntaxKind.CloseBracketToken */: {
                endLineNumber = scanner.getTokenStartLine();
                currentContainerStack.pop();
                // If the last non-trivial non-comment token is a closing brace or bracket, then the currentProperty end line number has not been set yet so set it
                // The configuration considered is: [..., {}] or [..., []]
                if (currentProperty.endLineNumber === undefined
                    && (lastNonTriviaNonCommentToken === 2 /* SyntaxKind.CloseBraceToken */
                        || lastNonTriviaNonCommentToken === 4 /* SyntaxKind.CloseBracketToken */)) {
                    currentProperty.endLineNumber = endLineNumber - 1;
                    currentProperty.lastProperty = true;
                    currentProperty.lineWhereToAddComma = lineOfLastNonTriviaNonCommentToken;
                    currentProperty.indexWhereToAddComa = endIndexOfLastNonTriviaNonCommentToken;
                    lastProperty = currentProperty;
                    currentProperty = currentProperty ? currentProperty.parent : undefined;
                    currentTree = currentProperty;
                }
                rootTree.endLineNumber = endLineNumber;
                beginningLineNumber = endLineNumber + 1;
                break;
            }
            case 2 /* SyntaxKind.CloseBraceToken */: {
                endLineNumber = scanner.getTokenStartLine();
                currentContainerStack.pop();
                // If we are not inside of an empty object
                if (lastNonTriviaNonCommentToken !== 1 /* SyntaxKind.OpenBraceToken */) {
                    // If current property end line number has not yet been defined, define it
                    if (currentProperty.endLineNumber === undefined) {
                        currentProperty.endLineNumber = endLineNumber - 1;
                        // The current property is also the last property
                        currentProperty.lastProperty = true;
                        // The last property of an object is associated with the line and index of where to add the comma, in case after sorting, it is no longer the last property
                        currentProperty.lineWhereToAddComma = lineOfLastNonTriviaNonCommentToken;
                        currentProperty.indexWhereToAddComa = endIndexOfLastNonTriviaNonCommentToken;
                    }
                    lastProperty = currentProperty;
                    currentProperty = currentProperty ? currentProperty.parent : undefined;
                    currentTree = currentProperty;
                }
                rootTree.endLineNumber = scanner.getTokenStartLine();
                beginningLineNumber = endLineNumber + 1;
                break;
            }
            case 5 /* SyntaxKind.CommaToken */: {
                endLineNumber = scanner.getTokenStartLine();
                // If the current container is an object or the current container is an array and the last non-trivia non-comment token is a closing brace or a closing bracket
                // Then update the end line number of the current property
                if (currentProperty.endLineNumber === undefined
                    && (currentContainerStack[currentContainerStack.length - 1] === _propertyTree__WEBPACK_IMPORTED_MODULE_3__.Container.Object
                        || (currentContainerStack[currentContainerStack.length - 1] === _propertyTree__WEBPACK_IMPORTED_MODULE_3__.Container.Array
                            && (lastNonTriviaNonCommentToken === 2 /* SyntaxKind.CloseBraceToken */
                                || lastNonTriviaNonCommentToken === 4 /* SyntaxKind.CloseBracketToken */)))) {
                    currentProperty.endLineNumber = endLineNumber;
                    // Store the line and the index of the comma in case it needs to be removed during the sorting
                    currentProperty.commaIndex = scanner.getTokenOffset() - numberOfCharactersOnPreviousLines;
                    currentProperty.commaLine = endLineNumber;
                }
                if (lastNonTriviaNonCommentToken === 2 /* SyntaxKind.CloseBraceToken */
                    || lastNonTriviaNonCommentToken === 4 /* SyntaxKind.CloseBracketToken */) {
                    lastProperty = currentProperty;
                    currentProperty = currentProperty ? currentProperty.parent : undefined;
                    currentTree = currentProperty;
                }
                beginningLineNumber = endLineNumber + 1;
                break;
            }
            case 13 /* SyntaxKind.BlockCommentTrivia */: {
                // If the last non trivia non-comment token is a comma and the block comment starts on the same line as the comma, then update the end line number of the current property. For example if:
                // 1. {}, /* ...
                // 2. ..*/
                // The the property on line 1 shoud end on line 2, not line 1
                // In the case we are in an array we update the end line number only if the second to last non-trivia non-comment token is a closing brace or bracket
                if (lastNonTriviaNonCommentToken === 5 /* SyntaxKind.CommaToken */
                    && lineOfLastNonTriviaNonCommentToken === scanner.getTokenStartLine()
                    && (currentContainerStack[currentContainerStack.length - 1] === _propertyTree__WEBPACK_IMPORTED_MODULE_3__.Container.Array
                        && (secondToLastNonTriviaNonCommentToken === 2 /* SyntaxKind.CloseBraceToken */
                            || secondToLastNonTriviaNonCommentToken === 4 /* SyntaxKind.CloseBracketToken */)
                        || currentContainerStack[currentContainerStack.length - 1] === _propertyTree__WEBPACK_IMPORTED_MODULE_3__.Container.Object)) {
                    if (currentContainerStack[currentContainerStack.length - 1] === _propertyTree__WEBPACK_IMPORTED_MODULE_3__.Container.Array && (secondToLastNonTriviaNonCommentToken === 2 /* SyntaxKind.CloseBraceToken */ || secondToLastNonTriviaNonCommentToken === 4 /* SyntaxKind.CloseBracketToken */) || currentContainerStack[currentContainerStack.length - 1] === _propertyTree__WEBPACK_IMPORTED_MODULE_3__.Container.Object) {
                        currentProperty.endLineNumber = undefined;
                        updateLastPropertyEndLineNumber = true;
                    }
                }
                // When the block comment follows an open brace or an open token, we have the following scenario:
                // { /**
                // ../
                // }
                // The block comment should be assigned to the open brace not the first property below it
                if ((lastNonTriviaNonCommentToken === 1 /* SyntaxKind.OpenBraceToken */
                    || lastNonTriviaNonCommentToken === 3 /* SyntaxKind.OpenBracketToken */)
                    && lineOfLastNonTriviaNonCommentToken === scanner.getTokenStartLine()) {
                    updateBeginningLineNumber = true;
                }
                break;
            }
        }
        // Update the last and second to last non-trivia non-comment tokens
        if (token !== 14 /* SyntaxKind.LineBreakTrivia */
            && token !== 13 /* SyntaxKind.BlockCommentTrivia */
            && token !== 12 /* SyntaxKind.LineCommentTrivia */
            && token !== 15 /* SyntaxKind.Trivia */) {
            secondToLastNonTriviaNonCommentToken = lastNonTriviaNonCommentToken;
            lastNonTriviaNonCommentToken = token;
            lineOfLastNonTriviaNonCommentToken = scanner.getTokenStartLine();
            endIndexOfLastNonTriviaNonCommentToken = scanner.getTokenOffset() + scanner.getTokenLength() - numberOfCharactersOnPreviousLines;
        }
    }
    return rootTree;
}
function sortJsoncDocument(jsonDocument, propertyTree) {
    if (propertyTree.childrenProperties.length === 0) {
        return jsonDocument;
    }
    const sortedJsonDocument = _jsonLanguageTypes__WEBPACK_IMPORTED_MODULE_1__.TextDocument.create('test://test.json', 'json', 0, jsonDocument.getText());
    const queueToSort = [];
    updateSortingQueue(queueToSort, propertyTree, propertyTree.beginningLineNumber);
    while (queueToSort.length > 0) {
        const dataToSort = queueToSort.shift();
        const propertyTreeArray = dataToSort.propertyTreeArray;
        let beginningLineNumber = dataToSort.beginningLineNumber;
        for (let i = 0; i < propertyTreeArray.length; i++) {
            const propertyTree = propertyTreeArray[i];
            const range = _jsonLanguageTypes__WEBPACK_IMPORTED_MODULE_1__.Range.create(_jsonLanguageTypes__WEBPACK_IMPORTED_MODULE_1__.Position.create(propertyTree.beginningLineNumber, 0), _jsonLanguageTypes__WEBPACK_IMPORTED_MODULE_1__.Position.create(propertyTree.endLineNumber + 1, 0));
            const jsonContentToReplace = jsonDocument.getText(range);
            const jsonDocumentToReplace = _jsonLanguageTypes__WEBPACK_IMPORTED_MODULE_1__.TextDocument.create('test://test.json', 'json', 0, jsonContentToReplace);
            if (propertyTree.lastProperty === true && i !== propertyTreeArray.length - 1) {
                const lineWhereToAddComma = propertyTree.lineWhereToAddComma - propertyTree.beginningLineNumber;
                const indexWhereToAddComma = propertyTree.indexWhereToAddComa;
                const edit = {
                    range: _jsonLanguageTypes__WEBPACK_IMPORTED_MODULE_1__.Range.create(_jsonLanguageTypes__WEBPACK_IMPORTED_MODULE_1__.Position.create(lineWhereToAddComma, indexWhereToAddComma), _jsonLanguageTypes__WEBPACK_IMPORTED_MODULE_1__.Position.create(lineWhereToAddComma, indexWhereToAddComma)),
                    text: ','
                };
                _jsonLanguageTypes__WEBPACK_IMPORTED_MODULE_1__.TextDocument.update(jsonDocumentToReplace, [edit], 1);
            }
            else if (propertyTree.lastProperty === false && i === propertyTreeArray.length - 1) {
                const commaIndex = propertyTree.commaIndex;
                const commaLine = propertyTree.commaLine;
                const lineWhereToRemoveComma = commaLine - propertyTree.beginningLineNumber;
                const edit = {
                    range: _jsonLanguageTypes__WEBPACK_IMPORTED_MODULE_1__.Range.create(_jsonLanguageTypes__WEBPACK_IMPORTED_MODULE_1__.Position.create(lineWhereToRemoveComma, commaIndex), _jsonLanguageTypes__WEBPACK_IMPORTED_MODULE_1__.Position.create(lineWhereToRemoveComma, commaIndex + 1)),
                    text: ''
                };
                _jsonLanguageTypes__WEBPACK_IMPORTED_MODULE_1__.TextDocument.update(jsonDocumentToReplace, [edit], 1);
            }
            const length = propertyTree.endLineNumber - propertyTree.beginningLineNumber + 1;
            const edit = {
                range: _jsonLanguageTypes__WEBPACK_IMPORTED_MODULE_1__.Range.create(_jsonLanguageTypes__WEBPACK_IMPORTED_MODULE_1__.Position.create(beginningLineNumber, 0), _jsonLanguageTypes__WEBPACK_IMPORTED_MODULE_1__.Position.create(beginningLineNumber + length, 0)),
                text: jsonDocumentToReplace.getText()
            };
            _jsonLanguageTypes__WEBPACK_IMPORTED_MODULE_1__.TextDocument.update(sortedJsonDocument, [edit], 1);
            updateSortingQueue(queueToSort, propertyTree, beginningLineNumber);
            beginningLineNumber = beginningLineNumber + length;
        }
    }
    return sortedJsonDocument;
}
function sortProperties(properties) {
    properties.sort((a, b) => a.propertyName.localeCompare(b.propertyName));
}
function updateSortingQueue(queue, propertyTree, beginningLineNumber) {
    if (propertyTree.childrenProperties.length === 0) {
        return;
    }
    if (propertyTree.type === _propertyTree__WEBPACK_IMPORTED_MODULE_3__.Container.Object) {
        let minimumBeginningLineNumber = Infinity;
        for (const childProperty of propertyTree.childrenProperties) {
            if (childProperty.beginningLineNumber < minimumBeginningLineNumber) {
                minimumBeginningLineNumber = childProperty.beginningLineNumber;
            }
        }
        const diff = minimumBeginningLineNumber - propertyTree.beginningLineNumber;
        beginningLineNumber = beginningLineNumber + diff;
        sortProperties(propertyTree.childrenProperties);
        queue.push(new SortingRange(beginningLineNumber, propertyTree.childrenProperties));
    }
    else if (propertyTree.type === _propertyTree__WEBPACK_IMPORTED_MODULE_3__.Container.Array) {
        updateSortingQueueForArrayProperties(queue, propertyTree, beginningLineNumber);
    }
}
function updateSortingQueueForArrayProperties(queue, propertyTree, beginningLineNumber) {
    for (const subObject of propertyTree.childrenProperties) {
        // If the child property of the array is an object, then you can sort the properties within this object
        if (subObject.type === _propertyTree__WEBPACK_IMPORTED_MODULE_3__.Container.Object) {
            let minimumBeginningLineNumber = Infinity;
            for (const childProperty of subObject.childrenProperties) {
                if (childProperty.beginningLineNumber < minimumBeginningLineNumber) {
                    minimumBeginningLineNumber = childProperty.beginningLineNumber;
                }
            }
            const diff = minimumBeginningLineNumber - subObject.beginningLineNumber;
            queue.push(new SortingRange(beginningLineNumber + subObject.beginningLineNumber - propertyTree.beginningLineNumber + diff, subObject.childrenProperties));
        }
        // If the child property of the array is an array, then you need to recurse on the children properties, until you find an object to sort
        if (subObject.type === _propertyTree__WEBPACK_IMPORTED_MODULE_3__.Container.Array) {
            updateSortingQueueForArrayProperties(queue, subObject, beginningLineNumber + subObject.beginningLineNumber - propertyTree.beginningLineNumber);
        }
    }
}
class SortingRange {
    constructor(beginningLineNumber, propertyTreeArray) {
        this.beginningLineNumber = beginningLineNumber;
        this.propertyTreeArray = propertyTreeArray;
    }
}


}),
3712: (function (__unused_webpack_module, __webpack_exports__, __webpack_require__) {
__webpack_require__.r(__webpack_exports__);
__webpack_require__.d(__webpack_exports__, {
  convertSimple2RegExpPattern: () => (convertSimple2RegExpPattern),
  endsWith: () => (endsWith),
  extendedRegExp: () => (extendedRegExp),
  repeat: () => (repeat),
  startsWith: () => (startsWith),
  stringLength: () => (stringLength)
});
/*---------------------------------------------------------------------------------------------
*  Copyright (c) Microsoft Corporation. All rights reserved.
*  Licensed under the MIT License. See License.txt in the project root for license information.
*--------------------------------------------------------------------------------------------*/
function startsWith(haystack, needle) {
    if (haystack.length < needle.length) {
        return false;
    }
    for (let i = 0; i < needle.length; i++) {
        if (haystack[i] !== needle[i]) {
            return false;
        }
    }
    return true;
}
/**
 * Determines if haystack ends with needle.
 */
function endsWith(haystack, needle) {
    const diff = haystack.length - needle.length;
    if (diff > 0) {
        return haystack.lastIndexOf(needle) === diff;
    }
    else if (diff === 0) {
        return haystack === needle;
    }
    else {
        return false;
    }
}
function convertSimple2RegExpPattern(pattern) {
    return pattern.replace(/[\-\\\{\}\+\?\|\^\$\.\,\[\]\(\)\#\s]/g, '\\$&').replace(/[\*]/g, '.*');
}
function repeat(value, count) {
    let s = '';
    while (count > 0) {
        if ((count & 1) === 1) {
            s += value;
        }
        value += value;
        count = count >>> 1;
    }
    return s;
}
function extendedRegExp(pattern) {
    let flags = '';
    if (startsWith(pattern, '(?i)')) {
        pattern = pattern.substring(4);
        flags = 'i';
    }
    try {
        return new RegExp(pattern, flags + 'u');
    }
    catch (e) {
        // could be an exception due to the 'u ' flag
        try {
            return new RegExp(pattern, flags);
        }
        catch (e) {
            // invalid pattern
            return undefined;
        }
    }
}
// from https://tanishiking.github.io/posts/count-unicode-codepoint/#work-hard-with-for-statements
function stringLength(str) {
    let count = 0;
    for (let i = 0; i < str.length; i++) {
        count++;
        // obtain the i-th 16-bit
        const code = str.charCodeAt(i);
        if (0xD800 <= code && code <= 0xDBFF) {
            // if the i-th 16bit is an upper surrogate
            // skip the next 16 bits (lower surrogate)
            i++;
        }
    }
    return count;
}


}),
3704: (function (__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) {
__webpack_require__.r(__webpack_exports__);
__webpack_require__.d(__webpack_exports__, {
  DiagnosticSeverity: () => (/* reexport safe */ _coze_editor_editor_language_json__WEBPACK_IMPORTED_MODULE_0__.DiagnosticSeverity),
  JSONLanguageService: () => (/* reexport safe */ _coze_editor_editor_language_json__WEBPACK_IMPORTED_MODULE_0__.JSONLanguageService),
  Text: () => (/* reexport safe */ _coze_editor_editor_language_json__WEBPACK_IMPORTED_MODULE_0__.Text),
  json: () => (/* reexport safe */ _coze_editor_editor_language_json__WEBPACK_IMPORTED_MODULE_0__.json),
  jsonLanguage: () => (/* reexport safe */ _coze_editor_editor_language_json__WEBPACK_IMPORTED_MODULE_0__.jsonLanguage),
  jsonLanguageService: () => (/* reexport safe */ _coze_editor_editor_language_json__WEBPACK_IMPORTED_MODULE_0__.jsonLanguageService)
});
/* ESM import */var _coze_editor_editor_language_json__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(3705);



}),
3729: (function (__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) {
__webpack_require__.r(__webpack_exports__);
__webpack_require__.d(__webpack_exports__, {
  v4: () => (v4)
});
var IDX=256, HEX=[], BUFFER;
while (IDX--) HEX[IDX] = (IDX + 256).toString(16).substring(1);

function v4() {
	var i=0, num, out='';

	if (!BUFFER || ((IDX + 16) > 256)) {
		BUFFER = Array(i=256);
		while (i--) BUFFER[i] = 256 * Math.random() | 0;
		i = IDX = 0;
	}

	for (; i < 16; i++) {
		num = BUFFER[IDX + i];
		if (i==6) out += HEX[num & 15 | 64];
		else if (i==8) out += HEX[num & 63 | 128];
		else out += HEX[num];

		if (i & 1 && i > 1 && i < 11) out += '-';
	}

	IDX++;
	return out;
}


}),

}]);
//# sourceMappingURL=45.js.map