export enum TokenType{
    FUNC = "FUNC",
    RET = "RET",

    CLASS = "CLASS",
    PUB = "PUB",
    PRV = "PRV",

    NEW = "NEW",

    IDENT = "IDENT",
    LEADER = ">>",
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
    DO = "DO",

    BREAK = "BREAK",
    CONTINUE = "CONTINUE",

    MATCH = "MATCH",
    CASE = "CASE",
    OTHER = "OTHER",

    LPAREN = "(",
    RPAREN = ")",

    PLUS = "+",
    MINUS = "-",
    MULTI = "*",
    DIV = "/",
    MOD = "%",

    PLUSASSIGN = "+=",
    MINUSASSIGN = "-=",
    MULTIASSIGN = "*=",
    DIVASSIGN = "/=",
    MODASSIGN = "%=",

    INC = "++",
    DEC = "--",

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
    CHAR = "CHAR",
    INT_ARRANGE = "INT_ARRANGE",
    FLOAT_ARRANGE = "FLOAT_ARRANGE",
    CHAR_ARRANGE = "CHAR_ARRANGE",

    LARRAY = "[",
    RARRAY = "]",
    
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