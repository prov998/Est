import { _ERROR_TYPE_CALC } from "../error/error";
import { TokenType } from "../token/tokenType";

export enum Types{
    INT = "INT",
    FLOAT = "FLOAT",
    BOOL = "BOOL",
}

export function CastWithOpr(type1:Types,type2:Types,opr:TokenType):Types{
    switch(type1){
        case Types.INT:
            switch(type2){
                case Types.INT:
                    switch(opr){
                        case TokenType.PLUS:
                            return Types.INT
                        case TokenType.MINUS:
                            return Types.INT
                        case TokenType.MULTI:
                            return Types.INT
                        case TokenType.DIV:
                            return Types.FLOAT
                        case TokenType.MOD:
                            return Types.INT
                    }
                case Types.FLOAT:
                    switch(opr){
                        case TokenType.PLUS:
                            return Types.FLOAT
                        case TokenType.MINUS:
                            return Types.FLOAT
                        case TokenType.MULTI:
                            return Types.FLOAT
                        case TokenType.DIV:
                            return Types.FLOAT
                        case TokenType.MOD:
                            throw new Error("Cant use opr 'mod' with float");
                    }
                case Types.BOOL:
                    _ERROR_TYPE_CALC(Types.INT,Types.BOOL);
                default:
                    throw new Error("")
            }
        case Types.FLOAT:
            switch(type2){
                case Types.INT:
                    switch(opr){
                        case TokenType.PLUS:
                            return Types.FLOAT
                        case TokenType.MINUS:
                            return Types.FLOAT
                        case TokenType.MULTI:
                            return Types.FLOAT
                        case TokenType.DIV:
                            return Types.FLOAT
                        case TokenType.MOD:
                            throw new Error("Cant use opr 'mod' with float");
                    }
                case Types.FLOAT:
                    switch(opr){
                        case TokenType.PLUS:
                            return Types.FLOAT
                        case TokenType.MINUS:
                            return Types.FLOAT
                        case TokenType.MULTI:
                            return Types.FLOAT
                        case TokenType.DIV:
                            return Types.FLOAT
                        case TokenType.MOD:
                            throw new Error("Cant use opr 'mod' with float");
                    }
                case Types.BOOL:
                    _ERROR_TYPE_CALC(Types.FLOAT,Types.BOOL);
                default:
                    throw new Error("")
            }
        case Types.BOOL:
            switch(type2){
                case Types.INT:
                    _ERROR_TYPE_CALC(Types.BOOL,Types.INT);
                case Types.FLOAT:
                    _ERROR_TYPE_CALC(Types.BOOL,Types.FLOAT);
                case Types.BOOL:
                default:
                    throw new Error("")
            }
    }
}