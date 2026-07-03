/**
 * Vuex Helper 自动生成的 mutations 类型
 *
 * 当使用 `createMutations(state)` 时，会为每个 state 字段自动生成如下 mutations:
 *   - `{key}.set`     - 整体覆盖
 *   - `{key}.merge`   - 对象合并 / 非对象覆盖
 *   - `{key}.push`    - 数组 push
 *   - `{key}.pop`     - 数组 pop
 *   - `{key}.shift`   - 数组 shift
 *   - `{key}.unshift` - 数组 unshift
 *   - `{key}.concat`  - 数组 concat
 *   - `{key}.splice`  - 数组 splice
 */
import { Flatten, IsNonKeyOf } from './types';

export type GetVuexHelperMutations<State> = IsNonKeyOf<State> extends false
  ? {
      [Property in keyof State as `${string & Property}.set`]: (data: State[Property]) => void;
    } & {
      [Property in keyof State as `${string & Property}.merge`]: (data: Partial<State[Property]>) => void;
    } & {
      [Property in keyof State as `${string & Property}.concat`]: State[Property] extends { [index: number]: infer T }
        ? (data: T | T[]) => void
        : never;
    } & {
      [Property in keyof State as `${string & Property}.push`]: State[Property] extends Array<any>
        ? (data: Flatten<State[Property]>) => void
        : never;
    } & {
      [Property in keyof State as `${string & Property}.splice`]: State[Property] extends { [index: number]: infer T }
        ? (data: [start: number, deleteCount: number, ...items: T[]]) => void
        : never;
    } & {
      [Property in keyof State as `${string & Property}.pop`]: State[Property] extends Array<any> ? () => void : never;
    } & {
      [Property in keyof State as `${string & Property}.shift`]: State[Property] extends Array<any>
        ? () => void
        : never;
    } & {
      [Property in keyof State as `${string & Property}.unshift`]: State[Property] extends {
        [index: number]: infer T;
      }
        ? (arg: T) => void
        : never;
    }
  : {};
