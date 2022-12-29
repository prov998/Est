import { Lexer } from "../lexer/lexer"
import { Parser } from "../parser/parser";
import { Token } from "../token/token";
import { TokenType } from "../token/tokenType";
import { VM } from "../virtualMachine/vm";

export let run = ()=>{
    let input = `

        func main>>
            var x:int[10];

            x[0] = 4;
        end
    `
    let lexer = new Lexer(input);

    let tokens:Token[] = [];

    while(true){
        let token = lexer.NextToken();

        if(token.Type == TokenType.EOF) break;

        tokens.push(token);
    }
    console.log(tokens)

    let parser = new Parser(tokens);
    parser.ParseProgram()

    let index = 0;

    parser.getCodes().forEach(code=>{
        console.log(index++,"TYPE: ",code.Kind," OPR1:",code.Opr1," OPR2:",code.Opr2)
    })
    if(parser.getErrors().length != 0){
        parser.getErrors().forEach(error=>{
            console.log(error);
        })
        return;
    } 

    let vm = new VM(parser.getCodes());
    vm.run();

    console.log("STACK:",vm.Stack);
    console.log("DYMEM:",vm.Dymem);
    console.log("OUTPUT:",vm.Output);    
}

run();
