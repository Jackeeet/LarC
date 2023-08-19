export const throwUnreachable = (msg: string): never => {
  throw new Error("Unreachable: " + msg);
};

export const ID_NOT_EXPANDED = "Identifier should've been expanded into an expression";

export const NULL_ID = "null identifier";

export const NULL_VAR = "null variable name";

export const NULL_FUNC_BODY = "null expression in function body";

export const NULL_ASSIGN = "null expression in assignment";

export const NULL_APPLIED = "null applied expression";

export const NULL_APPLICAND = "null applicand";

export const NULL_EVAL = "null expression to evaluate";

export const NULL_PRINT = "null expression to print";

