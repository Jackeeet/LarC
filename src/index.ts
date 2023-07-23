import {
  Scanner, 
  Token, 
  TokenKind,
  initScanner, 
  advance, 
  scanToken,
  toString
} from './scanner';

export const scan = (source: string) => {
  let scanner = initScanner(source);
  let token: Token | null = null;

  ({token, scanner} = scanToken(scanner));
  if (token === null) {
    throw new Error("null token");
  }

  const tokens: Token[] = [token]; 
  while (token?.kind !== TokenKind.EOF) {
    ({token, scanner} = scanToken(scanner));
    if (token === null) {
      throw new Error("null token");
    }
    tokens.push(token);
  }

  tokens.forEach(t => console.log(toString(t)));
};

scan("N = \\x.x \n F = N N");
