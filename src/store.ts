/**
 * 强类型 Vuex Store 封装
 *
 * 核心特性:
 * 1. 递归推导嵌套模块的 state / mutations / actions / getters 类型
 * 2. commit / dispatch 的字符串路径自动带模块前缀，payload 自动匹配
 * 3. 支持 action 内部的本地 / root 两种 commit、dispatch 调用方式
 */
import { WatchOptions } from 'vue';
import {
  ActionPayload,
  ActionTree,
  CommitOptions,
  DispatchOptions,
  GetterTree,
  Module,
  ModuleTree,
  MutationPayload,
  MutationTree,
  StoreOptions,
  SubscribeActionOptions,
  SubscribeOptions,
  ModuleOptions as VuexModuleOptions,
  Store as VuexStore
} from 'vuex';
import { GetVuexHelperMutations } from './helper';
import { FlattenedPromise, getProperty, IsNonKeyOf, KeyValues, RequiredProps, UnionToIntersection } from './types';

/* eslint-disable @typescript-eslint/no-unused-vars */

/**
 * 移除函数第一个参数（context）
 */
export type GetRestFuncType<T> = T extends (context: any, ...params: infer P) => infer R
  ? P extends any[]
    ? (...args: P) => R
    : never
  : never;

/**
 * 取函数第一个参数类型；无参函数返回 undefined
 */
export type GetParam<T> = T extends () => any ? undefined : T extends (arg: infer R) => any ? R : any;

/**
 * 拼接模块路径字符串
 * 例: `GetModuleName<'user', '/', 'login'>` → `'user/login'`
 *      `GetModuleName<'', '/', 'login'>`    → `'login'`
 */
export type GetModuleName<Prefix extends string, Separator extends string, Property extends string> =
  Prefix extends ''
    ? Property
    : `${Prefix}${Separator}${Property}`;

/**
 * 把 `{ foo: fn }` 映射为 `{ "module/foo": 去context后的fn }`
 */
export type GetRestMaps<
  ModuleName extends string,
  obj extends any,
  Separator extends string = '/'
> = obj extends infer O
  ? {
      [Property in keyof O as GetModuleName<ModuleName, Separator, Extract<Property, string>>]: GetRestFuncType<O[Property]>;
    }
  : never;

/**
 * 取某个 key 对应的 value 类型（排除非函数项）
 */
export type GetTypeOfKey<T, K extends keyof T> = T[K] extends (data: any) => any ? T[K] : never;

/**
 * 取 mutation/action 的 payload 类型
 */
export type GetPayLoad<T, K extends keyof T> = GetParam<GetTypeOfKey<T, K>>;

/**
 * 映射 getters，保留返回值类型
 */
export type GetGetterReturnType<
  ModuleName extends string,
  obj extends any,
  Separator extends string = '/'
> = obj extends infer O
  ? {
      [Property in keyof O as GetModuleName<ModuleName, Separator, Extract<Property, string>>]: O[Property] extends (...args: any) => any ? ReturnType<O[Property]> : never;
    }
  : never;

/**
 * 把 helper 自动生成的 mutations 也带上模块前缀
 */
export type GetVuexHelperStateMutations<
  ModuleName,
  State,
  Separator extends string = '/',
  Mutations = GetVuexHelperMutations<State>
> = {
  [Property in keyof Mutations as GetModuleName<Extract<ModuleName, string>, Separator, Extract<Property, string>>]: Mutations[Property];
};

/* -------------------------------------- Mutations -------------------------------------- */

/**
 * 递归收集模块的 mutations（含 helper 生成的）
 */
export type GetModuleMutations<
  Mutations extends any,
  State extends any = undefined,
  SubModules extends any = undefined,
  ModuleName extends string = '',
  Separator extends string = '/'
> = (IsNonKeyOf<SubModules> extends false
  ? UnionToIntersection<GetSubModuleMutations<SubModules, ModuleName, Separator>>
  : unknown) &
  (IsNonKeyOf<Mutations> extends false ? GetRestMaps<ModuleName, Mutations> : unknown) &
  (IsNonKeyOf<State> extends false ? GetVuexHelperStateMutations<ModuleName, State, Separator> : unknown);

/**
 * 收集子模块 mutations
 */
export type GetSubModuleMutations<
  SubModules extends any,
  ModuleName extends string = '',
  Separator extends string = '/'
> = IsNonKeyOf<SubModules> extends false
  ? {
      [SubModuleName in keyof SubModules]: GetModuleMutations<
        getProperty<SubModules[SubModuleName], 'mutations'>,
        getProperty<SubModules[SubModuleName], 'state'>,
        getProperty<SubModules[SubModuleName], 'modules'>,
        GetModuleName<ModuleName, Separator, Extract<SubModuleName, string>>,
        Separator
      >;
    }[keyof SubModules]
  : never;

/* -------------------------------------- Actions -------------------------------------- */

type __GetModuleActions<
  Actions extends any,
  SubModules extends any,
  ModuleName extends string = '',
  Separator extends string = '/'
> =
  | (IsNonKeyOf<SubModules> extends false ? GetSubModuleActions<SubModules, ModuleName, Separator> : never)
  | (IsNonKeyOf<Actions> extends false ? GetRestMaps<ModuleName, Actions, Separator> : never);

export type GetSubModuleActions<
  SubModules extends any,
  ModuleName extends string = '',
  Separator extends string = '/'
> = IsNonKeyOf<SubModules> extends false
  ? {
      [SubModuleName in keyof SubModules]: __GetModuleActions<
        getProperty<SubModules[SubModuleName], 'actions'>,
        getProperty<SubModules[SubModuleName], 'modules'>,
        GetModuleName<ModuleName, Separator, Extract<SubModuleName, string>>,
        Separator
      >;
    }[keyof SubModules]
  : never;

export type GetModuleActions<
  Actions extends any,
  SubModules extends any = undefined,
  ModuleName extends string = '',
  Separator extends string = '/'
> = UnionToIntersection<__GetModuleActions<Actions, SubModules, ModuleName, Separator>>;

/* -------------------------------------- Getters -------------------------------------- */

type __GetModuleGetters<
  Getters extends any,
  SubModules extends any,
  ModuleName extends string = '',
  Separator extends string = '/'
> =
  | (IsNonKeyOf<SubModules> extends false ? GetSubModuleGetters<SubModules, ModuleName, Separator> : never)
  | (IsNonKeyOf<Getters> extends false ? GetGetterReturnType<ModuleName, Getters> : never);

export type GetSubModuleGetters<
  SubModules extends any,
  ModuleName extends string = '',
  Separator extends string = '/'
> = IsNonKeyOf<SubModules> extends false
  ? {
      [SubModuleName in keyof SubModules]: __GetModuleGetters<
        getProperty<SubModules[SubModuleName], 'getters'>,
        getProperty<SubModules[SubModuleName], 'modules'>,
        GetModuleName<ModuleName, Separator, Extract<SubModuleName, string>>,
        Separator
      >;
    }[keyof SubModules]
  : never;

export type GetModuleGetters<
  Getters extends any,
  SubModules extends any = undefined,
  ModuleName extends string = '',
  Separator extends string = '/'
> = UnionToIntersection<__GetModuleGetters<Getters, SubModules, ModuleName, Separator>>;

/* -------------------------------------- State -------------------------------------- */

/**
 * 递归收集模块的 state（含子模块）
 */
export type GetModuleState<StateDefinitions, SubModuleDefinitions = undefined> = (IsNonKeyOf<StateDefinitions> extends false
  ? StateDefinitions
  : {}) &
  (IsNonKeyOf<SubModuleDefinitions> extends false
    ? {
        [SubModuleName in keyof SubModuleDefinitions]: GetModuleState<
          getProperty<SubModuleDefinitions[SubModuleName], 'state'>,
          getProperty<SubModuleDefinitions[SubModuleName], 'modules'>
        >;
      }
    : {});

/* -------------------------------------- ActionContext -------------------------------------- */

/**
 * action 内部使用的 context 类型，支持本地 + root: true 两种调用
 */
export type GetModuleActionContext<
  State,
  Mutations,
  Actions,
  Getters,
  RootState = State,
  RootMutations = Mutations,
  RootActions = Actions,
  RootGetters = Getters
> = {
  commit: {
    <T extends keyof Mutations>(type: Extract<T, string>, payload?: GetPayLoad<Mutations, T>): void;
    <T extends keyof RootMutations>(
      type: Extract<T, string>,
      payload: GetPayLoad<RootMutations, T>,
      options: RequiredProps<CommitOptions, 'root'>
    ): void;
  };
  dispatch: {
    <
      T extends keyof Actions,
      ResultType = FlattenedPromise<
        Promise<Actions[T] extends (...args: any[]) => any ? ReturnType<Actions[T]> : Actions[T]>
      >
    >(
      type: Extract<T, string>,
      payload?: GetPayLoad<Actions, T>
    ): ResultType;
    <
      R extends keyof RootActions,
      ResultType = FlattenedPromise<
        Promise<RootActions[R] extends (...args: any[]) => any ? ReturnType<RootActions[R]> : RootActions[R]>
      >
    >(
      type: Extract<R, string>,
      payload: GetPayLoad<RootActions, R>,
      options: Required<DispatchOptions>
    ): ResultType;
  };
  state: State;
  getters: Getters;
  rootState: RootState;
  rootGetters: RootGetters;
};

/* -------------------------------------- Store -------------------------------------- */

interface StoreDispatch<Actions> {
  <T extends keyof Actions>(
    type: Extract<T, string>,
    payload?: GetPayLoad<Actions, T>,
    options?: DispatchOptions
  ): Actions[T] extends (...args: any[]) => any
    ? ReturnType<Actions[T]> extends Promise<any>
      ? ReturnType<Actions[T]>
      : Promise<ReturnType<Actions[T]>>
    : Promise<Actions[T]>;
}

let id = 0;

/**
 * 强类型 Vuex Store 封装
 */
export class Store<
  StateDefinitions extends any,
  MutationDefinitions extends any,
  ActionDefinitions extends any,
  GetterDefinitions extends any,
  SubModuleDefinitions extends any = undefined,
  State = GetModuleState<StateDefinitions, SubModuleDefinitions>,
  Mutations = GetModuleMutations<MutationDefinitions, StateDefinitions, SubModuleDefinitions>,
  Actions = GetModuleActions<ActionDefinitions, SubModuleDefinitions>,
  Getters = GetModuleGetters<GetterDefinitions, SubModuleDefinitions>
> {
  public readonly storeInstance!: VuexStore<State>;
  public id: number = 0;

  private _commit!: VuexStore<any>['commit'];

  public get getters(): Getters {
    return this.storeInstance.getters;
  }

  public get state(): State {
    return this.storeInstance.state;
  }

  public get strict(): boolean {
    return (this.storeInstance as any).strict;
  }

  protected get _committing(): boolean {
    return (this.storeInstance as any)._committing;
  }

  constructor(public options: StoreOptions<any>) {
    this.storeInstance = new VuexStore(options);
    this._commit = this.storeInstance.commit;
    this.id = id++;

    const that = this;
    (this.storeInstance as any).commit = function (
      this: VuexStore<any>,
      type: string,
      payload: any = undefined,
      options: CommitOptions = {}
    ) {
      that._commit(type as any, payload, options);
    };
    this._initPrivateProperties();
    this.setOptions(options);
  }

  public setOptions(options: StoreOptions<any>) {
    Object.assign(this.options, options);
  }

  private _initPrivateProperties() {
    [
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
    ].forEach((key) => {
      (this as any)[key] = (this.storeInstance as any)[key];
    });
  }

  public replaceState(state: State): void {
    return this.storeInstance.replaceState(state);
  }

  public getModuleFromType(type: string): string {
    const lastIndex = type.lastIndexOf('/');
    return lastIndex === -1 ? '' : type.slice(0, lastIndex);
  }

  public commit<T extends keyof Mutations>(
    type: Extract<T, string>,
    payload: GetPayLoad<Mutations, T> | undefined = undefined,
    options?: CommitOptions
  ) {
    this.storeInstance.commit(type as any, payload, options);
  }

  public dispatch: StoreDispatch<Actions> = ((type: any, payload: any, options?: DispatchOptions) => {
    return this.storeInstance.dispatch(type, payload, options);
  }) as any;

  subscribe<P extends MutationPayload>(
    fn: (mutation: P, state: State) => any,
    options?: SubscribeOptions
  ): () => void {
    return this.storeInstance.subscribe(fn, options);
  }

  subscribeAction<P extends ActionPayload>(
    fn: SubscribeActionOptions<P, State>,
    options?: SubscribeOptions
  ): () => void {
    return this.storeInstance.subscribeAction(fn, options);
  }

  watch<T>(
    getter: (state: State, getters: any) => T,
    cb: (value: T, oldValue: T) => void,
    options?: WatchOptions
  ): () => void {
    return this.storeInstance.watch(getter, cb, options);
  }

  public registerModule<T>(path: string[], module: Module<T, State>, options?: VuexModuleOptions): void;
  public registerModule<T>(path: string, module: Module<T, State>, options?: VuexModuleOptions): void;
  public registerModule<T>(path: string | string[], module: Module<T, State>, options?: VuexModuleOptions): void {
    return this.storeInstance.registerModule(path as any, module, options);
  }

  public unregisterModule(path: string): void;
  public unregisterModule(path: string[]): void;
  public unregisterModule(path: string | string[]): void {
    return this.storeInstance.unregisterModule(path as any);
  }

  public hasModule(path: string): boolean;
  public hasModule(path: string[]): boolean;
  public hasModule(path: string | string[]): boolean {
    return this.storeInstance.hasModule(path as any);
  }

  public hotUpdate(options: {
    actions?: ActionTree<State, State>;
    mutations?: MutationTree<State>;
    getters?: GetterTree<State, State>;
    modules?: ModuleTree<State>;
  }): void {
    return this.storeInstance.hotUpdate(options);
  }
}
