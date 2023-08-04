export interface Expression {
  value: string;
}

export type Identifier = Expression & {isId: boolean};
export const isIdentifier = (expr: Expression): expr is Identifier => {
  return (expr as Identifier).isId;
};

export type Variable = Expression & {isVar: boolean};
export const isVariable = (expr: Expression): expr is Variable => {
  return (expr as Variable).isVar;
};

export type Previous = Expression & {isPrevious: boolean};
export const isPrevious = (expr: Expression): expr is Previous => {
  return (expr as Previous).isPrevious;
};

export const previous = {value: '$', isPrevious: true};
