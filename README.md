# vuex-typed-store

**强类型 Vuex Store 封装**：递归推导嵌套模块的 state / mutations / actions / getters 路径字符串与 payload 类型。

从 [fs-base-web-electron](https://git.sf-express.com/) 项目的 `utils/vuex-tools.ts` 抽离而来，保留完整 API 的同时，剥离了 Electron 业务耦合，可作为任何 Vue 2 + Vuex 3 项目的通用基础库。

---

## ✨ 功能特性

| 特性 | 说明 |
|------|------|
| 🎯 路径字符串推导 | `commit('account/setToken', ...)` 中 `'account/setToken'` 是字面量类型，不是 `string` |
| 🔁 递归嵌套 | 多层模块（如 `a/b/c/mutation`）自动拼接前缀 |
| 💯 Payload 校验 | `commit / dispatch` 的 payload 类型随 mutation / action 自动推导 |
| 🧠 Action 返回值推导 | `dispatch('user/login', ...)` 的返回值自动推导为 `Promise<{success: boolean}>` |
| 🧩 懒加载友好 | `IRootSubModules` 用可选字段描述懒加载模块，类型照样完整推导 |
| 🔧 Helper mutations | 配合 `createMutations(state)` 自动生成 `key.set / key.merge / key.push …` 的强类型版本 |
| 🏭 模块创建辅助 | `createNamespacedStore(name, module)` 一站式生成模块 + `mapState / mapMutations / mapActions / mapGetters` |
| 🛡️ 错误调用拒绝 | 写错 mutation 路径、传错 payload 类型、缺字段时 TS 编译报错 |
| 📦 零运行时依赖 | 仅 peer 依赖 `vue ^2.6` 与 `vuex ^3.x` |

---

## 📦 安装

```bash
npm install vuex-typed-store
# 或
yarn add vuex-typed-store
```

> 需要 `peerDependencies`：`vue ^2.6.x`、`vuex ^3.x`

---

## 🚀 快速开始

### 1. 定义模块

```ts
// modules/account.ts
export const accountState = {
  userId: '',
  token: ''
};

export const accountMutations = {
  setToken(state: typeof accountState, token: string) {
    state.token = token;
  }
};

export const accountActions = {
  async login(context: any, payload: { userId: string; password: string }) {
    context.commit('setToken', 'fake-token');
    return { success: true };
  }
};

export const accountModuleDefinitions = {
  state: accountState,
  mutations: accountMutations,
  actions: accountActions,
  getters: {}
};
```

### 2. 声明根级 SubModules 并实例化

```ts
// store/index.ts
import Vue from 'vue';
import Vuex, { StoreOptions } from 'vuex';
import { Store, GetModuleMutations, GetModuleActions } from 'vuex-typed-store';
import { accountModuleDefinitions } from './modules/account';

Vue.use(Vuex);

// 懒加载模块声明（可选字段 → 懒加载友好）
type IRootSubModules = {
  account?: typeof accountModuleDefinitions;
};

// 根级 mutations（可选）
const storeMutations = { ping(state: any) { /* ... */ } };
type IRootMutationsDefinitions = typeof storeMutations;

// 类型推导
type IRootMutations = GetModuleMutations<IRootMutationsDefinitions, undefined, IRootSubModules>;
type IRootActions   = GetModuleActions<undefined, IRootSubModules>;

// 创建实例
export const store = new Store<
  undefined,                  // State
  IRootMutationsDefinitions,  // Mutations
  undefined,                  // Actions
  undefined,                  // Getters
  IRootSubModules             // SubModules
>({
  state: {},
  mutations: storeMutations,
  modules: {}
});
```

### 3. 类型安全地使用

```ts
// ✅ payload 自动推导为 string
store.commit('account/setToken', 'abc');

// ❌ TS 报错：期望 string，实际为 number
store.commit('account/setToken', 123);

// ✅ 返回值推导为 Promise<{ success: boolean }>
store.dispatch('account/login', { userId: 'u1', password: 'p1' })
  .then(res => console.log(res.success));

// ❌ TS 报错：payload 缺少 password
store.dispatch('account/login', { userId: 'u1' });

// ✅ state 访问有完整类型
console.log(store.state.account?.token);
```

---

## 📘 API 文档

### 类：`Store`

```ts
class Store<
  StateDefinitions,
  MutationDefinitions,
  ActionDefinitions,
  GetterDefinitions,
  SubModuleDefinitions = undefined,
  State = GetModuleState<...>,
  Mutations = GetModuleMutations<...>,
  Actions = GetModuleActions<...>,
  Getters = GetModuleGetters<...>
>
```

> 通常只需要传前 5 个泛型参数，后 4 个会自动推导。

#### 构造参数

| 参数 | 类型 | 说明 |
|------|------|------|
| `options` | `StoreOptions<T>` | 标准 Vuex `StoreOptions`，类型透传到内部实例 |

#### 实例方法

| 方法 | 类型签名 | 说明 |
|------|---------|------|
| `commit(type, payload?, options?)` | 强类型 | 触发 mutation，`type` 是带路径的字面量 |
| `dispatch(type, payload?, options?)` | 强类型 | 触发 action，返回值自动包裹 Promise |
| `subscribe(fn, options?)` | `(mutation, state) => any` | 订阅 mutation |
| `subscribeAction(fn, options?)` | `SubscribeActionOptions` | 订阅 action |
| `watch(getter, cb, options?)` | Vue WatchOptions | 监听 state 变化 |
| `registerModule(path, module, options?)` | 标准 Vuex | 懒加载注册模块 |
| `unregisterModule(path)` | 标准 Vuex | 卸载模块 |
| `hasModule(path)` | 标准 Vuex | 判断模块是否已注册 |
| `replaceState(state)` | 标准 Vuex | 替换整个 state |
| `hotUpdate(options)` | 标准 Vuex | 热更新 |
| `getModuleFromType(type)` | `(type: string) => string` | 从 `'a/b/mut'` 中抽取 `'a/b'` |
| `setOptions(options)` | `(options) => void` | 运行时更新 store 配置 |

#### 实例属性（getter）

| 属性 | 类型 | 说明 |
|------|------|------|
| `state` | `State` | 根 state |
| `getters` | `Getters` | 所有 getters（含模块前缀） |
| `strict` | `boolean` | Vuex strict 模式 |
| `storeInstance` | `VuexStore<State>` | 内部原始 Vuex 实例 |
| `id` | `number` | 全局递增 ID |

---

### 类型工具

#### `GetModuleState<State, SubModules?>`

递归收集模块 state，含子模块。

```ts
type Root = GetModuleState<undefined, IRootSubModules>;
// => { account: {...}; setting: {...} }
```

#### `GetModuleMutations<Mutations, State?, SubModules?>`

递归收集 mutations，自动拼接路径前缀。  
**包含 helper 自动生成的 `key.set / key.merge / key.push …`**。

```ts
type Root = GetModuleMutations<IRootMutationsDefinitions, undefined, IRootSubModules>;
// => {
//   ping: () => void;                       // 根级
//   'account/setToken': (token: string) => void;
//   'account/login.set': (v: string) => void;  // helper 生成
//   ...
// }
```

#### `GetModuleActions<Actions, SubModules?>`

递归收集 actions，自动拼接路径前缀。

```ts
type Root = GetModuleActions<undefined, IRootSubModules>;
// => {
//   'account/login': (payload: { userId: string; password: string }) => Promise<{success: boolean}>;
//   ...
// }
```

#### `GetModuleGetters<Getters, SubModules?>`

递归收集 getters，保留返回值类型。

```ts
type Root = GetModuleGetters<undefined, IRootSubModules>;
// => {
//   'setting/isDarkMode': boolean;
//   'setting/displayFontSize': string;
//   ...
// }
```

#### `GetModuleActionContext<State, Mutations, Actions, Getters, RootState, RootMutations, RootActions, RootGetters>`

**给 action 内部使用的 context 类型**，支持：
- 本地 `commit / dispatch`（自动加当前模块前缀）
- `commit(type, payload, { root: true })` 调用根 mutation
- `dispatch(type, payload, { root: true })` 调用根 action
- 访问 `state / getters / rootState / rootGetters`

```ts
type IAccountActionContext = GetModuleActionContext<
  IAccountState,
  IAccountMutations,
  IAccountActions,
  any,          // 本模块 getters
  IRootState,   // rootState
  IRootMutations,
  IRootActions,
  any           // rootGetters
>;

const myAction = (ctx: IAccountActionContext) => {
  ctx.commit('setToken', 'abc');              // 本地 mutation
  ctx.commit('ping', undefined, { root: true }); // 根 mutation
};
```

---

## 🏭 模块创建辅助

### `createMutations(state)`

根据 state 自动生成一组标准 mutations：`{key}.set / {key}.merge / {key}.push / {key}.pop / {key}.shift / {key}.unshift / {key}.concat / {key}.splice`。

生成的 mutations 与 `GetVuexHelperMutations<State>` 类型**完全对应**，因此 `commit('module/key.set', value)` 时 payload 类型会被正确推导。

```ts
import { createMutations } from 'vuex-typed-store';

const state = {
  name: '',
  list: [] as number[],
  profile: { age: 18 }
};

const mutations = createMutations(state);
// 自动生成：
// 'name.set'       (value: string) => void
// 'name.merge'     (value: Partial<string>) => void
// 'list.set'       (value: number[]) => void
// 'list.push'      (value: number) => void
// 'list.pop'       () => void
// 'list.concat'    (value: number | number[]) => void
// 'list.splice'    (value: [start, deleteCount, ...items]) => void
// 'profile.set'    (value: { age: number }) => void
// 'profile.merge'  (value: Partial<{ age: number }>) => void
// ... 共 24 个 mutations（3 字段 × 8 种操作）
```

### `createNamespacedStore(name, module)`

一站式创建带命名空间的模块，并附带 `mapState / mapMutations / mapActions / mapGetters` 辅助。

内部自动调用 `createMutations` 生成标准 mutations，用户自定义的 mutations 通过 spread 合并（**自定义优先**）。

```ts
import { createNamespacedStore } from 'vuex-typed-store';

const userState = {
  name: '',
  permissions: [] as string[]
};

const userMutations = {
  // 自定义：覆盖自动生成版本（比如 trim）
  'name.set'(state: typeof userState, name: string) {
    state.name = name.trim();
  }
};

const userActions = {
  async initUser({ commit }: any) {
    commit('permissions.push', 'default'); // 自动生成的 push
    commit('name.set', 'Alice');           // 自定义的 set
  }
};

const userModule = createNamespacedStore<typeof userState, IRootState>('user', {
  state: userState,
  mutations: userMutations,
  actions: userActions
});

// 返回值包含：
// - namespaced: true
// - state / getters / mutations / actions（mutations 已自动合并）
// - mapState / mapMutations / mapActions / mapGetters（可直接在组件中使用）

// 在 Vuex modules 中注册
store.registerModule(['user'], {
  namespaced: userModule.namespaced,
  state: userModule.state,
  mutations: userModule.mutations,
  actions: userModule.actions
});

// 在 Vue 组件中使用
export default {
  computed: userModule.mapState(['name', 'permissions']),
  methods: userModule.mapMutations({ setName: 'name.set' })
};
```

---

## 📖 完整业务示例

参考真实项目中的 `access-history` 模块，演示完整的定义、类型推导、错误拒绝流程。

### 1. 定义模块

```ts
// modules/access-history.ts
import { createNamespacedStore } from 'vuex-typed-store';

export interface AccessHistory {
  id: string;
  title: string;
  updateTime: number;
}

export const accessHistoryState = {
  accessHistories: [] as AccessHistory[]
};

// 自定义 mutations（会覆盖自动生成的）
export const accessHistoryMutations = {
  reSort(state: typeof accessHistoryState) {
    state.accessHistories.sort((a, b) => b.updateTime - a.updateTime);
  }
};

export const accessHistoryActions = {
  async addHistory({ commit }: any, item: AccessHistory) {
    commit('accessHistories.push', item);  // ← 自动生成的 push
    commit('reSort');                       // ← 自定义 mutation
  },
  async clearAll({ commit }: any) {
    commit('accessHistories.set', []);      // ← 自动生成的 set
  }
};

export const accessHistoryModule = createNamespacedStore<
  typeof accessHistoryState,
  IRootState
>('accessHistory', {
  state: accessHistoryState,
  mutations: accessHistoryMutations,
  actions: accessHistoryActions
});
```

### 2. 组装到根 store

```ts
// store/index.ts
import {
  Store,
  GetModuleMutations,
  GetModuleActions,
  GetModuleState
} from 'vuex-typed-store';
import { accessHistoryModule } from './modules/access-history';

// 懒加载模块声明（可选字段 → 类型照样完整推导）
type IRootSubModules = {
  accessHistory?: typeof accessHistoryModule;
};

// 推导根级类型
type IRootMutations = GetModuleMutations<undefined, undefined, IRootSubModules>;
type IRootActions   = GetModuleActions<undefined, IRootSubModules>;
type IRootState     = GetModuleState<undefined, IRootSubModules>;

// 创建强类型 Store
export const store = new Store<
  undefined,
  undefined,
  undefined,
  undefined,
  IRootSubModules
>({ state: {}, modules: {} });
```

### 3. 类型校验演示

```ts
// ✅ 正确调用
store.commit('accessHistory/reSort', undefined);
store.commit('accessHistory/accessHistories.push', {
  id: '1',
  title: 'Hello',
  updateTime: Date.now()
});
store.dispatch('accessHistory/addHistory', {
  id: '1',
  title: 'Hello',
  updateTime: Date.now()
});

// ❌ TS 报错：不存在的 mutation
store.commit('accessHistory/nonExistent');

// ❌ TS 报错：payload 类型错误（期望 AccessHistory，传了 string）
store.commit('accessHistory/accessHistories.push', 'not-an-object');

// ❌ TS 报错：action payload 缺字段（缺 title 和 updateTime）
store.dispatch('accessHistory/addHistory', { id: '1' });

// ✅ state 访问有完整类型
const histories: AccessHistory[] = store.state.accessHistory?.accessHistories ?? [];
```

---

## 🧠 类型推导原理

### 路径字符串拼接

利用 TS 4.1+ 的模板字面量类型：

```ts
type GetModuleName<Prefix, Separator, Property> =
  Prefix extends ''
    ? `${Property}`
    : `${Prefix}${Separator}${Property}`;

// GetModuleName<'account', '/', 'setToken'>  → 'account/setToken'
// GetModuleName<'', '/', 'setToken'>         → 'setToken'
```

### 递归嵌套

`GetModuleMutations` 通过 `UnionToIntersection` + 递归 `GetSubModuleMutations` 把树形模块扁平化成带路径的交叉类型：

```ts
type Mutations =
  & GetRestMaps<'', RootMutations>                          // 根级
  & UnionToIntersection<GetSubModuleMutations<SubModules>>  // 子模块扁平化
```

### Helper mutations 自动推导

`GetVuexHelperMutations<State>` 从 state 的字段名推导 `key.set / key.merge / key.push …` 的签名：

```ts
type M = GetVuexHelperMutations<{ token: string; list: number[] }>;
// {
//   'token.set':   (data: string) => void;
//   'token.merge': (data: Partial<string>) => void;
//   'list.push':   (data: number) => void;
//   'list.pop':    () => void;
//   ...
// }
```

---

## 🔌 进阶用法

### 懒加载模块

`IRootSubModules` 用**可选字段**声明，类型推导照常工作：

```ts
type IRootSubModules = {
  account?: typeof accountModuleDefinitions;   // 懒加载
  setting?: typeof settingModuleDefinitions;
};

// registerModule 时类型照样校验
store.registerModule(['account'], { /* ... */ });
```

### Action 内部的 context

用 `GetModuleActionContext` 给 action 的 context 强类型化：

```ts
const login: ActionHandler<IAccountState, IRootState> = async (ctx, payload) => {
  // ctx 的类型用 GetModuleActionContext 推导
};
```

---

## 🔄 迁移指南

从 `utils/vuex-tools.ts` 迁移到新库只需改一处：

```diff
- import { Store, GetModuleMutations, ... } from 'utils/vuex-tools';
+ import { Store, GetModuleMutations, ... } from 'vuex-typed-store';
```

**API 完全兼容，无需修改业务代码。**

### 与原 `vuex-tools.ts` 的差异

| 项目 | 原 `vuex-tools.ts` | `vuex-typed-store` |
|------|-------------------|-------------------|
| 依赖 | 绑定项目内部 `typings/util` | 自包含所有工具类型，无 lodash 依赖 |
| Helper | 依赖 `utils/vuex-helper` | 自包含 `GetVuexHelperMutations` + `createMutations` + `createNamespacedStore` |
| 模块创建辅助 | `createMutations / createNamespacedStore / namespaceDecorator` | 包含前两项；装饰器（`namespaceDecorator`）不含，因 Vue 3 已弃用装饰器 |
| `.concat` 行为 | 不修改原数组（bug） | 自动赋回，行为正确 |
| `@ts-ignore` | 有（访问 Vuex 私有属性） | 改用 `any` 断言，更清晰 |

---

## 📁 目录结构

```
vuex-typed-store/
├── src/
│   ├── index.ts              # 主入口（统一导出）
│   ├── types.ts              # 基础工具类型
│   ├── helper.ts             # GetVuexHelperMutations 类型
│   ├── store.ts              # Store 类 + 递归类型
│   └── module-helpers.ts     # createMutations / createNamespacedStore
├── test/
│   ├── store.test.ts         # Store 类运行时测试（22 用例）
│   ├── module-helpers.test.ts # 模块辅助运行时测试（23 用例）
│   └── types.test-d.ts       # 类型测试（42 用例）
├── examples/
│   ├── demo.ts               # 完整使用示例
│   └── migration.ts          # 迁移对照
├── package.json
├── tsconfig.json
├── vitest.config.ts
└── README.md
```

---

## 📄 License

MIT
