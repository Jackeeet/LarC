import {Expression} from './expression';

export type Instruction = {
  op: 'assign' | 'eval' | 'print' | 'apply' | 'func';
  arg1: Expression;
  arg2: Expression | null;
};
