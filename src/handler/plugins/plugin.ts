//
// Plugins can be inserted on all commands and are emitted
//
// 1.) on ready event, where all commands are loaded. 
// 2.) on corresponding observable (command triggers)
//  
// The goal of plugins is to organize commands and 
// provide extensions to repetitive patterns 
// examples include refreshing modules,
// categorizing commands, cooldowns, permissions, etc
// Plugins are reminisce of middleware in express.
//

import type { Awaitable, Client } from "discord.js";
import type { Err, Ok, Result } from "ts-results";
import type { Module, Override, Wrapper } from "../..";
import type { CommandType } from "../sern";
import type { ModuleDefs } from "../structures/modules/commands/moduleHandler";
import type { BaseModule, PluggedModule } from "../structures/modules/module";

export enum PluginType {
    Command = 0b01,
    Event   = 0b10
}

export interface Controller {
  next : () => Ok<void>,
  stop : () => Err<void>

}

type executeCmdPlugin = { execute : ( wrapper : Wrapper, controller : Controller ) => Result<void, void> }

interface BasePlugin extends Override<BaseModule, executeCmdPlugin>{
    type : PluginType
}

export type CommandPlugin = {
    type : PluginType.Command
} & Override<BasePlugin, { 
    execute : (
        wrapper:Client, module : Module, controller:Controller
    ) => Awaitable<Result<void,void>>
}>;

export type EventPlugin<T extends CommandType = 1> = {
    type : PluginType.Event,
    modTy : T 
} & Override<BasePlugin, {
    execute : ( event : Parameters<ModuleDefs[T]['execute']>, controller: Controller ) => Awaitable<Result<void,void>> 
}>;

export type SernPlugin =
    CommandPlugin
    | EventPlugin;

export function commmand(plug : CommandPlugin) { 
    return plug;
}

export function event(plug : EventPlugin) {
    return plug;
}

export function apply(...plugins: SernPlugin[]) {
    return plugins;
}

export function sernModule
    (plugins : SernPlugin[], mod : Module ) : PluggedModule { 
        return {
            mod,
            plugins 
        }
}





