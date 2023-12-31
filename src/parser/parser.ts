import {Scanner, initScanner, scanToken} from './scanner';
import {Token, TokenKind, startToken} from './token';
import {Instruction} from '../types/instruction';
import {SymbolTable} from '../types/symbolTable';
import * as exp from '../types/expression';
import * as err from '../errors';

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

export class YYParser {
  public symTable: SymbolTable;
  public instructions: Instruction[];

  private _scanner: Scanner;
  private _errStatus = 0;

  constructor(source: string, symTable: SymbolTable) {
    this._scanner = initScanner(source);
    this.symTable = symTable;
    this.instructions = [];
  }

  private _scan() {
    const {token, scanner} = scanToken(this._scanner);
    this._scanner = scanner;
    return token;
  }

  private _declareGlobal(
    identifier: exp.Identifier,
    expr: exp.GeneralExpression
  ) {
    if (identifier.value === null) err.throwUnreachable(err.NULL_ID);

    this.symTable[identifier.value] = expr;
    this.instructions.push({op: 'assign', arg1: expr, arg2: identifier});
  }

  private _makeFunc(
    bound: exp.Variable,
    body: exp.GeneralExpression
  ): exp.Func {
    if (bound === null) err.throwUnreachable(err.NULL_VAR);

    this.instructions.push({op: 'func', arg1: bound, arg2: body});
    return {value: 'func', body: body, sub: bound};
  }

  private _makeApplication(
    applied: exp.GeneralExpression,
    applicand: exp.GeneralExpression
  ): exp.Application {
    this.instructions.push({op: 'apply', arg1: applied, arg2: applicand});
    return {value: 'application', applied: applied, applicand: applicand};
  }

  private _declareEval(expr: exp.Expression): exp.Expression {
    this.instructions.push({op: 'eval', arg1: expr, arg2: null});
    return expr;
  }

  private _handlePrint(value: exp.Expression) {
    this.instructions.push({op: 'print', arg1: value, arg2: null});
  }

  private _parseDeclaration(stack: YYStack) {
    // declaration : LET IDENTIFIER EQUALS (expression | evaluation)
    const identifier = stack.valueAt(2) as exp.Identifier;
    const expression = stack.valueAt(0);

    if (identifier === null) err.throwUnreachable(err.NULL_ID);
    if (expression === null) err.throwUnreachable(err.NULL_ASSIGN);
    if (exp.isIdentifier(expression!)) {
      err.throwUnreachable(err.ID_NOT_EXPANDED);
    }

    this._declareGlobal(identifier, expression as exp.GeneralExpression);
  }

  private _parseFunc(stack: YYStack) {
    // function : LAMBDA NAME DOT expression
    const variable = stack.valueAt(2) as exp.Variable;
    const expression = stack.valueAt(0);

    if (variable === null) err.throwUnreachable(err.NULL_VAR);
    if (expression === null) err.throwUnreachable(err.NULL_FUNC_BODY);
    if (exp.isIdentifier(expression!)) {
      err.throwUnreachable(err.ID_NOT_EXPANDED);
    }

    return this._makeFunc(variable, expression as exp.GeneralExpression);
  }

  private _parseApplication(stack: YYStack) {
    // application : expression APPLY expression
    const applied = stack.valueAt(2);
    const applicand = stack.valueAt(0);

    if (applied === null) err.throwUnreachable(err.NULL_APPLIED);
    if (applicand === null) err.throwUnreachable(err.NULL_APPLICAND);
    if (exp.isIdentifier(applied!) || exp.isIdentifier(applicand!)) {
      err.throwUnreachable(err.ID_NOT_EXPANDED);
    }

    return this._makeApplication(
      applied as exp.GeneralExpression,
      applicand as exp.GeneralExpression
    );
  }

  private _action(yyn: number, stack: YYStack, len: number) {
    let val: exp.Expression | null = stack.valueAt(len > 0 ? len - 1 : 0);
    switch (yyn) {
      case 3:
        const value = stack.valueAt(0) as exp.Expression;
        if (value === null) err.throwUnreachable(err.NULL_PRINT);
        this._handlePrint(value);
        break;
      case 5:
      case 6:
        this._parseDeclaration(stack);
        break;
      case 7: // evaluation : EVAL expression
        const expression = stack.valueAt(0);
        if (expression === null) err.throwUnreachable(err.NULL_EVAL);
        val = this._declareEval(expression!);
        break;
      case 8: // expression : IDENTIFIER
        const identifier = stack.valueAt(0);
        if (identifier === null) err.throwUnreachable(err.NULL_ID);
        val = this.symTable[identifier!.value];
        break;
      case 9: // expression : NAME
        const variable = stack.valueAt(0);
        if (variable === null) err.throwUnreachable(err.NULL_VAR);
        val = exp.toVariable(variable!);
        break;
      case 12: // expression : LBRACKET expression RBRACKET
        val = stack.valueAt(1);
        break;
      case 13:
        val = this._parseFunc(stack);
        break;
      case 14:
        val = this._parseApplication(stack);
        break;
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

    stack.push(state, typeof val === 'string' ? {value: val} : val);
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

    stack.push(state, this._tokenToExpression(token));
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
            stack.push(state, this._tokenToExpression(token));
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
          stack.push(yyn, this._tokenToExpression(token));
          label = ActionResult.NewState;
          break;
        case ActionResult.Accept:
          return true;
        case ActionResult.Abort:
          return false;
      }
    }
  }

  private _tokenToExpression(token: Token) {
    return token.value === null ? null : {value: token.value};
  }

  private readonly _pact_ninf = -10;
  private readonly _pact = [
    -10, 0, -10, -1, 19, -10, -10, -2, -10, -10, 4, 19, -4, -10, -10, 10, 11,
    -8, 19, -10, -4, 19, -10, -10, -4,
  ];

  private readonly _defact = [
    4, 0, 1, 0, 0, 2, 3, 0, 9, 8, 0, 0, 7, 10, 11, 0, 0, 0, 0, 6, 5, 0, 12, 14,
    13,
  ];

  private readonly _pgoto = [-10, -10, -10, 1, -9, -10, -10];

  private readonly _defgoto = [-1, 1, 5, 6, 12, 13, 14];

  private readonly _table_ninf = -1;
  private readonly _table = [
    2, 22, 17, 7, 18, 15, 20, 16, 18, 23, 3, 4, 24, 8, 9, 10, 19, 21, 11, 0, 0,
    4, 8, 9, 10, 0, 0, 11,
  ];

  private readonly _check = [
    0, 9, 11, 4, 12, 7, 15, 3, 12, 18, 10, 11, 21, 3, 4, 5, 15, 6, 8, -1, -1,
    11, 3, 4, 5, -1, -1, 8,
  ];

  private readonly _r1 = [
    0, 13, 14, 14, 14, 15, 15, 16, 17, 17, 17, 17, 17, 18, 19,
  ];

  private readonly _r2 = [0, 2, 2, 2, 0, 4, 4, 2, 1, 1, 1, 1, 3, 4, 3];

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
    2, 2, 2, 2, 2, 2, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12,
  ];

  private _translate(tokenNumber: number) {
    if (tokenNumber >= 0 && tokenNumber <= this._maxUserTokenNumber)
      return this._translateTable[tokenNumber];
    return this._undefinedTokenNumber;
  }

  private readonly _last = 27;
  private readonly _empty = -2;
  private readonly _final = 2;
  private readonly _tError = 1;
  private readonly _nTokens = 13;

  private readonly _maxUserTokenNumber = 267;
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
    apply: 267,
  };
}

class YYStack {
  private _stateStack: number[] = [];
  private _valueStack: (exp.Expression | null)[] = [];

  public height = -1;

  public push(state: number, value: exp.Expression | null) {
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
