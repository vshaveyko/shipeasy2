/**
 * Tiny syntax tokenizer for the SDK snippets we ship in wizards + docs.
 * Avoids pulling in shiki/prism (would add ~300kb to the edge bundle).
 *
 * Supports: ts/tsx/js/jsx, python, go, ruby, bash/curl, sh.
 * Anything else falls back to a single `plain` token, keeping the API safe.
 *
 * Token classes map to CSS custom properties scoped under `.se-code` so a
 * single set of color rules in `globals.css` themes every block.
 */
import * as React from "react";

export type TokenKind =
  | "keyword"
  | "string"
  | "number"
  | "comment"
  | "punctuation"
  | "function"
  | "type"
  | "boolean"
  | "operator"
  | "variable"
  | "flag"
  | "plain";

type Rule = { kind: TokenKind; re: RegExp };

const TS_KEYWORDS = new Set([
  "import",
  "from",
  "export",
  "default",
  "const",
  "let",
  "var",
  "function",
  "return",
  "if",
  "else",
  "for",
  "while",
  "do",
  "break",
  "continue",
  "switch",
  "case",
  "throw",
  "try",
  "catch",
  "finally",
  "new",
  "async",
  "await",
  "class",
  "extends",
  "implements",
  "interface",
  "type",
  "enum",
  "as",
  "of",
  "in",
  "typeof",
  "instanceof",
  "void",
  "null",
  "undefined",
  "this",
  "super",
  "yield",
  "static",
  "public",
  "private",
  "protected",
  "readonly",
  "abstract",
  "true",
  "false",
]);

const PY_KEYWORDS = new Set([
  "import",
  "from",
  "as",
  "def",
  "return",
  "if",
  "elif",
  "else",
  "for",
  "while",
  "break",
  "continue",
  "pass",
  "yield",
  "class",
  "try",
  "except",
  "finally",
  "raise",
  "with",
  "lambda",
  "not",
  "and",
  "or",
  "is",
  "in",
  "global",
  "nonlocal",
  "True",
  "False",
  "None",
  "async",
  "await",
]);

const GO_KEYWORDS = new Set([
  "package",
  "import",
  "func",
  "var",
  "const",
  "type",
  "struct",
  "interface",
  "map",
  "chan",
  "go",
  "defer",
  "select",
  "for",
  "range",
  "switch",
  "case",
  "default",
  "if",
  "else",
  "return",
  "break",
  "continue",
  "fallthrough",
  "goto",
  "true",
  "false",
  "nil",
]);

const RB_KEYWORDS = new Set([
  "require",
  "require_relative",
  "module",
  "class",
  "def",
  "end",
  "if",
  "elsif",
  "else",
  "unless",
  "while",
  "until",
  "for",
  "do",
  "begin",
  "rescue",
  "ensure",
  "return",
  "yield",
  "self",
  "nil",
  "true",
  "false",
  "and",
  "or",
  "not",
]);

function jsRules(): Rule[] {
  return [
    { kind: "comment", re: /^\/\/[^\n]*/ },
    { kind: "comment", re: /^\/\*[\s\S]*?\*\// },
    { kind: "string", re: /^`(?:\\.|\$\{[^}]*\}|[^`\\])*`/ },
    { kind: "string", re: /^"(?:\\.|[^"\\])*"/ },
    { kind: "string", re: /^'(?:\\.|[^'\\])*'/ },
    { kind: "number", re: /^0[xX][\da-fA-F_]+n?|^\d+(\.\d+)?(e[+-]?\d+)?n?/ },
    { kind: "punctuation", re: /^[()[\]{},;:]/ },
    {
      kind: "operator",
      re: /^(===|!==|==|!=|<=|>=|=>|\?\?|\?\.|&&|\|\||\+\+|--|\.\.\.|[+\-*/%<>=!&|^~?:])/,
    },
  ];
}

function pyRules(): Rule[] {
  return [
    { kind: "comment", re: /^#[^\n]*/ },
    { kind: "string", re: /^[rRbBuU]?"""[\s\S]*?"""/ },
    { kind: "string", re: /^[rRbBuU]?'''[\s\S]*?'''/ },
    { kind: "string", re: /^[rRbBuU]?"(?:\\.|[^"\\])*"/ },
    { kind: "string", re: /^[rRbBuU]?'(?:\\.|[^'\\])*'/ },
    { kind: "number", re: /^0[xX][\da-fA-F_]+|^\d+(\.\d+)?(e[+-]?\d+)?/ },
    { kind: "punctuation", re: /^[()[\]{},;:]/ },
    { kind: "operator", re: /^(==|!=|<=|>=|->|\*\*|\/\/|[+\-*/%<>=!&|^~@])/ },
  ];
}

function goRules(): Rule[] {
  return [
    { kind: "comment", re: /^\/\/[^\n]*/ },
    { kind: "comment", re: /^\/\*[\s\S]*?\*\// },
    { kind: "string", re: /^"(?:\\.|[^"\\])*"/ },
    { kind: "string", re: /^`[^`]*`/ },
    { kind: "string", re: /^'(?:\\.|[^'\\])*'/ },
    { kind: "number", re: /^0[xX][\da-fA-F_]+|^\d+(\.\d+)?(e[+-]?\d+)?/ },
    { kind: "punctuation", re: /^[()[\]{},;:]/ },
    { kind: "operator", re: /^(:=|<-|==|!=|<=|>=|&&|\|\||\+\+|--|[+\-*/%<>=!&|^~?])/ },
  ];
}

function rbRules(): Rule[] {
  return [
    { kind: "comment", re: /^#[^\n]*/ },
    { kind: "string", re: /^"(?:\\.|#\{[^}]*\}|[^"\\])*"/ },
    { kind: "string", re: /^'(?:\\.|[^'\\])*'/ },
    { kind: "number", re: /^0[xX][\da-fA-F_]+|^\d+(\.\d+)?(e[+-]?\d+)?/ },
    { kind: "punctuation", re: /^[()[\]{},;:]/ },
    { kind: "operator", re: /^(==|!=|<=|>=|=>|\*\*|<<|>>|[+\-*/%<>=!&|^~?])/ },
  ];
}

function bashRules(): Rule[] {
  return [
    { kind: "comment", re: /^#[^\n]*/ },
    { kind: "string", re: /^"(?:\\.|\$\{[^}]*\}|[^"\\])*"/ },
    { kind: "string", re: /^'(?:\\.|[^'\\])*'/ },
    { kind: "flag", re: /^(?:^|(?<=\s))-{1,2}[A-Za-z][\w-]*/ },
    { kind: "number", re: /^\d+/ },
    { kind: "punctuation", re: /^[(){}|;&<>]/ },
    { kind: "variable", re: /^\$\{?[A-Z_][A-Z0-9_]*\}?/ },
  ];
}

function keywordSet(lang: string): Set<string> {
  switch (lang) {
    case "ts":
    case "tsx":
    case "js":
    case "jsx":
    case "typescript":
    case "javascript":
      return TS_KEYWORDS;
    case "py":
    case "python":
      return PY_KEYWORDS;
    case "go":
      return GO_KEYWORDS;
    case "rb":
    case "ruby":
      return RB_KEYWORDS;
    default:
      return new Set();
  }
}

function languageRules(lang: string): Rule[] {
  switch (lang) {
    case "ts":
    case "tsx":
    case "js":
    case "jsx":
    case "typescript":
    case "javascript":
      return jsRules();
    case "py":
    case "python":
      return pyRules();
    case "go":
      return goRules();
    case "rb":
    case "ruby":
      return rbRules();
    case "bash":
    case "sh":
    case "shell":
    case "curl":
      return bashRules();
    default:
      return [];
  }
}

type Token = { kind: TokenKind; text: string };

export function tokenize(code: string, lang: string): Token[] {
  const rules = languageRules(lang);
  const keywords = keywordSet(lang);
  const tokens: Token[] = [];
  if (rules.length === 0) return [{ kind: "plain", text: code }];

  let i = 0;
  let buf = "";
  const flushPlain = () => {
    if (buf) {
      tokens.push({ kind: "plain", text: buf });
      buf = "";
    }
  };

  while (i < code.length) {
    const rest = code.slice(i);

    // Identifier scan — used to detect keywords + function-call form.
    const idMatch = rest.match(/^[A-Za-z_$][A-Za-z0-9_$]*/);
    if (idMatch) {
      const word = idMatch[0];
      const after = rest.slice(word.length);
      flushPlain();
      if (keywords.has(word)) {
        tokens.push({ kind: "keyword", text: word });
      } else if (
        word === "true" ||
        word === "false" ||
        word === "null" ||
        word === "None" ||
        word === "nil"
      ) {
        tokens.push({ kind: "boolean", text: word });
      } else if (/^\s*\(/.test(after) && !keywords.has(word)) {
        tokens.push({ kind: "function", text: word });
      } else {
        buf += word;
        flushPlain();
      }
      i += word.length;
      continue;
    }

    let matched = false;
    for (const rule of rules) {
      const m = rest.match(rule.re);
      if (m) {
        flushPlain();
        tokens.push({ kind: rule.kind, text: m[0] });
        i += m[0].length;
        matched = true;
        break;
      }
    }
    if (matched) continue;

    buf += code[i];
    i += 1;
  }
  flushPlain();
  return tokens;
}

const KIND_CLASS: Record<TokenKind, string> = {
  keyword: "se-tok-keyword",
  string: "se-tok-string",
  number: "se-tok-number",
  comment: "se-tok-comment",
  punctuation: "se-tok-punctuation",
  function: "se-tok-function",
  type: "se-tok-type",
  boolean: "se-tok-boolean",
  operator: "se-tok-operator",
  variable: "se-tok-variable",
  flag: "se-tok-flag",
  plain: "se-tok-plain",
};

export function renderHighlighted(code: string, lang: string): React.ReactNode {
  const tokens = tokenize(code, lang);
  return tokens.map((t, i) => (
    <span key={i} className={KIND_CLASS[t.kind]}>
      {t.text}
    </span>
  ));
}
