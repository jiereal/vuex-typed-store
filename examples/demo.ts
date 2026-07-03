/**
 * vuex-typed-store 使用示例
 *
 * 模拟 `app/src/renders/store/store.d.ts` 中的真实结构：
 * - 多个子模块（account / setting / chatWindow …）
 * - 每个模块都有自己的 state / mutations / actions / getters
 * - 懒加载（子模块可选）
 */
import Vue from 'vue';
import Vuex, { StoreOptions } from 'vuex';
import {
  Store,
  GetModuleState,
  GetModuleMutations,
  GetModuleActions,
  GetModuleGetters,
  GetModuleActionContext
} from 'vuex-typed-store';

Vue.use(Vuex);

/* ============================================================================
 * 1. 定义模块：account
 * ==========================================================================*/

const accountState = {
  userId: '',
  userName: '',
  token: '',
  loginTime: 0
};

const accountMutations = {
  setToken(state: typeof accountState, token: string) {
    state.token = token;
  },
  logout(state: typeof accountState) {
    state.userId = '';
    state.token = '';
  }
};

const accountStoreActions = {
  async login(context: any, payload: { userId: string; password: string }) {
    // 模拟登录
    context.commit('setToken', 'fake-token');
    return { success: true };
  },
  async refresh(context: any) {
    return { ok: true };
  }
};

/* ============================================================================
 * 2. 定义模块：setting
 * ==========================================================================*/

const settingState = {
  theme: 'light' as 'light' | 'dark',
  locale: 'zh-CN',
  fontSize: 14
};

const settingStoreMutations = {
  setTheme(state: typeof settingState, theme: 'light' | 'dark') {
    state.theme = theme;
  },
  setLocale(state: typeof settingState, locale: string) {
    state.locale = locale;
  }
};

const settingStoreActions = {
  async toggleTheme(context: any) {
    const next = context.state.theme === 'light' ? 'dark' : 'light';
    context.commit('setTheme', next);
  }
};

const settingStoreGetters = {
  isDarkMode: (state: typeof settingState) => state.theme === 'dark',
  displayFontSize: (state: typeof settingState) => `${state.fontSize}px`
};

/* ============================================================================
 * 3. 定义模块：chatWindow（懒加载）
 * ==========================================================================*/

const chatWindowState = {
  visible: false,
  targetId: ''
};

const chatWindowMutations = {
  show(state: typeof chatWindowState, targetId: string) {
    state.visible = true;
    state.targetId = targetId;
  },
  hide(state: typeof chatWindowState) {
    state.visible = false;
  }
};

const chatWindowActions = {
  async openChat(context: any, targetId: string) {
    context.commit('show', targetId);
  }
};

/* ============================================================================
 * 4. 模块元信息（用于懒加载）
 * ==========================================================================*/

export const accountModuleDefinitions = {
  state: accountState,
  mutations: accountMutations,
  actions: accountStoreActions,
  getters: {}
};

export const settingModuleDefinitions = {
  state: settingState,
  mutations: settingStoreMutations,
  actions: settingStoreActions,
  getters: settingStoreGetters
};

export const chatWindowModuleDefinitions = {
  state: chatWindowState,
  mutations: chatWindowMutations,
  actions: chatWindowActions,
  getters: {}
};

/* ============================================================================
 * 5. 组装 RootState / RootSubModules（核心！）
 * ==========================================================================*/

/** 懒加载模块声明（子模块可选） */
export type IRootSubModules = {
  account?: typeof accountModuleDefinitions;
  setting?: typeof settingModuleDefinitions;
  chatWindow?: typeof chatWindowModuleDefinitions;
};

/** 根 mutations（可选的根级别 mutation） */
const storeMutations = {
  ping(state: any) {
    state.__ping = Date.now();
  }
};
export type IRootMutationsDefinitions = typeof storeMutations;

/* ============================================================================
 * 6. 推导根级类型
 * ==========================================================================*/

/** 自动推导出的完整 state（含所有子模块） */
export type IRootState = GetModuleState<undefined, IRootSubModules>;
//   ^ 等价于:
//   {
//     account: { userId: string; userName: string; token: string; loginTime: number };
//     setting: { theme: 'light' | 'dark'; locale: string; fontSize: number };
//     chatWindow: { visible: boolean; targetId: string };
//   }

/** 自动推导出的完整 mutations（含前缀） */
export type IRootMutations = GetModuleMutations<IRootMutationsDefinitions, undefined, IRootSubModules>;
//   ^ 等价于:
//   {
//     ping: (state: any) => void;                           // 根级
//     'account/setToken': (token: string) => void;          // 子模块
//     'account/logout': () => void;
//     'setting/setTheme': (theme: 'light' | 'dark') => void;
//     'setting/setLocale': (locale: string) => void;
//     'chatWindow/show': (targetId: string) => void;
//     'chatWindow/hide': () => void;
//   }

/** 自动推导出的完整 actions（含前缀） */
export type IRootActions = GetModuleActions<undefined, IRootSubModules>;
//   ^ 等价于:
//   {
//     'account/login': (payload: { userId: string; password: string }) => Promise<{ success: boolean }>;
//     'account/refresh': () => Promise<{ ok: boolean }>;
//     'setting/toggleTheme': () => Promise<void>;
//     'chatWindow/openChat': (targetId: string) => Promise<void>;
//   }

/* ============================================================================
 * 7. 创建 Store 实例
 * ==========================================================================*/

const storeOptions: StoreOptions<any> = {
  state: {},
  mutations: storeMutations,
  modules: {}
};

// 泛型顺序：<State, Mutations, Actions, Getters, SubModules>
export const store = new Store<undefined, IRootMutationsDefinitions, undefined, undefined, IRootSubModules>(
  storeOptions
);

/* ============================================================================
 * 8. 类型安全的调用示例
 * ==========================================================================*/

// ✅ commit 的 payload 自动推导为 `string`
store.commit('account/setToken', 'abc');

// ❌ TS 报错：期望 string，实际为 number
// store.commit('account/setToken', 123);

// ✅ commit 自动推导为 `'light' | 'dark'`
store.commit('setting/setTheme', 'dark');

// ❌ TS 报错：'red' 不在 'light' | 'dark' 中
// store.commit('setting/setTheme', 'red');

// ✅ dispatch 返回值自动推导为 Promise<{ success: boolean }>
store.dispatch('account/login', { userId: 'u1', password: 'p1' }).then((res) => {
  // res: { success: boolean }
  console.log(res.success);
});

// ❌ TS 报错：payload 缺少 password
// store.dispatch('account/login', { userId: 'u1' });

// ✅ state 访问有完整类型
console.log(store.state.account?.token);
console.log(store.state.setting?.theme);

// ✅ getters 访问有完整类型
console.log(store.getters['setting/isDarkMode']);

/* ============================================================================
 * 9. 模块内部 action 的 context 类型
 *
 *    在 `account/actions.ts` 中：
 * ==========================================================================*/

type IAccountState = GetModuleState<typeof accountState>;
type IAccountMutations = GetModuleMutations<typeof accountMutations, typeof accountState>;
type IAccountActions = GetModuleActions<typeof accountStoreActions>;
type IAccountActionContext = GetModuleActionContext<
  IAccountState,
  IAccountMutations,
  IAccountActions,
  any, // getters
  IRootState, // rootState
  IRootMutations, // rootMutations
  IRootActions, // rootActions
  any // rootGetters
>;

// 在 action 内部，commit/dispatch 自动带路径前缀，payload 类型也会被校验
const someAction = (context: IAccountActionContext) => {
  // ✅ 本地 mutation，路径自动为 'account/setToken'
  context.commit('setToken', 'xxx');

  // ✅ root mutation，需要 { root: true }
  context.commit('ping', undefined, { root: true });

  // ✅ 跨模块 dispatch，路径为 'setting/toggleTheme'
  context.dispatch('toggleTheme' as any);

  // ✅ 访问本地 / 根 state
  console.log(context.state.token);
  console.log(context.rootState.setting?.theme);
};

/* ============================================================================
 * 10. 懒加载模块
 * ==========================================================================*/

store.registerModule(['account'], {
  namespaced: true,
  state: accountState,
  mutations: accountMutations,
  actions: accountStoreActions,
  getters: {}
});

/* ============================================================================
 * 11. 订阅变更
 * ==========================================================================*/

store.subscribe((mutation, state) => {
  // mutation.type 是 `account/setToken` 这种带路径的字符串
  console.log(mutation.type, mutation.payload);
});
