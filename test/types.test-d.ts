/**
 * 类型层面测试
 *
 * 验证 GetModule* 系列类型、Store 泛型、ActionContext 等的类型推导正确性。
 *
 * 使用 vitest 的 expectTypeOf + assertType，以及 @ts-expect-error 负向验证。
 */
import Vue from 'vue';
import Vuex from 'vuex';
import { describe, it, expectTypeOf, assertType } from 'vitest';
import {
  GetModuleName,
  GetModuleState,
  GetModuleMutations,
  GetModuleActions,
  GetModuleGetters,
  GetModuleActionContext,
  GetRestFuncType,
  GetPayLoad,
  GetParam,
  GetRestMaps,
  GetGetterReturnType,
  GetVuexHelperStateMutations,
  GetTypeOfKey,
  Store
} from '../src/store';
import { IsNonKeyOf, UnionToIntersection, FlattenedPromise, RequiredProps, getProperty } from '../src/types';
import { GetVuexHelperMutations } from '../src/helper';

Vue.use(Vuex);

/* ============================================================================
 * 测试用模块定义
 * ==========================================================================*/

const accountState = {
  userId: '',
  token: '',
  permissions: [] as string[]
};

const accountMutations = {
  setToken(state: typeof accountState, token: string) {
    state.token = token;
  },
  logout(state: typeof accountState) {
    state.token = '';
  }
};

const accountActions = {
  async login(_ctx: any, payload: { userId: string; password: string }) {
    return { success: true as const, token: 'fake' };
  },
  async refresh(_ctx: any) {
    return { ok: true as const };
  }
};

const accountGetters = {
  hasToken: (state: typeof accountState) => state.token !== '',
  tokenLength: (state: typeof accountState) => state.token.length
};

const accountModule = {
  state: accountState,
  mutations: accountMutations,
  actions: accountActions,
  getters: accountGetters
};

const settingState = { theme: 'light' as 'light' | 'dark' };
const settingMutations = {
  setTheme(state: typeof settingState, theme: 'light' | 'dark') {
    state.theme = theme;
  }
};
const settingModule = { state: settingState, mutations: settingMutations };

type IRootSubModules = {
  account?: typeof accountModule;
  setting?: typeof settingModule;
};

const rootMutations = {
  ping() {}
};

/* ============================================================================
 * 工具类型基础
 * ==========================================================================*/

describe('utility types', () => {
  it('IsNonKeyOf 判断空对象', () => {
    assertType<IsNonKeyOf<undefined>>(true as any);
    assertType<IsNonKeyOf<{}>>(true as any);
    assertType<IsNonKeyOf<{ a: 1 }>>(false as any);
  });

  it('UnionToIntersection 联合转交叉', () => {
    type R = UnionToIntersection<{ a: 1 } | { b: 2 }>;
    expectTypeOf<R>().toEqualTypeOf<{ a: 1 } & { b: 2 }>();
  });

  it('GetRestFuncType 移除函数第一个参数', () => {
    type F1 = GetRestFuncType<(ctx: any, a: string, b: number) => boolean>;
    expectTypeOf<F1>().toEqualTypeOf<(a: string, b: number) => boolean>();

    type F2 = GetRestFuncType<(ctx: any) => void>;
    expectTypeOf<F2>().toEqualTypeOf<() => void>();
  });
});

/* ============================================================================
 * GetModuleName 路径拼接
 * ==========================================================================*/

describe('GetModuleName', () => {
  it('空 prefix 直接返回 property', () => {
    type R = GetModuleName<'', '/', 'setToken'>;
    expectTypeOf<R>().toEqualTypeOf<'setToken'>();
  });

  it('有 prefix 拼接 separator + property', () => {
    type R = GetModuleName<'account', '/', 'setToken'>;
    expectTypeOf<R>().toEqualTypeOf<'account/setToken'>();
  });

  it('嵌套 prefix', () => {
    type R = GetModuleName<'a/b', '/', 'mut'>;
    expectTypeOf<R>().toEqualTypeOf<'a/b/mut'>();
  });
});

/* ============================================================================
 * GetModuleState 推导
 * ==========================================================================*/

describe('GetModuleState', () => {
  it('单模块 state', () => {
    type R = GetModuleState<typeof accountState>;
    expectTypeOf<R>().toEqualTypeOf<typeof accountState>();
  });

  it('嵌套子模块 state', () => {
    type R = GetModuleState<undefined, IRootSubModules>;
    expectTypeOf<R>().toMatchTypeOf<{
      account?: typeof accountState;
      setting?: typeof settingState;
    }>();
  });
});

/* ============================================================================
 * GetModuleMutations 推导
 * ==========================================================================*/

describe('GetModuleMutations', () => {
  it('单模块 mutations 带路径', () => {
    type R = GetModuleMutations<typeof accountMutations, typeof accountState>;
    expectTypeOf<R>().toMatchTypeOf<{
      'account/setToken'?: (token: string) => void;
    }>();
  });

  it('空 prefix 不带路径', () => {
    type R = GetModuleMutations<typeof accountMutations, typeof accountState, undefined, ''>;
    expectTypeOf<R>().toMatchTypeOf<{
      setToken?: (token: string) => void;
    }>();
  });

  it('嵌套子模块 mutations', () => {
    type R = GetModuleMutations<typeof rootMutations, undefined, IRootSubModules>;
    expectTypeOf<R>().toMatchTypeOf<{
      ping?: () => void;
      'account/setToken'?: (token: string) => void;
      'account/logout'?: () => void;
      'setting/setTheme'?: (theme: 'light' | 'dark') => void;
    }>();
  });
});

/* ============================================================================
 * GetVuexHelperMutations 自动推导
 * ==========================================================================*/

describe('GetVuexHelperMutations', () => {
  it('生成 set / merge / push / pop 等 mutations', () => {
    type R = GetVuexHelperMutations<typeof accountState>;
    expectTypeOf<R>().toMatchTypeOf<{
      'userId.set': (v: string) => void;
      'userId.merge': (v: Partial<string>) => void;
      'permissions.push': (v: string) => void;
      'permissions.pop': () => void;
    }>();
  });

  it('undefined 输入返回空对象', () => {
    type R = GetVuexHelperMutations<undefined>;
    expectTypeOf<R>().toEqualTypeOf<{}>();
  });
});

/* ============================================================================
 * GetModuleActions 推导
 * ==========================================================================*/

describe('GetModuleActions', () => {
  it('单模块 actions 带路径', () => {
    type R = GetModuleActions<typeof accountActions, undefined, 'account'>;
    expectTypeOf<R>().toMatchTypeOf<{
      'account/login': (payload: { userId: string; password: string }) => any;
    }>();
  });

  it('嵌套子模块 actions', () => {
    type R = GetModuleActions<undefined, IRootSubModules>;
    expectTypeOf<R>().toMatchTypeOf<{
      'account/login'?: (payload: { userId: string; password: string }) => any;
    }>();
  });
});

/* ============================================================================
 * GetModuleGetters 推导
 * ==========================================================================*/

describe('GetModuleGetters', () => {
  it('保留返回值类型', () => {
    type R = GetModuleGetters<typeof accountGetters, undefined, 'account'>;
    expectTypeOf<R>().toMatchTypeOf<{
      'account/hasToken': boolean;
      'account/tokenLength': number;
    }>();
  });
});

/* ============================================================================
 * GetPayLoad 推导
 * ==========================================================================*/

describe('GetPayLoad', () => {
  it('取 mutation 第一个业务参数', () => {
    type Mut = { setToken: (state: any, token: string) => void };
    type R = GetPayLoad<Mut, 'setToken'>;
    expectTypeOf<R>().toEqualTypeOf<string>();
  });

  it('无参数 mutation 返回 undefined', () => {
    type Mut = { logout: (state: any) => void };
    type R = GetPayLoad<Mut, 'logout'>;
    expectTypeOf<R>().toEqualTypeOf<undefined>();
  });
});

/* ============================================================================
 * GetModuleActionContext 推导
 * ==========================================================================*/

describe('GetModuleActionContext', () => {
  type LocalMut = { setToken: (token: string) => void };
  type RootMut = { ping: () => void };
  type LocalAct = { refresh: () => Promise<{ ok: true }> };
  type RootAct = { globalReset: () => Promise<void> };
  type Ctx = GetModuleActionContext<
    typeof accountState,
    LocalMut,
    LocalAct,
    any,
    any,
    RootMut,
    RootAct,
    any
  >;

  it('commit 本地 mutation payload 正确', () => {
    type CommitFn = Ctx['commit'];
    expectTypeOf<CommitFn>().toBeCallableWith('setToken', 'abc');
  });

  it('commit root: true 调用根 mutation', () => {
    type CommitFn = Ctx['commit'];
    expectTypeOf<CommitFn>().toBeCallableWith('ping', undefined, { root: true });
  });

  it('dispatch 本地 action 返回 Promise', () => {
    type DispatchFn = Ctx['dispatch'];
    // @ts-expect-error - refresh 不接受参数
    expectTypeOf<DispatchFn>().returns.toEqualTypeOf<Promise<{ ok: true }>>();
  });

  it('state / rootState 类型正确', () => {
    expectTypeOf<Ctx['state']>().toEqualTypeOf<typeof accountState>();
  });
});

/* ============================================================================
 * Store 实例类型
 * ==========================================================================*/

describe('Store instance types', () => {
  type Mutations = {
    'account/setToken': (token: string) => void;
    'setting/setTheme': (theme: 'light' | 'dark') => void;
  };
  type Actions = {
    'account/login': (payload: { userId: string; password: string }) => Promise<{ success: true }>;
  };
  type TestStore = Store<undefined, Mutations, Actions, undefined, undefined>;

  // 创建一个真实但空的实例用于类型测试
  const store: TestStore = new Store<undefined, Mutations, Actions, undefined, undefined>({ state: {} });

  it('commit 强类型 payload', () => {
    expectTypeOf(store.commit).toBeCallableWith('account/setToken', 'abc');
    expectTypeOf(store.commit).toBeCallableWith('setting/setTheme', 'dark');
  });

  it('dispatch 返回值自动包裹 Promise', () => {
    // 用 expectTypeOf 直接验证 dispatch 的返回类型（不实际调用）
    expectTypeOf(store.dispatch).returns.toEqualTypeOf<Promise<{ success: true }>>();
  });

  it('state / getters 有正确类型', () => {
    // 验证类型存在且不为 never/undefined
    expectTypeOf(store.state).not.toBeNever();
    expectTypeOf(store.getters).not.toBeNever();
  });

  it('storeInstance 是 readonly', () => {
    expectTypeOf(store.storeInstance).not.toBeNever();
    // @ts-expect-error - readonly 不允许赋值
    store.storeInstance = null;
  });
});

/* ============================================================================
 * 懒加载场景：SubModules 用可选字段
 * ==========================================================================*/

describe('lazy-loaded submodules', () => {
  type RootMutations = GetModuleMutations<typeof rootMutations, undefined, IRootSubModules>;
  type RootActions = GetModuleActions<undefined, IRootSubModules>;

  it('mutations 路径推导正确', () => {
    expectTypeOf<RootMutations>().toMatchTypeOf<{
      'account/setToken'?: (token: string) => void;
      'setting/setTheme'?: (theme: 'light' | 'dark') => void;
    }>();
  });

  it('actions 路径推导正确', () => {
    expectTypeOf<RootActions>().toMatchTypeOf<{
      'account/login'?: (payload: { userId: string; password: string }) => any;
    }>();
  });
});

/* ============================================================================
 * createMutations 生成的 mutations 与 GetVuexHelperMutations 类型对应
 * ==========================================================================*/

describe('createMutations type mapping', () => {
  it('生成的 mutations 名字与 GetVuexHelperMutations 完全一致', () => {
    interface S {
      name: string;
      list: number[];
      profile: { age: number };
    }
    type Expected = GetVuexHelperMutations<S>;

    // set / merge 对所有字段都存在
    expectTypeOf<Expected>().toMatchTypeOf<{
      'name.set': (v: string) => void;
      'name.merge': (v: Partial<string>) => void;
      'list.set': (v: number[]) => void;
      'list.merge': (v: Partial<number[]>) => void;
      'profile.set': (v: { age: number }) => void;
      'profile.merge': (v: Partial<{ age: number }>) => void;
    }>();

    // 数组字段额外有 push/pop/shift/unshift/concat/splice
    expectTypeOf<Expected>().toMatchTypeOf<{
      'list.push': (v: number) => void;
      'list.pop': () => void;
      'list.shift': () => void;
      'list.unshift': (v: number) => void;
      'list.concat': (v: number | number[]) => void;
      'list.splice': (v: [start: number, deleteCount: number, ...items: number[]]) => void;
    }>();

    // 非数组字段这些方法的类型为 never
    expectTypeOf<Expected['name.push']>().toBeNever();
    expectTypeOf<Expected['profile.pop']>().toBeNever();
  });
});

/* ============================================================================
 * 参考 access-history 真实结构的完整类型校验
 *
 * 结构：
 *   state: { accessHistories: AccessHistory[] }
 *   mutations: { reSort } + 自动生成的 accessHistories.push/set/…
 *   actions: { addHistory, clearAll }
 * ==========================================================================*/

describe('access-history style module - type validation', () => {
  interface AccessHistory {
    id: string;
    title: string;
    updateTime: number;
  }

  const accessHistoryState = {
    accessHistories: [] as AccessHistory[]
  };

  const accessHistoryMutations = {
    reSort(state: typeof accessHistoryState) {
      state.accessHistories.sort((a, b) => b.updateTime - a.updateTime);
    }
  };

  const accessHistoryActions = {
    async addHistory(_ctx: any, item: AccessHistory) {
      return item;
    },
    async clearAll() {}
  };

  const accessHistoryModule = {
    state: accessHistoryState,
    mutations: accessHistoryMutations,
    actions: accessHistoryActions
  };

  type IRootSubModules = {
    accessHistory?: typeof accessHistoryModule;
  };

  // 推导出的完整类型
  type IAccessHistoryState = GetModuleState<typeof accessHistoryState>;
  type IAccessHistoryMutations = GetModuleMutations<
    typeof accessHistoryMutations,
    typeof accessHistoryState
  >;
  type IAccessHistoryActions = GetModuleActions<typeof accessHistoryActions>;
  type IRootMutations = GetModuleMutations<undefined, undefined, IRootSubModules>;
  type IRootActions = GetModuleActions<undefined, IRootSubModules>;

  it('state 类型推导正确', () => {
    expectTypeOf<IAccessHistoryState>().toEqualTypeOf<{
      accessHistories: AccessHistory[];
    }>();
  });

  it('本地 mutations 包含 reSort + 自动生成的 accessHistories.*', () => {
    expectTypeOf<IAccessHistoryMutations>().toMatchTypeOf<{
      reSort?: () => void;
      'accessHistories.set'?: (v: AccessHistory[]) => void;
      'accessHistories.push'?: (v: AccessHistory) => void;
      'accessHistories.pop'?: () => void;
    }>();
  });

  it('根 mutations 带路径前缀', () => {
    expectTypeOf<IRootMutations>().toMatchTypeOf<{
      'accessHistory/reSort'?: () => void;
      'accessHistory/accessHistories.push'?: (v: AccessHistory) => void;
    }>();
  });

  it('根 actions 带路径前缀', () => {
    expectTypeOf<IRootActions>().toMatchTypeOf<{
      'accessHistory/addHistory'?: (item: AccessHistory) => any;
      'accessHistory/clearAll'?: () => any;
    }>();
  });

  it('Store 实例的 commit 类型校验', () => {
    type TestStore = Store<undefined, IRootMutations, IRootActions, undefined, IRootSubModules>;
    const store: TestStore = new Store<undefined, IRootMutations, IRootActions, undefined, IRootSubModules>({
      state: {},
      modules: {}
    });

    // ✅ 正确调用
    expectTypeOf(store.commit).toBeCallableWith('accessHistory/reSort', undefined);
    expectTypeOf(store.commit).toBeCallableWith(
      'accessHistory/accessHistories.push',
      { id: '1', title: 'x', updateTime: 100 }
    );

    // ✅ dispatch 正确调用
    expectTypeOf(store.dispatch).toBeCallableWith('accessHistory/addHistory', {
      id: '1',
      title: 'x',
      updateTime: 100
    });
  });

  it('Store 实例的 commit/dispatch 拒绝错误调用', () => {
    type TestStore = Store<undefined, IRootMutations, IRootActions, undefined, IRootSubModules>;
    const store: TestStore = new Store<undefined, IRootMutations, IRootActions, undefined, IRootSubModules>({
      state: {},
      modules: {}
    });

    // ❌ 不存在的 mutation
    // @ts-expect-error
    store.commit('accessHistory/nonExistent');

    // ❌ mutation payload 类型错误（期望 AccessHistory，传了 string）
    // @ts-expect-error
    store.commit('accessHistory/accessHistories.push', 'not-an-object');

    // ❌ 不存在的 action
    // @ts-expect-error
    store.dispatch('accessHistory/nonExistent');

    // ❌ action payload 类型错误
    // @ts-expect-error
    store.dispatch('accessHistory/addHistory', { id: '1' }); // 缺 title / updateTime
  });

  it('state 访问带完整类型', () => {
    type TestStore = Store<undefined, IRootMutations, IRootActions, undefined, IRootSubModules>;
    const store: TestStore = new Store<undefined, IRootMutations, IRootActions, undefined, IRootSubModules>({
      state: {},
      modules: {}
    });

    // 整体 state 类型正确
    expectTypeOf(store.state).toMatchTypeOf<{
      accessHistory?: {
        accessHistories: AccessHistory[];
      };
    }>();

    // 用类型层面访问内部字段（不触发运行时）
    type AccessHistoryArrayType = NonNullable<typeof store.state.accessHistory>['accessHistories'];
    expectTypeOf<AccessHistoryArrayType>().toEqualTypeOf<AccessHistory[]>();
  });
});

/* ============================================================================
 * dispatch 返回值类型推导
 * ==========================================================================*/

describe('dispatch return type inference', () => {
  const actions = {
    async fetchUser() {
      return { id: 'u1', name: 'Alice' };
    },
    async fetchList() {
      return [1, 2, 3] as number[];
    },
    syncAction() {
      return 42;
    }
  };

  type Acts = typeof actions;
  type ActStore = Store<undefined, undefined, Acts, undefined, undefined>;
  const store: ActStore = new Store<undefined, undefined, Acts, undefined, undefined>({
    state: {},
    actions
  });

  it('async action 返回解包后的 Promise', () => {
    const r1 = store.dispatch('fetchUser');
    expectTypeOf(r1).toEqualTypeOf<Promise<{ id: string; name: string }>>();

    const r2 = store.dispatch('fetchList');
    expectTypeOf(r2).toEqualTypeOf<Promise<number[]>>();
  });

  it('同步 action 也被包裹为 Promise', () => {
    const r = store.dispatch('syncAction');
    expectTypeOf(r).toEqualTypeOf<Promise<number>>();
  });
});

/* ============================================================================
 * commit 的 payload 推导边界
 * ==========================================================================*/

describe('commit payload boundary cases', () => {
  const mutations = {
    noPayload(state: { x: number }) {
      state.x += 1;
    },
    optionalLike(state: { x: number }, v?: number) {
      state.x += v ?? 1;
    },
    withPayload(state: { x: number }, v: number) {
      state.x = v;
    },
    unionPayload(state: { x: number }, v: number | string) {
      state.x = typeof v === 'number' ? v : v.length;
    }
  };

  type Muts = typeof mutations;
  type MutStore = Store<undefined, Muts, undefined, undefined, undefined>;
  const store: MutStore = new Store<undefined, Muts, undefined, undefined, undefined>({
    state: { x: 0 },
    mutations
  });

  it('无参 mutation 不传 payload', () => {
    expectTypeOf(store.commit).toBeCallableWith('noPayload', undefined);
  });

  it('有参 mutation 必须传正确类型', () => {
    expectTypeOf(store.commit).toBeCallableWith('withPayload', 42);
  });

  it('联合类型 payload 接受联合中的任意一种', () => {
    expectTypeOf(store.commit).toBeCallableWith('unionPayload', 42);
    expectTypeOf(store.commit).toBeCallableWith('unionPayload', 'hello');
  });

  it('拒绝错误类型的 payload', () => {
    // @ts-expect-error - 期望 number，传 boolean
    store.commit('withPayload', true);
    // @ts-expect-error - 期望 number | string，传 object
    store.commit('unionPayload', {});
  });
});

/* ============================================================================
 * GetParam 参数提取
 * ==========================================================================*/

describe('GetParam', () => {
  it('无参函数返回 undefined', () => {
    type R = GetParam<() => void>;
    expectTypeOf<R>().toEqualTypeOf<undefined>();
  });

  it('单参函数返回参数类型', () => {
    type R = GetParam<(arg: string) => void>;
    expectTypeOf<R>().toEqualTypeOf<string>();
  });

  it('多参函数只取第一个参数', () => {
    type R = GetParam<(a: number, b: string) => boolean>;
    expectTypeOf<R>().toEqualTypeOf<number>();
  });

  it('对象类型参数', () => {
    type Payload = { userId: string; password: string };
    type R = GetParam<(arg: Payload) => Promise<void>>;
    expectTypeOf<R>().toEqualTypeOf<Payload>();
  });

  it('可选参数也正常提取', () => {
    type R = GetParam<(arg?: number) => void>;
    expectTypeOf<R>().toEqualTypeOf<number | undefined>();
  });

  it('非函数类型返回 any', () => {
    type R = GetParam<string>;
    expectTypeOf<R>().toEqualTypeOf<any>();
  });
});

/* ============================================================================
 * FlattenedPromise 展平
 * ==========================================================================*/

describe('FlattenedPromise', () => {
  it('Promise<T> 解包为 T', () => {
    type R = FlattenedPromise<Promise<string>>;
    expectTypeOf<R>().toEqualTypeOf<string>();
  });

  it('普通类型包裹为 Promise', () => {
    type R = FlattenedPromise<number>;
    expectTypeOf<R>().toEqualTypeOf<Promise<number>>();
  });

  it('嵌套 Promise 只解一层', () => {
    type R = FlattenedPromise<Promise<Promise<string>>>;
    expectTypeOf<R>().toEqualTypeOf<Promise<string>>();
  });

  it('unknown 类型返回 Promise<unknown>', () => {
    type R = FlattenedPromise<unknown>;
    expectTypeOf<R>().toEqualTypeOf<Promise<unknown>>();
  });

  it('void 类型包裹为 Promise<void>', () => {
    type R = FlattenedPromise<void>;
    expectTypeOf<R>().toEqualTypeOf<Promise<void>>();
  });
});

/* ============================================================================
 * RequiredProps 必填转换
 * ==========================================================================*/

describe('RequiredProps', () => {
  it('将指定可选属性变为必填', () => {
    type Source = { a?: string; b?: number; c: boolean };
    type R = RequiredProps<Source, 'a'>;
    expectTypeOf<R>().toMatchTypeOf<{ a: string; b?: number; c: boolean }>();
  });

  it('原来就是必填的不受影响', () => {
    type Source = { a: string; b: number };
    type R = RequiredProps<Source, 'a'>;
    expectTypeOf<R>().toMatchTypeOf<{ a: string; b: number }>();
  });

  it('多个 key 同时变必填', () => {
    type Source = { a?: string; b?: number; c?: boolean };
    type R = RequiredProps<Source, 'a' | 'b'>;
    expectTypeOf<R>().toMatchTypeOf<{ a: string; b: number; c?: boolean }>();
  });
});

/* ============================================================================
 * getProperty 安全取属性
 * ==========================================================================*/

describe('getProperty', () => {
  it('存在的 key 返回对应类型', () => {
    type R = getProperty<{ a: string; b: number }, 'a'>;
    expectTypeOf<R>().toEqualTypeOf<string>();
  });

  it('不存在的 key 返回 undefined', () => {
    type R = getProperty<{ a: string }, 'z'>;
    expectTypeOf<R>().toEqualTypeOf<undefined>();
  });
});

/* ============================================================================
 * GetTypeOfKey 过滤非函数
 * ==========================================================================*/

describe('GetTypeOfKey', () => {
  it('函数类型 key 正常返回', () => {
    type R = GetTypeOfKey<{ fn: (data: string) => void }, 'fn'>;
    expectTypeOf<R>().toEqualTypeOf<(data: string) => void>();
  });

  it('非函数类型 key 返回 never', () => {
    type R = GetTypeOfKey<{ val: string }, 'val'>;
    expectTypeOf<R>().toBeNever();
  });
});

/* ============================================================================
 * GetRestMaps 路径映射
 * ==========================================================================*/

describe('GetRestMaps', () => {
  it('映射为带路径前缀的函数', () => {
    type Fns = { login: (ctx: any, payload: string) => Promise<void> };
    type R = GetRestMaps<'account', Fns>;
    expectTypeOf<R>().toMatchTypeOf<{
      'account/login': (payload: string) => Promise<void>;
    }>();
  });

  it('空前缀不加路径', () => {
    type Fns = { ping: (ctx: any) => void };
    type R = GetRestMaps<'', Fns>;
    expectTypeOf<R>().toMatchTypeOf<{
      ping: () => void;
    }>();
  });
});

/* ============================================================================
 * GetGetterReturnType 保留 getter 返回值
 * ==========================================================================*/

describe('GetGetterReturnType', () => {
  it('保留返回值类型并加路径前缀', () => {
    type Getters = {
      isActive: (state: any) => boolean;
      count: (state: any) => number;
    };
    type R = GetGetterReturnType<'user', Getters>;
    expectTypeOf<R>().toEqualTypeOf<{
      'user/isActive': boolean;
      'user/count': number;
    }>();
  });

  it('空路径不加前缀', () => {
    type Getters = { fullName: (state: any) => string };
    type R = GetGetterReturnType<'', Getters>;
    expectTypeOf<R>().toEqualTypeOf<{
      fullName: string;
    }>();
  });
});

/* ============================================================================
 * GetVuexHelperStateMutations 带路径前缀的自动 mutations
 * ==========================================================================*/

describe('GetVuexHelperStateMutations', () => {
  it('自动生成的 mutations 带模块前缀', () => {
    type State = { name: string; count: number };
    type R = GetVuexHelperStateMutations<'user', State>;
    expectTypeOf<R>().toMatchTypeOf<{
      'user/name.set': (v: string) => void;
      'user/name.merge': (v: Partial<string>) => void;
      'user/count.set': (v: number) => void;
      'user/count.merge': (v: Partial<number>) => void;
    }>();
  });

  it('空模块名不带前缀', () => {
    type State = { value: string };
    type R = GetVuexHelperStateMutations<'', State>;
    expectTypeOf<R>().toMatchTypeOf<{
      'value.set': (v: string) => void;
    }>();
  });
});

/* ============================================================================
 * 深层嵌套模块（3 层）
 * ==========================================================================*/

describe('deeply nested modules (3 levels)', () => {
  const level3State = { deep: 'value' };
  const level3Mutations = {
    setDeep(state: typeof level3State, v: string) {
      state.deep = v;
    }
  };
  const level3Actions = {
    async doDeep(_ctx: any, v: string) {
      return v.length;
    }
  };

  const level3Module = {
    state: level3State,
    mutations: level3Mutations,
    actions: level3Actions
  };

  const level2State = { mid: 0 };
  const level2Mutations = {
    setMid(state: typeof level2State, v: number) {
      state.mid = v;
    }
  };

  const level2Module = {
    state: level2State,
    mutations: level2Mutations,
    modules: { level3: level3Module }
  };

  type Level2SubModules = { level2?: typeof level2Module };

  it('3 层 state 路径推导', () => {
    type R = GetModuleState<undefined, Level2SubModules>;
    expectTypeOf<R>().toMatchTypeOf<{
      level2?: {
        mid: number;
        level3?: { deep: string };
      };
    }>();
  });

  it('3 层 mutations 路径推导', () => {
    type R = GetModuleMutations<undefined, undefined, Level2SubModules>;
    expectTypeOf<R>().toMatchTypeOf<{
      'level2/setMid'?: (v: number) => void;
      'level2/level3/setDeep'?: (v: string) => void;
    }>();
  });

  it('3 层 actions 路径推导', () => {
    type R = GetModuleActions<undefined, Level2SubModules>;
    expectTypeOf<R>().toMatchTypeOf<{
      'level2/level3/doDeep'?: (v: string) => any;
    }>();
  });

  it('3 层 getters 路径推导', () => {
    type SubMods = {
      level2?: {
        state: typeof level2State;
        mutations: typeof level2Mutations;
        getters: { midDouble: (state: typeof level2State) => number };
        modules: {
          level3: {
            state: typeof level3State;
            mutations: typeof level3Mutations;
            getters: { isDeep: (state: typeof level3State) => boolean };
          };
        };
      };
    };
    type R = GetModuleGetters<undefined, SubMods>;
    expectTypeOf<R>().toMatchTypeOf<{
      'level2/midDouble'?: number;
      'level2/level3/isDeep'?: boolean;
    }>();
  });
});

/* ============================================================================
 * Store getters 返回类型校验
 * ==========================================================================*/

describe('Store getters return type', () => {
  type GetterDefs = {
    'account/hasToken': (state: any) => boolean;
    'account/tokenLength': (state: any) => number;
    'setting/isDark': (state: any) => boolean;
  };
  type TestStore = Store<undefined, undefined, undefined, GetterDefs, undefined>;
  const store: TestStore = new Store<undefined, undefined, undefined, GetterDefs, undefined>({ state: {} });

  it('getter 返回值类型正确', () => {
    expectTypeOf(store.getters['account/hasToken']).toEqualTypeOf<boolean>();
    expectTypeOf(store.getters['account/tokenLength']).toEqualTypeOf<number>();
    expectTypeOf(store.getters['setting/isDark']).toEqualTypeOf<boolean>();
  });

  it('不存在的 getter 被拒绝', () => {
    // @ts-expect-error - 不存在的 getter
    store.getters['nonExistent'];
  });
});

/* ============================================================================
 * Store commit 更多边界
 * ==========================================================================*/

describe('Store commit additional edge cases', () => {
  type Mutations = {
    'a/set': (v: string) => void;
    'a/b/set': (v: number) => void;
    'reset': () => void;
    'multi': (v: string | number) => void;
  };
  type TestStore = Store<undefined, Mutations, undefined, undefined, undefined>;
  const store: TestStore = new Store<undefined, Mutations, undefined, undefined, undefined>({ state: {} });

  it('多级路径 mutation 正确调用', () => {
    expectTypeOf(store.commit).toBeCallableWith('a/set', 'hello');
    expectTypeOf(store.commit).toBeCallableWith('a/b/set', 42);
  });

  it('无参 mutation 传 undefined', () => {
    expectTypeOf(store.commit).toBeCallableWith('reset', undefined);
  });

  it('联合类型 payload 正确匹配', () => {
    expectTypeOf(store.commit).toBeCallableWith('multi', 'hello');
    expectTypeOf(store.commit).toBeCallableWith('multi', 42);
  });

  it('拒绝错误 mutation 名', () => {
    // @ts-expect-error
    store.commit('nonexistent');
  });

  it('拒绝错误 payload 类型', () => {
    // @ts-expect-error - 期望 string
    store.commit('a/set', 123);
    // @ts-expect-error - 期望 number
    store.commit('a/b/set', 'wrong');
  });
});

/* ============================================================================
 * Store dispatch 更多边界
 * ==========================================================================*/

describe('Store dispatch additional edge cases', () => {
  type Actions = {
    'a/login': (payload: { user: string }) => Promise<{ ok: boolean }>;
    'a/b/fetch': (id: number) => Promise<string[]>;
    'a/sync': () => number;
    'noPayload': () => Promise<void>;
  };
  type TestStore = Store<undefined, undefined, Actions, undefined, undefined>;
  const store: TestStore = new Store<undefined, undefined, Actions, undefined, undefined>({ state: {} });

  it('多级路径 action 正确调用', () => {
    const r1 = store.dispatch('a/login', { user: 'alice' });
    expectTypeOf(r1).toEqualTypeOf<Promise<{ ok: boolean }>>();

    const r2 = store.dispatch('a/b/fetch', 1);
    expectTypeOf(r2).toEqualTypeOf<Promise<string[]>>();
  });

  it('同步 action 返回值被包裹为 Promise', () => {
    const r = store.dispatch('a/sync');
    expectTypeOf(r).toEqualTypeOf<Promise<number>>();
  });

  it('无参 action 调用', () => {
    const r = store.dispatch('noPayload');
    expectTypeOf(r).toEqualTypeOf<Promise<void>>();
  });

  it('拒绝错误 action 名', () => {
    // @ts-expect-error
    store.dispatch('nonexistent');
  });

  it('拒绝错误 payload 类型', () => {
    // @ts-expect-error - 期望 { user: string }，传了 string
    store.dispatch('a/login', 'wrong');
    // @ts-expect-error - 期望 number，传了 string
    store.dispatch('a/b/fetch', 'wrong');
  });

  it('拒绝缺少必填参数的调用', () => {
    // @ts-expect-error - 缺少 payload
    store.dispatch('a/login');
  });
});

/* ============================================================================
 * Store.watch / subscribe / subscribeAction 类型
 * ==========================================================================*/

describe('Store watch / subscribe / subscribeAction', () => {
  type State = { count: number; name: string };
  type Mutations = { 'inc': (v: number) => void };
  type Actions = { 'fetch': (id: string) => Promise<void> };
  type TestStore = Store<State, Mutations, Actions, undefined, undefined>;
  const store: TestStore = new Store<State, Mutations, Actions, undefined, undefined>({ state: { count: 0, name: '' } });

  it('watch getter 接受 state 参数，回调接受 watch 值', () => {
    store.watch(
      (state) => state.count,
      (value, oldValue) => {
        expectTypeOf(value).toEqualTypeOf<number>();
        expectTypeOf(oldValue).toEqualTypeOf<number>();
      }
    );
  });

  it('subscribe 回调接受 mutation 和 state', () => {
    store.subscribe((mutation, state) => {
      expectTypeOf(state).toMatchTypeOf<{ count: number; name: string }>();
    });
  });

  it('subscribeAction 回调接受 action 和 state', () => {
    store.subscribeAction((action, state) => {
      expectTypeOf(state).toMatchTypeOf<{ count: number; name: string }>();
    });
  });

  it('replaceState 接受正确 state 类型', () => {
    store.replaceState({ count: 1, name: 'new' });
  });

  it('replaceState 拒绝错误类型', () => {
    // @ts-expect-error - count 应该是 number
    store.replaceState({ count: 'wrong', name: 'new' });
  });
});

/* ============================================================================
 * Store.registerModule / unregisterModule / hasModule 类型
 * ==========================================================================*/

describe('Store module management', () => {
  type State = { x: number };
  type TestStore = Store<State, undefined, undefined, undefined, undefined>;
  const store: TestStore = new Store<State, undefined, undefined, undefined, undefined>({ state: { x: 0 } });

  it('registerModule 接受字符串路径', () => {
    store.registerModule('mod', { state: { y: 1 } });
  });

  it('registerModule 接受数组路径', () => {
    type RegisterFn = typeof store.registerModule;
    expectTypeOf<RegisterFn>().toBeCallableWith(['a', 'b'], { state: { y: 1 } });
  });

  it('unregisterModule 接受字符串路径', () => {
    store.unregisterModule('mod');
  });

  it('unregisterModule 接受数组路径', () => {
    type UnregisterFn = typeof store.unregisterModule;
    expectTypeOf<UnregisterFn>().toBeCallableWith(['a', 'b']);
  });

  it('hasModule 接受字符串路径', () => {
    const r: boolean = store.hasModule('mod');
    expectTypeOf(r).toEqualTypeOf<boolean>();
  });

  it('hasModule 接受数组路径', () => {
    const r: boolean = store.hasModule(['a', 'b']);
    expectTypeOf(r).toEqualTypeOf<boolean>();
  });
});

/* ============================================================================
 * GetModuleActionContext dispatch 带 root: true 返回类型
 * ==========================================================================*/

describe('GetModuleActionContext dispatch with root: true', () => {
  type LocalMut = { setLocal: (v: string) => void };
  type RootMut = { setRoot: (v: number) => void };
  type LocalAct = { localAction: () => Promise<string> };
  type RootAct = { rootAction: (id: number) => Promise<boolean> };

  type Ctx = GetModuleActionContext<
    { value: string },
    LocalMut,
    LocalAct,
    any,
    { rootValue: number },
    RootMut,
    RootAct,
    any
  >;

  it('dispatch 本地 action 返回正确类型', () => {
    type DispatchFn = Ctx['dispatch'];
    expectTypeOf<DispatchFn>().returns.toEqualTypeOf<Promise<string>>();
  });

  it('dispatch root action 需要 options.root', () => {
    type DispatchFn = Ctx['dispatch'];
    expectTypeOf<DispatchFn>().toBeCallableWith('rootAction', 1, { root: true });
  });

  it('rootState 类型正确', () => {
    expectTypeOf<Ctx['rootState']>().toEqualTypeOf<{ rootValue: number }>();
  });

  it('state 类型正确', () => {
    expectTypeOf<Ctx['state']>().toEqualTypeOf<{ value: string }>();
  });
});

/* ============================================================================
 * Store hotUpdate 类型
 * ==========================================================================*/

describe('Store hotUpdate', () => {
  type State = { count: number };
  type TestStore = Store<State, undefined, undefined, undefined, undefined>;
  const store: TestStore = new Store<State, undefined, undefined, undefined, undefined>({ state: { count: 0 } });

  it('hotUpdate 接受 actions/mutations/getters/modules', () => {
    store.hotUpdate({
      actions: {
        newAction(_ctx: any) {}
      },
      mutations: {
        newMut(state: State) {
          state.count++;
        }
      }
    });
  });
});

/* ============================================================================
 * 完整端到端：带 getter 的全链路类型推导
 * ==========================================================================*/

describe('end-to-end with getters', () => {
  interface TodoItem {
    id: number;
    text: string;
    done: boolean;
  }

  const todoState = {
    items: [] as TodoItem[],
    filter: 'all' as 'all' | 'done' | 'pending'
  };

  const todoMutations = {
    add(state: typeof todoState, item: TodoItem) {
      state.items.push(item);
    },
    clear(state: typeof todoState) {
      state.items = [];
    }
  };

  const todoActions = {
    async addAsync(_ctx: any, text: string): Promise<TodoItem> {
      return { id: Date.now(), text, done: false };
    }
  };

  const todoGetters = {
    doneItems: (state: typeof todoState) => state.items.filter((i) => i.done),
    pendingCount: (state: typeof todoState) => state.items.filter((i) => !i.done).length,
    isEmpty: (state: typeof todoState) => state.items.length === 0
  };

  const todoModule = {
    state: todoState,
    mutations: todoMutations,
    actions: todoActions,
    getters: todoGetters
  };

  type SubModules = { todo?: typeof todoModule };
  type RootMuts = GetModuleMutations<undefined, undefined, SubModules>;
  type RootActs = GetModuleActions<undefined, SubModules>;
  type RootGetters = GetModuleGetters<undefined, SubModules>;

  it('根 mutations 包含 todo 子模块所有 mutation + helper', () => {
    expectTypeOf<RootMuts>().toMatchTypeOf<{
      'todo/add'?: (item: TodoItem) => void;
      'todo/clear'?: () => void;
      'todo/items.push'?: (v: TodoItem) => void;
      'todo/items.set'?: (v: TodoItem[]) => void;
      'todo/filter.set'?: (v: 'all' | 'done' | 'pending') => void;
    }>();
  });

  it('根 actions 包含 todo 子模块 action', () => {
    expectTypeOf<RootActs>().toMatchTypeOf<{
      'todo/addAsync'?: (text: string) => Promise<TodoItem>;
    }>();
  });

  it('根 getters 保留返回值类型', () => {
    expectTypeOf<RootGetters>().toMatchTypeOf<{
      'todo/doneItems'?: TodoItem[];
      'todo/pendingCount'?: number;
      'todo/isEmpty'?: boolean;
    }>();
  });

  it('端到端 Store 实例类型完整校验', () => {
    type TodoStore = Store<undefined, undefined, RootActs, RootGetters, SubModules>;
    const store: TodoStore = new Store<undefined, undefined, RootActs, RootGetters, SubModules>({ state: {}, modules: {} });

    // commit 正确
    expectTypeOf(store.commit).toBeCallableWith('todo/add', { id: 1, text: 'test', done: false });
    expectTypeOf(store.commit).toBeCallableWith('todo/clear', undefined);
    expectTypeOf(store.commit).toBeCallableWith('todo/items.push', { id: 1, text: 'test', done: false });

    // commit 错误
    // @ts-expect-error - 缺少 text 和 done
    store.commit('todo/add', { id: 1 });

    // dispatch 正确
    const r = store.dispatch('todo/addAsync', 'hello');
    expectTypeOf(r).toEqualTypeOf<Promise<TodoItem>>();

    // dispatch 错误
    // @ts-expect-error - 期望 string
    store.dispatch('todo/addAsync', 123);

    // getters 正确
    expectTypeOf(store.getters['todo/doneItems']).toEqualTypeOf<TodoItem[]>();
    expectTypeOf(store.getters['todo/pendingCount']).toEqualTypeOf<number>();
    expectTypeOf(store.getters['todo/isEmpty']).toEqualTypeOf<boolean>();

    // state 正确
    expectTypeOf(store.state).toMatchTypeOf<{
      todo?: {
        items: TodoItem[];
        filter: 'all' | 'done' | 'pending';
      };
    }>();
  });
});
