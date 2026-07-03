/**
 * 迁移对照：从 `utils/vuex-tools` 迁移到 `vuex-typed-store`
 *
 * 变更内容：仅导入路径调整，API 完全兼容
 */

// ==================== 迁移前 ====================
// import {
//   Store,
//   GetModuleState,
//   GetModuleMutations,
//   GetModuleActions,
//   GetModuleGetters,
//   GetModuleActionContext
// } from 'utils/vuex-tools';

// ==================== 迁移后 ====================
import {
  Store,
  GetModuleState,
  GetModuleMutations,
  GetModuleActions,
  GetModuleGetters,
  GetModuleActionContext
} from 'vuex-typed-store';

// 其他用法完全一致，无需修改任何业务代码。
