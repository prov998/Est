export enum TokenType{
    FUNC = "FUNC",
    RET = "RET",

    IDENT = "IDENT",
    FUNC_LEADER = ">>",
    END = "END",

    PRINT = "PRINT",
    PRINTLN = "PRINTLN",
    VAR = "VAR",
    CONST = "CONST",
    ASSIGN = "ASSIGN",
    IF = "IF",
    THEN = "THEN",
    ELSE = "ELSE",
    ELIF = "ELIF",

    WHILE = "WHILE",

    BREAK = "BREAK",
    CONTINUE = "CONTINUE",

    LPAREN = "(",
    RPAREN = ")",

    PLUS = "+",
    MINUS = "-",
    MULTI = "*",
    DIV = "/",
    MOD = "%",

    GRT = ">",
    LES = "<",
    EGR = ">=",
    ELE = "<=",
    EQ = "==",
    NEQ = "!=",

    TRUE = "TRUE",
    FALSE = "FALSE",

    INT_NUMBER = "INT_NUMBER",
    FLOAT_NUMBER = "FLOAT_NUMBER",
    
    DOT = "DOT",

    ILLEGAL = "ILLEGAL",
    WHITESPACE = "WHITESPACE",
    EOF = "EOF",

    COMMA = ",",
    SEMICOLON = ";",
    COLON = ":",

    //TYPE
    INT = "INT",
    FLOAT = "FLOAT",
    BOOL = "BOOL",
}