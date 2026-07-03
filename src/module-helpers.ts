/**
 * Vuex 模块创建辅助
 *
 * 从 `utils/vuex-helper.ts` 抽离，用于：
 * 1. `createMutations(state)` - 自动生成 `{key}.set / {key}.merge / {key}.push …` 等 mutations
 * 2. `createNamespacedStore(name, module)` - 创建带命名空间的模块，并附带 `mapState/mapMutations/...` 辅助
 *
 * 设计说明：
 * - 不依赖 lodash，使用原生 JS 实现
 * - 不引入 vuex-class（Vue 3 已弃用装饰器），如需装饰器可自行基于 vuex-class 封装
 */
import { ActionTree, createNamespacedHelpers, Module, NamespacedMappers } from 'vuex';

/**
 * 判断是否为普通对象（非数组、非 null、原型为 Object.prototype）
 */
export function isPlainObject(value: unknown): value is Record<string, any> {
  if (value === null || typeof value !== 'object') return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

/**
 * 根据初始 state 自动生成一组标准 mutations：
 *
 * 对 state 中的每个 key，生成：
 *  - `{key}.set`     - 整体覆盖
 *  - `{key}.merge`   - 对象合并 / 非对象覆盖
 *  - `{key}.push`    - 数组 push（仅当值为数组）
 *  - `{key}.pop`     - 数组 pop
 *  - `{key}.shift`   - 数组 shift
 *  - `{key}.unshift` - 数组 unshift
 *  - `{key}.concat`  - 数组 concat
 *  - `{key}.splice`  - 数组 splice
 *
 * 生成的 mutations 与 `GetVuexHelperMutations<State>` 类型完全对应，
 * 因此 `commit('module/key.set', value)` 时 payload 类型能被正确推导。
 */
export function createMutations<S extends Record<string, any>>(initialState: S) {
  const mutations: Record<string, (state: S, value: any) => void> = {};

  (Object.keys(initialState) as Array<keyof S>).forEach((key) => {
    mutations[`${String(key)}.set`] = (state, value) => {
      state[key] = value;
    };

    mutations[`${String(key)}.merge`] = (state, value) => {
      if (initialState[key] === null || isPlainObject(initialState[key])) {
        state[key] = Object.assign({}, state[key], value);
      } else {
        state[key] = value;
      }
    };

    ['concat', 'push', 'splice', 'pop', 'shift', 'unshift'].forEach((operate) => {
      mutations[`${String(key)}.${operate}`] = (state, value) => {
        if (operate === 'splice') {
          state[key].splice(...value);
        } else if (operate === 'concat') {
          // concat 不修改原数组，需要把结果赋回
          state[key] = state[key].concat(value);
        } else {
          state[key][operate](value);
        }
      };
    });
  });

  return mutations;
}

/**
 * createNamespacedStore 的返回类型
 */
export interface ICreateNamespacedStore<S, R> {
  (
    name: string,
    module: Module<S, R>
  ): {
    namespaced: boolean;
    state: S;
    getters: any;
    mutations: any;
  } & NamespacedMappers;
}

/**
 * 创建带命名空间的 Vuex 模块，并附带 `mapState/mapMutations/mapActions/mapGetters` 辅助。
 *
 * 用法：
 * ```ts
 * const myModule = createNamespacedStore<IMyState, IRootState>('myModule', {
 *   state: { count: 0 },
 *   mutations: { inc(state) { state.count += 1 } }
 * });
 *
 * // 导出可直接用于 Vuex modules 注册
 * export default myModule;
 *
 * // 在组件中使用
 * import { mapState, mapMutations } from './my-module';
 * export default {
 *   computed: mapState(['count']),
 *   methods: mapMutations(['inc'])
 * };
 * ```
 *
 * 注意：会自动调用 `createMutations(initialState)` 生成标准 mutations，
 * 用户自定义的 mutations 会覆盖自动生成的（通过 spread 合并）。
 */
export function createNamespacedStore<S, R>(
  name: string,
  { state: initialState, mutations = {}, actions = {}, getters = {} }: Module<S, R>
) {
  const { mapMutations, mapState, mapActions, mapGetters } = createNamespacedHelpers(name);
  const autoMutations = createMutations(initialState as Record<string, any>);
  const mergedMutations = {
    ...autoMutations,
    ...mutations
  };

  return {
    namespaced: true,
    state: initialState as S,
    getters,
    actions: actions as ActionTree<S, R>,
    mutations: mergedMutations,
    mapState,
    mapMutations,
    mapGetters,
    mapActions
  };
}
