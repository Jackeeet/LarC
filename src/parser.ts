import {
  Scanner, 
  initScanner, 
  Token, 
  TokenKind,
  scanToken
} from './scanner';

enum ActionResult {
  Accept = 0,
  Abort = 1,
  Err = 2,
  Fail = 3,
  NewState = 4,
  Default = 5,
  Reduce = 6,
  ErrLab1 = 7,
  Return = 8
}

type Statement = any;

type Expression = any;

type InstructionKind = Statement | Expression;

type Op = "assign" | "eval" | "apply" 

type Instruction = {
  op: Op;
  arg1: any;
  arg2: any;
  result: any;
}

type LocalVar = {
  name: string;
  depth: number;
};

export class YYParser {
  public symTable: any; // todo assign actual type
  public program: Instruction[];

  // private _locals: LocalVar[];

  private _scanner: Scanner;

  private _errStatus = 0;

  constructor(source: string, symTable: any) {
    this._scanner = initScanner(source);
    this.symTable = symTable;
    this.program = [];
  }

  private _scan() {
    const {token, scanner} = scanToken(this._scanner);
    this._scanner = scanner;
    return token;
  }

  public recovering() {
    return this._errStatus === 0;
  }

  private _addDecl(decl: Statement) {
    this.program.push(decl);
  }

  private _addEval(expr: Expression) {
    this.program.push(expr);
  }

  private _evaluate(expr: Expression) {
  }

  private _declareVar(identifier: Token, expr: Expression) {
    const id = identifier.value;
    if (id === null)
      throw new Error("null identifier");
    this.symTable[id] = expr;
  }

  private _lookUp(identifier: Token) {
    const id = identifier.value;
    if (id === null)
      throw new Error("null identifier");

    return this.symTable.hasOwnProperty(id) ? this.symTable[id] : null;
  }

  private _handleLocal(local: any) {
  }
  
  private _handleFunc(func: any) {
  }

  private _handleApplication(appl: any) {
  }

  private _handleGrouping(grouping: any) {
  }

  // technically lambda calculus allows multiple function parameters
  // but we'll go with single-parameter functions for now
  private _makeFunc(bound: Token, expr: Expression) {

  }

  private _apply(expr1: Expression, expr2: Expression) {
  }

  private _action(yyn: number, stack: YYStack, len: number) {
    let val: any = stack.valueAt(len > 0 ? len -1 : 0);
    // this._reduce_print(yyn, stack);

    switch (yyn) {
      case 2:
        this._addDecl(stack.valueAt(0));
        break;
      case 3:
        this._addEval(stack.valueAt(0));
        break;
      case 5:
        this._declareVar(stack.valueAt(2), stack.valueAt(0));
        break;
      case 6:
        const evaluated = this._evaluate(stack.valueAt(0));
        this._declareVar(stack.valueAt(2), evaluated);
        break;
      case 7:
        val = this._evaluate(stack.valueAt(0));
        break;
      case 8:
        val = this._lookUp(stack.valueAt(0));
        break;
      case 9: 
        val = this._handleLocal(stack.valueAt(0));
        break;
      case 10:
        this._handleFunc(stack.valueAt(0)); 
        break;
      case 11:
        this._handleApplication(stack.valueAt(0));
        break;
      case 12: 
        val = this._handleGrouping(stack.valueAt(1));
        break;
      case 13: 
        this._makeFunc(stack.valueAt(2), stack.valueAt(0));
        break;
      case 14:
        val = this._apply(stack.valueAt(1), stack.valueAt(0));
        break;
      default:
        break;
    }

    // symbol_print("-> $$ =", yyr1_[yyn], val);
    stack.pop(len);
    len = 0;

    // shift result of the reduction
    yyn = this._r1[yyn];
    let state = this._pgoto[yyn - this._nTokens] + stack.stateAt(0);
    const condition = 0 <= state && state <= this._last 
      && this._check[state] == stack.stateAt(0);
    state = condition ? this._table[state] : this._defgoto[yyn - this._nTokens]; 
    stack.push(state, val);
    return ActionResult.NewState;
  }

  private _tNameErr(str: string) {
    if (str[0] === '"') {
      let res = "";
      let breakLoop = false;
      for (let i = 1; i < str.length; i++) {
        switch(str[i]) {
          case "\'":
          case ",":
            breakLoop = true;
            break;
          case "\\":
            if (str[i + 1] !== "\\")
              breakLoop = true;
              break;
          case '"':
            return res;
          default:
            res += str[i];
            break;
        }
        if (breakLoop)
          break;
      }
    } else if (str === "$end") {
      return "end of input";
    }

    return str;
  }
  
 // private _symbolPrint(s: string, type: number, value: any) { }
  
  public parse() {
    let tokenNumber: number = this._empty;
    let token: Token = {
      kind: TokenKind.EOF, line: -1, pos: -1, value: null
    };

    let yyn = 0;
    let len = 0;
    let state = 0;

    let stack = new YYStack();

    let errCount = 0;
    let lookaheadValue: any = null;

    let result: number | null = null;
    this._errStatus = 0;

    stack.push(state, lookaheadValue);
    let label = ActionResult.NewState;
    while (true) {
      switch (label) {
        case ActionResult.NewState:
          if (state === this._final) // accept?
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
            lookaheadValue = token.value;
          }

          // convert token to internal form
          if (tokenNumber <= this._tokenKindToNum[TokenKind.EOF]) { 
            token = { kind: TokenKind.EOF, line: -1, pos: -1, value: null };
            tokenNumber = this._tokenKindToNum[TokenKind.EOF];
          } else {
            tokenNumber = this._translate(this._tokenKindToNum[token.kind]);
          }

          yyn += tokenNumber;
          if (yyn < 0 || this._last < yyn || this._check[yyn] !== tokenNumber) {
            label = ActionResult.Default;
          } else if ((yyn = this._table[yyn]) <= 0) {
            if (yyn === 0 || yyn == this._table_ninf) {
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
            stack.push(state, lookaheadValue);
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
              else
                tokenNumber = this._empty;
            }
          }

          label = ActionResult.ErrLab1;
          break;
        case ActionResult.Err:
          stack.pop(len);
          len = 0;
          state = stack.stateAt(0);
          label = ActionResult.ErrLab1;
          break;
        case ActionResult.ErrLab1:
          this._errStatus = 3;
          while (true) {
            yyn = this._pact[state];
            if (yyn !== this._pact_ninf) {
              yyn += this._tError;
              if (0 <= yyn && yyn <= this._last && this._check[yyn] === this._tError) {
                yyn = this._table[yyn];
                if (0 < yyn)
                  break;
              }
            }
            
            if (stack.height === 1)
              return false;
          
            stack.pop();
            state = stack.stateAt(0);
          }

          state = yyn;
          stack.push(yyn, lookaheadValue);
          label = ActionResult.NewState;
          break;
        case ActionResult.Accept:
          return true;
        case ActionResult.Abort:
          return false;
      }
    }
  }

  private _syntaxError() {
    return "syntax error";
  }

  private readonly _pact_ninf = -5;
  private readonly _pact = [
    -5,  2, -5, -3, 20, -5, -5, -1, -5, -5,
     7, 20, 20, -5, -5, 11, 12,  0, 20, -5, 
    20, 20, -5, 20
  ];
  
  private readonly _defact = [
    4,  0,  1,  0,  0, 2, 3, 0,  9, 8,
    0,  0,  7, 10, 11, 0, 0, 0, 14, 6,
    5,  0, 12, 13
  ];

  private readonly _pgoto = [
    -5, -5, -5, 5, -4, -5, -5
  ];

  private readonly _defgoto = [
    -1, 1, 5, 6, 18, 13, 14
  ];

  private readonly _table_ninf = -1;
  private readonly _table = [
    12,  7, 2, 8, 9, 10, 15, 17, 11, 22,
    16, 20, 3, 4, 8,  9, 10, 23, 21, 11,
    19,  0, 4, 8, 9, 10,  0,  0, 11
  ];

  private readonly _check = [
     4,  4,  0,  3, 4, 5,  7, 11, 8, 9,
     3, 15, 10, 11, 3, 4,  5, 21, 6, 8, 
    15, -1, 11,  3, 4, 5, -1, -1, 8
  ];

  private readonly _stos = [
     0, 13,  0, 10, 11, 14, 15,  4,  3,  4, 
     5,  8, 16, 17, 18,  7,  3, 16, 16, 15, 
    16,  6,  9, 16
  ];

  private readonly _r1 = [
    0, 12, 13, 13, 13, 14, 14, 15, 16, 16, 16, 16, 16, 17, 18
  ];

  private readonly _r2 = [
    0, 2, 2, 2, 0, 4, 4, 2, 1, 1, 1, 1, 3, 4, 2
  ];

  private readonly _rhs = [
    13,  0, -1, 13, 14, -1, 13, 15, -1, -1,
    10,  4,  7, 16, -1, 10,  4,  7, 15, -1, 
    11, 16, -1,  4, -1,  3, -1, 17, -1, 18,
    -1,  8, 16,  9, -1,  5,  3,  6, 16, -1, 
    16, 16, -1
  ];

  private readonly _prhs = [
    0, 0, 3, 6, 9, 10, 15, 20, 23, 25, 27, 29, 31, 35, 40
  ];

  private readonly _rline = [
    0, 15, 15, 16, 17, 20, 21, 24, 27, 28, 29, 30, 31, 34, 37
    // 0, 8, 8, 9, 10, 13, 14, 17, 20, 21, 22, 23, 24, 27, 30
  ];

  private readonly _translateTable = [
    0, 2, 2, 2, 2,  2,  2, 2, 2, 2,
    2, 2, 2, 2, 2,  2,  2, 2, 2, 2,
    2, 2, 2, 2, 2,  2,  2, 2, 2, 2,
    2, 2, 2, 2, 2,  2,  2, 2, 2, 2,
    2, 2, 2, 2, 2,  2,  2, 2, 2, 2,
    2, 2, 2, 2, 2,  2,  2, 2, 2, 2,
    2, 2, 2, 2, 2,  2,  2, 2, 2, 2,
    2, 2, 2, 2, 2,  2,  2, 2, 2, 2,
    2, 2, 2, 2, 2,  2,  2, 2, 2, 2,
    2, 2, 2, 2, 2,  2,  2, 2, 2, 2,
    2, 2, 2, 2, 2,  2,  2, 2, 2, 2,
    2, 2, 2, 2, 2,  2,  2, 2, 2, 2,
    2, 2, 2, 2, 2,  2,  2, 2, 2, 2,
    2, 2, 2, 2, 2,  2,  2, 2, 2, 2,
    2, 2, 2, 2, 2,  2,  2, 2, 2, 2,
    2, 2, 2, 2, 2,  2,  2, 2, 2, 2,
    2, 2, 2, 2, 2,  2,  2, 2, 2, 2,
    2, 2, 2, 2, 2,  2,  2, 2, 2, 2,
    2, 2, 2, 2, 2,  2,  2, 2, 2, 2,
    2, 2, 2, 2, 2,  2,  2, 2, 2, 2,
    2, 2, 2, 2, 2,  2,  2, 2, 2, 2,
    2, 2, 2, 2, 2,  2,  2, 2, 2, 2,
    2, 2, 2, 2, 2,  2,  2, 2, 2, 2,
    2, 2, 2, 2, 2,  2,  2, 2, 2, 2,
    2, 2, 2, 2, 2,  2,  2, 2, 2, 2,
    2, 2, 2, 2, 2,  2,  1, 2, 3, 4,
    5, 6, 7, 8, 9, 10, 11
  ];

  private _translate(tokenNumber: number) {
    if (tokenNumber >= 0 && tokenNumber <= this._maxUserTokenNumber)
      return this._translateTable[tokenNumber];
    return this._undefinedTokenNumber;
  }

  private readonly _last = 28;
  private readonly _nnts = 7;
  private readonly _empty = -2;
  private readonly _final = 2;
  private readonly _tError = 1;
  private readonly _errCode = 256;
  private readonly _nTokens = 12;

  private readonly _maxUserTokenNumber = 266;
  private readonly _undefinedTokenNumber = 2;
  
  private readonly _numToTokenKind = {
      0: TokenKind.EOF,
      258: TokenKind.Name,
      259: TokenKind.Identifier,
      260: TokenKind.Lambda,
      261: TokenKind.Dot,
      262: TokenKind.Equals,
      263: TokenKind.LBracket,
      264: TokenKind.RBracket,
      265: TokenKind.Let,
      266: TokenKind.Eval,
  };

  private readonly _tokenKindToNum: {[key:string] : number} = {
     "EOF": 0,
     "name": 258,
     "identifier": 259,
     "lambda": 260,
     "dot": 261,
     "equals": 262,
     "lBracket": 263,
     "rBracket": 264,
     "let": 265,
     "eval": 266
  }; 
 } 

 class YYStack {
    private _stateStack: number[] = [];
    private _valueStack: any[] = [];

    public height = -1;

    public push(state: number, value: any) {
      this._stateStack.push(state);
      this._valueStack.push(value);
      this.height += 1;
    }

    public pop(n: number = 1) {
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

