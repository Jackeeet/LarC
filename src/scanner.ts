export enum TokenKind {
  Equals = "equals",
  Lambda = "lambda",
  Dot= "dot",
  LBracket = "lBracket",
  RBracket = "rBracket",
  Identifier = "identifier",
  Name = "name",
  EOF = "EOF",
  ERR = "ERR"
}

export type Token = {
  kind: TokenKind;
  line: number;
  pos: number;
  value: string | null;
}

export type Scanner = {
  source: string;
  index: number;
  tokenStart: number;
  line: number;
  pos: number;
};

const eof = '$';

const newToken = (kind: TokenKind, scanner: Scanner) => {
  let value: string | null = null;
  let pos: number = kind === TokenKind.EOF ? scanner.pos : scanner.pos - 1;

  if (kind === TokenKind.Identifier) {
    const start = scanner.tokenStart;
    const end = scanner.index;
    value = scanner.source.slice(start, end);
    pos = scanner.pos - value.length;  
  } 

  return { 
    kind: kind, 
    line: scanner.line, 
    pos: pos, 
    value: value
  };
};

export const toString = (token: Token) => {
  return `[${token.line}:${token.pos}] ${token.kind}${token.value ? ': ' + token.value : ''}`;
};

export const initScanner = (source: string) => {
  return { 
    source: source, 
    index: 0, 
    tokenStart: 0,
    line: 1, 
    pos: 1 
  };
};

const isEnd = (scanner: Scanner) => {
  return scanner.source.length === scanner.index;
};

const isDigit = (ch: string) => {
  if (ch.length > 1)
    throw new Error('Not a character: ' + ch);
  
  const code = ch.charCodeAt(0);
  return (code >= 48 && code <= 57);
};

const isAlpha = (ch: string) => {
  if (ch.length > 1)
    throw new Error('Not a character: ' + ch);
  
  const code = ch.charCodeAt(0);
  return (code >= 65 && code <= 90) 
      || (code >= 97 && code <= 122);
};

const peek = (scanner: Scanner) => {
  return scanner.source[scanner.index];
};

const peekNext = (scanner: Scanner) => {
  return !isEnd(scanner) ? 
    scanner.source[scanner.index + 1] : eof;
};

export const advance = (scanner: Scanner) => {
  const ch = peek(scanner);
  const newLine = ch === '\n';
  return { 
    ch: ch, 
    scanner: {
      source: scanner.source,
      index: scanner.index + 1,
      tokenStart: scanner.tokenStart,
      line: scanner.line + (newLine ? 1 : 0), 
      pos: newLine? 1 : scanner.pos + 1
    }
  };
};

const identifier = (scanner: Scanner) => {
  let ch = '';
  while (!isEnd(scanner) && (isAlpha(peek(scanner)) || isDigit(peek(scanner)))) {
    ({ch, scanner} = advance(scanner));
  }

  return {
    token: newToken(TokenKind.Identifier, scanner),
    scanner: { ...scanner, tokenStart: scanner.index }
  };
};

const skipBlanks = (scanner: Scanner) => {
  while (true) {
    let ch = peek(scanner);
    switch (ch) {
      case ' ':
      case '\r':
      case '\t':
      case '\n':
        ({ch, scanner} = advance(scanner));
        break;
      case '/':
        if (peekNext(scanner) === '/') {
          while (peek(scanner) !== '\n' && !isEnd(scanner))
            ({ch, scanner} = advance(scanner));
        } else {
          return {...scanner, tokenStart: scanner.index};
        }
        break;
      default: 
        return {...scanner, tokenStart: scanner.index};
    }
  }
};

export const scanToken = (scanner: Scanner) => {
  if (isEnd(scanner)) {
    return { 
      token: newToken(TokenKind.EOF, scanner),
      scanner: scanner
    }; 
  }

  scanner = skipBlanks(scanner);
  let ch = '';
  ({ch, scanner} = advance(scanner));

  if (isAlpha(ch)) {
    return identifier(scanner);
  }

  let token: Token | null = null;
  switch(ch) {
    case '\\': 
      token = newToken(TokenKind.Lambda, scanner);
      break;
    case '.': 
      token = newToken(TokenKind.Dot, scanner);
      break;
    case '=': 
      token = newToken(TokenKind.Equals, scanner);
      break;
    case '(': 
      token = newToken(TokenKind.LBracket, scanner);
      break;
    case ')': 
      token = newToken(TokenKind.RBracket, scanner);
      break;
    case '!': 
      token = newToken(TokenKind.Application, scanner);
      break;
    default:
      // unreachable
      return {
        token: newToken(TokenKind.ERR, scanner), 
        scanner: scanner
      };
  }

  return {token: token, scanner: scanner};
};

