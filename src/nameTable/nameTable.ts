import { Types } from "../type/type";
import {IdentFactor, IdentKind} from "./identFactor"

type Display = {
    address:number;
    localAddress:number;
}

export class NameTable{
    private table:IdentFactor[];
    private level:number;
    private localAddress:number;
    private curFunctionAddress:number;
    private display:{address:number,localAddress:number}[];
    constructor(){
        this.table = [];
        this.level = -1;
        this.localAddress = 1;
        this.curFunctionAddress = 0;
        this.display = [];
    }

    public RegisterFunction(name:string,index:number){
        this.curFunctionAddress = this.table.length;
        this.table.push(new IdentFactor(name,null,IdentKind.FUNC,1,this.level++,index,0));
        this.display.push({address:this.table.length,localAddress:this.localAddress});
        this.localAddress = 1;
        return this.curFunctionAddress;
    }

    public AddFunctionParameter(name:string){
        const address = this.table.length;
        this.table.push(new IdentFactor(name,null,IdentKind.PARAM,1,this.level,0,null));
        this.table[this.curFunctionAddress].incNumParams();
        return address;
    }

    public EndFunctionParams(){
        const numParams = this.table[this.curFunctionAddress].NumParams;
        if(numParams == null) throw new Error("END FUNC PARAMS ERROR")

        for(let i =1;i<=numParams;i++){
            this.table[this.curFunctionAddress+i].SetRelAddress = i -numParams - 3
        }
        return numParams
    }

    public EndFunction(){
        const _dis= this.display.pop();
        if(_dis == undefined) throw new Error("");
        this.table.length = _dis.address;
        this.localAddress = this.localAddress; 
        this.level--;
    }

    public RegisterVar(name:string,type:Types|null){
        this.table.push(new IdentFactor(name,type,IdentKind.VAR,1,this.level,this.localAddress++,null));
    }

    public RegisterConst(name:string,type:Types|null){
        this.table.push(new IdentFactor(name,type,IdentKind.CONST,1,this.level,this.localAddress++,null));
    }

    public BeginBlock(){
        this.display.push({address:this.table.length,localAddress:this.localAddress});
        this.localAddress = 1;
        this.level++;
    }

    public EndBlock(){
        const _dis = this.display.pop();
        if(_dis == undefined) throw new Error("");
        this.table.length = _dis.address;
        this.localAddress = this.localAddress;
        this.level--;
    }

    public CheckIdentType(name:string,type:Types){
        const ident = this.Exist(name);
        if(ident?.Type != type) throw new Error("Type Error!");
    }

    public SearchIdentByOffset(offset:number){
        let length = this.table.length;
        if(length == 0) return;

        for(let i = length-1;i >=0;i--){
            if(this.table[i].Level == this.level && this.table[i].RelAddress == this.localAddress - offset) return this.table[i];
        }

        throw new Error("");
    }

    //nameが存在するか　存在したらその識別子を返す
    public Exist(name:string){
        let length = this.table.length;
        if(length == 0) return;

        for(let i = length-1;i >=0;i--){
            if(this.table[i].Name == name) return this.table[i];
        }

        throw new Error(`Name Error!! The Identifier '${name}' was not found.`);
    }

    public get Table():IdentFactor[]{return this.table;}

    public get Level():number{return this.level;}

    public get LocalAddress():number{return this.localAddress;}
}