import { TokenType } from "./tokenType";

export class Token{
    private type:TokenType;
    private name:string;
    private value:string;
    constructor(type:TokenType,name:string,value:string){
        this.type = type;
        this.name = name;
        this.value = value;
    }

    get Type():TokenType{return this.type;}

    get Name():string{return this.name;}

    get Value():string{return this.value;}
}

export function keyWord(name:string){
    switch(name){
        case "func":
            return TokenType.FUNC
        case "end":
            return TokenType.END
        case "return":
            return TokenType.RET
        case "print":
            return TokenType.PRINT
        case "println":
            return TokenType.PRINTLN
        case "var":
            return TokenType.VAR
        case "const":
            return TokenType.CONST
        case "if":
            return TokenType.IF
        case "then":
            return TokenType.THEN
        case "elif":
            return TokenType.ELIF
        case "else":
            return TokenType.ELSE
        case "true":
            return TokenType.TRUE
        case "false":
            return TokenType.FALSE
        case "while":
            return TokenType.WHILE
        case "do":
            return TokenType.DO
        case "match":
            return TokenType.MATCH
        case "case":
            return TokenType.CASE
        case "other":
            return TokenType.OTHER
        case "break":
            return TokenType.BREAK
        case "continue":
            return TokenType.CONTINUE
        case "int":
            return TokenType.INT
        case "float":
            return TokenType.FLOAT
        case "bool":
            return TokenType.BOOL
        default:
            return null
    }
}