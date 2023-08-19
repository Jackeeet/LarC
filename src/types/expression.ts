export interface Expression {
  value: string;
}

export type Identifier = Expression & {isId: boolean};
export const toIdentifier = (expr: Expression) => ({
  value: expr.value,
  isId: true,
});
export const isIdentifier = (expr: Expression): expr is Identifier =>
  (expr as Identifier).isId;

export type GeneralExpression = Variable | Func | Application;

export type Variable = Expression & {isVar: boolean};
export const toVariable = (expr: Expression) => ({
  value: expr.value,
  isVar: true,
});
export const isVariable = (expr: Expression): expr is Variable =>
  (expr as Variable).isVar;

export type Func = Expression & {
  body: GeneralExpression;
  sub: Variable;
};
export const isFunc = (expr: any): expr is Func =>
  (expr as Func).body !== undefined && (expr as Func).sub !== undefined;


export type Application = Expression & {
  applied: GeneralExpression;
  applicand: GeneralExpression;
};
export const isApplication = (expr: any): expr is Application =>
  (expr as Application).applied !== undefined &&
  (expr as Application).applicand !== undefined;
