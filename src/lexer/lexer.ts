import { keyWord, Token} from "../token/token";
import { TokenType } from "../token/tokenType";

export class Lexer{
    private input:string;
    private position:number;
    private readPosition:number;
    private ch:string;
    private isFloat:boolean = false;

    constructor(input:string) {
        this.input = input;
        this.position = 0;
        this.readPosition = 0;
        this.ch = "";
        this.Next();
    }

    private Next(){
        if(this.readPosition >= this.input.length){
            this.ch = "EOF";
        }else{
            this.ch = this.input[this.readPosition];
        }
        this.position = this.readPosition;
        this.readPosition++;
    }

    public NextToken():Token{
        let token:Token;

        while(true){
            this.skipWhiteSpace();
            switch(this.ch){
                case "[":
                    token = new Token(TokenType.LARRAY,"[","");
                    break;
                case "]":
                    token = new Token(TokenType.RARRAY,"]","");
                    break;
                case "'":
                    this.Next();
                    if(this.isIdentifier(this.ch)|| this.isWhiteSpace(this.ch)){
                        let char = this.ch;
                        token = new Token(TokenType.CHAR,"",char);
                        this.Next();
                    }else{
                        token = new Token(TokenType.CHAR,"","");
                    }
                    if(this.ch != "'") throw new Error("'がありません！");
                    //this.Next();
                    break;
                case "=":
                    if(this.peekChar() == "="){
                        this.Next();
                        token = new Token(TokenType.EQ,"=","");
                    }else{
                        token = new Token(TokenType.ASSIGN,"=","");
                    }
                    break;
                case "!":
                    if(this.peekChar() == "="){
                        this.Next();
                        token = new Token(TokenType.NEQ,"=","");
                    }else{
                        throw new Error("Need '='");
                    }
                    break;
                case ".":
                    token = new Token(TokenType.DOT,".","");
                    break;
                case ";":
                    token = new Token(TokenType.SEMICOLON,";","");
                    break;
                case ",":
                    token = new Token(TokenType.COMMA,",","");
                    break;
                case ":":
                    token = new Token(TokenType.COLON,":","");
                    break;
                case "(":
                    token = new Token(TokenType.LPAREN,"","");
                    break;
                case ")":
                    token = new Token(TokenType.RPAREN,"","");
                    break;
                case "EOF":
                    token = new Token(TokenType.EOF,"","");
                    break;
                case "+":
                    if(this.peekChar() == "="){
                        this.Next();
                        token = new Token(TokenType.PLUSASSIGN,"+=","");
                    }else if(this.peekChar() == "+"){
                        this.Next();
                        token = new Token(TokenType.INC,"++","");
                    }else{
                        token = new Token(TokenType.PLUS,"+","");
                    }
                    break;
                case "-":
                    if(this.peekChar() == "="){
                        this.Next();
                        token = new Token(TokenType.MINUSASSIGN,"-=","");
                    }else if(this.peekChar() == "-"){
                        this.Next();
                        token = new Token(TokenType.DEC,"--","");
                    }else{
                        token = new Token(TokenType.MINUS,"-","");
                    }
                    break;
                case "*":
                    if(this.peekChar() == "="){
                        this.Next();
                        token = new Token(TokenType.MULTIASSIGN,"*=","");
                    }else{
                        token = new Token(TokenType.MULTI,"*","");
                    }
                    break;
                case "/":
                    if(this.peekChar() == "/"){
                        this.Next();
                        this.Next();
                        this.LexComment();
                        continue;
                    }else if(this.peekChar() == "="){
                        this.Next();
                        token = new Token(TokenType.DIVASSIGN,"/=","");
                    }else{
                        token = new Token(TokenType.DIV,"","");
                    }
                    break;
                case "%":
                    if(this.peekChar() == "="){
                        this.Next();
                        token = new Token(TokenType.MODASSIGN,"%=","");
                    }else{
                        token = new Token(TokenType.MOD,"%","");
                    }
                    break;
                case ">":
                    if(this.peekChar() == ">"){
                        this.Next();
                        token = new Token(TokenType.LEADER,"","");
                    }else if(this.peekChar() == "="){
                        this.Next();
                        token = new Token(TokenType.EGR,"","");
                    }else{
                        token = new Token(TokenType.GRT,"","");
                    }
                    break;
                case "<":
                    if(this.peekChar() == "="){
                        this.Next();
                        token = new Token(TokenType.ELE,"","");
                    }else{
                        token = new Token(TokenType.LES,"","");
                    }
                    break;
                default:
                    if(this.isDigit(this.ch)){
                        let value = this.LexDigit();

                        if(this.isFloat){
                            token = new Token(TokenType.FLOAT_NUMBER,"",value);
                            this.isFloat = false;
                        }
                        else token = new Token(TokenType.INT_NUMBER,"",value);
                        return token
                    }
                    if(this.isIdentifier(this.ch)){
                    let name = this.LexIdentifier();
                        let type = keyWord(name);
                        if(type != null){
                            token = new Token(type,name,"");
                            return token;
                        }

                        token = new Token(TokenType.IDENT,name,"");
                        return token;
                        }  
                    token = new Token(TokenType.ILLEGAL,this.ch,"");
            }
            break;
        }

        this.Next();
        return token;
    }

    private LexComment(){
        while(this.ch != "\n"&&this.ch != "\r") this.Next();
    }

    private peekChar(){
        return this.input[this.position+1];
    }

    private isDigit(ch:string) {
        return /^\d$/.test(ch);
    }
    
    private isIdentifier(ch:string){
        return /^[A-Za-z]$/.test(ch) || ch=="_";
    }
    
    private isWhiteSpace(ch:string) {
        return /^[ \n\r\t]$/.test(ch);
    }

    private skipWhiteSpace(){
        while(this.isWhiteSpace(this.ch)) this.Next();
    }

    private LexDigit():string{
        let start = this.position;
        let dot_position = 0;
        while(true){
            if(this.ch == "."){
                if(this.isFloat) throw new Error("表記エラー");
                else this.isFloat = true;

                dot_position = this.position;
                this.Next();
            }

            if(this.isDigit(this.ch)){
                this.Next();
                continue;
            }else{
                break;
            }
        }
        let length = this.position - start;
        if(this.isFloat){
            var real_part = this.input.substr(start,length);
            real_part = real_part.replace(".","");
            var real_part_number = Number(real_part);

            var expo = this.position - dot_position -1;
            return String(real_part_number*Math.pow(10,-expo));
        }

        return this.input.substr(start,length);
    }

    private LexIdentifier():string{
        let start = this.position;
        while(this.isIdentifier(this.ch)||this.isDigit(this.ch)) this.Next();
        let length = this.position - start;

        return this.input.substr(start,length);
    }
}