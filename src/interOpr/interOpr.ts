import { InterOprKind } from "./interOprKind";

export class InterOpr{
    private kind:InterOprKind;
    private opr1:number|null|string;
    private opr2:number|null|string;
    private level:number;
    private numParams:number

    constructor(kind:InterOprKind,opr1:number|null|string,opr2:number|null|string,level:number,numParams:number){
        this.kind = kind;
        this.opr1 = opr1;
        this.opr2 = opr2;
        this.level = level;
        this.numParams = numParams
    }

    public setOpr1(opr:number){this.opr1 = opr;}

    public setOpr2(opr:number){this.opr2 = opr;}

    public get Kind():InterOprKind{return this.kind;}

    public get Opr1():number|null|string{return this.opr1;}

    public get Opr2():number|null|string{return this.opr2;}

    public get Level():number{return this.level;}

    public get NumParams():number{return this.numParams;}
}