/**
 * module-helpers 运行时测试
 *
 * 参考 app/src/renders/store/modules/access-history/index.ts 的真实结构，
 * 验证 createMutations / createNamespacedStore / isPlainObject 的行为。
 */
import Vue from 'vue';
import Vuex from 'vuex';
import { describe, it, expect, vi } from 'vitest';
import { createMutations, createNamespacedStore, isPlainObject } from '../src/module-helpers';
import { Store } from '../src/store';

Vue.use(Vuex);

/* ============================================================================
 * isPlainObject
 * ==========================================================================*/

describe('isPlainObject', () => {
  it('普通对象返回 true', () => {
    expect(isPlainObject({})).toBe(true);
    expect(isPlainObject({ a: 1 })).toBe(true);
    expect(isPlainObject(Object.create(null))).toBe(true);
  });

  it('非对象返回 false', () => {
    expect(isPlainObject(null)).toBe(false);
    expect(isPlainObject(undefined)).toBe(false);
    expect(isPlainObject(42)).toBe(false);
    expect(isPlainObject('str')).toBe(false);
    expect(isPlainObject([])).toBe(false);
    expect(isPlainObject(new Date())).toBe(false);
    expect(isPlainObject(() => 0)).toBe(false);
  });
});

/* ============================================================================
 * createMutations - 基础类型
 * ==========================================================================*/

describe('createMutations - primitive fields', () => {
  const state = {
    userId: '',
    count: 0,
    flag: false
  };
  const mutations = createMutations(state);

  it('生成 set/merge 等 8 个标准 mutation 名', () => {
    expect(Object.keys(mutations).sort()).toEqual([
      'count.concat',
      'count.merge',
      'count.pop',
      'count.push',
      'count.set',
      'count.shift',
      'count.splice',
      'count.unshift',
      'flag.concat',
      'flag.merge',
      'flag.pop',
      'flag.push',
      'flag.set',
      'flag.shift',
      'flag.splice',
      'flag.unshift',
      'userId.concat',
      'userId.merge',
      'userId.pop',
      'userId.push',
      'userId.set',
      'userId.shift',
      'userId.splice',
      'userId.unshift'
    ]);
  });

  it('.set 整体覆盖', () => {
    const s = { ...state };
    mutations['userId.set'](s, 'u-123');
    expect(s.userId).toBe('u-123');
  });

  it('.merge 对非对象直接覆盖', () => {
    const s = { ...state };
    mutations['userId.merge'](s, 'u-456');
    expect(s.userId).toBe('u-456');
    mutations['count.merge'](s, 42);
    expect(s.count).toBe(42);
  });
});

/* ============================================================================
 * createMutations - 对象字段
 * ==========================================================================*/

describe('createMutations - object fields', () => {
  const state = {
    profile: { name: 'Alice', age: 18 }
  };
  const mutations = createMutations(state);

  it('.set 整体替换对象', () => {
    const s = { profile: { ...state.profile } };
    mutations['profile.set'](s, { name: 'Bob', age: 20 });
    expect(s.profile).toEqual({ name: 'Bob', age: 20 });
  });

  it('.merge 合并对象字段', () => {
    const s = { profile: { ...state.profile } };
    mutations['profile.merge'](s, { age: 19 });
    expect(s.profile).toEqual({ name: 'Alice', age: 19 });
  });

  it('.merge 对 null 初始值也安全', () => {
    const nullState = { data: null as any };
    const m = createMutations(nullState);
    const s = { data: null as any };
    m['data.merge'](s, { x: 1 });
    expect(s.data).toEqual({ x: 1 });
  });
});

/* ============================================================================
 * createMutations - 数组字段
 * ==========================================================================*/

describe('createMutations - array fields', () => {
  const state = {
    items: [] as number[],
    tags: ['a', 'b'] as string[]
  };
  const mutations = createMutations(state);

  it('.push 添加元素', () => {
    const s = { items: [...state.items], tags: [...state.tags] };
    mutations['items.push'](s, 1);
    mutations['items.push'](s, 2);
    expect(s.items).toEqual([1, 2]);
  });

  it('.pop 移除末尾', () => {
    const s = { items: [1, 2, 3], tags: [...state.tags] };
    mutations['items.pop'](s, undefined);
    expect(s.items).toEqual([1, 2]);
  });

  it('.shift 移除开头', () => {
    const s = { items: [1, 2, 3], tags: [...state.tags] };
    mutations['items.shift'](s, undefined);
    expect(s.items).toEqual([2, 3]);
  });

  it('.unshift 添加到开头', () => {
    const s = { items: [1, 2], tags: [...state.tags] };
    mutations['items.unshift'](s, 0);
    expect(s.items).toEqual([0, 1, 2]);
  });

  it('.concat 连接数组', () => {
    const s = { items: [1], tags: [...state.tags] };
    mutations['items.concat'](s, [2, 3]);
    expect(s.items).toEqual([1, 2, 3]);
  });

  it('.splice 插入/删除', () => {
    const s = { items: [1, 2, 3], tags: [...state.tags] };
    mutations['items.splice'](s, [1, 1, 9, 9]);
    expect(s.items).toEqual([1, 9, 9, 3]);
  });
});

/* ============================================================================
 * 参考 access-history 的真实模块结构
 * ==========================================================================*/

describe('access-history style module', () => {
  // 模拟 AccessHistory 数据结构
  interface AccessHistory {
    id: string;
    title: string;
    updateTime: number;
  }

  // 1. 定义初始 state
  const accessHistoryState = {
    accessHistories: [] as AccessHistory[]
  };

  // 2. 定义自定义 mutations（覆盖自动生成的）
  const accessHistoryMutations = {
    reSort(state: typeof accessHistoryState) {
      state.accessHistories.sort((a, b) => b.updateTime - a.updateTime);
    }
  };

  // 3. 定义 actions
  const accessHistoryActions = {
    async addHistory({ commit }: any, item: AccessHistory) {
      commit('accessHistories.push', item);
      commit('reSort');
    },
    async clearAll({ commit }: any) {
      commit('accessHistories.set', []);
    }
  };

  // 4. 用 createNamespacedStore 创建模块
  const accessHistoryModule = createNamespacedStore<typeof accessHistoryState, any>(
    'accessHistory',
    {
      state: accessHistoryState,
      mutations: accessHistoryMutations,
      actions: accessHistoryActions
    }
  );

  it('模块包含 namespaced 标识和标准字段', () => {
    expect(accessHistoryModule.namespaced).toBe(true);
    expect(accessHistoryModule.state).toEqual({ accessHistories: [] });
    expect(accessHistoryModule.mutations).toBeDefined();
    expect(accessHistoryModule.actions).toBeDefined();
  });

  it('自动生成的 mutations 与自定义 mutations 合并', () => {
    const muts = accessHistoryModule.mutations;
    // 自定义
    expect(muts.reSort).toBeDefined();
    // 自动生成
    expect(muts['accessHistories.push']).toBeDefined();
    expect(muts['accessHistories.set']).toBeDefined();
    expect(muts['accessHistories.pop']).toBeDefined();
    expect(muts['accessHistories.concat']).toBeDefined();
  });

  it('附带 mapState/mapMutations/mapActions/mapGetters 辅助', () => {
    expect(typeof accessHistoryModule.mapState).toBe('function');
    expect(typeof accessHistoryModule.mapMutations).toBe('function');
    expect(typeof accessHistoryModule.mapActions).toBe('function');
    expect(typeof accessHistoryModule.mapGetters).toBe('function');
  });

  it('在真实 Store 中 dispatch action，验证完整流程', async () => {
    type ISubModules = { accessHistory?: typeof accessHistoryModule };

    const store = new Store<undefined, undefined, undefined, undefined, ISubModules>({
      state: {},
      modules: {}
    });

    store.registerModule(['accessHistory'], {
      namespaced: true,
      state: { ...accessHistoryState },
      mutations: accessHistoryModule.mutations,
      actions: accessHistoryModule.actions
    } as any);

    // dispatch addHistory，内部会调用自动生成的 accessHistories.push
    await store.dispatch('accessHistory/addHistory' as any, {
      id: '1',
      title: 'First',
      updateTime: 100
    });
    expect(store.state.accessHistory.accessHistories).toEqual([
      { id: '1', title: 'First', updateTime: 100 }
    ]);

    // 再添加一条更晚的
    await store.dispatch('accessHistory/addHistory' as any, {
      id: '2',
      title: 'Second',
      updateTime: 200
    });

    // reSort 应该把 updateTime 大的排前面
    expect(store.state.accessHistory.accessHistories[0].id).toBe('2');
    expect(store.state.accessHistory.accessHistories[1].id).toBe('1');

    // clearAll 应该用 accessHistories.set 设置空数组
    await store.dispatch('accessHistory/clearAll' as any);
    expect(store.state.accessHistory.accessHistories).toEqual([]);
  });

  it('自定义 mutation 可以覆盖自动生成的', () => {
    const customMutations = {
      'items.set'(state: { items: number[] }, value: number[]) {
        // 自定义行为：只保留偶数
        state.items = value.filter((n) => n % 2 === 0);
      }
    };
    const m = createNamespacedStore<{ items: number[] }, any>('mod', {
      state: { items: [] as number[] },
      mutations: customMutations
    });
    const state = { items: [] as number[] };
    m.mutations['items.set'](state, [1, 2, 3, 4]);
    expect(state.items).toEqual([2, 4]);
  });
});

/* ============================================================================
 * createNamespacedStore - 与 Store 类的集成
 * ==========================================================================*/

describe('createNamespacedStore + Store class integration', () => {
  it('完整流程：自动 mutation + 自定义 mutation + action', async () => {
    const userState = {
      name: '',
      permissions: [] as string[],
      settings: { theme: 'light' as const }
    };

    const userMutations = {
      setName(state: typeof userState, name: string) {
        state.name = name.trim();
      }
    };

    const userActions = {
      async initUser({ commit }: any, payload: { name: string; perms: string[] }) {
        commit('setName', payload.name);
        commit('permissions.push', 'default');
        for (const p of payload.perms) {
          commit('permissions.push', p);
        }
        commit('settings.merge', { theme: 'dark' });
      }
    };

    const userModule = createNamespacedStore<typeof userState, any>('user', {
      state: userState,
      mutations: userMutations,
      actions: userActions
    });

    type ISubModules = { user?: typeof userModule };
    const store = new Store<undefined, undefined, undefined, undefined, ISubModules>({
      state: {},
      modules: {}
    });

    store.registerModule(['user'], {
      namespaced: true,
      state: { ...userState },
      mutations: userModule.mutations,
      actions: userModule.actions
    } as any);

    await store.dispatch('user/initUser' as any, {
      name: '  Alice  ',
      perms: ['admin', 'editor']
    });

    // setName 自定义行为：trim
    expect(store.state.user.name).toBe('Alice');
    // permissions.push 自动生成
    expect(store.state.user.permissions).toEqual(['default', 'admin', 'editor']);
    // settings.merge 自动生成
    expect(store.state.user.settings).toEqual({ theme: 'dark' });
  });
});

/* ============================================================================
 * 边界情况
 * ==========================================================================*/

describe('edge cases', () => {
  it('空 state 生成空 mutations', () => {
    const m = createMutations({});
    expect(Object.keys(m)).toEqual([]);
  });

  it('嵌套对象 state 只处理第一层', () => {
    const m = createMutations({ deep: { inner: 1 } });
    expect(m['deep.set']).toBeDefined();
    expect(m['deep.inner.set']).toBeUndefined();
  });

  it('symbol key 不被处理（Object.keys 只返回 string）', () => {
    const sym = Symbol('s');
    const state = { [sym]: 1, name: 'x' } as any;
    const m = createMutations(state);
    expect(m['name.set']).toBeDefined();
    expect(Object.keys(m).some((k) => k.startsWith(String(sym)))).toBe(false);
  });
});
