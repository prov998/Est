import { Modifier } from "../type/modifier_type";
import { Types } from "../type/type";

export enum IdentKind{
    FUNC = "FUNC",
    VAR = "VAR",
    CONST = "CONST",
    PARAM = "PARAM",
    CLASS = "CLASS",
    PROPERTY = "PROPERTY",
}

export class IdentFactor{
    private name:string;
    private type:Types|null;
    private identKind:IdentKind;
    private size:number
    private level:number;
    private relAddress:number;
    private numParams:number|null;
    private modifier:Modifier = Modifier.PUB;
    private in_class_number:number|null = null;
    private className:string = "";

    constructor(name:string,type:Types|null,identKind:IdentKind,size:number,level:number,relAddress:number,numParams:number|null,modifier:Modifier,in_class_number:number|null = null,className:string = ""){
        this.name = name;
        this.type = type; //type ->intなどの型注釈
        this.identKind = identKind //identKind ->識別子のパターン
        this.size = size;
        this.level = level;
        this.relAddress = relAddress;
        this.numParams = numParams; //関数の場合に使用
        this.modifier = modifier;
        this.in_class_number = in_class_number;
        this.className = className;
    }

    public get Name():string{return this.name;}
    public get Type():Types|null{return this.type;}
    public get IdentKind():IdentKind{return this.identKind;}
    public get Size():number{return this.size;}
    public get Level():number{return this.level;}
    public get RelAddress():number {return this.relAddress;}
    public get NumParams():number|null {return this.numParams;}
    public get Modifier():Modifier{return this.modifier;}
    public get InClassNumber():null|number{return this.in_class_number;}
    public get ClassName():string{return this.className;}

    public incNumParams(){
        if(this.numParams == null) throw new Error("ERROR");
        this.numParams++;
    }

    public set SetRelAddress(v : number) {
        this.relAddress = v;
    }

    public set SetType(type:Types){
        this.type = type;
    }

    public set SetSize(size:number){
        this.size = size;
    }

    public set SetMemberNumber(num:number){
        this.in_class_number = num;
    }

    public set SetClassName(name:string){
        this.className = name;
    }
    
}