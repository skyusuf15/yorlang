const MainInterpreter = require("../../interpreters/maininterpreter.js");
const Environment = require("../../environment.js");
const Parser = require("../../parsers/parser.js");
const Lexer = require("../../lexer.js");
const InputStream = require("../../inputstream.js");
const constants = require("../../constants.js");

describe("INodeFun test suite", () => {
    let mainInterpreter, parser;

    beforeEach(() => {
        parser = new Parser(new Lexer(new InputStream()));
        mainInterpreter = new MainInterpreter(new Environment());
        global.console.log = jest.fn();
    });

    test("it should interprete fun node", () => {
        parser.lexer.inputStream.code = `
            ${constants.KW.FUN} (${constants.KW.TI} i = 0; i < 10; ${constants.KW.TI} i = i + 1;) {
                ${constants.KW.SOPE} i;
            }
        `;

        const program = parser.parseProgram();
        mainInterpreter.astList = program.astList;
        mainInterpreter.interpreteProgram();
        expect(global.console.log).toHaveBeenCalledTimes(10);
    });

    test("it should interprete nested fun node", () => {
        parser.lexer.inputStream.code = `
            ${constants.KW.FUN} (${constants.KW.TI} i = 1; i < 3; ${constants.KW.TI} i = i + 1;) {
                ${constants.KW.SOPE} i;
                ${constants.KW.FUN} (${constants.KW.TI} j = 0; j < 2; ${constants.KW.TI} j = i + j;) {
                    ${constants.KW.SOPE} j;
                }
            }
        `;

        const program = parser.parseProgram();
        mainInterpreter.astList = program.astList;
        mainInterpreter.interpreteProgram();
        expect(global.console.log).toHaveBeenCalledTimes(5);
    });

    test("it should interprete fun node with kuro keyword", () => {
        parser.lexer.inputStream.code = `
            ${constants.KW.FUN} (${constants.KW.TI} i = 0; i < 10; ${constants.KW.TI} i = i + 1;) {
                ${constants.KW.SOPE} i;
                ${constants.KW.SE} (i == 5) {
                    ${constants.KW.KURO};
                }
            }
        `;

        const program = parser.parseProgram();
        mainInterpreter.astList = program.astList;
        mainInterpreter.interpreteProgram();
        expect(global.console.log).toHaveBeenCalledTimes(6);
    });

});