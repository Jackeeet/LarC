export enum TokenKind {
  Equals = 'equals',
  Lambda = 'lambda',
  Dot = 'dot',
  LBracket = 'lBracket',
  RBracket = 'rBracket',
  Identifier = 'identifier',  // uppercase function name
  Name = 'name', // lowercase variable name
  Let = 'let',
  Eval = 'eval',
  Start = 'start', // default value for parse() start
  EOF = 'EOF',
  ERR = 'ERR',
}

export type Token = {
  kind: TokenKind;
  line: number;
  pos: number;
  value: string | null;
};

export const toString = (token: Token) => {
  return `[${token.line}:${token.pos}] ${token.kind}${
    token.value ? ': ' + token.value : ''
  }`;
};

export const startToken: Token = {
  kind: TokenKind.Start,
  line: -1,
  pos: -1,
  value: null,
};
