/**
 * Store 类运行时行为测试
 *
 * 验证 Store 包装层与原生 VuexStore 行为一致，并保留类型封装。
 */
import Vue from 'vue';
import Vuex from 'vuex';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Store } from '../src/store';

Vue.use(Vuex);

/* ============================================================================
 * 测试用模块定义
 * ==========================================================================*/

const accountState = {
  userId: '',
  token: ''
};

const accountMutations = {
  setToken(state: typeof accountState, token: string) {
    state.token = token;
  },
  clearToken(state: typeof accountState) {
    state.token = '';
  }
};

const accountActions = {
  async login({ commit }: any, token: string) {
    commit('setToken', token);
    return { success: true, token };
  },
  async fail() {
    throw new Error('fail');
  }
};

const accountGetters = {
  hasToken: (state: typeof accountState) => state.token !== '',
  tokenLength: (state: typeof accountState) => state.token.length
};

const accountModuleDefinitions = {
  state: accountState,
  mutations: accountMutations,
  actions: accountActions,
  getters: accountGetters
};

type IRootSubModules = {
  account?: typeof accountModuleDefinitions;
};

/* ============================================================================
 * Store 构造
 * ==========================================================================*/

describe('Store construction', () => {
  it('可以用空 options 创建', () => {
    const store = new Store<{}, {}, {}, {}>({ state: {} });
    expect(store).toBeDefined();
    expect(store.storeInstance).toBeInstanceOf(Vuex.Store);
  });

  it('id 全局递增', () => {
    const a = new Store<{}, {}, {}, {}>({ state: {} });
    const b = new Store<{}, {}, {}, {}>({ state: {} });
    expect(b.id).toBe(a.id + 1);
  });

  it('state / getters 可以通过 getter 访问', () => {
    const store = new Store<{ count: number }, {}, {}, {}>({
      state: { count: 42 }
    });
    expect(store.state.count).toBe(42);
  });

  it('storeInstance 是 readonly（TS 层面）', () => {
    const store = new Store<{}, {}, {}, {}>({ state: {} });
    // 运行时仍可访问，但 TS 编译时不能重新赋值
    expect(store.storeInstance).toBeDefined();
  });
});

/* ============================================================================
 * commit / dispatch 基本行为
 * ==========================================================================*/

describe('commit / dispatch', () => {
  it('commit 触发 mutation 并修改 state', () => {
    const store = new Store<{ count: number }, { inc: (s: { count: number }) => void }, {}, {}>({
      state: { count: 0 },
      mutations: {
        inc(state) {
          state.count += 1;
        }
      }
    });

    store.commit('inc' as any, undefined as any);
    expect(store.state.count).toBe(1);
  });

  it('dispatch 触发 action 并返回 Promise', async () => {
    const store = new Store<
      { value: string },
      { setValue: (s: { value: string }, v: string) => void },
      { setValueAsync: any },
      {}
    >({
      state: { value: '' },
      mutations: {
        setValue(state, v: string) {
          state.value = v;
        }
      },
      actions: {
        async setValueAsync({ commit }, v: string) {
          commit('setValue', v);
          return v.toUpperCase();
        }
      }
    });

    const result = await store.dispatch('setValueAsync' as any, 'hello');
    expect(result).toBe('HELLO');
    expect(store.state.value).toBe('hello');
  });

  it('dispatch 抛出 action 内部错误', async () => {
    const store = new Store<{}, {}, { fail: any }, {}>({
      actions: {
        async fail() {
          throw new Error('boom');
        }
      }
    });
    await expect(store.dispatch('fail' as any)).rejects.toThrow('boom');
  });
});

/* ============================================================================
 * 模块路径路由
 * ==========================================================================*/

describe('module path routing', () => {
  let store: Store<any, any, any, any, IRootSubModules>;

  beforeEach(() => {
    store = new Store<undefined, undefined, undefined, undefined, IRootSubModules>({
      state: {},
      modules: {}
    });
    // 懒加载注册模块
    store.registerModule(['account'], {
      namespaced: true,
      state: { ...accountState },
      mutations: accountMutations,
      actions: accountActions,
      getters: accountGetters
    });
  });

  it('子模块 mutation 通过路径字符串触发', () => {
    store.commit('account/setToken' as any, 'abc');
    expect(store.state.account.token).toBe('abc');
  });

  it('子模块 action 通过路径字符串触发', async () => {
    const result = await store.dispatch('account/login' as any, 'xyz');
    expect(result).toEqual({ success: true, token: 'xyz' });
    expect(store.state.account.token).toBe('xyz');
  });

  it('子模块 getter 通过路径字符串访问', () => {
    store.commit('account/setToken' as any, 'abc');
    expect(store.getters['account/hasToken']).toBe(true);
    expect(store.getters['account/tokenLength']).toBe(3);
  });

  it('getModuleFromType 抽取模块路径', () => {
    expect(store.getModuleFromType('account/setToken')).toBe('account');
    expect(store.getModuleFromType('a/b/c/mut')).toBe('a/b/c');
    expect(store.getModuleFromType('mut')).toBe('');
  });
});

/* ============================================================================
 * subscribe / subscribeAction
 * ==========================================================================*/

describe('subscribe / subscribeAction', () => {
  it('subscribe 收到 mutation 事件', () => {
    const store = new Store<{ x: number }, { setX: (s: { x: number }, v: number) => void }, {}, {}>({
      state: { x: 0 },
      mutations: {
        setX(state, v: number) {
          state.x = v;
        }
      }
    });
    const spy = vi.fn();
    store.subscribe(spy);
    store.commit('setX' as any, 42);
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'setX', payload: 42 }),
      expect.objectContaining({ x: 42 })
    );
  });

  it('subscribeAction 收到 action 事件', async () => {
    const store = new Store<{}, {}, { doIt: any }, {}>({
      actions: {
        async doIt() {
          return 'done';
        }
      }
    });
    const beforeSpy = vi.fn();
    const afterSpy = vi.fn();
    store.subscribeAction({ before: beforeSpy, after: afterSpy });
    await store.dispatch('doIt' as any);
    expect(beforeSpy).toHaveBeenCalledTimes(1);
    expect(afterSpy).toHaveBeenCalledTimes(1);
    expect(beforeSpy.mock.calls[0][0]).toMatchObject({ type: 'doIt' });
    expect(afterSpy.mock.calls[0][0]).toMatchObject({ type: 'doIt' });
  });

  it('subscribe 返回的函数可以取消订阅', () => {
    const store = new Store<{ x: number }, { setX: (s: { x: number }, v: number) => void }, {}, {}>({
      state: { x: 0 },
      mutations: {
        setX(state, v: number) {
          state.x = v;
        }
      }
    });
    const spy = vi.fn();
    const unsubscribe = store.subscribe(spy);
    store.commit('setX' as any, 1);
    unsubscribe();
    store.commit('setX' as any, 2);
    expect(spy).toHaveBeenCalledTimes(1);
  });
});

/* ============================================================================
 * registerModule / unregisterModule / hasModule
 * ==========================================================================*/

describe('registerModule / unregisterModule / hasModule', () => {
  it('registerModule 注册后可访问', () => {
    const store = new Store<undefined, undefined, undefined, undefined, IRootSubModules>({
      state: {},
      modules: {}
    });
    expect(store.hasModule('account' as any)).toBe(false);
    store.registerModule('account', {
      namespaced: true,
      state: { ...accountState },
      mutations: accountMutations
    } as any);
    expect(store.hasModule('account' as any)).toBe(true);
    expect(store.state.account.token).toBe('');
  });

  it('unregisterModule 卸载后不可访问', () => {
    const store = new Store<undefined, undefined, undefined, undefined, IRootSubModules>({
      state: {},
      modules: {}
    });
    store.registerModule('account', {
      namespaced: true,
      state: { ...accountState },
      mutations: accountMutations
    } as any);
    store.unregisterModule('account');
    expect(store.hasModule('account' as any)).toBe(false);
  });

  it('支持数组路径的 registerModule（需先注册父模块）', () => {
    const store = new Store<undefined, undefined, undefined, undefined, any>({
      state: {},
      modules: {}
    });
    // 必须先注册父模块 'a'，再注册 'a/b'
    store.registerModule('a', {
      namespaced: true,
      state: {}
    } as any);
    store.registerModule(['a', 'b'], {
      namespaced: true,
      state: { v: 1 }
    } as any);
    expect((store.state as any).a.b.v).toBe(1);
  });
});

/* ============================================================================
 * replaceState / setOptions / watch
 * ==========================================================================*/

describe('replaceState / setOptions / watch', () => {
  it('replaceState 替换整个 state', () => {
    const store = new Store<{ x: number }, {}, {}, {}>({
      state: { x: 1 }
    });
    store.replaceState({ x: 99 } as any);
    expect(store.state.x).toBe(99);
  });

  it('setOptions 合并 options', () => {
    const store = new Store<{}, {}, {}, {}>({ state: {} });
    (store.options as any).customField = 'before';
    store.setOptions({ customField: 'after' } as any);
    expect((store.options as any).customField).toBe('after');
  });

  it('watch 监听 state 变化', async () => {
    const store = new Store<{ x: number }, { setX: (s: { x: number }, v: number) => void }, {}, {}>({
      state: { x: 0 },
      mutations: {
        setX(state, v: number) {
          state.x = v;
        }
      }
    });
    const spy = vi.fn();
    store.watch((state) => (state as any).x, spy);
    store.commit('setX' as any, 10);
    // watch 是异步触发，需要等一个 tick
    await new Promise((r) => setTimeout(r, 0));
    expect(spy).toHaveBeenCalledWith(10, 0);
  });
});

/* ============================================================================
 * _initPrivateProperties
 * ==========================================================================*/

describe('_initPrivateProperties', () => {
  it('把 Vuex 内部属性挂到 Store 实例', () => {
    const store = new Store<{}, {}, {}, {}>({ state: {} });
    const expected = [
      '_actionSubscribers',
      '_actions',
      '_makeLocalGettersCache',
      '_modules',
      '_mutations',
      '_subscribers',
      '_vm',
      '_watcherVM',
      '_wrappedGetters',
      '_modulesNamespaceMap',
      '_withCommit'
    ];
    for (const key of expected) {
      expect((store as any)[key]).toBe((store.storeInstance as any)[key]);
    }
  });
});

/* ============================================================================
 * hotUpdate
 * ==========================================================================*/

describe('hotUpdate', () => {
  it('热更新 mutation 行为', () => {
    const store = new Store<{ x: number }, { inc: (s: { x: number }) => void }, {}, {}>({
      state: { x: 0 },
      mutations: {
        inc(state) {
          state.x += 1;
        }
      }
    });
    store.commit('inc' as any, undefined as any);
    expect(store.state.x).toBe(1);

    store.hotUpdate({
      mutations: {
        inc(state) {
          state.x += 10;
        }
      } as any
    });
    store.commit('inc' as any, undefined as any);
    expect(store.state.x).toBe(11);
  });
});
