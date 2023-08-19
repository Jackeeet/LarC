import {GeneralExpression} from './expression';

export type SymbolTable = {
  [key: string]: GeneralExpression;
};
