import { InterOpr } from "../interOpr/interOpr";
import { InterOprKind } from "../interOpr/interOprKind";

export class VM{
    private codes:InterOpr[];
    private pc:number; //program counter
    private stack:number[]|string[];
    private dymem:number[];
    private stackTop:number;
    private bp:number; //block pointer
    private dp:number; //dymemの先頭のアドレス
    private fp:number; //frame pointer
    private output:string;
    constructor(codes:InterOpr[]){
        this.codes = codes;
        this.pc = 0;
        this.stack = [0,0,0];
        this.dymem = [];
        this.stackTop = this.stack.length;
        this.dp = -1;
        this.bp = 0;
        this.fp = 0;
        this.output = "";
    }

    public get Stack():number[]|string[]{return this.stack;}
    public get Dymem():number[]{return this.dymem;}
    public get Output():string{return this.output;}

    public run(){
        while(true){
            let code = this.codes[this.pc++];
            switch(code.Kind){
                case InterOprKind.BEGIN:
                    this.runBegin();
                    break;
                case InterOprKind.END:
                    this.runEnd();
                    break;
                case InterOprKind.JPC:
                    if(typeof code.Opr1 === 'number') this.runJpc(code.Opr1);
                    break;
                case InterOprKind.JMP:
                    if(typeof code.Opr1 === 'number') this.runJmp(code.Opr1);
                    break;
                case InterOprKind.START:
                    this.runStart(code);
                    break;
                case InterOprKind.LOAD:
                    if(typeof code.Opr1 === 'number' && typeof code.Opr2 === 'number')this.runLoad(code.Opr1,code.Opr2);
                    break;
                case InterOprKind.POP:
                    this.runPop();
                    break;
                case InterOprKind.ASS:
                    this.runAss();
                    break;
                case InterOprKind.PUSH:
                    if(typeof code.Opr1 === 'number') this.runPush(code.Opr1);
                    break;
                case InterOprKind.PUSHI:
                    if(typeof code.Opr1 === 'number' && typeof code.Opr2 === 'number')this.runPushi(code.Opr1,code.Opr2);
                    break;
                case InterOprKind.LABEL:
                    break;
                case InterOprKind.CALL:
                    this.runCall(code);
                    break;
                case InterOprKind.PRT:
                    this.runPrt();
                    break;
                case InterOprKind.RET:
                    this.runRet(code);
                    break;
                case InterOprKind.PRT:
                    this.runPrt();
                    break;
                case InterOprKind.PRTLN:
                    this.runPrtln();
                    break;
                case InterOprKind.ADD:
                    this.runAdd();
                    break;
                case InterOprKind.SUB:
                    this.runSub();
                    break;
                case InterOprKind.NEG:
                    this.runNeg();
                    break;
                case InterOprKind.MUL:
                    this.runMul();
                    break;
                case InterOprKind.DIV:
                    this.runDiv();
                    break;
                case InterOprKind.MOD:
                    this.runMod();
                    break;
                case InterOprKind.EQ:
                    this.runEq();
                    break;
                case InterOprKind.NEQ:
                    this.runNeq();
                    break;
                case InterOprKind.GRT:
                    this.runGrt();
                    break;
                case InterOprKind.EGR:
                    this.runEgr();
                    break;
                case InterOprKind.LES:
                    this.runLes();
                    break;
                case InterOprKind.ELE:
                    this.runEle();
                    break;
                case InterOprKind.TRUE:
                    this.runTrue();
                    break;
                case InterOprKind.FALSE:
                    this.runFalse();
                    break;
                default:
                    console.log(code)
                    throw new Error("不明な指示です");
            }

            if(this.pc >= this.codes.length) break;
            if(this.pc == 0) break;
        }
    }

    private runBegin(){
        this.dymem[++this.dp] = this.bp;
        this.bp = this.dp;
    }

    private runEnd(){
        const before_bp = this.bp;
        this.bp = this.dymem[this.bp];

        this.dp = this.bp;
        this.dymem = this.dymem.slice(0,before_bp);
    }

    private runJpc(index:number){
        const bool = this.runPopNoOpr();

        if(bool == 0) this.pc = index;
    }

    private runJmp(index:number){
        console.log(this.dymem,"!!!")
        console.log(this.bp,"???")
        this.pc = index;
    }

    private runPushi(level:number,address:number){
        let new_bp = this.bp;
        if(level == -1){
            const realAddress = -1 + address;
            this.runPush(realAddress);
            return;
        }
        for(let i=0;i<level;i++){
            new_bp = this.dymem[new_bp];
        }
        this.runPush(new_bp+address);
    }

    private runAss(){
        const _address = this.runPopNoOpr();
        const _value = this.runPopNoOpr();

        const before_bp = this.bp;
        if(typeof _address == "number"&& typeof _value == "number") this.dymem[_address] = _value;
        if(before_bp != this.dymem.length) this.dp = this.dymem.length-1;
    }

    private runLoad(level:number,address:number){
        let new_bp = this.bp;
        if(level == -1){
            const realAddress = -1 + address;
            const value =this.dymem[realAddress];
            this.runPush(value);
            return;
        }
        for(let i=0;i<level;i++){
            new_bp = this.dymem[new_bp];
        }

        const value = this.dymem[new_bp+address];
        
        this.runPush(value);
    }

    private runPush(value:number|string){
        this.stack[this.stackTop++] = value;
    }

    private runPop(){
        const value = this.Stack[--this.stackTop];
        this.stack.length--;
        
        if(typeof value == "number") this.dymem[++this.dp] = value;
    }

    private runPopNoOpr(){
        const value = this.Stack[--this.stackTop];
        this.stack.length--;
        return value;
    }

    private runPrt(){
        const value = this.runPopNoOpr();

        this.output += value;
    }

    private runPrtln(){
        const value = this.runPopNoOpr();
        if(value == undefined) throw new Error("PRT ERROR!");
        this.output += value+"\n";
    }

    private runStart(code:InterOpr){
        if(typeof code.Opr1 === 'number') this.pc = code.Opr1;

        this.dymem[++this.dp] = -1;
        this.fp = this.dp;
        this.dymem[++this.dp] = -1;
        this.dymem[++this.dp] = -1;

        this.bp  =this.dp;
    }

    private runCall(code:InterOpr){

        this.dymem[++this.dp] = this.fp;
        this.fp = this.dp;
        
        this.dymem[++this.dp] = this.pc;
        this.dymem[++this.dp] = this.bp;

        this.bp = this.dp;

        if(typeof code.Opr1 === 'number') this.pc = code.Opr1;;
    }

    private runRet(code:InterOpr){
        const result = this.runPopNoOpr();
        this.bp = this.dymem[this.fp+2];
        this.pc = this.dymem[this.fp+1];
        this.dp = this.fp - code.NumParams - 1;

        this.fp = this.dymem[this.fp];
        if(this.pc != -1){
            this.dymem.length = this.dp+1;
            if(typeof code.Opr1 == "number") this.stackTop -= code.Opr1;
        }else{
            this.pc = 0;
        }

        if(typeof result == "number")this.runPush(result);
    }

    private runAdd(){
        const rs = this.runPopNoOpr();
        const ls = this.runPopNoOpr();

        if(typeof rs == "number" && typeof ls == "number"){
            const value = ls+rs;
            this.runPush(value);
        }
    }

    private runSub(){
        const rs = this.runPopNoOpr();
        const ls = this.runPopNoOpr();

        if(typeof ls == "number" && typeof rs == "number"){
            const value = ls - rs;
            this.runPush(value);
        }
    }

    private runNeg(){
        const rs = this.runPopNoOpr();

        if(typeof rs == "number"){
            const value = -rs;
            this.runPush(value);
        }
    }

    private runMul(){
        const rs = this.runPopNoOpr();
        const ls = this.runPopNoOpr();

        if(typeof ls == "number" && typeof rs == "number"){
            const value = ls * rs;
            this.runPush(value);
        }
    }

    private runDiv(){
        const rs = this.runPopNoOpr();
        const ls = this.runPopNoOpr();

        if(typeof ls == "number" && typeof rs == "number"){
            const value = ls / rs;
            this.runPush(value);
        }
    }

    private runMod(){
        const rs = this.runPopNoOpr();
        const ls = this.runPopNoOpr();

        if(typeof ls == "number" && typeof rs == "number"){
            const value = ls % rs;
            this.runPush(value);
        }
    }

    private runEq(){
        const rs = this.runPopNoOpr();
        const ls = this.runPopNoOpr();

        const value = rs == ls?1:0;
        this.runPush(value)
        console.log("ls:",ls,"rs:",rs);
    }

    private runNeq(){
        const rs = this.runPopNoOpr();
        const ls = this.runPopNoOpr();

        const value = rs == ls?0:1;
        this.runPush(value)
    }

    private runGrt(){
        const rs = this.runPopNoOpr();
        const ls = this.runPopNoOpr();

        const value = ls > rs ?1:0;
        this.runPush(value);
    }

    private runEgr(){
        const rs = this.runPopNoOpr();
        const ls = this.runPopNoOpr();

        const value = ls >= rs ?1:0;
        this.runPush(value)
    }

    private runLes(){
        const rs = this.runPopNoOpr();
        const ls = this.runPopNoOpr();

        console.log(ls,rs);
        const value = ls < rs ?1:0;
        this.runPush(value)
    }

    private runEle(){
        const rs = this.runPopNoOpr();
        const ls = this.runPopNoOpr();

        const value = ls <= rs ?1:0;
        this.runPush(value)
    }

    private runTrue(){
        this.runPush(1);
    }

    private runFalse(){
        this.runPush(0);
    }
}