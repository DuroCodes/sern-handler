import type { MessagePackage, Nullable, Visibility } from "../../types/handler/handler";
import { CommandType } from "../../types/handler/handler";
import { Files } from "../utils/readFile"
import type {  ApplicationCommandOptionData, Awaitable, Client, CommandInteraction, CommandInteractionOptionResolver, Message} from "discord.js";
import type { possibleOutput } from "../../types/handler/handler"
import { Err, Ok, Result, Option, None, Some } from "ts-results";
import type { Utils } from "../utils/preprocessors/args";




export namespace Sern {
    export class Handler {
        private wrapper: Sern.Wrapper;
        private CtxHandler : CtxHandler = new CtxHandler();
        constructor(
            wrapper : Sern.Wrapper,
            ) {
             this.wrapper = wrapper;
             this.wrapper.client
                .on("ready", async () => {
                    if (this.wrapper.init !== undefined) this.wrapper.init();
                    await Files.registerModules(this);
                    
                    
                })

                .on("messageCreate", async message => {               
                        
                    let tryFmt = this.CtxHandler.listen({ message: Some(message), interaction : None, prefix: this.prefix}).fmt();
                    if (tryFmt.err) return;
                    const commandName = this.CtxHandler.fmtMsg!.shift()!;
                    const module = Files.Commands.get(commandName) ?? Files.Alias.get(commandName)
                    let cmdResult = (await this.commandResult(module?.mod, message))  
                    if (cmdResult === undefined) return;
                       
                    message.channel.send(cmdResult)
                    this.CtxHandler.clear();
                })

                .on("interactionCreate", async interaction => {
                    if(!interaction.isCommand()) return;
                    const module = Files.Commands.get(interaction.commandName); 
                    await this.interactionResult(module, interaction);

                })
            }

            private async interactionResult(
                module: { mod: Sern.Module<unknown>, options: ApplicationCommandOptionData[]} | undefined,
                interaction: CommandInteraction) : Promise<possibleOutput | undefined> {

                if (module === undefined) return "Unknown slash command!";
                const name = Array.from(Files.Commands.keys()).find(it => it === interaction.commandName)!;

                (await this.client.guilds.fetch(this.privateServerId))
                .commands
                .create({
                    name, 
                    description : module.mod.desc,
                    options: module.options
                });
                if(module.mod.type === CommandType.SLASH) return "This is not a slash command";

                let parsedArgs = module.mod.parse?.({message: None, interaction: Some(interaction)}, interaction.options ?? []) ?? Ok([]);
                module.mod.delegate({message : None, interaction: Some(interaction)}, Ok(parsedArgs)  );
                
            }

            private async commandResult(module: Sern.Module<unknown> | undefined, message: Message) : Promise<possibleOutput| undefined> {
                if (module === undefined) return "Unknown legacy command";
                if (module.visibility === "private" && message.guildId !== this.privateServerId) {
                    return "This command is not availible in this guild!"
                }
                if (module.type === CommandType.SLASH) return `This may be a slash command and not a legacy command`
                    let args = this.CtxHandler.fmtMsg.join(" ");
                    let parsedArgs = module.parse === undefined ? Ok("") : module.parse( { message : Some(message), interaction : None }, args);
                if(parsedArgs.err) return parsedArgs.val;
                    let fn = await module.delegate({interaction : None, message: Some(message)}, parsedArgs)
                return fn instanceof Object ? fn.val : undefined 
            }

            get prefix() : string {
                return this.wrapper.prefix;
            }
            get commandDir() : string {
                return this.wrapper.commands;
            }
            get client() : Client<boolean> {
                return this.wrapper.client
            }
            get privateServerId() {
                return this.wrapper.privateServerId;
            }
        
        
    }
    /**
     * An object to be passed into Sern.Handler constructor. 
     * ```ts
     * new Sern.Handler({
     *   client,       // Discord.js client instance          
     *   prefix : "!", // an example prefix
     *   commands: "",  //commands directory
     *   init : () => console.log("Bot is ready") // function called on ready
     *   privateServerId : "" // a server id that can be used for private or test server
     * })
     * ```
     */
    export interface Wrapper {
        readonly client : Client,
        readonly prefix: string,
        readonly commands : string
        init? : () => void,
        readonly privateServerId : string
    }

    type Context = {
        message : Option<Message>,
        interaction : Option<CommandInteraction>
    }
    type MapArgTypes = {
        2 : Omit<CommandInteractionOptionResolver, "getMessage" | "getFocused">,
        4: string
        6: MapArgTypes["2"] | MapArgTypes["4"]
    }

    export interface Module<T> { 
        alias: string[],
        desc : string,
        visibility : Visibility,
        type: CommandType,
        delegate : ( eventParams : Context  , args: Ok<T> ) => Awaitable<Result<possibleOutput, string > | void>  
        parse? : <C extends Module<unknown>["type"]>(ctx: Context, args: MapArgTypes[C] ) => Utils.ArgType<T>
    }

     
}

class CtxHandler {

    private msg : Nullable<MessagePackage> = null;
    private resMsg : Nullable<string[]> =  null;

    listen (msg : MessagePackage): CtxHandler  {
        this.msg = msg
        return this;
    }

    isCommand() : boolean {
        const msg = this.msg!.message;
        if(msg.some) {
            const someMsg = msg.val.content.trim();
            return msg.unwrap().author.bot || someMsg.slice(this.prefix.length).toLowerCase() !== this.prefix
        }
        return false;
    } 

    fmt() : Result<void, void> {
        if (this.isCommand()) return Err(void 0);
        this.resMsg = this.message.unwrap().content.slice(this.prefix.length).trim().split(/\s+/g);
        return Ok(void 0);
    }
    clear() {
        this.msg = null;
    }

    get fmtMsg() {
        return this.resMsg!;
    }

    get messagePack() {
        return this.msg;
    }
    
    get message() {
        return this.msg!.message
    }
    
    get prefix() {
        return this.msg!.prefix
    }

}