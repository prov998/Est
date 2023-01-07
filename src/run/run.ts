import { Lexer } from "../lexer/lexer"
import { Parser } from "../parser/parser";
import { Token } from "../token/token";
import { TokenType } from "../token/tokenType";
import { VM } from "../virtualMachine/vm";

export let run = ()=>{
    let input = `

        class A>>
            prv x:int;

            pub Init(p:int)>>
                this.x = p;
            end

            pub func Set(y:int)>>
                this.x = y;
            end
        end


        func main>>
            var a:A = new A(4);
            a.Set(100);

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
    console.log("HEEP:",vm.Heep)
    console.log("OUTPUT:",vm.Output);  
}

run();
