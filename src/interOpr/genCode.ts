import {InterOpr} from "./interOpr";
import { InterOprKind } from "./interOprKind";

export class GenCode{
    private codes:InterOpr[];
    private currentIndex:number;
    constructor(){
        this.currentIndex = 0;
        this.codes = [];
    }

    private Emit(code:InterOpr){
        const index = this.currentIndex++;
        this.codes[index] = code;
        return index;
    }

    public EmitStart(){
        return this.Emit(new InterOpr(InterOprKind.START,1,null,-1,0));
    }

    public EmitCopy(){
        return this.Emit(new InterOpr(InterOprKind.COPY,null,null,0,0));
    }

    public EmitInc(){
        return this.Emit(new InterOpr(InterOprKind.INC,null,null,0,0));
    }

    public EmitDec(){
        return this.Emit(new InterOpr(InterOprKind.DEC,null,null,0,0));
    }

    public EmitLoad(level:number,address:number){
        return this.Emit(new InterOpr(InterOprKind.LOAD,level,address,0,0));
    }

    public EmitPushi(level:number,address:number){
        return this.Emit(new InterOpr(InterOprKind.PUSHI,level,address,0,0));
    }

    public EmitAss(){
        return this.Emit(new InterOpr(InterOprKind.ASS,null,null,0,0));
    }

    public EmitPush(value:number){
        return this.Emit(new InterOpr(InterOprKind.PUSH,value,null,0,0));
    }

    public EmitPop(){
        return this.Emit(new InterOpr(InterOprKind.POP,null,null,0,0));
    }

    public EmitCall(index:number){
        return this.Emit(new InterOpr(InterOprKind.CALL,index,null,0,0));
    }

    public EmitLabel(name:string){
        return this.Emit(new InterOpr(InterOprKind.LABEL,name,null,-1,0));
    }

    public EmitReturn(num:number,level:number,numParams:number){
        return this.Emit(new InterOpr(InterOprKind.RET,num,null,level,numParams));
    }

    public EmitAdd(){
        return this.Emit(new InterOpr(InterOprKind.ADD,null,null,0,0));
    }

    public EmitSub(){
        return this.Emit(new InterOpr(InterOprKind.SUB,null,null,0,0));
    }

    public EmitNeg(){
        return this.Emit(new InterOpr(InterOprKind.NEG,null,null,0,0));
    }

    public EmitMul(){
        return this.Emit(new InterOpr(InterOprKind.MUL,null,null,0,0));
    }

    public EmitDiv(){
        return this.Emit(new InterOpr(InterOprKind.DIV,null,null,0,0));
    }

    public EmitMod(){
        return this.Emit(new InterOpr(InterOprKind.MOD,null,null,0,0));
    }

    public EmitPrt(){
        return this.Emit(new InterOpr(InterOprKind.PRT,null,null,0,0));
    }

    public EmitPrtln(){
        return this.Emit(new InterOpr(InterOprKind.PRTLN,null,null,0,0));
    }

    public EmitGrt(){
        return this.Emit(new InterOpr(InterOprKind.GRT,null,null,0,0));
    }

    public EmitLes(){
        return this.Emit(new InterOpr(InterOprKind.LES,null,null,0,0));
    }

    public EmitEgr(){
        return this.Emit(new InterOpr(InterOprKind.EGR,null,null,0,0));
    }

    public EmitEle(){
        return this.Emit(new InterOpr(InterOprKind.ELE,null,null,0,0));
    }

    public EmitEq(){
        return this.Emit(new InterOpr(InterOprKind.EQ,null,null,0,0));
    }

    public EmitNeq(){
        return this.Emit(new InterOpr(InterOprKind.NEQ,null,null,0,0));
    }

    public EmitTrue(){
        return this.Emit(new InterOpr(InterOprKind.TRUE,null,null,0,0));
    }

    public EmitFalse(){
        return this.Emit(new InterOpr(InterOprKind.FALSE,null,null,0,0));
    }

    public EmitJpc(num:number){
        return this.Emit(new InterOpr(InterOprKind.JPC,num,null,0,0));
    }

    public EmitJmp(num:number){
        return this.Emit(new InterOpr(InterOprKind.JMP,num,null,0,0));
    }

    public EmitBegin(){
        return this.Emit(new InterOpr(InterOprKind.BEGIN,null,null,0,0));
    }

    public EmitEnd(){
        return this.Emit(new InterOpr(InterOprKind.END,null,null,0,0));
    }

    public BackPatch1(index:number,newIndex:number){
        console.log("S",index,newIndex)
        console.log(this.codes[newIndex])
        this.codes[index].setOpr1(newIndex);
    }

    public BackPatch2(index:number,newIndex:number){
        this.codes[index].setOpr2(newIndex);
    }

    public getCodes(){return this.codes;}

    public getIndex(){return this.currentIndex;}
}