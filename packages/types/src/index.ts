export type {
  ActorContext,
  AdminConfig,
  AuthContextPayload,
  CMSConfig,
  DatabaseConfig,
  Permission,
  PermissionChecker,
  PermissionCheckInput,
  RBACRole,
  RequestContext,
  RoleAssignment,
  SiteContext,
  ViseedCMS,
} from './cms'
export {
  checkPermission,
  HOOK_KEY,
  PERMISSION_CATALOG,
  ROLE_PERMISSION_MATRIX,
  resolvePermissionsForRoles,
  SINGLE_SITE_CONTEXT,
  SITE_ADMIN_PERMISSIONS,
  SITE_CONTENT_WRITER_PERMISSIONS,
  toAuthContextPayload,
} from './cms'
export type {
  ComponentEntry,
  ComponentRegistry,
} from './component-registry'
export type {
  PluginManifest,
  PluginRegistryEntry,
  PluginRegistryResponse,
} from './manifest'
export type {
  CMSHookName,
  CMSPlugin,
  CMSPluginHooks,
  CMSRouteContextHelpers,
  DashboardWidgetDef,
  DashboardWidgetSize,
  PluginAdminConfig,
  PluginAdminMenuItem,
  PluginFactory,
  PluginLifecycle,
  PluginPublicConfig,
  ThemeRenderRequestContext,
  WidgetTypeDef,
} from './plugin'

export type {
  CMSTheme,
  CMSThemeHooks,
  LayoutContext,
  LayoutHelpers,
  ThemeAssets,
  ThemeFactory,
  ThemeLayoutEntry,
  ThemeLayoutMap,
  ThemeMenuItem,
  ThemeSettingsSchema,
  ThemeSettingsValue,
} from './theme'

export type {
  ThemeExtensionManifest,
  ThemeExtensionRegionId,
  ThemeExtensionSlotId,
  ThemeExtensionSlotManifestEntry,
  ThemeExtensionWidgetDescriptor,
  ThemeExtensionWidgetKind,
  ThemeExtensionWidgetRegistration,
} from './theme-extension-points'

export { THEME_EXTENSION_REGION_IDS } from './theme-extension-points'
export type {
  CategoryLayoutData,
  HomeLayoutData,
  LayoutDataMap,
  NotFoundLayoutData,
  OptionalLayoutKey,
  OptionalMenuZone,
  PageLayoutData,
  PostLayoutData,
  RequiredLayoutKey,
  RequiredMenuZone,
  ThemeLayoutKey,
  ThemeMenuDeclaration,
  ThemeMenuZone,
} from './theme-layout'
export type {
  ThemeManifest,
  ThemeRegistryEntry,
  ThemeRegistryResponse,
} from './theme-manifest'
export type {
  ThemeSettingsBooleanField,
  ThemeSettingsColorField,
  ThemeSettingsField,
  ThemeSettingsFieldBase,
  ThemeSettingsImageField,
  ThemeSettingsItemField,
  ThemeSettingsItemListField,
  ThemeSettingsLinkItem,
  ThemeSettingsLinkListField,
  ThemeSettingsSection,
  ThemeSettingsSelectField,
  ThemeSettingsSelectOption,
  ThemeSettingsTextareaField,
  ThemeSettingsTextField,
} from './theme-settings'
export { resolveDefaultSettings } from './theme-settings'
