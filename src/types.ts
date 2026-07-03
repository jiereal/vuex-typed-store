/**
 * 基础工具类型
 */

/**
 * 判断 T 是否没有任何 key（即 `never` / `undefined` / `{}`）
 */
export type IsNonKeyOf<T> = keyof T extends never ? true : false;

/**
 * 联合类型转交叉类型
 * 例: `A | B` → `A & B`
 */
export type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends (k: infer I) => void
  ? I
  : never;

/**
 * 展平 Promise 包装:
 *  - `Promise<T>` → `T`
 *  - 其他 → `Promise<T>`
 */
export type FlattenedPromise<T> = unknown extends T ? Promise<T> : T extends Promise<infer R> ? R : Promise<T>;

/**
 * 把 T 中的 K 变成必填
 */
export type RequiredProps<T, K extends keyof T> = T & Required<Pick<T, K>>;

/**
 * 数组元素类型
 */
export type Flatten<T> = T extends Array<infer U> ? U : never;

/**
 * 基础 key/value 映射
 */
export type KeyValues = { [key: string]: any };

/**
 * 安全地取对象属性类型，不存在返回 undefined
 */
export type getProperty<T, K> = K extends keyof T ? T[K] : undefined;
