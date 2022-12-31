import { Modifier } from "../type/modifier_type";
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
    private curClassAddress:number
    private curFunctionAddress:number;
    private display:{address:number,localAddress:number}[];
    constructor(){
        this.table = [];
        this.level = -1;
        this.localAddress = 1;
        this.curFunctionAddress = 0;
        this.curClassAddress = 0;
        this.display = [];
    }

    public RegisterClass(name:string,index:number){
        this.curClassAddress = this.table.length;
        this.table.push(new IdentFactor(name,null,IdentKind.CLASS,1,this.level++,index,0,Modifier.PUB));
        this.display.push({address:this.table.length,localAddress:this.localAddress});
        this.localAddress = 1;
        return this.curClassAddress;
    }

    public ClassOwnMemberBackPatch(name:string,new_member_number:number){
        const length = this.table.length;

        for(let i = length-1;i>=0;i--){
            if(this.table[i].Name == name) this.table[i].SetMemberNumber = new_member_number;
        }
    }

    public RegisterFunction(name:string,index:number,in_class_number:number|null = null,className:string = ""){
        this.curFunctionAddress = this.table.length;
        this.table.push(new IdentFactor(name,null,IdentKind.FUNC,1,this.level++,index,0,Modifier.PUB,in_class_number,className));
        this.display.push({address:this.table.length,localAddress:this.localAddress});
        this.localAddress = 1;
        return this.curFunctionAddress;
    }

    public FunctionTypeBackPatch(type:Types){
        this.table[this.curFunctionAddress].SetType = type;
    }

    public AddFunctionParameter(name:string,type:Types){
        const address = this.table.length;
        this.table.push(new IdentFactor(name,type,IdentKind.PARAM,1,this.level,0,null,Modifier.PUB));
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

    public SetSizeArray(new_size:number,name:string){
        const length = this.table.length;

        for(let i = length-1;i>=0;i--){
            if(this.table[i].Name == name) this.table[i].SetSize = new_size;
        }

        this.localAddress += new_size-1;
    }

    public SearchClass(name:string){
        const length = this.table.length;

        for(let i = length-1;i>=0;i--){
            if(this.table[i].Name == name && this.table[i].IdentKind == IdentKind.CLASS) return this.table[i]; 
        }

    }

    public classNameBackPatch(name:string,new_name:string){
        this.table.forEach(ident=>{
            if(ident.Name == name) ident.SetClassName = new_name;
        })
    }

    public EndClass(){
        const _dis= this.display.pop();
        if(_dis == undefined) throw new Error("");
        //this.table.length = _dis.address;
        this.localAddress = _dis.localAddress; 
        this.level--;
    }

    public EndFunction(){
        const _dis= this.display.pop();
        if(_dis == undefined) throw new Error("");
        this.table.length = _dis.address;
        this.localAddress = _dis.localAddress;
        this.level--;
    }

    public RegisterVar(name:string,type:Types|null,size:number,in_class_number:null|number = null){
        this.table.push(new IdentFactor(name,type,IdentKind.VAR,size,this.level,this.localAddress,null,Modifier.PUB,in_class_number));
        this.localAddress += size
    }

    public RegisterConst(name:string,type:Types|null,size:number,in_class_number:null|number = null){
        this.table.push(new IdentFactor(name,type,IdentKind.CONST,size,this.level,this.localAddress,null,Modifier.PUB,in_class_number));
        this.localAddress += size
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

    public IsIdentTypeNull(name:string):boolean{
        const ident = this.Exist(name);
        return ident?.Type == null;
    }

    public SetType(name:string,type:Types){
        const length = this.table.length;

        for(let i = length-1;i>=0;i--){
            if(this.table[i].Name == name) this.table[i].SetType = type;
        }
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