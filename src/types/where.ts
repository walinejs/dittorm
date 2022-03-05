export type WhereValue<T = any> =
  | T
  | ["IN" | "NOT IN", T[]]
  | ["LIKE", string]
  | ["!=" | ">", T];

type LogicKey = "_logic";
export type Complex<T> = {
  [key in (keyof T | LogicKey)]: key extends LogicKey ? "or" | "and" : WhereValue<any> | string;
};

type ComplexKey = "_complex";
export type Where<T> = {
  [key in (keyof T | ComplexKey)]?: key extends ComplexKey ? Complex<T> : WhereValue<any> | Complex<T> | undefined;
};