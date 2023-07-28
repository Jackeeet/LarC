import {Scanner, initScanner, scanToken} from './scanner';
import {TokenKind, startToken} from './token';

enum ActionResult {
  Accept = 0,
  Abort = 1,
  Err = 2,
  Fail = 3,
  NewState = 4,
  Default = 5,
  Reduce = 6,
  ErrLab1 = 7,
  Return = 8,
}

export type InstructionPointer = string;
const toInstPointer = (n: number) => `i${n}`;

export type Identifier = string;
export type Variable = string;
export type Expression = Identifier | Variable;

export type Instruction = {
  op: 'assign' | 'eval' | 'apply' | 'func';
  arg1: Expression | InstructionPointer;
  arg2: Expression | InstructionPointer | null;
};

export class YYParser {
  public symTable: {[key: Identifier]: Expression | InstructionPointer};
  public instructions: Instruction[];

  private _scanner: Scanner;
  private _errStatus = 0;

  constructor(
    source: string,
    symTable: {[key: Identifier]: Expression | InstructionPointer}
  ) {
    this._scanner = initScanner(source);
    this.symTable = symTable;
    this.instructions = [];
  }

  private _scan() {
    const {token, scanner} = scanToken(this._scanner);
    this._scanner = scanner;
    return token;
  }

  private _declareGlobal(identifier: Identifier, expr: Expression) {
    if (identifier === null) throw new Error('Unreachable: null identifier');

    this.symTable[identifier] = expr;
    this.instructions.push({op: 'assign', arg1: expr, arg2: identifier});
  }

  private _makeFunc(bound: Variable, body: Expression): InstructionPointer {
    if (bound === null) throw new Error('Unreachable: null bound value');

    const ptr = toInstPointer(this.instructions.length);
    this.instructions.push({op: 'func', arg1: bound, arg2: body});
    return ptr;
  }

  private _makeApplication(
    applied: Expression,
    applicand: Expression
  ): InstructionPointer {
    const ptr = toInstPointer(this.instructions.length);
    this.instructions.push({op: 'apply', arg1: applied, arg2: applicand});
    return ptr;
  }

  private _declareEval(expr: Expression): InstructionPointer {
    const ptr = toInstPointer(this.instructions.length);
    this.instructions.push({op: 'eval', arg1: expr, arg2: null});
    return ptr;
  }

  private _action(yyn: number, stack: YYStack, len: number) {
    let val: Expression | InstructionPointer | null = stack.valueAt(
      len > 0 ? len - 1 : 0
    );
    switch (yyn) {
      case 5:
      case 6: {
        // declaration : LET IDENTIFIER EQUALS (expression | evaluation)
        const identifier = <Identifier>stack.valueAt(2);
        if (identifier === null)
          throw new Error('Unreachable: null identifier');
        const expression = stack.valueAt(0);
        if (expression === null)
          throw new Error('Unreachable: null expression in assignment');
        this._declareGlobal(identifier, expression);
        break;
      }
      case 7: {
        // evaluation : EVAL expression
        const expression = stack.valueAt(0);
        if (expression === null)
          throw new Error('Unreachable: null expression in eval');
        val = this._declareEval(expression);
        break;
      }
      case 12:
        // expression : LBRACKET expression RBRACKET
        val = stack.valueAt(1);
        break;
      case 13: {
        // function : LAMBDA NAME DOT expression
        const variable = <Variable>stack.valueAt(2);
        if (variable === null)
          throw new Error('Unreachable: null variable name');
        const expression = stack.valueAt(0);
        if (expression === null)
          throw new Error('Unreachable: null expression in function body');
        val = this._makeFunc(variable, expression);
        break;
      }
      case 14: {
        // application : expression expression
        const applied = stack.valueAt(1);
        if (applied === null)
          throw new Error('Unreachable: null applied expression');
        const applicand = stack.valueAt(0);
        if (applicand === null) throw new Error('Unreachable: null applicand');
        val = this._makeApplication(applied, applicand);
        break;
      }
      default:
        break;
    }

    stack.pop(len);

    // shift result of the reduction
    yyn = this._r1[yyn];
    let state = this._pgoto[yyn - this._nTokens] + stack.stateAt(0);
    const condition =
      0 <= state &&
      state <= this._last &&
      this._check[state] === stack.stateAt(0);
    state = condition ? this._table[state] : this._defgoto[yyn - this._nTokens];
    stack.push(state, val);
    return ActionResult.NewState;
  }

  public parse() {
    let tokenNumber: number = this._empty;
    let token = startToken;
    let yyn = 0;
    let len = 0;
    let state = 0;

    const stack = new YYStack();
    this._errStatus = 0;

    stack.push(state, token.value);
    let label = ActionResult.NewState;
    while (true) {
      switch (label) {
        case ActionResult.NewState:
          if (state === this._final)
            // accept?
            return true;

          // try deciding w/o lookahead
          yyn = this._pact[state];
          if (yyn === this._pact_ninf) {
            label = ActionResult.Default;
            break;
          }

          // read lookahead token
          if (tokenNumber === this._empty) {
            token = this._scan();
            tokenNumber = this._tokenKindToNum[token.kind];
          }

          // convert token to internal form
          if (tokenNumber <= this._tokenKindToNum[TokenKind.EOF]) {
            token = {kind: TokenKind.EOF, line: -1, pos: -1, value: null};
            tokenNumber = this._tokenKindToNum[TokenKind.EOF];
          } else {
            tokenNumber = this._translate(this._tokenKindToNum[token.kind]);
          }

          yyn += tokenNumber;
          if (yyn < 0 || this._last < yyn || this._check[yyn] !== tokenNumber) {
            label = ActionResult.Default;
          } else if ((yyn = this._table[yyn]) <= 0) {
            if (yyn === 0 || yyn === this._table_ninf) {
              label = ActionResult.Fail;
            } else {
              yyn = -yyn;
              label = ActionResult.Reduce;
            }
          } else {
            tokenNumber = this._empty;
            if (this._errStatus > 0) {
              this._errStatus -= 1;
            }

            state = yyn;
            stack.push(state, token.value);
            label = ActionResult.NewState;
          }
          break;
        case ActionResult.Default:
          yyn = this._defact[state];
          label = yyn === 0 ? ActionResult.Fail : ActionResult.Reduce;
          break;
        case ActionResult.Reduce:
          len = this._r2[yyn];
          label = this._action(yyn, stack, len);
          state = stack.stateAt(0);
          break;
        case ActionResult.Fail:
          if (this._errStatus === 0) {
            // ++yynerrs_;
            // yyerror();
          }

          if (this._errStatus === 3) {
            if (tokenNumber <= this._tokenKindToNum[TokenKind.EOF]) {
              if (tokenNumber === this._tokenKindToNum[TokenKind.EOF])
                return false;
              else tokenNumber = this._empty;
            }
          }

          label = ActionResult.ErrLab1;
          break;
        case ActionResult.ErrLab1:
          this._errStatus = 3;
          while (true) {
            yyn = this._pact[state];
            if (yyn !== this._pact_ninf) {
              yyn += this._tError;
              if (
                0 <= yyn &&
                yyn <= this._last &&
                this._check[yyn] === this._tError
              ) {
                yyn = this._table[yyn];
                if (0 < yyn) break;
              }
            }

            if (stack.height === 1) return false;

            stack.pop();
            state = stack.stateAt(0);
          }

          state = yyn;
          stack.push(yyn, token.value);
          label = ActionResult.NewState;
          break;
        case ActionResult.Accept:
          return true;
        case ActionResult.Abort:
          return false;
      }
    }
  }

  private readonly _pact_ninf = -5;
  private readonly _pact = [
    -5, 2, -5, -3, 20, -5, -5, -1, -5, -5, 7, 20, 20, -5, -5, 11, 12, 0, 20, -5,
    20, 20, -5, 20,
  ];

  private readonly _defact = [
    4, 0, 1, 0, 0, 2, 3, 0, 9, 8, 0, 0, 7, 10, 11, 0, 0, 0, 14, 6, 5, 0, 12, 13,
  ];

  private readonly _pgoto = [-5, -5, -5, 5, -4, -5, -5];

  private readonly _defgoto = [-1, 1, 5, 6, 18, 13, 14];

  private readonly _table_ninf = -1;
  private readonly _table = [
    12, 7, 2, 8, 9, 10, 15, 17, 11, 22, 16, 20, 3, 4, 8, 9, 10, 23, 21, 11, 19,
    0, 4, 8, 9, 10, 0, 0, 11,
  ];

  private readonly _check = [
    4, 4, 0, 3, 4, 5, 7, 11, 8, 9, 3, 15, 10, 11, 3, 4, 5, 21, 6, 8, 15, -1, 11,
    3, 4, 5, -1, -1, 8,
  ];

  private readonly _r1 = [
    0, 12, 13, 13, 13, 14, 14, 15, 16, 16, 16, 16, 16, 17, 18,
  ];

  private readonly _r2 = [0, 2, 2, 2, 0, 4, 4, 2, 1, 1, 1, 1, 3, 4, 2];

  private readonly _translateTable = [
    0, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2,
    2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2,
    2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2,
    2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2,
    2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2,
    2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2,
    2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2,
    2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2,
    2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2,
    2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2,
    2, 2, 2, 2, 2, 2, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11,
  ];

  private _translate(tokenNumber: number) {
    if (tokenNumber >= 0 && tokenNumber <= this._maxUserTokenNumber)
      return this._translateTable[tokenNumber];
    return this._undefinedTokenNumber;
  }

  private readonly _last = 28;
  private readonly _empty = -2;
  private readonly _final = 2;
  private readonly _tError = 1;
  private readonly _nTokens = 12;

  private readonly _maxUserTokenNumber = 266;
  private readonly _undefinedTokenNumber = 2;

  private readonly _tokenKindToNum: {[key: string]: number} = {
    EOF: 0,
    name: 258,
    identifier: 259,
    lambda: 260,
    dot: 261,
    equals: 262,
    lBracket: 263,
    rBracket: 264,
    let: 265,
    eval: 266,
  };
}

class YYStack {
  private _stateStack: number[] = [];
  private _valueStack: (string | null)[] = [];

  public height = -1;

  public push(state: number, value: string | null) {
    this._stateStack.push(state);
    this._valueStack.push(value);
    this.height += 1;
  }

  public pop(n = 1) {
    for (let i = 0; i < n; i++) {
      this._stateStack.pop();
      this._valueStack.pop();
      this.height -= 1;
    }
  }

  public stateAt(index: number) {
    return this._stateStack[this.height - index];
  }

  public valueAt(index: number) {
    return this._valueStack[this.height - index];
  }
}
