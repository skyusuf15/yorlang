const constants = require("../constants.js");
const feedbackMessages = require("../feedbackMessages.js");
const kwnodes = require("./keywordnodes/kwnodes.js");
const nodeLiterals = require("./nodeLiterals/nodeliterals.js");
const BaseNode = require("./basenode.js");

class Parser {
    constructor (lexer) {
        this.lexer = () => lexer;
        this.initBlockTypeStack();
        this.initIsArithmeticExpression();
    }

    initBlockTypeStack () {
        // a work around for creating a private field with public accessors
        const _blockTypeStack = [];
        this.pushToBlockTypeStack = (blockName) => {
            _blockTypeStack.push(blockName);
        };
        this.popBlockTypeStack = () => _blockTypeStack.pop();
        this.peekBlockTypeStack = () => _blockTypeStack[_blockTypeStack.length - 1];
        this.getBlockTypeStack = () => [ ..._blockTypeStack, ];
    }

    initIsArithmeticExpression () {
        let _isArithmeticExpression = true;
        this.setIsArithmeticExpression = (isArithmetic) => {
            _isArithmeticExpression = isArithmetic;
        };
        this.isArithmeticExpression = () => _isArithmeticExpression;
    }

    isNextTokenPunctuation (punc) {
        const token = this.lexer().peek();
        return token && token.type === constants.PUNCTUATION && (token.value === punc);
    }

    isNextTokenOperator (op) {
        const token = this.lexer().peek();
        return token && token.type === constants.OPERATOR && (token.value === op);
    }

    isNextTokenKeyword (kw) {
        const token = this.lexer().peek();
        return token && token.type === constants.KEYWORD && (token.value === kw);
    }

    skipPunctuation (punc) {
        if (this.isNextTokenPunctuation(punc)) this.lexer().next();
        else this.throwError(feedbackMessages.genericErrorMsg(this.getCurrentTokenValue()));
    }

    skipOperator (op) {
        if (this.isNextTokenOperator(op)) this.lexer().next();
        else this.throwError(feedbackMessages.genericErrorMsg(this.getCurrentTokenValue()));
    }

    skipKeyword (kw) {
        if (this.isNextTokenKeyword(kw)) this.lexer().next();
        else this.throwError(feedbackMessages.genericErrorMsg(this.getCurrentTokenValue()));
    }

    getCurrentTokenValue () {
        return this.lexer().peek() ? this.lexer().peek().value : null;
    }

    // Recursive descent parsing technique
    // backtracking is used in handling operator precedence while parsing the expression
    parseExpression () {
        return this.parseAssign();
    }

    parseAssign () {
        return this.parseWhile([ constants.SYM.ASSIGN, ], this.parseOr);
    }

    parseOr () {
        return this.parseWhile([ constants.SYM.OR, ], this.parseAnd);
    }

    parseAnd () {
        return this.parseWhile([ constants.SYM.AND, ], this.parseGreaterLesserEquality);
    }

    parseGreaterLesserEquality () {
        const operatorList = [
            constants.SYM.L_THAN, constants.SYM.G_THAN, constants.SYM.G_THAN_OR_EQ,
            constants.SYM.L_THAN_OR_EQ, constants.SYM.EQ, constants.SYM.NOT_EQ,
        ];

        if (this.isArithmeticExpression()) return this.parseWhile(operatorList, this.parsePlusMinus);
        else return this.parseWhile(operatorList, this.parseNodeLiteral); // it is a boolean expression
    }

    parsePlusMinus () {
        return this.parseWhile([ constants.SYM.PLUS, constants.SYM.MINUS, ], this.parseMultiplyDivisionRemainder);
    }

    parseMultiplyDivisionRemainder () {
        return this.parseWhile([ constants.SYM.MULTIPLY, constants.SYM.DIVIDE, constants.SYM.REMAINDER, ], this.parseNodeLiteral);
    }

    parseWhile (operatorList, parseOperationWithLesserPrecedence) {
        let node = parseOperationWithLesserPrecedence.bind(this)();

        while (this.isNextTokenInOperatorList(operatorList)) {
            node = {
                left: node,
                operation: this.lexer().next().value,
                right: parseOperationWithLesserPrecedence.bind(this)(),
                value: null,
            };
        }

        return node;
    }

    isNextTokenInOperatorList (operatorList) {
        return this.isNotEndOfFile() && (operatorList.includes(this.lexer().peek().value));
    }

    parseNodeLiteral () {
        const token = this.lexer().peek();

        if (nodeLiterals[token.type]) {
            const nodeliteral = nodeLiterals[token.type];
            if (nodeliteral instanceof BaseNode) return nodeliteral.getNode.call(this);
            else throw new Error(feedbackMessages.baseNodeType(token.value));
        }

        // check if the token value is a punctuation that can be used in an expression e.g (, [
        if (nodeLiterals[constants.EXP_PUNC][token.value]) {
            const nodeliteral = nodeLiterals[constants.EXP_PUNC][token.value];
            if (nodeliteral instanceof BaseNode) return nodeliteral.getNode.call(this);
            else throw new Error(feedbackMessages.baseNodeType(token.value));
        }

        this.lexer().throwError(feedbackMessages.genericErrorMsg(token.value));
    }

    parseBlock (currentBlock) {
        this.pushToBlockTypeStack(currentBlock);
        this.skipPunctuation(constants.SYM.L_PAREN);
        const block = [];
        while (this.isNotEndOfBlock()) {
            block.push(this.parseAst());
        }
        this.skipPunctuation(constants.SYM.R_PAREN);
        this.popBlockTypeStack();

        return block;
    }

    isNotEndOfBlock () {
        return this.isNotEndOfFile() && (this.lexer().peek().value !== constants.SYM.R_PAREN);
    }

    parseVarname () {
        return (this.lexer().peek().type === constants.VARIABLE)
            ? this.lexer().next().value
            : this.lexer().throwError(feedbackMessages.genericErrorMsg(this.lexer().peek().value));
    }

    parseDelimited (start, stop, separator, parser, predicate) {
        const varList = []; let firstVar = true;

        this.skipPunctuation(start);
        while (this.isNotEndOfFile()) {
            if (this.isNextTokenPunctuation(stop)) break;
            if (firstVar) firstVar = false; else this.skipPunctuation(separator);
            if (this.isNextTokenPunctuation(stop)) break; // this is necessary for an optional last separator
            varList.push(parser(predicate));
        }
        this.skipPunctuation(stop);

        return varList;
    }

    getTokenThatSatisfiesPredicate (predicate) {
        var token = this.lexer().next();
        if (predicate(token)) return token;

        this.throwError(feedbackMessages.genericErrorMsg(token.type));
    }

    parseAst () {
        const token = this.lexer().peek();

        if (kwnodes[token.value]) {
            const kwNode = kwnodes[token.value];
            if (kwNode instanceof BaseNode) return kwNode.getNode.call(this); // call the method getNode in kwNode object like an extension function to the Parser class
            else throw new Error(feedbackMessages.baseNodeType(kwNode));
        }

        if (token.type === constants.VARIABLE) { // then a function call is expected
            const callIseNodeLiteral = nodeLiterals[constants.CALL_ISE];
            if (callIseNodeLiteral instanceof BaseNode) return callIseNodeLiteral.getNode.call(this);
            else throw new Error(feedbackMessages.baseNodeType(callIseNodeLiteral));
        }

        this.throwError(feedbackMessages.genericErrorMsg(token.value));
    }

    isNotEndOfFile () {
        return this.lexer().isNotEndOfFile();
    }

    throwError (msg) {
        this.lexer().throwError(msg);
    }
}

module.exports = Parser;
