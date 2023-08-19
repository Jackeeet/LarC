import {Instruction} from '../types/instruction';
import {SymbolTable} from '../types/symbolTable';
import * as exp from '../types/expression';
import * as err from '../errors';

enum Command {
  Pop = 0,
  Push = 1,
  Store = 2,
  Load = 3,
  Func = 4,
  Apply = 5,
  Eval = 6,
  Print = 7,
}

export type Compiler = {
  bytes: number[];
  symTable: SymbolTable;
  ids: {[key: string]: number};
  vars: {[key: string]: number};
};

const SUBSTITUTE: exp.Variable = {value: 'SUBSTITUTE', isVar: true};

export const initCompiler = (symTable: SymbolTable) => {
  return {
    bytes: [],
    symTable: symTable,
    ids: {},
    vars: {SUBSTITUTE: 0},
  };
};

const checkDefined = (c: Compiler, id: exp.Identifier) => {
  if (!(id.value in c.symTable))
    throw new Error(`Identifier '${id.value}' is not defined`);
};

const compileAssignment = (
  c: Compiler,
  expr: exp.Expression,
  target: exp.Identifier
) => {
  if (exp.isIdentifier(expr)) {
    checkDefined(c, expr);
    c.symTable[target.value] = c.symTable[expr.value];
    emitLoad(c, expr);
  } else if (exp.isVariable(expr)) {
    c.symTable[target.value] = expr;
    emitPush(c, expr);
  }

  emitStore(c, target);
  return c;
};

const compileApplication = (
  c: Compiler,
  applied: exp.Expression,
  applicand: exp.Expression
) => {
  return c;
};

const compileFunction = (c: Compiler, bound: exp.Variable, body: exp.Expression) => {
  const makeFunc = (body: exp.GeneralExpression) => {
    return {value: 'func', body: body, sub: bound};
  };

  emitPush(c, bound);
  if (exp.isIdentifier(body)) {
    checkDefined(c, body);
    emitLoad(c, body);
  } else {
    const varName = body as exp.Variable;
    emitPush(c, varName.value === bound.value ? SUBSTITUTE : varName);
  }

  c.bytes.push(Command.Func);
  return c;
};

const emitPush = (c: Compiler, v: exp.Variable) => {
  c.bytes.push(Command.Push);
  c.bytes.push(getVarCode(c, v));
};

const emitStore = (c: Compiler, id: exp.Identifier) => {
  c.bytes.push(Command.Store);
  c.bytes.push(getIdCode(c, id));
};

const emitLoad = (c: Compiler, id: exp.Identifier) => {
  c.bytes.push(Command.Load);
  c.bytes.push(getIdCode(c, id));
};

const getVarCode = (c: Compiler, v: exp.Variable) => {
  if (!(v.value in c.vars)) c.vars[v.value] = Object.keys(c.vars).length;
  return c.vars[v.value];
};

const getIdCode = (c: Compiler, id: exp.Identifier) => {
  if (!(id.value in c.ids)) c.ids[id.value] = Object.keys(c.ids).length;
  return c.ids[id.value];
};

export const compile = (c: Compiler, instructions: Instruction[]) => {
  instructions.forEach(instruction => {
    switch (instruction.op) {
      case 'assign':
        if (instruction.arg2 === null)
          throw new Error('Unreachable: null assignment target');
        c = compileAssignment(
          c,
          instruction.arg1,
          instruction.arg2 as exp.Identifier
        );
        break;
      case 'apply':
        if (instruction.arg2 === null)
          throw new Error('Unreachable: null applicand');
        c = compileApplication(c, instruction.arg1, instruction.arg2);
        break;
      case 'func':
        if (instruction.arg2 === null)
          throw new Error('Unreachable: null function body');
        c = compileFunction(c, instruction.arg1 as exp.Variable, instruction.arg2);
        break;
      case 'eval':
        c.bytes.push(Command.Eval);
        break;
      case 'print':
        c.bytes.push(Command.Print);
        break;
    }
  });

  return c;
};

