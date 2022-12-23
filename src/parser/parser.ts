import { GenCode } from "../interOpr/genCode";
import { NameTable } from "../nameTable/nameTable";
import { Token } from "../token/token";
import { TokenType } from "../token/tokenType";
import {IdentFactor, IdentKind} from "../nameTable/identFactor"
import { CastWithOpr, Types } from "../type/type";

export class Parser{
    private _tokens:Token[];
    private index:number;
    private errors:string[];
    private genCode:GenCode;
    private table:NameTable;
    private level:number;
    private isInCondition:boolean = false;
    private loop_continue_index:number[] = [];
    private loop_break_index:number[] = [];

    private wasMainDecled:boolean = false;

    constructor(tokens:Token[]){
        this._tokens = tokens;
        this.index = 0;
        this.errors = [];
        this.genCode = new GenCode();
        this.table = new NameTable();
        this.level = -1;
    }

    public getErrors(){return this.errors;}

    public getCodes(){
        //this.genCode.getCodes().forEach(code=>{console.log(code.Kind,code.Opr1,code.Level,code.NumParams)})
        return this.genCode.getCodes();
    }

    public getTable(){return this.table;}

    //indexを進める
    private Next(){
        this.index++;
    }

    private CurToken(){
        if(this.index >= this._tokens.length) return new Token(TokenType.EOF,"","");
        return this._tokens[this.index];
    }

    //出力するエラー配列にエラー文を追加
    private PutError(expected_type:TokenType){
        let message = `Parse Error! Expected token:${expected_type} but found token:${this.CurToken().Type} at ${this.index}`
        this.errors.push(message);
    }

    //次のトークンのタイプが一致するか
    private CheckToken(type:TokenType):boolean{
        this.Next();
        if(this.CurToken().Type != type){
            return false;
        }
        return true;
    }

    public ParseProgram(){
        this.genCode.EmitStart();
        while(true){
            this.ParseBlock();
            if(this.CurToken().Type == TokenType.EOF) break;
        }
        if(!this.wasMainDecled) this.genCode.BackPatch1(0,this.genCode.getIndex());
    }

    private ParseBlock(){
        while(true){
            switch(this.CurToken().Type){
                case TokenType.FUNC:
                    this.ParseFuncDecl();
                    continue;
                default:
                    break;
            }
            break;
        }
        this.ParseStatement();
    }

    private SemicolonCheck(){
        if(this.CurToken().Type != TokenType.SEMICOLON){
            this.PutError(TokenType.SEMICOLON);
        }else this.Next();
    }

    private ParseStatement(){
        while(true){
            switch(this.CurToken().Type){
                case TokenType.PRINT:
                    this.Next();
                    this.ParsePrint();
                    this.SemicolonCheck();
                    continue;
                case TokenType.PRINTLN:
                    this.Next();
                    this.ParsePrintln();
                    this.SemicolonCheck();
                    continue;
                case TokenType.IDENT:
                    this.ParseIdent();
                    this.SemicolonCheck();
                    continue;
                case TokenType.VAR:
                    this.Next();
                    this.ParseVarDecl();
                    continue;
                case TokenType.CONST:
                    this.Next();
                    this.ParseConstDecl();
                    continue;
                case TokenType.IF:
                    this.Next();
                    this.ParseIFStatement();
                    continue;
                case TokenType.WHILE:
                    this.Next();
                    this.ParseWhileStatement();
                    continue;
                default:
                    break;
            }
            break;
        }
    }

    private BreakStatement(){
        if(this.loop_continue_index.length == 0) throw new Error("Not in loop");
        this.loop_break_index.push(this.genCode.EmitJmp(0));
        if(!this.CheckToken(TokenType.SEMICOLON)) this.PutError(TokenType.SEMICOLON);
        this.Next();
    }

    private ContinueStatement(){
        if(this.loop_continue_index.length == 0) throw new Error("Not in loop");
        this.genCode.EmitEnd();
        this.genCode.EmitJmp(this.loop_continue_index[this.loop_continue_index.length-1]);
        if(!this.CheckToken(TokenType.SEMICOLON)) this.PutError(TokenType.SEMICOLON);
        this.Next();
    }

    private ParseWhileStatement(){
        let jpc_index;

        this.level++;
        this.genCode.EmitBegin();
        let return_jmp_index = this.genCode.getIndex();
        this.loop_continue_index.push(return_jmp_index)
        this.ParseCondition();
        if(this.CurToken().Type != TokenType.THEN) this.PutError(TokenType.THEN);
        this.Next();

        this.table.BeginBlock();
        jpc_index = this.genCode.EmitJpc(0);

        while(true){
            this.ParseStatement();

            if(this.CurToken().Type == TokenType.CONTINUE){
                this.genCode.EmitJmp(this.loop_continue_index[this.loop_continue_index.length-1]);
            }

            if(this.CurToken().Type == TokenType.BREAK){
                this.loop_break_index.push(this.genCode.EmitJmp(0));
            }

            if(this.CurToken().Type == TokenType.END){
                this.genCode.EmitJmp(return_jmp_index);
                this.genCode.BackPatch1(jpc_index,this.genCode.getIndex());
                break;
            }
            this.Next();
        }

        while(this.loop_break_index.length > 0){
            const index = this.loop_break_index.pop();
            if(index != undefined)
            this.genCode.BackPatch1(index,this.genCode.getIndex());
        }

        this.loop_continue_index.pop();
        this.genCode.EmitEnd();
        this.table.EndBlock()
        this.Next();
        this.level--;
    }

    private ParseIFStatement(){
        let last_jpc_index;
        let jmp_indexes:number[] = [];
        this.level++;
        this.genCode.EmitBegin();
        this.ParseCondition();
        if(this.CurToken().Type != TokenType.THEN) this.PutError(TokenType.THEN);
        this.Next();
    
        this.table.BeginBlock();
        last_jpc_index = this.genCode.EmitJpc(0);

        while(true){
            this.ParseStatement();

            if(this.CurToken().Type == TokenType.BREAK){
                this.BreakStatement();
            }

            if(this.CurToken().Type == TokenType.CONTINUE){
                this.ContinueStatement();
            }

            if(this.CurToken().Type == TokenType.ELIF){
                this.table.EndBlock();
                this.Next()
                jmp_indexes.push(this.genCode.EmitJmp(0));
                this.genCode.BackPatch1(last_jpc_index,this.genCode.getIndex());
                this.ParseCondition();
                if(this.CurToken().Type != TokenType.THEN) this.PutError(TokenType.THEN);
                this.Next();

                last_jpc_index = this.genCode.EmitJpc(0);
                this.table.BeginBlock();
                this.ParseElif();
            }

            if(this.CurToken().Type == TokenType.ELSE){
                this.table.EndBlock();
                jmp_indexes.push(this.genCode.EmitJmp(0));
                this.genCode.BackPatch1(last_jpc_index,this.genCode.getIndex());
                this.Next();

                this.ParseElse();
                this.table.BeginBlock();
                break;
            }
            
            if(this.CurToken().Type == TokenType.END){
                this.genCode.BackPatch1(last_jpc_index,this.genCode.getIndex());
                break;
            }
        }
        if(jmp_indexes.length != 0){
            jmp_indexes.forEach(index=>this.genCode.BackPatch1(index,this.genCode.getIndex()));
        }

        this.genCode.EmitEnd();
        this.table.EndBlock()
        this.Next();
        this.level--;
    }

    private ParseElif(){
        while(true){
            this.ParseStatement();

            if(this.CurToken().Type == TokenType.BREAK){
                this.BreakStatement();
            }

            if(this.CurToken().Type == TokenType.CONTINUE){
                this.ContinueStatement();
            }

            if(this.CurToken().Type == TokenType.END||
            this.CurToken().Type == TokenType.ELIF||
            this.CurToken().Type == TokenType.ELSE) break;
            this.Next();
        }
    }

    private ParseElse(){
        while(true){
            this.ParseStatement();

            if(this.CurToken().Type == TokenType.BREAK){
                this.BreakStatement();
            }

            if(this.CurToken().Type == TokenType.CONTINUE){
                this.ContinueStatement();
            }

            if(this.CurToken().Type == TokenType.END) break;
            this.Next();
        }
    }

    private ParseCondition(){
        this.isInCondition = true;
        this.ParseExpression();
        let _cur = this.CurToken();
        if(_cur.Type == TokenType.THEN) return;
        this.Next();
        this.ParseExpression();
        this.isInCondition = false;

        switch(_cur.Type){
            case TokenType.GRT:
                this.genCode.EmitGrt();
                break;
            case TokenType.LES:
                this.genCode.EmitLes();
                break;
            case TokenType.EGR:
                this.genCode.EmitEgr();
                break;
            case TokenType.ELE:
                this.genCode.EmitLes();
                break;
            case TokenType.EQ:
                this.genCode.EmitEq();
                break;
            case TokenType.NEQ:
                this.genCode.EmitNeq();
                break;
            default:
                console.log(_cur.Name)
                throw new Error("in condition");
        }

    }

    private ParsePrint(){
        this.ParseExpression();
        this.genCode.EmitPrt();
    }

    private ParsePrintln(){
        this.ParseExpression();
        this.genCode.EmitPrtln();
    }

    private ParseType(){
        switch(this.CurToken().Type){
            case TokenType.INT:
                return Types.INT
            case TokenType.FLOAT:
                return Types.FLOAT
            case TokenType.BOOL:
                return Types.BOOL
            default:
                throw new Error("型を入力してください");
        }
    }

    private ParseVarDecl(){
        var var_counted:number = 0;
        var type:Types|null = null;
        while(true){
            if(this.CurToken().Type!=TokenType.IDENT) this.PutError(TokenType.IDENT);
            const name = this.CurToken().Name;
            this.Next();

            if(this.CurToken().Type == TokenType.COLON){
                this.Next();
                type = this.ParseType();
                this.Next();
            }

            this.table.RegisterVar(name,type);
            var_counted++;

            if(this.CurToken().Type == TokenType.COMMA){
                this.Next();
                continue;
            }
             //宣言と代入文の併用
            if(this.CurToken().Type == TokenType.ASSIGN){
                while(true){
                    const new_factor_in_table = this.table.SearchIdentByOffset(var_counted);
                    if(new_factor_in_table == null) return;
                    this.Next();
                    const type = this.ParseExpression();
                    this.table.CheckIdentType(new_factor_in_table.Name,type);
                    this.genCode.EmitPushi(this.level-new_factor_in_table.Level,new_factor_in_table.RelAddress);
                    this.genCode.EmitAss();
                    var_counted--;
                    if(this.CurToken().Type == TokenType.COMMA){
                        continue;
                    }
                    if(var_counted != 0) throw new Error("NumbersError")
                    break;
                }
            }
            if(this.CurToken().Type != TokenType.SEMICOLON) this.PutError(TokenType.SEMICOLON);
            this.Next();
            break;
        }
    }

    private ParseConstDecl(){
        var const_counted:number = 0;
        var type:Types|null = null;
        while(true){
            if(this.CurToken().Type!=TokenType.IDENT) this.PutError(TokenType.IDENT);
            const name = this.CurToken().Name;

            this.Next();
            if(this.CurToken().Type == TokenType.COLON){
                this.Next();
                type = this.ParseType();
                this.Next();
            }

            this.table.RegisterConst(name,type);
            const_counted++;

            if(this.CurToken().Type == TokenType.COMMA){
                this.Next();
                continue;
            }
             //宣言と代入文の併用
            if(this.CurToken().Type != TokenType.ASSIGN)this.PutError(TokenType.ASSIGN);
            while(true){
                const new_factor_in_table = this.table.SearchIdentByOffset(const_counted);
                if(new_factor_in_table == null) return;
                this.Next();
                const type = this.ParseExpression();
                this.table.CheckIdentType(new_factor_in_table.Name,type);
                this.genCode.EmitPushi(this.level-new_factor_in_table.Level,new_factor_in_table.RelAddress);
                this.genCode.EmitAss();
                const_counted--;
                if(this.CurToken().Type == TokenType.COMMA){
                    continue;
                }
                if(const_counted != 0) throw new Error("NumbersError")
                break;
            }
            if(this.CurToken().Type != TokenType.SEMICOLON) this.PutError(TokenType.SEMICOLON);
            this.Next();
            break;
        }
    }

    private ParseExpression(){
        var isNeg = false
        var type1;
        var type2;

        switch(this.CurToken().Type){
            case TokenType.PLUS:
                this.Next();
                break;
            case TokenType.MINUS:
                this.Next();
                isNeg = true;
                break;
            default:
                break;
        }

        type1 = this.ParseTerm();
        if(isNeg){
            if(type1 == Types.BOOL) throw new Error("BOOL CANT BEEN NEGATIVE");
            this.genCode.EmitNeg();
        }

        while(true){
            switch(this.CurToken().Type){
                case TokenType.PLUS:
                    this.Next();
                    type2 = this.ParseTerm();
                    type1 = CastWithOpr(type1,type2,TokenType.PLUS);
                    this.genCode.EmitAdd();
                    continue;
                case TokenType.MINUS:
                    this.Next();
                    type2 = this.ParseTerm();
                    type1 = CastWithOpr(type1,type2,TokenType.PLUS);
                    this.ParseTerm();
                    this.genCode.EmitSub();
                    continue;
                default:
                    break;
            }
            break;
        }

        return type1;
    }

    private ParseTerm(){
        var type1 = this.ParseFactor();
        var type2:Types|null|undefined = null;
        var opr:TokenType = TokenType.END;
        var new_type;
        if(type1 == null) throw new Error("Type1 is null");

        while(true){
            switch(this.CurToken().Type){
                case TokenType.MULTI:
                    opr = TokenType.MULTI;
                    this.Next();
                    type2 = this.ParseFactor();
                    this.genCode.EmitMul();
                    continue;
                case TokenType.DIV:
                    opr = TokenType.DIV;
                    this.Next();
                    type2 = this.ParseFactor();
                    this.genCode.EmitDiv();
                    continue;
                case TokenType.MOD:
                    opr = TokenType.MOD
                    this.Next();
                    type2 = this.ParseFactor();
                    this.genCode.EmitMod();
                    continue;
                default:
                    break;
            }
            break;
        }

        if(type2 != null && type2 != undefined) new_type = CastWithOpr(type1,type2,opr);
        else new_type = type1;
        return new_type
    }

    private ParseFactor(){
        switch(this.CurToken().Type){
            case TokenType.INT_NUMBER:
                const int_num_text = this.CurToken().Value;
                const value_int = Number(int_num_text);
                this.Next();
                this.genCode.EmitPush(value_int);
                return Types.INT;
            case TokenType.FLOAT_NUMBER:
                const float_num_text = this.CurToken().Value;
                const value_float = Number(float_num_text);
                this.Next();
                this.genCode.EmitPush(value_float);
                return Types.FLOAT;
            case TokenType.LPAREN:
                this.Next();
                this.ParseExpression();
                if(this.CurToken().Type != TokenType.RPAREN) throw new Error(")が必要");
                this.Next();
                return Types.BOOL;
            case TokenType.TRUE:
                this.Next();
                this.genCode.EmitTrue();
                return Types.BOOL;
            case TokenType.FALSE:
                this.Next();
                this.genCode.EmitFalse();
                return Types.BOOL;
            case TokenType.IDENT:
                const name = this.CurToken().Name;
                this.Next();

                const _ident_in_table = this.table.Exist(name);

                switch(_ident_in_table?.IdentKind){
                    case IdentKind.PARAM:
                        this.ParseFuncParams(_ident_in_table);
                        break;
                    case IdentKind.FUNC:
                        const index = _ident_in_table.RelAddress;
                        this.ParseFuncCall(index);
                        break;
                    case IdentKind.VAR:
                    case IdentKind.CONST:
                        this.genCode.EmitLoad(this.level-_ident_in_table.Level,_ident_in_table.RelAddress);
                        return _ident_in_table.Type;
                    default:
                        console.log(this.CurToken())
                        throw new Error("不明な識別子");
                }
                break;
            default:
                throw new Error(`Unknown factor ${this.CurToken().Type}`); 
        }
    }

    private ParseIdent(){
        const name = this.CurToken().Name;
        this.Next();

        const _ident_in_table = this.table.Exist(name);

        switch(_ident_in_table?.IdentKind){
            case IdentKind.FUNC:
                const index = _ident_in_table.RelAddress
                this.ParseFuncCall(index);
                break;
            case IdentKind.PARAM:
                this.Next();
                break;
            case IdentKind.VAR:
                if(this.CurToken().Type == TokenType.ASSIGN){
                    this.Next();
                    const type= this.ParseExpression();
                    this.table.CheckIdentType(_ident_in_table.Name,type);
                    this.genCode.EmitPushi(this.level-_ident_in_table.Level,_ident_in_table.RelAddress);
                    this.genCode.EmitAss();
                }
                break;
            case IdentKind.CONST:
                throw new Error("CONST IS NOT MUTABLE");
        }
    }

    private ParseFuncParams(param:IdentFactor){

        this.genCode.EmitLoad(this.level-param.Level,param.RelAddress);
    }

    private ParseFuncCall(index:number){
        this.Next();
        if(this.CurToken().Type == TokenType.LPAREN) this.Next();
        const preEmitIndex = this.genCode.getIndex();
        while(true){
            if(this.CurToken().Type == TokenType.RPAREN){
                this.Next();
                break;
            }
            this.ParseExpression();
            if(this.genCode.getIndex() != preEmitIndex) this.genCode.EmitPop();
            if(this.CurToken().Type == TokenType.COMMA){
                this.Next();
                continue;
            }
        }
        this.genCode.EmitCall(index);
    }

    private ParseFuncDecl(){
        if(!this.CheckToken(TokenType.IDENT)) this.PutError(TokenType.IDENT);
        const name = this.CurToken().Name;
        let numParams;
        if(name == "main"){
            this.wasMainDecled = true;
            this.genCode.EmitLabel("main")
            this.genCode.BackPatch1(0,this.genCode.getIndex()-1);
        }else this.genCode.EmitLabel(name);

        this.table.RegisterFunction(name,this.genCode.getIndex()-1);

        this.level++;
        this.Next();
        if(this.CurToken().Type == TokenType.LPAREN) this.Next();
        while(true){
            if(this.CurToken().Type == TokenType.IDENT){
                this.table.AddFunctionParameter(this.CurToken().Name);
                this.Next();
                if(this.CurToken().Type == TokenType.COMMA){
                    this.Next();
                    continue;
                }
            }
            if(this.CurToken().Type == TokenType.RPAREN) this.Next();
            if(this.CurToken().Type == TokenType.FUNC_LEADER){
                this.Next();
                break;
            }

            this.PutError(TokenType.FUNC_LEADER);
            break;
        }

        numParams = this.table.EndFunctionParams();
        while(true){
            this.ParseBlock();
            if(this.CurToken().Type == TokenType.RET){
                this.Next();
                this.ParseReturn(numParams);
            }
            if(this.CurToken().Type == TokenType.END){
                this.Next();
                break;
            }
        }

        this.table.EndFunction();
        this.genCode.EmitReturn(numParams,this.table.Level,numParams);
        this.level--;
    }

    private ParseReturn(numParams:number){
        this.ParseExpression();
        this.genCode.EmitReturn(numParams,this.table.Level,numParams);
        if(this.CurToken().Type != TokenType.SEMICOLON){
            this.PutError(TokenType.SEMICOLON);
        }else this.Next();
    }   
}