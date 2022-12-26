export enum InterOprKind{
    PUSH = "PUSH", //opr1 push number to stack
    POP = "POP",//opr1 or null pop the head of stack,and push the value to opr1 or no
    LOAD = "LOAD",//opr1 and opr2 から計算したアドレスの値を取得
    PUSHI = "PUSHI",//アドレスだけを取得
    ASS = "ASS",//opr1をopr2(address)に代入

    COPY = "COPY",
    INC = "INC",
    DEC = "DEC",

    CALL = "CALL",
    RET = "RET",

    START = "START",
    LABEL = "LABEL",

    PRT = "PRT",
    PRTLN = "PRTLN",

    ADD = "ADD",
    SUB = "SUB",
    NEG = "NEG",
    MUL = "MUL",
    DIV = "DIV",
    MOD = "MOD",

    EQ = "EQ",
    NEQ = "NEQ",
    GRT = "GRT",
    EGR = "EGR",
    LES = "LES",
    ELE = "ELE",
    JMP = "JMP",//無条件飛び
    JPC = "JPC",//条件付き飛び

    BEGIN = "BEGIN",//ブロック呼び出し（BP更新）
    END = "END",//ブロック終わり（BP元に戻す）

    TRUE = "TRUE",
    FALSE = "FALSE",
}