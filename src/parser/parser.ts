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
                case TokenType.INC:
                    this.Next();
                    this.PrefixInc();
                    this.SemicolonCheck();
                    continue;
                case TokenType.DEC:
                    this.Next();
                    this.PrefixDec();
                    this.SemicolonCheck();
                    continue;
                case TokenType.MATCH:
                    this.Next();
                    this.MatchStatement();
                    continue;
                default:
                    break;
            }
            break;
        }
    }

    private MatchStatement(){
        var pre_jpc_index:number|null = null;
        var jmp_indexes:number[] = [];
        this.genCode.EmitBegin();
        this.table.BeginBlock();
        this.level++;
        const main_type=this.ParseExpression();
        if(this.CurToken().Type != TokenType.LEADER) this.PutError(TokenType.LEADER);
        this.Next();

        while(true){
            if(this.CurToken().Type == TokenType.CASE){
                if(pre_jpc_index != null) this.genCode.BackPatch1(pre_jpc_index,this.genCode.getIndex());
                this.Next();
                this.genCode.EmitCopy();
                
                const type = this.ParseExpression();
                if(type != main_type) throw new Error("無効なパターンです");

                if(this.CurToken().Type != TokenType.LEADER) this.PutError(TokenType.LEADER);
                this.Next();

                this.genCode.EmitEq();
                pre_jpc_index = this.genCode.EmitJpc(0)

                while(true){
                    this.ParseStatement();

                    if(this.CurToken().Type == TokenType.CASE||
                        this.CurToken().Type == TokenType.OTHER||
                        this.CurToken().Type == TokenType.END) break;

                    this.Next();
                }

                jmp_indexes.push(this.genCode.EmitJmp(0));
                this.table.EndBlock();
                this.table.BeginBlock();
                continue;
            }
            if(this.CurToken().Type == TokenType.OTHER){
                if(pre_jpc_index != null) this.genCode.BackPatch1(pre_jpc_index,this.genCode.getIndex());
                this.Next();

                while(true){
                    this.ParseStatement();

                    if(this.CurToken().Type == TokenType.END) break;
                    this.Next();
                }
                this.table.EndBlock();
                this.table.BeginBlock();
                break;
            }else{
                if(pre_jpc_index != null) this.genCode.BackPatch1(pre_jpc_index,this.genCode.getIndex())
            }
            break;
        }
        if(this.CurToken().Type != TokenType.END) this.PutError(TokenType.END);
        this.Next();

        if(jmp_indexes.length != 0)
        jmp_indexes.forEach(index=>this.genCode.BackPatch1(index,this.genCode.getIndex()));

        this.genCode.EmitEnd();
        this.table.EndBlock();
        this.level--;
    }

    private BreakStatement(){
        if(this.loop_continue_index.length == 0) throw new Error("Not in loop");
        this.loop_break_index.push(this.genCode.EmitJmp(0));
        if(!this.CheckToken(TokenType.SEMICOLON)) this.PutError(TokenType.SEMICOLON);
        this.Next();
    }

    private PrefixInc():Types{
        const name = this.CurToken().Name;
        this.Next();
        const _ident_in_table = this.table.Exist(name);

        switch(_ident_in_table?.IdentKind){
            case IdentKind.VAR:
                this.genCode.EmitLoad(this.level - _ident_in_table.Level,_ident_in_table.RelAddress);
                this.genCode.EmitInc();
                this.genCode.EmitCopy();
                this.genCode.EmitPushi(this.level - _ident_in_table.Level,_ident_in_table.RelAddress);
                this.genCode.EmitAss();
                break;
            default:
                throw new Error("インクリメントできません");
        }
        if(_ident_in_table.Type == null) throw new Error("null ErROR");

        return _ident_in_table.Type
    }

    private PrefixDec():Types{
        const name = this.CurToken().Name;
        this.Next();
        this.SemicolonCheck();
        const _ident_in_table = this.table.Exist(name);

        switch(_ident_in_table?.IdentKind){
            case IdentKind.VAR:
                this.genCode.EmitLoad(this.level - _ident_in_table.Level,_ident_in_table.RelAddress);
                this.genCode.EmitDec();
                this.genCode.EmitCopy();
                this.genCode.EmitPushi(this.level - _ident_in_table.Level,_ident_in_table.RelAddress);
                this.genCode.EmitAss();
                break;
            default:
                throw new Error("インクリメントできません");
        }

        if(_ident_in_table.Type == null) throw new Error("null ErROR");

        return _ident_in_table.Type
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
        this.loop_continue_index.push(return_jmp_index);
        this.ParseCondition(true);
        if(this.CurToken().Type != TokenType.DO) this.PutError(TokenType.DO);
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
        this.ParseCondition(false);
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
                this.ParseCondition(false);
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

    private ParseCondition(isLoop:Boolean){
        this.isInCondition = true;
        this.ParseExpression();
        let _cur = this.CurToken();
        if(isLoop){
            if(this.CurToken().Type == TokenType.DO) return;
        }else{
            if(this.CurToken().Type == TokenType.THEN) return;
            else if(this.CurToken().Type == TokenType.DO) throw new Error("Need then")
        }
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
            case TokenType.CHAR:
                return Types.CHAR
            default:
                throw new Error("Type is unknown");
        }
    }

    private ParseTypeToArrange(type:Types){
        switch(type){
            case Types.INT:
                return Types.INT_ARRANGE
            case Types.FLOAT:
                return Types.FLOAT_ARRANGE
            case Types.CHAR:
                return Types.CHAR_ARRANGE
            default:
                throw new Error("Can't array");
        }
    }

    private ParseTypeArrayFactor(type:Types){
        switch(type){
            case Types.INT_ARRANGE:
                return Types.INT;
            case Types.FLOAT_ARRANGE:
                return Types.FLOAT
            case Types.CHAR_ARRANGE:
                return Types.CHAR
            default:
        }
    }

    public isTypeArray(type:Types){
        switch(type){
            case Types.INT_ARRANGE:
            case Types.FLOAT_ARRANGE:
            case Types.CHAR_ARRANGE:
                return true
            default:
                return false;
        }
    }

    private ParseVarDecl(){
        var type:Types|null = null;
        var var_size = 1;
        var SizeWasDecled:boolean = false;
        while(true){
            if(this.CurToken().Type!=TokenType.IDENT) this.PutError(TokenType.IDENT);
            const name = this.CurToken().Name;
            this.Next();

            if(this.CurToken().Type == TokenType.COLON){
                this.Next();
                type = this.ParseType();
                this.Next();
                if(this.CurToken().Type == TokenType.LARRAY){
                    this.Next();
                    if(this.CurToken().Type == TokenType.INT_NUMBER){
                        var_size = Number(this.CurToken().Value);
                        SizeWasDecled = true;
                        this.Next();
                        if(this.CurToken().Type != TokenType.RARRAY) this.PutError(TokenType.RARRAY);
                    }
                    this.Next();
                    type = this.ParseTypeToArrange(type)
                }
            }

            this.table.RegisterVar(name,type,var_size);

            if(type != null && this.isTypeArray(type)){
                var initialize:number|string;
                const ident = this.table.Exist(name);
                if(ident == null) throw new Error("");

                if(type == Types.INT_ARRANGE) initialize = 0;
                else if(type == Types.FLOAT_ARRANGE) initialize = 0.0;
                else if(type == Types.CHAR_ARRANGE) initialize = ' ';
                else throw new Error("Unknown Arrange Type");
                for(let i=0;i<ident.Size;i++){
                    this.genCode.EmitPush(initialize);
                    this.genCode.EmitPushi(this.level,ident.RelAddress);
                    this.genCode.EmitPush(i);
                    this.genCode.EmitAdd();
                    this.genCode.EmitAss();
                }
            }

            if(this.CurToken().Type == TokenType.COMMA){
                this.Next();
                continue;
            }
             //宣言と代入文の併用
            if(this.CurToken().Type == TokenType.ASSIGN){
                const new_factor_in_table = this.table.Exist(name)
                if(new_factor_in_table == null) return;
                this.Next();
                if(this.CurToken().Type == TokenType.LARRAY){
                    var number_counted = 0;
                    var factor_type:Types|null|undefined = null;

                    if(new_factor_in_table.Type != null){
                        factor_type = this.ParseTypeArrayFactor(new_factor_in_table.Type);
                    }
                    this.Next();

                    while(true){
                        if(this.CurToken().Type == TokenType.COMMA){
                            number_counted++;
                            this.Next();
                        }
                        const type = this.ParseExpression();

                        if(factor_type == null) factor_type = type;
                        if(factor_type != type) throw new Error("Type Error!");

                        this.genCode.EmitPushi(this.level-new_factor_in_table.Level,new_factor_in_table.RelAddress+number_counted);
                        this.genCode.EmitAss();
                        //this.Next();

                        if(this.CurToken().Type == TokenType.RARRAY) break;
                    }
                    if(!SizeWasDecled){
                        var_size = number_counted+1;
                        this.table.SetSizeArray(var_size,name)
                    }
                    if(number_counted != var_size-1) throw new Error("Size is Different!")
                    this.Next();
                }else{
                    const type = this.ParseExpression();
                    if(this.table.IsIdentTypeNull(name)){
                        this.table.SetType(name,type);
                    }else{
                        this.table.CheckIdentType(new_factor_in_table.Name,type);
                    }
                    this.genCode.EmitPushi(this.level-new_factor_in_table.Level,new_factor_in_table.RelAddress);
                    this.genCode.EmitAss();
    
                    if(this.CurToken().Type == TokenType.COMMA){
                        continue;
                    }
                    break;
                }

            }
            console.log(this.table.Table)
            if(this.CurToken().Type != TokenType.SEMICOLON) this.PutError(TokenType.SEMICOLON);
            this.Next();
            break;
        }
    }

    private ParseConstDecl(){
        var type:Types|null = null;
        var const_size = 1;
        while(true){
            if(this.CurToken().Type!=TokenType.IDENT) this.PutError(TokenType.IDENT);
            const name = this.CurToken().Name;

            this.Next();
            if(this.CurToken().Type == TokenType.COLON){
                this.Next();
                type = this.ParseType();
                this.Next();
                if(this.CurToken().Type == TokenType.LARRAY){
                    this.Next();
                    if(this.CurToken().Type == TokenType.INT_NUMBER) const_size = Number(this.CurToken().Value);
                    else throw new Error("定数が必要です");
                    this.Next();
                    if(this.CurToken().Type != TokenType.RARRAY) this.PutError(TokenType.RARRAY);
                    this.Next();
                    type = this.ParseTypeToArrange(type)
                }
            }

            this.table.RegisterConst(name,type,const_size);

            if(this.CurToken().Type == TokenType.COMMA){
                this.Next();
                continue;
            }
             //宣言と代入文の併用
            if(this.CurToken().Type != TokenType.ASSIGN)this.PutError(TokenType.ASSIGN);
            while(true){
                const new_factor_in_table = this.table.Exist(name);
                if(new_factor_in_table == null) return;
                this.Next();
                if(this.CurToken().Type == TokenType.LARRAY){
                    var number_counted = 0;
                    var factor_type:Types|null|undefined = null;

                    if(new_factor_in_table.Type != null){
                        factor_type = this.ParseTypeArrayFactor(new_factor_in_table.Type);
                    }
                    this.Next();

                    while(true){
                        if(this.CurToken().Type == TokenType.COMMA){
                            number_counted++;
                            this.Next();
                        }
                        const type = this.ParseExpression();

                        if(factor_type == null) factor_type = type;
                        if(factor_type != type) throw new Error("Type Error!");

                        this.genCode.EmitPushi(this.level-new_factor_in_table.Level,new_factor_in_table.RelAddress+number_counted);
                        this.genCode.EmitAss();
                        //this.Next();
                        console.log(this.CurToken().Type)

                        if(this.CurToken().Type == TokenType.RARRAY) break;
                    }
                    console.log(number_counted,const_size)
                    if(number_counted != const_size-1) throw new Error("Size id Different!")
                    this.Next();
                }else{
                    const type = this.ParseExpression();
                    if(this.table.IsIdentTypeNull(name)){
                        this.table.SetType(name,type);
                    }else{
                        this.table.CheckIdentType(new_factor_in_table.Name,type);
                    }
                    this.genCode.EmitPushi(this.level-new_factor_in_table.Level,new_factor_in_table.RelAddress);
                    this.genCode.EmitAss();
    
                    if(this.CurToken().Type == TokenType.COMMA){
                        continue;
                    }
                    break;
                }
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

    private ParseFactor():Types{
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
            case TokenType.CHAR:
                const char = this.CurToken().Value;
                this.Next();
                this.genCode.EmitPush(char);
                return Types.CHAR;
            case TokenType.LPAREN:
                this.Next();
                const type = this.ParseExpression();
                if(this.CurToken().Type != TokenType.RPAREN) throw new Error(")が必要");
                this.Next();
                console.log(type)
                return type;
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
                if(_ident_in_table?.Type == null) throw new Error("");
                if(this.CurToken().Type == TokenType.INC){
                    this.Next();
                    if(_ident_in_table != undefined)
                    this.PostfixInc(_ident_in_table);

                    if(_ident_in_table?.Type == null) throw new Error("");
                    return _ident_in_table?.Type;
                }

                if(this.CurToken().Type == TokenType.INC){
                    this.Next();
                    if(_ident_in_table != undefined)
                    this.PostfixDec(_ident_in_table);
                    if(_ident_in_table?.Type == null) throw new Error("");
                    return _ident_in_table?.Type;
                }

                if(this.CurToken().Type == TokenType.LARRAY && this.isTypeArray(_ident_in_table?.Type)){
                    var index_type;
                    const factor_type = this.ParseTypeArrayFactor(_ident_in_table.Type);
                    this.Next();

                    this.genCode.EmitPushi(this.level-_ident_in_table.Level,_ident_in_table.RelAddress);
                    
                    index_type = this.ParseExpression();

                    if(index_type != Types.INT) throw new Error("Index Type Error!")
                    this.genCode.EmitAdd();
                    this.genCode.EmitLdst();

                    if(this.CurToken().Type != TokenType.RARRAY) this.PutError(TokenType.RARRAY);
                    this.Next();
                    
                    if(factor_type == undefined) throw new Error("");
                    return factor_type;
                }

                switch(_ident_in_table?.IdentKind){
                    case IdentKind.PARAM:
                        this.ParseFuncParams(_ident_in_table);
                        return _ident_in_table.Type;
                    case IdentKind.FUNC:
                        const index = _ident_in_table.RelAddress;
                        this.ParseFuncCall(index);
                        return _ident_in_table.Type
                    case IdentKind.VAR:
                    case IdentKind.CONST:
                        this.genCode.EmitLoad(this.level-_ident_in_table.Level,_ident_in_table.RelAddress);
                        return _ident_in_table.Type;
                    default:
                        throw new Error("不明な識別子");
                }
            case TokenType.INC:
                this.Next();
                const type_inc:Types = this.PrefixInc();

                if(type_inc == undefined) throw new Error("")
                return type_inc;
            case TokenType.DEC:
                this.Next();
                const type_dec:Types = this.PrefixDec();

                return type_dec;

            default:
                return Types.VOID;
                //throw new Error(`Unknown factor ${this.CurToken().Type}`); 
        }
    }

    private PostfixInc(_ident_in_table:IdentFactor){
        this.genCode.EmitLoad(this.level - _ident_in_table.Level,_ident_in_table.RelAddress);
        this.genCode.EmitCopy();
        this.genCode.EmitInc();
        this.genCode.EmitPushi(this.level-_ident_in_table.Level,_ident_in_table.RelAddress);
        this.genCode.EmitAss();
    }

    private PostfixDec(_ident_in_table:IdentFactor){
        this.genCode.EmitLoad(this.level - _ident_in_table.Level,_ident_in_table.RelAddress);
        this.genCode.EmitCopy();
        this.genCode.EmitDec();
        this.genCode.EmitPushi(this.level-_ident_in_table.Level,_ident_in_table.RelAddress);
        this.genCode.EmitAss();
    }

    private ParseIdent(){
        let index:number|null = null;
        const name = this.CurToken().Name;
        this.Next();

        const _ident_in_table = this.table.Exist(name);
        if(this.CurToken().Type == TokenType.LARRAY && _ident_in_table != undefined){
            if(_ident_in_table.Type != null && !this.isTypeArray(_ident_in_table.Type)) throw new Error("[]は無効です");
            this.Next();

            index = Number(this.CurToken().Value);
            this.Next();

            if(this.CurToken().Type != TokenType.RARRAY) this.PutError(TokenType.RARRAY);
            this.Next();
        }


        switch(_ident_in_table?.IdentKind){
            case IdentKind.FUNC:
                const _index = _ident_in_table.RelAddress
                this.ParseFuncCall(_index);
                break;
            case IdentKind.PARAM:
                this.Next();
                break;
            case IdentKind.VAR:
                if(this.CurToken().Type == TokenType.ASSIGN){
                    this.Next();
                    const type= this.ParseExpression();
                    if(_ident_in_table.Type != null && this.isTypeArray(_ident_in_table.Type)){
                        const factor_type = this.ParseTypeToArrange(type);
                        this.table.CheckIdentType(_ident_in_table.Name,factor_type);
                    }else if(this.table.IsIdentTypeNull(name)){
                        this.table.SetType(name,type);
                    }else{
                        this.table.CheckIdentType(_ident_in_table.Name,type);
                    }
                    this.genCode.EmitPushi(this.level-_ident_in_table.Level,_ident_in_table.RelAddress);
                    if(index != null){
                        this.genCode.EmitPush(index);
                        this.genCode.EmitAdd();
                    }
                    this.genCode.EmitAss();
                }else if(this.CurToken().Type == TokenType.PLUSASSIGN){
                    this.Next();
                    if(_ident_in_table.Type != null && this.isTypeArray(_ident_in_table.Type)){
                        this.genCode.EmitPushi(this.level - _ident_in_table.Level,_ident_in_table.RelAddress);
                        if(index != null)this.genCode.EmitPush(index);
                        this.genCode.EmitAdd();
                        this.genCode.EmitLdst();
                    }else{
                        this.genCode.EmitLoad(this.level - _ident_in_table.Level,_ident_in_table.RelAddress);
                    }
                    const type= this.ParseExpression();
                    if(_ident_in_table.Type != null && this.isTypeArray(_ident_in_table.Type)){
                        const factor_type = this.ParseTypeToArrange(type);
                        this.table.CheckIdentType(_ident_in_table.Name,factor_type);
                    }else if(this.table.IsIdentTypeNull(name)){
                        this.table.SetType(name,type);
                    }else{
                        this.table.CheckIdentType(_ident_in_table.Name,type);
                    }
                    this.genCode.EmitAdd();
                    this.genCode.EmitPushi(this.level-_ident_in_table.Level,_ident_in_table.RelAddress);
                    if(index != null){
                        this.genCode.EmitPush(index);
                        this.genCode.EmitAdd();
                    }
                    this.genCode.EmitAss();
                }else if(this.CurToken().Type == TokenType.MINUSASSIGN){
                    this.Next();
                    if(_ident_in_table.Type != null && this.isTypeArray(_ident_in_table.Type)){
                        this.genCode.EmitPushi(this.level - _ident_in_table.Level,_ident_in_table.RelAddress);
                        if(index != null)this.genCode.EmitPush(index);
                        this.genCode.EmitAdd();
                        this.genCode.EmitLdst();
                    }else{
                        this.genCode.EmitLoad(this.level - _ident_in_table.Level,_ident_in_table.RelAddress);
                    }
                    const type= this.ParseExpression();
                    if(_ident_in_table.Type != null && this.isTypeArray(_ident_in_table.Type)){
                        const factor_type = this.ParseTypeToArrange(type);
                        this.table.CheckIdentType(_ident_in_table.Name,factor_type);
                    }else if(this.table.IsIdentTypeNull(name)){
                        this.table.SetType(name,type);
                    }else{
                        this.table.CheckIdentType(_ident_in_table.Name,type);
                    }
                    this.genCode.EmitSub();
                    this.genCode.EmitPushi(this.level-_ident_in_table.Level,_ident_in_table.RelAddress);
                    if(index != null){
                        this.genCode.EmitPush(index);
                        this.genCode.EmitAdd();
                    }
                    this.genCode.EmitAss();
                }else if(this.CurToken().Type == TokenType.MULTIASSIGN){
                    this.Next();
                    if(_ident_in_table.Type != null && this.isTypeArray(_ident_in_table.Type)){
                        this.genCode.EmitPushi(this.level - _ident_in_table.Level,_ident_in_table.RelAddress);
                        if(index != null)this.genCode.EmitPush(index);
                        this.genCode.EmitAdd();
                        this.genCode.EmitLdst();
                    }else{
                        this.genCode.EmitLoad(this.level - _ident_in_table.Level,_ident_in_table.RelAddress);
                    }
                    const type= this.ParseExpression();
                    if(_ident_in_table.Type != null && this.isTypeArray(_ident_in_table.Type)){
                        const factor_type = this.ParseTypeToArrange(type);
                        this.table.CheckIdentType(_ident_in_table.Name,factor_type);
                    }else if(this.table.IsIdentTypeNull(name)){
                        this.table.SetType(name,type);
                    }else{
                        this.table.CheckIdentType(_ident_in_table.Name,type);
                    }
                    this.genCode.EmitMul();
                    this.genCode.EmitPushi(this.level-_ident_in_table.Level,_ident_in_table.RelAddress);
                    if(index != null){
                        this.genCode.EmitPush(index);
                        this.genCode.EmitAdd();
                    }
                    this.genCode.EmitAss();
                }else if(this.CurToken().Type == TokenType.DIVASSIGN){
                    this.Next();
                    if(_ident_in_table.Type != null && this.isTypeArray(_ident_in_table.Type)){
                        this.genCode.EmitPushi(this.level - _ident_in_table.Level,_ident_in_table.RelAddress);
                        if(index != null)this.genCode.EmitPush(index);
                        this.genCode.EmitAdd();
                        this.genCode.EmitLdst();
                    }else{
                        this.genCode.EmitLoad(this.level - _ident_in_table.Level,_ident_in_table.RelAddress);
                    }
                    const type= this.ParseExpression();
                    if(_ident_in_table.Type != null && this.isTypeArray(_ident_in_table.Type)){
                        const factor_type = this.ParseTypeToArrange(type);
                        this.table.CheckIdentType(_ident_in_table.Name,factor_type);
                    }else if(this.table.IsIdentTypeNull(name)){
                        this.table.SetType(name,type);
                    }else{
                        this.table.CheckIdentType(_ident_in_table.Name,type);
                    }
                    this.genCode.EmitDiv();
                    this.genCode.EmitPushi(this.level-_ident_in_table.Level,_ident_in_table.RelAddress);
                    if(index != null){
                        this.genCode.EmitPush(index);
                        this.genCode.EmitAdd();
                    }
                    this.genCode.EmitAss();
                }else if(this.CurToken().Type == TokenType.MODASSIGN){
                    this.Next();
                    if(_ident_in_table.Type != null && this.isTypeArray(_ident_in_table.Type)){
                        this.genCode.EmitPushi(this.level - _ident_in_table.Level,_ident_in_table.RelAddress);
                        if(index != null)this.genCode.EmitPush(index);
                        this.genCode.EmitAdd();
                        this.genCode.EmitLdst();
                    }else{
                        this.genCode.EmitLoad(this.level - _ident_in_table.Level,_ident_in_table.RelAddress);
                    }
                    const type= this.ParseExpression();
                    if(_ident_in_table.Type != null && this.isTypeArray(_ident_in_table.Type)){
                        const factor_type = this.ParseTypeToArrange(type);
                        this.table.CheckIdentType(_ident_in_table.Name,factor_type);
                    }else if(this.table.IsIdentTypeNull(name)){
                        this.table.SetType(name,type);
                    }else{
                        this.table.CheckIdentType(_ident_in_table.Name,type);
                    }
                    this.genCode.EmitMod();
                    this.genCode.EmitPushi(this.level-_ident_in_table.Level,_ident_in_table.RelAddress);
                    if(index != null){
                        this.genCode.EmitPush(index);
                        this.genCode.EmitAdd();
                    }
                    this.genCode.EmitAss();
                }else if(this.CurToken().Type == TokenType.INC){
                    this.Next();
                    if(_ident_in_table != undefined)
                    this.PostfixInc(_ident_in_table);
                }else if(this.CurToken().Type == TokenType.DEC){
                    this.Next();
                    if(_ident_in_table != undefined)
                    this.PostfixDec(_ident_in_table);
                }else{
                    if(index != null){
                        this.genCode.EmitPushi(this.level - _ident_in_table.Level,_ident_in_table.RelAddress);
                        this.genCode.EmitPush(index);
                        this.genCode.EmitAdd();
                        this.genCode.EmitLdst();
                    }
                    this.genCode.EmitLoad(this.level - _ident_in_table.Level,_ident_in_table.RelAddress);
                }
                break;
            case IdentKind.CONST:
                this.Next();
                if(this.CurToken().Type == TokenType.ASSIGN) throw new Error("CONST IS NOT MUTABLE");
        }
    }

    private ParseFuncParams(param:IdentFactor){

        this.genCode.EmitLoad(this.level-param.Level,param.RelAddress);
    }

    private ParseFuncCall(index:number){
        var func_return_type;
        if(this.CurToken().Type != TokenType.LPAREN) this.PutError(TokenType.LPAREN);
        this.Next();
        const preEmitIndex = this.genCode.getIndex();
        if(this.CurToken().Type == TokenType.RPAREN){

        }else while(true){
            func_return_type = this.ParseExpression();
            if(this.genCode.getIndex() != preEmitIndex) this.genCode.EmitPop();
            if(this.CurToken().Type == TokenType.COMMA){
                this.Next();
                continue;
            }
            break;
        }
        if(this.CurToken().Type != TokenType.RPAREN) this.PutError(TokenType.RPAREN);
        this.Next();
        this.genCode.EmitCall(index);
    }

    private ParseFuncDecl(){

        let wasReturned:boolean = false;
        let func_return_type;

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
                const param_name = this.CurToken().Name;
                this.Next();
                if(this.CurToken().Type != TokenType.COLON) this.PutError(TokenType.COLON);
                this.Next();
                const type = this.ParseType();
                this.Next();
                this.table.AddFunctionParameter(param_name,type);
                if(this.CurToken().Type == TokenType.COMMA){
                    this.Next();
                    continue;
                }
            }
            if(this.CurToken().Type == TokenType.RPAREN) this.Next();
            if(this.CurToken().Type == TokenType.LEADER){
                this.Next();
                try{
                    func_return_type = this.ParseType();
                    this.Next();
                }catch(e){
                    func_return_type = Types.VOID;
                }
                this.table.FunctionTypeBackPatch(func_return_type);
                break;
            }
            this.PutError(TokenType.LEADER);
            break;
        }

        numParams = this.table.EndFunctionParams();
        while(true){
            this.ParseBlock();
            if(this.CurToken().Type == TokenType.RET){
                this.Next();
                if(func_return_type != undefined)
                this.ParseReturn(numParams,func_return_type);
                wasReturned = true;
            }
            if(this.CurToken().Type == TokenType.END){
                this.Next();
                break;
            }
            this.Next();
        }

        if(func_return_type != Types.VOID && !wasReturned) throw new Error("returnが必要です");

        this.table.EndFunction();
        this.genCode.EmitReturn(numParams,this.table.Level,numParams);
        this.level--;

        wasReturned = false;
    }

    private ParseReturn(numParams:number,return_type:Types){
        const type = this.ParseExpression();
        if(type != return_type) throw new Error("Type Error!");
        this.genCode.EmitReturn(numParams,this.table.Level,numParams);
        if(this.CurToken().Type != TokenType.SEMICOLON){
            this.PutError(TokenType.SEMICOLON);
        }else this.Next();
    }   
}