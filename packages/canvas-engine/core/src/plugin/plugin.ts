/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { ContainerModule, interfaces } from 'inversify';

import { PlaygroundContribution } from '../playground-contribution';
import { type Playground } from '../playground';

export interface PluginContext {
  /**
   * 画布实例
   */
  playground: Playground;
  /**
   * IOC 容器
   */
  container: interfaces.Container;
  /**
   * 获取 IOC 容器的 单例模块
   * @param identifier
   */
  get<T>(identifier: interfaces.ServiceIdentifier<T>): T;

  /**
   * 获取 IOC 容器的 多例模块
   */
  getAll<T>(identifier: interfaces.ServiceIdentifier<T>): T[];
}

export const PluginContext = Symbol('PluginContext');
export interface PluginBindConfig {
  bind: interfaces.Bind;
  unbind: interfaces.Unbind;
  isBound: interfaces.IsBound;
  rebind: interfaces.Rebind;
}

export interface PluginConfig<Opts, CTX extends PluginContext = PluginContext> {
  /**
   * 插件 IOC 注册, 等价于 containerModule
   * @param ctx
   */
  onBind?: (bindConfig: PluginBindConfig, opts: Opts) => void;
  /**
   * 画布注册阶段
   */
  onInit?: (ctx: CTX, opts: Opts) => void;
  /**
   * 画布准备阶段，一般用于 dom 事件注册等
   */
  onReady?: (ctx: CTX, opts: Opts) => void;
  /**
   * 画布销毁阶段
   */
  onDispose?: (ctx: CTX, opts: Opts) => void;
  /**
   * 画布所有 layer 渲染结束
   */
  onAllLayersRendered?: (ctx: CTX, opts: Opts) => void;
  /**
   * IOC 模块，用于更底层的插件扩展
   */
  containerModules?: interfaces.ContainerModule[];
}

export const Plugin = Symbol('Plugin');

export type Plugin<Options = any> = {
  options: Options;
  pluginId: string;
  singleton: boolean;
  initPlugin: () => void;
  contributionKeys?: interfaces.ServiceIdentifier[];
  containerModules?: interfaces.ContainerModule[];
};

export interface PluginsProvider<CTX extends PluginContext = PluginContext> {
  (ctx: CTX): Plugin[];
}

export type PluginCreator<Options> = (opts: Options) => Plugin<Options>;

export function loadPlugins(plugins: Plugin[], container: interfaces.Container): void {
  const pluginInitSet = new Set<string>();
  const singletonPluginIds = new Set<string>();
  const modules: interfaces.ContainerModule[] = plugins
    .reduceRight((result: Plugin[], plugin: Plugin) => {
      const shouldSkip = plugin.singleton && singletonPluginIds.has(plugin.pluginId);
      if (plugin.singleton) {
        singletonPluginIds.add(plugin.pluginId);
      }
      return shouldSkip ? result : [plugin, ...result];
    }, [])
    .reduce((res, plugin) => {
      if (!pluginInitSet.has(plugin.pluginId)) {
        plugin.initPlugin();
        pluginInitSet.add(plugin.pluginId);
      }
      if (plugin.containerModules && plugin.containerModules.length > 0) {
        for (let module of plugin.containerModules) {
          // 去重
          if (!res.includes(module)) {
            res.push(module);
          }
        }
        return res;
      }
      return res;
    }, [] as interfaces.ContainerModule[]);
  modules.forEach((module) => container.load(module));
  plugins.forEach((plugin) => {
    if (plugin.contributionKeys) {
      for (const contribution of plugin.contributionKeys) {
        container.bind(contribution).toConstantValue(plugin.options);
      }
    }
  });
}

function toPlaygroundContainerModule<Options, CTX extends PluginContext = PluginContext>(
  config: {
    onInit?: (ctx: CTX, opts: Options) => void;
    onDispose?: (ctx: CTX, opts: Options) => void;
    onReady?: (ctx: CTX, opts: Options) => void;
    onAllLayersRendered?: (ctx: CTX, opts: Options) => void;
  },
  opts: Options
): interfaces.ContainerModule {
  return new ContainerModule((bind) => {
    bind(PlaygroundContribution).toDynamicValue((ctx) => {
      const pluginContext = ctx.container.get<CTX>(PluginContext);
      return {
        onInit: () => {
          config.onInit?.(pluginContext, opts);
        },
        onReady: () => {
          config.onReady?.(pluginContext, opts);
        },
        onDispose: () => {
          config.onDispose?.(pluginContext, opts);
        },
        onAllLayersRendered: () => {
          config.onAllLayersRendered?.(pluginContext, opts);
        },
      };
    });
  });
}

let pluginIndex = 0;
export function definePluginCreator<Options, CTX extends PluginContext = PluginContext>(
  config: {
    containerModules?: interfaces.ContainerModule[];
    contributionKeys?: interfaces.ServiceIdentifier[];
    singleton?: boolean;
  } & PluginConfig<Options, CTX>
): PluginCreator<Options> {
  const { contributionKeys, singleton = false } = config;
  pluginIndex += 1;
  const pluginId = `Playground_${pluginIndex}`;
  return (opts: Options) => {
    const containerModules: interfaces.ContainerModule[] = [];
    let isInit = false;

    return {
      pluginId,
      singleton,
      initPlugin: () => {
        // 防止 plugin 被上层业务多次 init
        if (isInit) {
          return;
        }
        isInit = true;

        if (config.containerModules) {
          containerModules.push(...config.containerModules);
        }
        if (config.onBind) {
          containerModules.push(
            new ContainerModule((bind, unbind, isBound, rebind) => {
              config.onBind!(
                {
                  bind,
                  unbind,
                  isBound,
                  rebind,
                },
                opts
              );
            })
          );
        }
        if (config.onInit || config.onDispose || config.onReady || config.onAllLayersRendered) {
          containerModules.push(toPlaygroundContainerModule<Options, CTX>(config, opts));
        }
      },
      options: opts,
      contributionKeys,
      containerModules,
    };
  };
}

/**
 * @example
 * createPlaygroundPlugin({
 *    // IOC 注册
 *    onBind(bind) {
 *      bind('xxx').toSelf().inSingletonScope()
 *    },
 *    // 画布初始化
 *    onInit(ctx) {
 *      ctx.playground.registerLayer(MyLayer)
 *    },
 *    // 画布销毁
 *    onDispose(ctx) {
 *    },
 *    // IOC 模块
 *    containerModules: [new ContainerModule(() => {})]
 * })
 */
export const createPlaygroundPlugin = <CTX extends PluginContext = PluginContext>(
  options: PluginConfig<undefined, CTX>
) => definePluginCreator<undefined, CTX>(options)(undefined);
